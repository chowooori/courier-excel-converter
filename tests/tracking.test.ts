import { describe, expect, test } from "vitest";
import * as XLSX from "xlsx";
import { matchTrackingNumbers, salesLedgerTextColumns } from "../lib/excel/tracking";
import { tableToXlsxBlob, type TableData } from "../lib/excel/workbook";

function table(headers: string[], rows: (string | number)[][]): TableData {
  return { headers, rows, sheetName: "Sheet1" };
}

describe("tracking matcher", () => {
  test("matches bundled sales rows with one tracking number", () => {
    const shipment = table(
      ["받는분", "운송장번호"],
      [
        ["고객A", "1000-0001"],
        ["고객B", "1000-0002"],
        ["고객C", "1000-0003"],
      ],
    );
    const sales = table(
      ["주문고유번호", "판매사이트명", "결제일", "판매사이트 주문번호", "수령자명"],
      [
        [1, "쇼핑몰", "2026-09-16", 11, "고객A"],
        [2, "쇼핑몰", "2026-09-16", 12, "고객A"],
        [3, "쇼핑몰", "2026-09-16", 21, "고객B"],
        [4, "쇼핑몰", "2026-09-16", 22, "고객B"],
        [5, "쇼핑몰", "2026-09-16", 23, "고객B"],
        [6, "쇼핑몰", "2026-09-16", 31, "고객C"],
      ],
    );
    const original = structuredClone(sales);
    const { result, comparison, report } = matchTrackingNumbers(shipment, sales);

    expect(report.ok).toBe(true);
    expect(report.shipmentRowCount).toBe(3);
    expect(report.salesRowCount).toBe(6);
    expect(report.matchedRowCount).toBe(6);
    expect(new Set(report.bundledNames)).toEqual(new Set(["고객A", "고객B"]));
    expect(report.bundledRowCount).toBe(5);
    expect(result.headers[4]).toBe("운송장번호");
    expect(new Set(comparison.rows.map((row) => row[2]))).toEqual(
      new Set(["매칭 완료"]),
    );
    expect(sales).toEqual(original);
    expect(
      result.rows.filter((row) => row[5] === "고객A").map((row) => row[4]),
    ).toEqual(["1000-0001", "1000-0001"]);
    expect(
      result.rows.filter((row) => row[5] === "고객B").map((row) => row[4]),
    ).toEqual(["1000-0002", "1000-0002", "1000-0002"]);
  });

  test("blocks conflicting tracking numbers", () => {
    const shipment = table(
      ["받는분", "운송장번호"],
      [
        ["동명이인", "1111"],
        ["동명이인", "2222"],
      ],
    );
    const sales = table(["수령자명"], [["동명이인"]]);
    const { comparison, report } = matchTrackingNumbers(shipment, sales);

    expect(report.ok).toBe(false);
    expect(report.conflictNames).toEqual(["동명이인"]);
    expect(comparison.rows[0][2]).toBe("운송장 충돌");
  });

  test("blocks unmatched recipients", () => {
    const shipment = table(["받는분", "운송장번호"], [["홍길동", "1111"]]);
    const sales = table(["수령자명"], [["홍길동"], ["없는사람"]]);
    const { report } = matchTrackingNumbers(shipment, sales);

    expect(report.ok).toBe(false);
    expect(report.matchedRowCount).toBe(1);
    expect(report.unmatchedNames).toEqual(["없는사람"]);
  });

  test("keeps tracking in column E and long order numbers as text", async () => {
    const result = table(
      [
        "주문고유번호",
        "판매사이트명",
        "결제일",
        "판매사이트 주문번호",
        "운송장번호",
        "수령자명",
      ],
      [[102012723275, "테스트", "2026-09-16", "2026091651299791", "1000-0001", "고객A"]],
    );
    const blob = tableToXlsxBlob(
      result,
      "매출장부",
      salesLedgerTextColumns(result.headers),
    );
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array", raw: false });
    const loaded = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets["매출장부"],
      { header: 1, raw: false },
    );

    expect(loaded[0][4]).toBe("운송장번호");
    expect(String(loaded[1][3])).toBe("2026091651299791");
    expect(String(loaded[1][4])).toBe("1000-0001");
  });
});
