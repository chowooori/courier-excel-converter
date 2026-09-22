import {
  ExcelFormatError,
  type ExcelValue,
  type TableData,
  columnIndex,
  valueText,
} from "./workbook";
import { asText } from "./courier";

export const SHIPMENT_NAME_COLUMN = "받는분";
export const SHIPMENT_TRACKING_COLUMN = "운송장번호";
export const SALES_NAME_COLUMN = "수령자명";
export const TRACKING_COLUMN = "운송장번호";
export const TRACKING_COLUMN_POSITION = 4;

export interface TrackingMatchReport {
  shipmentRowCount: number;
  salesRowCount: number;
  resultRowCount: number;
  matchedRowCount: number;
  unmatchedRowCount: number;
  unmatchedNames: string[];
  conflictNames: string[];
  emptyShipmentNameCount: number;
  emptyTrackingCount: number;
  emptySalesNameCount: number;
  bundledNames: string[];
  bundledRowCount: number;
  originalDataOk: boolean;
  ok: boolean;
}

export interface TrackingMatchResult {
  result: TableData;
  comparison: TableData;
  report: TrackingMatchReport;
}

function uniquePreserve(values: string[]): string[] {
  return [...new Set(values)];
}

function dropColumn(table: TableData, name: string): TableData {
  const index = table.headers.indexOf(name);
  if (index === -1) return table;
  return {
    sheetName: table.sheetName,
    headers: table.headers.filter((_, column) => column !== index),
    rows: table.rows.map((row) => row.filter((_, column) => column !== index)),
  };
}

function insertColumn(
  table: TableData,
  position: number,
  name: string,
  values: ExcelValue[],
): TableData {
  const insertAt = Math.min(position, table.headers.length);
  const headers = [...table.headers];
  headers.splice(insertAt, 0, name);
  const rows = table.rows.map((row, rowIndex) => {
    const next = [...row];
    while (next.length < table.headers.length) next.push("");
    next.splice(insertAt, 0, values[rowIndex] ?? "");
    return next;
  });
  return { sheetName: table.sheetName, headers, rows };
}

function tablesEqual(left: TableData, right: TableData): boolean {
  if (left.headers.length !== right.headers.length) return false;
  if (left.headers.some((header, index) => header !== right.headers[index])) {
    return false;
  }
  if (left.rows.length !== right.rows.length) return false;
  return left.rows.every((row, rowIndex) =>
    row.every(
      (value, columnIndex) =>
        valueText(value) === valueText(right.rows[rowIndex]?.[columnIndex]),
    ),
  );
}

export function salesLedgerTextColumns(headers: string[]): Set<string> {
  return new Set(
    headers.filter(
      (header) => header.includes("번호") || header === TRACKING_COLUMN,
    ),
  );
}

