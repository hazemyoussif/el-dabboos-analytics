import type { Locale } from '@el-dabboos/domain';
import type { SheetData } from 'write-excel-file/universal';
import type { ExcelWorkbook } from './excel-data.ts';

export function rowWorkbook(title: string, data: SheetData, locale: Locale): ExcelWorkbook {
  const name = title.replace(/[\\/:?*<>|"[\]']/g, ' ').replace(/\p{Cc}/gu, ' ').trim() || 'Table';
  return { sheets: [name.slice(0, 31)], data: [[[title], ...data]], fileName: `${name.slice(0, 100)}.xlsx`, rightToLeft: locale === 'ar' };
}
export function renderedTableWorkbook(table: HTMLTableElement, locale: Locale, columnCount: number): ExcelWorkbook {
  const title = table.closest('section')?.querySelector('h2')?.textContent ?? (locale === 'ar' ? 'الجدول' : 'Table');
  const rows = Array.from(table.rows).map(row => Array.from(row.cells).slice(0, columnCount).map(cell => cell.textContent?.trim() ?? ''));
  return rowWorkbook(title, [[locale === 'ar' ? 'الصفوف المعروضة' : 'Displayed rows'], ...rows], locale);
}
