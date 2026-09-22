import { asText } from "@/lib/excel/courier";
import type { TableData } from "@/lib/excel/workbook";
import { getSupabaseBrowserClient } from "./client";

const BATCH_SIZE = 200;

export type ConversionStep = "courier" | "tracking";

export interface ConversionRowRecord {
  row_no: number;
  recipient_name: string | null;
  tracking_number: string | null;
  phone: string | null;
  address: string | null;
  zipcode: string | null;
  product_name: string | null;
  quantity: string | null;
  payload: Record<string, string>;
}

export interface SaveConversionInput {
  step: ConversionStep;
  sourceFile?: string;
  extraFile?: string;
  resultFile: string;
  rowCount: number;
  qtySum?: string;
  matchedCount?: number;
  status: string;
  message: string;
  rows: ConversionRowRecord[];
}

export interface SaveConversionResult {
  ok: boolean;
  jobId?: number;
  error?: string;
}

function pick(
  payload: Record<string, string>,
  names: string[],
): string | null {
  for (const name of names) {
    const value = payload[name];
    if (value) return value;
  }
  return null;
}

export function tableToConversionRows(table: TableData): ConversionRowRecord[] {
  return table.rows.map((row, index) => {
    const payload: Record<string, string> = {};
    table.headers.forEach((header, column) => {
      payload[header] = asText(row[column]);
    });
    return {
      row_no: index + 1,
      recipient_name: pick(payload, ["받는분성명", "수령자명", "받는분"]),
      tracking_number: pick(payload, ["운송장번호", "매칭 운송장번호"]),
      phone: pick(payload, ["받는분전화번호", "수령자휴대폰번호"]),
      address: pick(payload, ["받는분주소(전체, 분할)", "배송지주소"]),
      zipcode: pick(payload, ["받는분우편번호", "배송지우편번호"]),
      product_name: pick(payload, ["내품명", "주문선택사항", "상품명"]),
      quantity: pick(payload, ["내품수량", "주문수량"]),
      payload,
    };
  });
}

export async function saveConversionJob(
  input: SaveConversionInput,
): Promise<SaveConversionResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return {
      ok: false,
      error: "슈파베이스 환경변수가 없습니다.",
    };
  }

  const { data: job, error: jobError } = await supabase
    .from("conversion_jobs")
    .insert({
      step: input.step,
      source_file: input.sourceFile ?? null,
      extra_file: input.extraFile ?? null,
      result_file: input.resultFile,
      row_count: input.rowCount,
      qty_sum: input.qtySum ?? null,
      matched_count: input.matchedCount ?? null,
      status: input.status,
      message: input.message,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return {
      ok: false,
      error: jobError?.message ?? "작업 로그를 저장하지 못했습니다.",
    };
  }

  const jobId = job.id as number;
  for (let start = 0; start < input.rows.length; start += BATCH_SIZE) {
    const chunk = input.rows.slice(start, start + BATCH_SIZE).map((row) => ({
      ...row,
      job_id: jobId,
    }));
    const { error: rowError } = await supabase
      .from("conversion_rows")
      .insert(chunk);
    if (rowError) {
      return {
        ok: false,
        jobId,
        error: rowError.message,
      };
    }
  }

  return { ok: true, jobId };
}
