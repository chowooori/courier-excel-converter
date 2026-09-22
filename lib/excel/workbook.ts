import * as XLSX from "xlsx";

export type ExcelValue = string | number | boolean | Date | null;

export interface TableData {
  headers: string[];
  rows: ExcelValue[][];
  sheetName: string;
}

export class ExcelFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelFormatError";
  }
}

export function valueText(value: ExcelValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function columnIndex(table: TableData, name: string): number {
  const index = table.headers.indexOf(name);
  if (index === -1) {
    throw new ExcelFormatError(`엑셀 파일에 필요한 열이 없습니다: ${name}`);
  }
  return index;
}

export function requireColumns(table: TableData, names: string[], label: string): void {
  const missing = names.filter((name) => !table.headers.includes(name));
  if (missing.length) {
    throw new ExcelFormatError(
      `${label}에 필요한 열이 없습니다: ${missing.join(", ")}`,
    );
  }
}

export async function readExcelFile(file: File): Promise<TableData> {
  const extension = file.name.toLowerCase();
  if (!extension.endsWith(".xls") && !extension.endsWith(".xlsx")) {
    throw new ExcelFormatError(".xls 또는 .xlsx 파일만 올릴 수 있습니다.");
  }

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: false,
      cellText: true,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new ExcelFormatError("엑셀 파일에 시트가 없습니다.");

    const matrix = XLSX.utils.sheet_to_json<ExcelValue[]>(
      workbook.Sheets[sheetName],
      {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      },
    );
    if (!matrix.length) throw new ExcelFormatError("엑셀 파일이 비어 있습니다.");

    const headers = matrix[0].map((value) => valueText(value));
    const duplicateHeaders = headers.filter(
      (header, index) => header && headers.indexOf(header) !== index,
    );
    if (duplicateHeaders.length) {
      throw new ExcelFormatError(
        `중복된 열 이름이 있습니다: ${[...new Set(duplicateHeaders)].join(", ")}`,
      );
    }

    const rows = matrix.slice(1).map((row) =>
      headers.map((_, index) => row[index] ?? ""),
    );
    return { headers, rows, sheetName };
  } catch (error) {
    if (error instanceof ExcelFormatError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ExcelFormatError(`엑셀 파일을 읽지 못했습니다: ${message}`);
  }
}

function setTextCell(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
): void {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = worksheet[address];
  if (!cell) return;
  cell.t = "s";
  cell.v = valueText(cell.v as ExcelValue);
  cell.z = "@";
}

export function tableToXlsxBlob(
  table: TableData,
  sheetName: string,
  textColumns: Set<string>,
  options?: { freezeHeader?: boolean; autoFilter?: boolean },
): Blob {
  const worksheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]);

  table.headers.forEach((header, column) => {
    if (!textColumns.has(header)) return;
    for (let row = 1; row <= table.rows.length; row += 1) {
      setTextCell(worksheet, row, column);
    }
  });

  if (options?.freezeHeader) {
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  }
  if (options?.autoFilter && worksheet["!ref"]) {
    worksheet["!autofilter"] = { ref: worksheet["!ref"] };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const output = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  }) as ArrayBuffer;
  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
