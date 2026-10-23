import { asText, formatZipcode } from "./courier";
import type { TableData } from "./workbook";

const SITE_COLUMN = "판매사이트명";
const COUPANG = "쿠팡";

export interface PhoneUnification {
  name: string;
  rowNumbers: number[];
  phone: string;
  replaced: string[];
}

export interface SplitPaymentWarning {
  name: string;
  rowNumbers: number[];
  reason: string;
}

export interface SplitPaymentReview {
  unified: PhoneUnification[];
  needsReview: SplitPaymentWarning[];
  /** 원본 행 위치(0부터) → 맞춘 전화번호 */
  phoneOverrides: Map<number, string>;
}

interface OrderRow {
  index: number;
  phone: string;
  address: string;
  zipcode: string;
  coupang: boolean;
}

function normalizeAddress(value: unknown): string {
  return asText(value).replace(/\s+/g, " ");
}

function compactAddress(value: string): string {
  return value.replace(/[\s(),\-]/g, "");
}

function rowNumber(index: number): number {
  return index + 2;
}

function groupBy<T>(items: T[], key: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const value = key(item);
    groups.set(value, [...(groups.get(value) ?? []), item]);
  });
  return [...groups.values()];
}

/**
 * 쿠팡 분할 결제 주문을 찾아 맨 위 행의 안심번호로 맞추고,
 * 자동으로 맞추기 위험한 비슷한 경우는 확인 필요로만 알린다.
 */
export function reviewSplitPayments(source: TableData): SplitPaymentReview {
  const siteIndex = source.headers.indexOf(SITE_COLUMN);
  const nameIndex = source.headers.indexOf("수령자명");
  const phoneIndex = source.headers.indexOf("수령자휴대폰번호");
  const addressIndex = source.headers.indexOf("배송지주소");
  const zipIndex = source.headers.indexOf("배송지우편번호");
  const review: SplitPaymentReview = {
    unified: [],
    needsReview: [],
    phoneOverrides: new Map(),
  };
  if ([nameIndex, phoneIndex, addressIndex, zipIndex].includes(-1)) return review;

  const byName = new Map<string, OrderRow[]>();
  source.rows.forEach((row, index) => {
    const name = asText(row[nameIndex]);
    if (!name) return;
    byName.set(name, [
      ...(byName.get(name) ?? []),
      {
        index,
        phone: asText(row[phoneIndex]),
        address: normalizeAddress(row[addressIndex]),
        zipcode: formatZipcode(row[zipIndex]),
        coupang: siteIndex !== -1 && asText(row[siteIndex]).includes(COUPANG),
      },
    ]);
  });

  const phoneOf = (row: OrderRow) =>
    review.phoneOverrides.get(row.index) ?? row.phone;
  const phonesDiffer = (rows: OrderRow[]) =>
    new Set(rows.map(phoneOf)).size > 1;
  const warn = (name: string, rows: OrderRow[], reason: string) => {
    review.needsReview.push({
      name,
      rowNumbers: rows.map((row) => rowNumber(row.index)).sort((a, b) => a - b),
      reason,
    });
  };

  byName.forEach((rows, name) => {
    if (rows.length < 2) return;
    const addressGroups = groupBy(rows, (row) => row.address);

    addressGroups.forEach((group) => {
      const coupangRows = group.filter((row) => row.coupang);
      if (coupangRows.length > 1 && phonesDiffer(coupangRows)) {
        const [first, ...rest] = coupangRows;
        const replaced = [
          ...new Set(
            rest.map((row) => row.phone).filter((phone) => phone !== first.phone),
          ),
        ];
        rest.forEach((row) => review.phoneOverrides.set(row.index, first.phone));
        review.unified.push({
          name,
          rowNumbers: coupangRows.map((row) => rowNumber(row.index)),
          phone: first.phone,
          replaced,
        });
      }
      if (phonesDiffer(group)) warn(name, group, "쿠팡 외 주문의 전화번호가 다름");
    });

    if (addressGroups.length < 2) return;
    const flagged = new Set<OrderRow[]>();
    groupBy(addressGroups, (group) => compactAddress(group[0].address)).forEach(
      (cluster) => {
        if (cluster.length < 2 || !phonesDiffer(cluster.flat())) return;
        cluster.forEach((group) => flagged.add(group));
        warn(name, cluster.flat(), "주소 표기가 조금 다름");
      },
    );
    groupBy(
      addressGroups.filter((group) => !flagged.has(group)),
      (group) => group[0].zipcode,
    ).forEach((cluster) => {
      if (cluster.length < 2 || !cluster[0][0].zipcode) return;
      if (!phonesDiffer(cluster.flat())) return;
      warn(name, cluster.flat(), "같은 우편번호에 주소가 다름");
    });
  });

  return review;
}