export function matchTrackingNumbers(
  shipment: TableData,
  sales: TableData,
): TrackingMatchResult {
  const missingShipment = [SHIPMENT_NAME_COLUMN, SHIPMENT_TRACKING_COLUMN].filter(
    (column) => !shipment.headers.includes(column),
  );
  if (missingShipment.length) {
    throw new ExcelFormatError(
      `택배사 상세내역에 필요한 열이 없습니다: ${missingShipment.join(", ")}`,
    );
  }
  if (!sales.headers.includes(SALES_NAME_COLUMN)) {
    throw new ExcelFormatError("EMP 매출장부에 필요한 열이 없습니다: 수령자명");
  }

  const shipmentNameIndex = columnIndex(shipment, SHIPMENT_NAME_COLUMN);
  const shipmentTrackingIndex = columnIndex(shipment, SHIPMENT_TRACKING_COLUMN);
  const salesNameIndex = columnIndex(sales, SALES_NAME_COLUMN);

  const shipmentNames = shipment.rows.map((row) => asText(row[shipmentNameIndex]));
  const shipmentTracking = shipment.rows.map((row) =>
    asText(row[shipmentTrackingIndex]),
  );
  const salesNames = sales.rows.map((row) => asText(row[salesNameIndex]));

  const grouped = new Map<string, string[]>();
  shipmentNames.forEach((name, index) => {
    const tracking = shipmentTracking[index];
    if (!name || !tracking) return;
    const existing = grouped.get(name) ?? [];
    if (!existing.includes(tracking)) existing.push(tracking);
    grouped.set(name, existing);
  });

  const conflictNames = [...grouped.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([name]) => name);
  const trackingMap = new Map<string, string>();
  grouped.forEach((values, name) => {
    if (values.length === 1 && !conflictNames.includes(name)) {
      trackingMap.set(name, values[0]);
    }
  });

  const mappedTracking = salesNames.map((name) => trackingMap.get(name) ?? "");
  const matchedMask = mappedTracking.map((value) => value !== "");
  const unmatchedNames = uniquePreserve(
    salesNames.filter((name, index) => name !== "" && !matchedMask[index]),
  );

  const withoutTracking = dropColumn(sales, TRACKING_COLUMN);
  const result = insertColumn(
    withoutTracking,
    TRACKING_COLUMN_POSITION,
    TRACKING_COLUMN,
    mappedTracking,
  );

  const nameCounts = new Map<string, number>();
  salesNames.forEach((name) => {
    if (!name) return;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  });
  const bundledNames = [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  const bundledRowCount = bundledNames.reduce(
    (total, name) => total + (nameCounts.get(name) ?? 0),
    0,
  );

  const originalColumns = sales.headers.filter(
    (column) => column !== TRACKING_COLUMN,
  );
  const originalFromSource: TableData = {
    sheetName: sales.sheetName,
    headers: originalColumns,
    rows: sales.rows.map((row) =>
      originalColumns.map((column) => row[sales.headers.indexOf(column)] ?? ""),
    ),
  };
  const originalFromResult: TableData = {
    sheetName: result.sheetName,
    headers: originalColumns,
    rows: result.rows.map((row) =>
      originalColumns.map((column) => row[result.headers.indexOf(column)] ?? ""),
    ),
  };
  const originalDataOk =
    sales.rows.length === result.rows.length &&
    tablesEqual(originalFromSource, originalFromResult);

  const status = salesNames.map((name, index) => {
    if (name === "") return "수령자명 없음";
    if (conflictNames.includes(name)) return "운송장 충돌";
    if (!matchedMask[index]) return "미매칭";
    return "매칭 완료";
  });

  const matchedRowCount = matchedMask.filter(Boolean).length;
  const unmatchedRowCount = sales.rows.length - matchedRowCount;
  const emptyShipmentNameCount = shipmentNames.filter((value) => value === "")
    .length;
  const emptyTrackingCount = shipmentTracking.filter((value) => value === "")
    .length;
  const emptySalesNameCount = salesNames.filter((value) => value === "").length;
  const ok =
    sales.rows.length === result.rows.length &&
    unmatchedRowCount === 0 &&
    conflictNames.length === 0 &&
    emptyShipmentNameCount === 0 &&
    emptyTrackingCount === 0 &&
    emptySalesNameCount === 0 &&
    originalDataOk;

  return {
    result: { ...result, sheetName: "매출장부" },
    comparison: {
      sheetName: "매칭결과",
      headers: ["수령자명", "매칭 운송장번호", "상태"],
      rows: salesNames.map((name, index) => [
        name,
        mappedTracking[index],
        status[index],
      ]),
    },
    report: {
      shipmentRowCount: shipment.rows.length,
      salesRowCount: sales.rows.length,
      resultRowCount: result.rows.length,
      matchedRowCount,
      unmatchedRowCount,
      unmatchedNames,
      conflictNames,
      emptyShipmentNameCount,
      emptyTrackingCount,
      emptySalesNameCount,
      bundledNames,
      bundledRowCount,
      originalDataOk,
      ok,
    },
  };
}
