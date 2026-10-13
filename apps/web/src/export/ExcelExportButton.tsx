import { useState } from 'react';
import type { Locale } from '@el-dabboos/domain';
import { exportCopy } from './excel-data.ts';
import type { ExcelWorkbook } from './excel-data.ts';

export async function downloadWorkbook(workbook: ExcelWorkbook): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const blob = await writeExcelFile(workbook.data, { sheets: workbook.sheets, rightToLeft: workbook.rightToLeft });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = workbook.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExcelExportButton({ locale, kind, createWorkbook, disabled = false }: { locale: Locale; kind: 'table' | 'dashboard'; createWorkbook: () => ExcelWorkbook; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = exportCopy[locale];
  async function exportExcel() {
    setBusy(true); setFailed(false);
    try { await downloadWorkbook(createWorkbook()); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  }
  return <div className="excel-export"><button type="button" className="button-ghost" disabled={disabled || busy} aria-busy={busy} onClick={() => void exportExcel()}>{busy ? text.busy : text[kind]}</button>{failed && <span role="alert">{text.failed}</span>}</div>;
}
