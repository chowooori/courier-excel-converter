import { describe, expect, test } from "vitest";
import {
  convertToCourierForm,
  formatRecipientName,
  formatZipcode,
  validate,
} from "../lib/excel/courier";
import type { TableData } from "../lib/excel/workbook";

function table(headers: string[], rows: (string | number)[][]): TableData {
  return { headers, rows, sheetName: "Sheet1" };
}

describe("courier conversion", () => {
  test("pads zipcode to five digits", () => {
    expect(formatZipcode(1760)).toBe("01760");
    expect(formatZipcode("35251")).toBe("35251");
  });

  test("adds a dot to one-character recipient names", () => {
    expect(formatRecipientName("집")).toBe("집.");
    expect(formatRecipientName("홍길동")).toBe("홍길동");
  });

  test("converts order rows and matches counts", () => {
    const source = table(
      [
        "수령자명",
        "주문선택사항",
        "주문수량",
        "수령자휴대폰번호",
        "배송지주소",
        "배송지우편번호",
        "배송메세지",
      ],
      [
        ["고객A", "상품A 1kg", 1, "010-0000-0001", "테스트 주소 1", 1760, "문 앞"],
        ["고객B", "상품B 500g", 2, "010-0000-0002", "테스트 주소 2", 35251, ""],
      ],
    );
    const converted = convertToCourierForm(source);
    const report = validate(source, converted);

    expect(report.ok).toBe(true);
    expect(report.rulesOk).toBe(true);
    expect(report.sourceRowCount).toBe(2);
    expect(report.sourceQtySum).toBe(3);
    expect(converted.rows.map((row) => row[0])).toEqual(["고객A", "고객B"]);
    expect(converted.rows.map((row) => row[1])).toEqual(["상품A 1kg", "상품B 500g"]);
    expect(converted.rows.map((row) => row[2])).toEqual([1, 2]);
    expect(converted.rows[0][5]).toBe("01760");
  });

  test("blocks invalid required courier fields", () => {
    const source = table(
      [
        "수령자명",
        "주문선택사항",
        "주문수량",
        "수령자휴대폰번호",
        "배송지주소",
        "배송지우편번호",
        "배송메세지",
      ],
      [["집", "", "한개", "01012345678", "", "123456", ""]],
    );
    const converted = convertToCourierForm(source);
    const report = validate(source, converted);

    expect(converted.rows[0][0]).toBe("집.");
    expect(report.adjustedNameCount).toBe(1);
    expect(report.emptyProductCount).toBe(1);
    expect(report.invalidQuantityCount).toBe(1);
    expect(report.invalidPhoneCount).toBe(1);
    expect(report.emptyAddressCount).toBe(1);
    expect(report.invalidZipcodeCount).toBe(1);
    expect(report.rulesOk).toBe(false);
    expect(report.ok).toBe(false);
  });
});
