import { describe, expect, test } from "vitest";
import { convertToCourierForm, validate } from "../lib/excel/courier";
import { reviewSplitPayments } from "../lib/excel/splitPayment";
import type { TableData } from "../lib/excel/workbook";

const HEADERS = [
  "판매사이트명",
  "수령자명",
  "주문선택사항",
  "주문수량",
  "수령자휴대폰번호",
  "배송지주소",
  "배송지우편번호",
  "배송메세지",
];

function orders(rows: [string, string, string, string, string][]): TableData {
  return {
    headers: HEADERS,
    sheetName: "Sheet1",
    rows: rows.map(([site, name, phone, address, zip]) => [
      site,
      name,
      "상품A 2kg",
      1,
      phone,
      address,
      zip,
      "문 앞",
    ]),
  };
}

function phones(table: TableData): string[] {
  const index = table.headers.indexOf("받는분전화번호");
  return table.rows.map((row) => String(row[index]));
}

describe("coupang split payment", () => {
  test("unifies coupang split payments to the first row's safe number", () => {
    const source = orders([
      ["스마트스토어", "고객Z", "010-0000-0009", "다른 주소 9", "11111"],
      ["쿠팡(신)", "고객A", "0504-1111-0001", "테스트시 테스트로 1 101호", "24204"],
      ["쿠팡(신)", "고객A", "0504-2222-0002", "테스트시 테스트로 1 101호", "24204"],
    ]);

    const review = reviewSplitPayments(source);
    expect(review.unified).toEqual([
      {
        name: "고객A",
        rowNumbers: [3, 4],
        phone: "0504-1111-0001",
        replaced: ["0504-2222-0002"],
      },
    ]);
    expect(review.needsReview).toEqual([]);

    const converted = convertToCourierForm(source);
    expect(phones(converted)).toEqual([
      "010-0000-0009",
      "0504-1111-0001",
      "0504-1111-0001",
    ]);
    expect(validate(source, converted).ok).toBe(true);
  });

  test("unifies three or more orders and ignores spacing differences", () => {
    const source = orders([
      ["쿠팡", "고객A", "0502-1111-0001", "테스트시  테스트로 1", "24204"],
      ["쿠팡(신)", "고객A", "0502-2222-0002", "테스트시 테스트로 1 ", "24204"],
      ["쿠팡(로켓)", "고객A", "0502-3333-0003", " 테스트시 테스트로 1", "24204"],
    ]);

    expect(reviewSplitPayments(source).unified[0]).toMatchObject({
      rowNumbers: [2, 3, 4],
      phone: "0502-1111-0001",
      replaced: ["0502-2222-0002", "0502-3333-0003"],
    });
    expect(new Set(phones(convertToCourierForm(source)))).toEqual(
      new Set(["0502-1111-0001"]),
    );
  });

  test("leaves rows alone when phones already match or addresses differ", () => {
    const source = orders([
      ["쿠팡(신)", "고객A", "0504-1111-0001", "테스트시 테스트로 1", "24204"],
      ["쿠팡(신)", "고객A", "0504-1111-0001", "테스트시 테스트로 1", "24204"],
      ["쿠팡(신)", "고객B", "0504-3333-0003", "가나시 가나로 1", "11111"],
      ["옥션", "고객B", "010-0000-0004", "다라시 다라로 2", "22222"],
    ]);

    const review = reviewSplitPayments(source);
    expect(review.unified).toEqual([]);
    expect(review.needsReview).toEqual([]);
    expect(phones(convertToCourierForm(source))).toEqual(
      source.rows.map((row) => String(row[4])),
    );
  });

  test("flags non-coupang orders with the same name and address but does not change them", () => {
    const source = orders([
      ["스마트스토어", "고객A", "010-0000-0001", "테스트시 테스트로 1", "24204"],
      ["스마트스토어", "고객A", "010-0000-0002", "테스트시 테스트로 1", "24204"],
    ]);

    const review = reviewSplitPayments(source);
    expect(review.unified).toEqual([]);
    expect(review.needsReview).toEqual([
      { name: "고객A", rowNumbers: [2, 3], reason: "쿠팡 외 주문의 전화번호가 다름" },
    ]);
    expect(phones(convertToCourierForm(source))).toEqual([
      "010-0000-0001",
      "010-0000-0002",
    ]);
  });

  test("flags coupang orders whose address differs only in punctuation or spacing inside", () => {
    const source = orders([
      ["쿠팡(신)", "고객A", "0504-1111-0001", "테스트시 테스트로 1 (테스트동)", "24204"],
      ["쿠팡(신)", "고객A", "0504-2222-0002", "테스트시 테스트로1(테스트동)", "24204"],
    ]);

    const review = reviewSplitPayments(source);
    expect(review.unified).toEqual([]);
    expect(review.needsReview).toEqual([
      { name: "고객A", rowNumbers: [2, 3], reason: "주소 표기가 조금 다름" },
    ]);
  });

  test("flags same name in the same zipcode with different phones", () => {
    const source = orders([
      ["쿠팡(신)", "고객A", "0504-1111-0001", "테스트시 테스트로 1 101호", "24204"],
      ["쿠팡(신)", "고객A", "0504-2222-0002", "테스트시 테스트로 1 102호", "24204"],
    ]);

    expect(reviewSplitPayments(source).needsReview).toEqual([
      { name: "고객A", rowNumbers: [2, 3], reason: "같은 우편번호에 주소가 다름" },
    ]);
  });

  test("works without a site column by only flagging", () => {
    const source = orders([
      ["", "고객A", "0504-1111-0001", "테스트시 테스트로 1", "24204"],
      ["", "고객A", "0504-2222-0002", "테스트시 테스트로 1", "24204"],
    ]);
    const withoutSite: TableData = {
      ...source,
      headers: source.headers.slice(1),
      rows: source.rows.map((row) => row.slice(1)),
    };

    const review = reviewSplitPayments(withoutSite);
    expect(review.unified).toEqual([]);
    expect(review.needsReview).toHaveLength(1);
  });
});
