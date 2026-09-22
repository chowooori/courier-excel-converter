"use client";

import { useState } from "react";
import {
  matchTrackingNumbers,
  salesLedgerTextColumns,
  type TrackingMatchReport,
} from "@/lib/excel/tracking";
import {
  downloadBlob,
  ExcelFormatError,
  readExcelFile,
  tableToXlsxBlob,
  type TableData,
} from "@/lib/excel/workbook";
import {
  saveConversionJob,
  tableToConversionRows,
} from "@/lib/supabase/saveConversion";
import { Badge, DataTable, Metric, timestampedName } from "./DataTable";
import { FileDrop } from "./FileDrop";

export function TrackingStep() {
  const [shipmentFile, setShipmentFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [shipment, setShipment] = useState<TableData | null>(null);
  const [sales, setSales] = useState<TableData | null>(null);
  const [result, setResult] = useState<TableData | null>(null);
  const [comparison, setComparison] = useState<TableData | null>(null);
  const [report, setReport] = useState<TrackingMatchReport | null>(null);
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"match" | "shipment" | "sales" | "result">(
    "match",
  );

  async function loadFiles(nextShipment: File | null, nextSales: File | null) {
    setShipmentFile(nextShipment);
    setSalesFile(nextSales);
    if (!nextShipment || !nextSales) {
      setShipment(null);
      setSales(null);
      setResult(null);
      setComparison(null);
      setReport(null);
      setError("");
      setSaveNote("");
      return;
    }

    try {
      const [shipmentTable, salesTable] = await Promise.all([
        readExcelFile(nextShipment),
        readExcelFile(nextSales),
      ]);
      const matched = matchTrackingNumbers(shipmentTable, salesTable);
      setShipment(shipmentTable);
      setSales(salesTable);
      setResult(matched.result);
      setComparison(matched.comparison);
      setReport(matched.report);
      setError("");
      setSaveNote("");
    } catch (caught) {
      setShipment(null);
      setSales(null);
      setResult(null);
      setComparison(null);
      setReport(null);
      setSaveNote("");
      setError(
        caught instanceof ExcelFormatError
          ? caught.message
          : "엑셀 파일을 읽지 못했습니다.",
      );
    }
  }

  async function handleDownload() {
    if (!result || !report?.ok || saving) return;
    const filename = timestampedName("EMP_매출장부_운송장완료");
    setSaving(true);
    setSaveNote("");
    try {
      const saved = await saveConversionJob({
        step: "tracking",
        sourceFile: shipmentFile?.name,
        extraFile: salesFile?.name,
        resultFile: filename,
        rowCount: result.rows.length,
        matchedCount: report.matchedRowCount,
        status: "ok",
        message: `운송장 연결 ${report.matchedRowCount}건 저장`,
        rows: tableToConversionRows(result),
      });
      downloadBlob(
        tableToXlsxBlob(
          result,
          "매출장부",
          salesLedgerTextColumns(result.headers),
          { freezeHeader: true, autoFilter: true },
        ),
        filename,
      );
      setSaveNote(
        saved.ok
          ? "엑셀을 받았고 슈파베이스에도 저장했습니다."
          : `엑셀은 받았지만 저장은 실패했습니다: ${saved.error}`,
      );
    } catch (caught) {
      downloadBlob(
        tableToXlsxBlob(
          result,
          "매출장부",
          salesLedgerTextColumns(result.headers),
          { freezeHeader: true, autoFilter: true },
        ),
        filename,
      );
      setSaveNote(
        `엑셀은 받았지만 저장은 실패했습니다: ${
          caught instanceof Error ? caught.message : "알 수 없는 오류"
        }`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2>2단계: 운송장 → EMP 매출장부</h2>
      <p className="muted">
        택배사 상세내역의 받는분과 운송장번호를 EMP 매출장부 수령자명에 연결합니다.
      </p>
      <div className="grid-2">
        <FileDrop
          label="① 택배사 파일접수 상세내역"
          file={shipmentFile}
          onFile={(file) => loadFiles(file, salesFile)}
        />
        <FileDrop
          label="② 원본 EMP 매출장부"
          file={salesFile}
          onFile={(file) => loadFiles(shipmentFile, file)}
        />
      </div>
      {error ? <p className="alert error">{error}</p> : null}

      {shipment && sales && result && comparison && report ? (
        <>
          <h2>매칭 검증</h2>
          <div className="metrics">
            <Metric label="매출장부 전체 행" value={report.salesRowCount} />
            <Metric label="운송장 매칭 행" value={report.matchedRowCount} />
            <Metric
              label="합배송"
              value={`${report.bundledNames.length}명 / ${report.bundledRowCount}행`}
            />
            <Metric label="미매칭 행" value={report.unmatchedRowCount} />
          </div>
          <div className="badges">
            <Badge
              ok={report.ok}
              label={report.ok ? "검증 OK" : "검증 Mismatch"}
            />
          </div>
          {report.ok ? (
            <p className="alert success">
              검증 OK — 모든 행이 매칭됐고 기존 데이터와 행 순서가 유지됐습니다.
            </p>
          ) : (
            <p className="alert error">
              검증 Mismatch — 아래 오류를 확인해 주세요. 다운로드할 수 없습니다.
            </p>
          )}
          {report.unmatchedNames.length ? (
            <p className="alert info">
              택배사 파일에 없는 수령자: {report.unmatchedNames.join(", ")}
            </p>
          ) : null}
          {report.conflictNames.length ? (
            <p className="alert error">
              같은 이름에 서로 다른 운송장번호가 있습니다:{" "}
              {report.conflictNames.join(", ")}
            </p>
          ) : null}
          {report.emptyShipmentNameCount ||
          report.emptyTrackingCount ||
          report.emptySalesNameCount ? (
            <p className="alert info">
              빈 값 — 택배사 수령자 {report.emptyShipmentNameCount}건, 운송장번호{" "}
              {report.emptyTrackingCount}건, 매출장부 수령자{" "}
              {report.emptySalesNameCount}건
            </p>
          ) : null}

          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "match"}
              onClick={() => setTab("match")}
            >
              매칭 결과
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "shipment"}
              onClick={() => setTab("shipment")}
            >
              택배사 상세내역
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "sales"}
              onClick={() => setTab("sales")}
            >
              원본 매출장부
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "result"}
              onClick={() => setTab("result")}
            >
              완성 매출장부
            </button>
          </div>
          {tab === "match" ? <DataTable table={comparison} /> : null}
          {tab === "shipment" ? <DataTable table={shipment} /> : null}
          {tab === "sales" ? <DataTable table={sales} /> : null}
          {tab === "result" ? (
            <DataTable
              table={result}
              actionLabel="운송장번호가 입력된 매출장부 다운로드"
              actionDisabled={!report.ok}
              actionBusy={saving}
              onAction={handleDownload}
            />
          ) : null}
          {saveNote ? (
            <p className={`alert ${saveNote.includes("실패") ? "error" : "success"}`}>
              {saveNote}
            </p>
          ) : null}
          {!report.ok ? (
            <p className="alert error">
              미매칭·충돌·빈 값이 해결되기 전에는 다운로드할 수 없습니다.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
