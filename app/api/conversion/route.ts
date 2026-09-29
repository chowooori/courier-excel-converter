import { NextResponse } from "next/server";
import {
  insertConversionJob,
  type ConversionStep,
  type SaveConversionInput,
} from "@/lib/supabase/saveConversion";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "서버 비밀 키(SUPABASE_SECRET_KEY)가 없습니다." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as SaveConversionInput;
  const step = body.step === "tracking" ? "tracking" : "courier";
  const input: SaveConversionInput = {
    step: step as ConversionStep,
    sourceFile: body.sourceFile,
    extraFile: body.extraFile,
    resultFile: String(body.resultFile || ""),
    rowCount: Number(body.rowCount) || 0,
    qtySum: body.qtySum,
    matchedCount: body.matchedCount,
    status: String(body.status || "ok"),
    message: String(body.message || ""),
  };
  const saved = await insertConversionJob(supabase, input);
  return NextResponse.json(saved, { status: saved.ok ? 200 : 500 });
}
