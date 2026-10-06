"""Read the supplied Finance export without modifying it or retaining it in Git."""
import hashlib
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as xml
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

NAMESPACE = {"sheet": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
BUCKETS = ["current", "1_30", "31_60", "61_90", "91_120", "older", "total"]
PRECISION = Decimal("0.001")


def sheet_rows(archive, sheet_path, strings):
    rows = []
    for row in xml.fromstring(archive.read(sheet_path)).find("sheet:sheetData", NAMESPACE):
        cells = {}
        for cell in row:
            value = cell.find("sheet:v", NAMESPACE)
            text = value.text if value is not None else ""
            if cell.attrib.get("t") == "s":
                text = strings[int(text)]
            elif cell.attrib.get("t") == "inlineStr":
                text = "".join(cell.find("sheet:is", NAMESPACE).itertext())
            if cell.find("sheet:f", NAMESPACE) is not None:
                raise ValueError("Cached formulas are not accepted as an exported accounting control")
            cells[re.sub(r"\d", "", cell.attrib["r"])] = text
        rows.append((int(row.attrib["r"]), cells))
    return rows


def amounts(cells):
    raw = {bucket: cells.get(column, "") for bucket, column in zip(BUCKETS, "CDEFGHI")}
    if any(value == "" for value in raw.values()):
        raise ValueError("Incomplete numeric control row")
    numeric = {bucket: Decimal(value) for bucket, value in raw.items()}
    if any(not value.is_finite() for value in numeric.values()):
        raise ValueError("Nonfinite Finance control")
    if any(abs(value - value.quantize(PRECISION, rounding=ROUND_HALF_UP)) > Decimal("0.00000001") for value in numeric.values()):
        raise ValueError("Workbook precision differs from observed IQD control; manual precision review required")
    rounded = {bucket: str(value.quantize(PRECISION, rounding=ROUND_HALF_UP)) for bucket, value in numeric.items()}
    return raw, rounded


def parse_workbook(path):
    content = Path(path).read_bytes()
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        strings = ["".join(item.itertext()) for item in xml.fromstring(archive.read("xl/sharedStrings.xml"))]
        workbook = xml.fromstring(archive.read("xl/workbook.xml"))
        names = [sheet.attrib["name"] for sheet in workbook.find("sheet:sheets", NAMESPACE)]
        if names != ["Aged Receivable", "Filters"]:
            raise ValueError("Expected unchanged Odoo Aged Receivable / Filters export")
        rows = sheet_rows(archive, "xl/worksheets/sheet1.xml", strings)
        filters = sheet_rows(archive, "xl/worksheets/sheet2.xml", strings)
    if rows[0][1].get("B") != "As of 09/30/2026":
        raise ValueError("Approved September-30 cutoff required")
    if [rows[1][1].get(column) for column in "CDEFGHI"] != ["At Date", "1-30", "31-60", "61-90", "91-120", "Older", "Total"]:
        raise ValueError("Unexpected report buckets")
    if rows[2][1].get("A") != "Aged Receivable" or rows[-1][1].get("A") != "Total Aged Receivable":
        raise ValueError("Report heading / total row missing")
    top_raw, top = amounts(rows[2][1])
    total_raw, totals = amounts(rows[-1][1])
    if top != totals:
        raise ValueError("Report heading and terminal control totals disagree")
    customers = []
    for row_number, cells in rows[3:-1]:
        label = cells.get("A")
        if not label:
            raise ValueError("Unlabeled customer control row")
        raw, values = amounts(cells)
        customers.append({"rowNumber": row_number, "rawLabel": label,
                          "comparisonKey": " ".join(label.split()), "rawValues": raw, "values": values})
    sums = {bucket: sum((Decimal(row["values"][bucket]) for row in customers), Decimal(0)) for bucket in BUCKETS}
    column_deltas = {bucket: str(sums[bucket] - Decimal(totals[bucket])) for bucket in BUCKETS}
    bad_rows = [row["rowNumber"] for row in customers if sum((Decimal(row["values"][bucket]) for bucket in BUCKETS[:-1]), Decimal(0)) != Decimal(row["values"]["total"])]
    raw_noise = max(abs(Decimal(row["rawValues"][bucket]) - Decimal(row["values"][bucket])) for row in customers for bucket in BUCKETS)
    characteristics = {
        "customerRows": len(customers),
        "positiveTotals": sum(Decimal(row["values"]["total"]) > 0 for row in customers),
        "negativeTotals": sum(Decimal(row["values"]["total"]) < 0 for row in customers),
        "zeroTotals": sum(Decimal(row["values"]["total"]) == 0 for row in customers),
        "zeroTotalWithNonzeroBuckets": sum(Decimal(row["values"]["total"]) == 0 and any(Decimal(row["values"][bucket]) != 0 for bucket in BUCKETS[:-1]) for row in customers),
        "negativeBucketCells": sum(Decimal(row["values"][bucket]) < 0 for row in customers for bucket in BUCKETS[:-1]),
        "duplicateNormalizedLabels": len(customers) - len({row["comparisonKey"] for row in customers}),
        "maximumNumericSerializationNoise": str(raw_noise),
    }
    return {"workbookSha256": hashlib.sha256(content).hexdigest(), "reportDate": "2026-09-30",
            "reportHeading": "Aged Receivable", "companyLabel": filters[0][1]["B"], "reportingCurrency": "IQD",
            "sheet": "Aged Receivable", "totalRow": rows[-1][0], "numericColumns": "C:I",
            "bucketLabels": {bucket: rows[1][1][column] for bucket, column in zip(BUCKETS, "CDEFGHI")},
            "rawTotals": total_raw, "totals": totals, "customers": customers,
            "integrity": {"columnDeltas": column_deltas, "rowSumMismatches": bad_rows,
                          "passed": not bad_rows and all(Decimal(delta) == 0 for delta in column_deltas.values())},
            "characteristics": characteristics,
            "precision": "0.001 IQD; Decimal quantization removes serialized binary-float noise below observed company precision; no acceptance tolerance"}


if __name__ == "__main__":
    workbook_path, output_path = sys.argv[1:]
    result = parse_workbook(workbook_path)
    descriptor = os.open(output_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps({"workbookSha256": result["workbookSha256"], "integrity": result["integrity"],
                      "totals": result["totals"], "characteristics": result["characteristics"]}))
