import {
  ExcelFormatError,
  type ExcelValue,
  type TableData,
  columnIndex,
} from "./workbook";

export const REQUIRED_SOURCE_COLUMNS = [
  "수령자명",
  "주문선택사항",
  "주문수량",
  "수령자휴대폰번호",
  "배송지주소",
  "배송지우편번호",
  "배송메세지",
] as const;

export const OUTPUT_COLUMNS = [
  "받는분성명",
  "내품명",
  "내품수량",
  "받는분전화번호",
  "받는분주소(전체, 분할)",
  "받는분우편번호",
  "배송메세지1",
  "발송업체명",
  "업체요청 메시지",
] as const;

export const COURIER_TEXT_COLUMNS = new Set([
  "받는분성명",
  "내품명",
  "받는분전화번호",
  "받는분주소(전체, 분할)",
  "받는분우편번호",
  "배송메세지1",
  "발송업체명",
  "업체요청 메시지",
]);

export const COMPARE_PAIRS = [
  ["수령자명", "받는분성명"],
  ["주문선택사항", "내품명"],
  ["주문수량", "내품수량"],
  ["수령자휴대폰번호", "받는분전화번호"],
  ["배송지주소", "받는분주소(전체, 분할)"],
  ["배송메세지", "배송메세지1"],
] as const;

const PHONE_PATTERN = /^\d{2,4}-\d{3,4}-\d{4}$/;
const ZIPCODE_PATTERN = /^\d{5}$/;

export interface ValidationReport {
  sourceRowCount: number;
  convertedRowCount: number;
  sourceQtySum: number;
  convertedQtySum: number;
  countOk: boolean;
  qtyOk: boolean;
  emptyNameCount: number;
  emptyProductCount: number;
  invalidQuantityCount: number;
  emptyPhoneCount: number;
  invalidPhoneCount: number;
  emptyAddressCount: number;
  invalidZipcodeCount: number;
  adjustedNameCount: number;
  rulesOk: boolean;
  ok: boolean;
}

export function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  if (text === "nan" || text === "None" || text === "<NA>") return "";
  return text;
}

export function formatRecipientName(value: unknown): string {
  const text = asText(value);
  return text.length === 1 ? `${text}.` : text;
}

export function formatZipcode(value: unknown): string {
  const text = asText(value);
  if (!text) return "";
  let next = text;
  if (next.endsWith(".0") && /^[\d-]+$/.test(next.slice(0, -2))) {
    next = next.slice(0, -2);
  }
  const digits = [...next].filter((ch) => ch >= "0" && ch <= "9").join("");
  if (!digits) return text;
  return digits.padStart(5, "0");
}

export function asQuantity(value: unknown): number | null {
  const text = asText(value);
  if (!text) return null;
  const numeric = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return Number.isInteger(numeric) ? numeric : numeric;
}

function qtySum(values: unknown[]): number {
  return values.reduce<number>((total, value) => {
    const numeric = asQuantity(value);
    return total + (numeric ?? 0);
  }, 0);
}

function columnValues(table: TableData, name: string): ExcelValue[] {
  const index = columnIndex(table, name);
  return table.rows.map((row) => row[index] ?? "");
}

export function convertToCourierForm(source: TableData): TableData {
  const missing = REQUIRED_SOURCE_COLUMNS.filter(
    (column) => !source.headers.includes(column),
  );
  if (missing.length) {
    throw new ExcelFormatError(
      `원본 엑셀에 필요한 열이 없습니다: ${missing.join(", ")}`,
    );
  }

  const nameIndex = columnIndex(source, "수령자명");
  const productIndex = columnIndex(source, "주문선택사항");
  const qtyIndex = columnIndex(source, "주문수량");
  const phoneIndex = columnIndex(source, "수령자휴대폰번호");
  const addressIndex = columnIndex(source, "배송지주소");
  const zipIndex = columnIndex(source, "배송지우편번호");
  const messageIndex = columnIndex(source, "배송메세지");

  const rows: ExcelValue[][] = source.rows.map((row) => {
    const quantity = asQuantity(row[qtyIndex]);
    return [
      formatRecipientName(row[nameIndex]),
      asText(row[productIndex]),
      quantity ?? "",
      asText(row[phoneIndex]),
      asText(row[addressIndex]),
      formatZipcode(row[zipIndex]),
      asText(row[messageIndex]),
      "",
      "",
    ];
  });

  return {
    headers: [...OUTPUT_COLUMNS],
    rows,
    sheetName: "Sheet1",
  };
}

export function validate(
  source: TableData,
  converted: TableData,
): ValidationReport {
  const sourceQtySum = qtySum(columnValues(source, "주문수량"));
  const convertedQtySum = qtySum(columnValues(converted, "내품수량"));
  const names = columnValues(converted, "받는분성명").map(asText);
  const products = columnValues(converted, "내품명").map(asText);
  const quantities = columnValues(converted, "내품수량");
  const phones = columnValues(converted, "받는분전화번호").map(asText);
  const addresses = columnValues(converted, "받는분주소(전체, 분할)").map(asText);
  const zipcodes = columnValues(converted, "받는분우편번호").map(asText);
  const sourceNames = columnValues(source, "수령자명").map(asText);

  const emptyNameCount = names.filter((value) => value === "").length;
  const emptyProductCount = products.filter((value) => value === "").length;
  const invalidQuantityCount = quantities.filter(
    (value) => asQuantity(value) === null,
  ).length;
  const emptyPhoneCount = phones.filter((value) => value === "").length;
  const invalidPhoneCount = phones.filter((value) => !PHONE_PATTERN.test(value))
    .length;
  const emptyAddressCount = addresses.filter((value) => value === "").length;
  const invalidZipcodeCount = zipcodes.filter(
    (value) => !ZIPCODE_PATTERN.test(value),
  ).length;
  const rulesOk =
    emptyNameCount === 0 &&
    emptyProductCount === 0 &&
    invalidQuantityCount === 0 &&
    invalidPhoneCount === 0 &&
    emptyAddressCount === 0 &&
    invalidZipcodeCount === 0;
  const countOk = source.rows.length === converted.rows.length;
  const qtyOk = sourceQtySum === convertedQtySum;

  return {
    sourceRowCount: source.rows.length,
    convertedRowCount: converted.rows.length,
    sourceQtySum,
    convertedQtySum,
    countOk,
    qtyOk,
    emptyNameCount,
    emptyProductCount,
    invalidQuantityCount,
    emptyPhoneCount,
    invalidPhoneCount,
    emptyAddressCount,
    invalidZipcodeCount,
    adjustedNameCount: sourceNames.filter((value) => value.length === 1).length,
    rulesOk,
    ok: countOk && qtyOk && rulesOk,
  };
}
