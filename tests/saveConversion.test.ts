import { describe, expect, test } from "vitest";
import { tableToConversionRows } from "../lib/supabase/saveConversion";
import type { TableData } from "../lib/excel/workbook";

function table(headers: string[], rows: (string | number)[][]): TableData {
  return { headers, rows, sheetName: "Sheet1" };
}

describe("tableToConversionRows", () => {
  test("maps courier columns into searchable fields and keeps the full row", () => {
    const converted = table(
      [
        "받는분성명",
        "내품명",
        "내품수량",
        "받는분전화번호",
        "받는분주소(전체, 분할)",
        "받는분우편번호",
        "배송메세지1",
        "발송업체명",
        "업체요청 메시지",
      ],
      [["고객A", "육회 1kg", 1, "010-0000-0001", "서울시 테스트", "01760", "문 앞", "", ""]],
    );

    expect(tableToConversionRows(converted)).toEqual([
      {
        row_no: 1,
        recipient_name: "고객A",
        tracking_number: null,
        phone: "010-0000-0001",
        address: "서울시 테스트",
        zipcode: "01760",
        product_name: "육회 1kg",
        quantity: "1",
        payload: {
          받는분성명: "고객A",
          내품명: "육회 1kg",
          내품수량: "1",
          받는분전화번호: "010-0000-0001",
          "받는분주소(전체, 분할)": "서울시 테스트",
          받는분우편번호: "01760",
          배송메세지1: "문 앞",
          발송업체명: "",
          "업체요청 메시지": "",
        },
      },
    ]);
  });

  test("maps tracking ledger columns including 운송장번호", () => {
    const result = table(
      ["수령자명", "상품명", "운송장번호"],
      [["고객B", "상품B", "1234567890"]],
    );

    expect(tableToConversionRows(result)[0]).toMatchObject({
      row_no: 1,
      recipient_name: "고객B",
      tracking_number: "1234567890",
      product_name: "상품B",
      payload: {
        수령자명: "고객B",
        상품명: "상품B",
        운송장번호: "1234567890",
      },
    });
  });
});
