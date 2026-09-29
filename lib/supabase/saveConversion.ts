import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversionStep = "courier" | "tracking";

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
}

export interface SaveConversionResult {
  ok: boolean;
  jobId?: number;
  error?: string;
}

export async function insertConversionJob(
  supabase: SupabaseClient,
  input: SaveConversionInput,
): Promise<SaveConversionResult> {
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

  return { ok: true, jobId: job.id as number };
}

export async function saveConversionJob(
  input: SaveConversionInput,
): Promise<SaveConversionResult> {
  const response = await fetch("/api/conversion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json()) as SaveConversionResult;
  if (!response.ok || !body.ok) {
    return { ok: false, error: body.error || "저장에 실패했습니다." };
  }
  return body;
}
