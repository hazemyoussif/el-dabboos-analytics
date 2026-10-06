"""Synthetic export fixtures only; never read a developer workbook or environment."""
import importlib.util
import tempfile
import sys
import unittest
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("aged_excel", Path(__file__).with_name("parse-odoo-aged-excel.py"))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
NS = parser.NAMESPACE["sheet"]


def synthetic_workbook(path, amounts=None, formula=False, total="10", label="  Synthetic\tCustomer  "):
    values = amounts or ["10.000000001", "-5", "0", "0", "0", "5", total]
    def numeric_row(number, name, numeric):
        cells = f'<c r="A{number}" t="inlineStr"><is><t>{escape(name)}</t></is></c>'
        for column, value in zip("CDEFGHI", numeric):
            cells += f'<c r="{column}{number}">{"<f>1+1</f>" if formula and number == 5 and column == "C" else ""}<v>{value}</v></c>'
        return f'<row r="{number}">{cells}</row>'
    heading = '<row r="1"><c r="B1" t="inlineStr"><is><t>As of 09/30/2026</t></is></c></row>'
    headers = '<row r="3">' + ''.join(f'<c r="{column}3" t="inlineStr"><is><t>{name}</t></is></c>' for column, name in zip("CDEFGHI", ["At Date", "1-30", "31-60", "61-90", "91-120", "Older", "Total"])) + '</row>'
    sheet = f'<worksheet xmlns="{NS}"><sheetData>{heading}{headers}{numeric_row(4,"Aged Receivable",values)}{numeric_row(5,label,values)}{numeric_row(6,"Total Aged Receivable",values)}</sheetData></worksheet>'
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("xl/sharedStrings.xml", f'<sst xmlns="{NS}"/>')
        archive.writestr("xl/workbook.xml", f'<workbook xmlns="{NS}"><sheets><sheet name="Aged Receivable"/><sheet name="Filters"/></sheets></workbook>')
        archive.writestr("xl/worksheets/sheet1.xml", sheet)
        archive.writestr("xl/worksheets/sheet2.xml", f'<worksheet xmlns="{NS}"><sheetData><row r="1"><c r="B1" t="inlineStr"><is><t>Synthetic Company</t></is></c></row></sheetData></worksheet>')


class ExportParserTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "synthetic.xlsx"

    def test_decimal_integrity_and_raw_labels_preserved(self):
        synthetic_workbook(self.path)
        original = self.path.read_bytes()
        result = parser.parse_workbook(self.path)
        self.assertTrue(result["integrity"]["passed"])
        self.assertEqual(result["customers"][0]["rawLabel"], "  Synthetic\tCustomer  ")
        self.assertEqual(result["customers"][0]["comparisonKey"], "Synthetic Customer")
        self.assertEqual(result["characteristics"]["negativeBucketCells"], 1)
        self.assertEqual(result["totals"]["current"], "10.000")
        self.assertEqual(self.path.read_bytes(), original)

    def test_zero_total_offsetting_buckets_are_valid(self):
        synthetic_workbook(self.path, amounts=["0", "-5", "0", "0", "0", "5", "0"])
        result = parser.parse_workbook(self.path)
        self.assertTrue(result["integrity"]["passed"])
        self.assertEqual(result["characteristics"]["zeroTotalWithNonzeroBuckets"], 1)

    def test_row_difference_is_not_hidden(self):
        synthetic_workbook(self.path, total="11")
        result = parser.parse_workbook(self.path)
        self.assertFalse(result["integrity"]["passed"])
        self.assertEqual(result["integrity"]["rowSumMismatches"], [5])

    def test_cached_formulas_and_new_precision_are_rejected(self):
        synthetic_workbook(self.path, formula=True)
        with self.assertRaises(ValueError):
            parser.parse_workbook(self.path)
        synthetic_workbook(self.path, amounts=["10.0004", "-5", "0", "0", "0", "5", "10"])
        with self.assertRaises(ValueError):
            parser.parse_workbook(self.path)


if __name__ == "__main__":
    unittest.main()
