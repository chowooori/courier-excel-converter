"use client";

import { useState } from "react";
import {
  COMPARE_PAIRS,
  COURIER_TEXT_COLUMNS,
  convertToCourierForm,
  validate,
  type ValidationReport,
} from "@/lib/excel/courier";
import {
  downloadBlob,
  ExcelFormatError,
  readExcelFile,
  tableToXlsxBlob,
  type TableData,
} from "@/lib/excel/workbook";
import { Badge, DataTable, Metric, qtyDisplay, timestampedName } from "./DataTable";
import { FileDrop } from "./FileDrop";

export function CourierStep() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<TableData | null>(null);
  const [converted, setConverted] = useState<TableData | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"source" | "converted" | "compare">("source");

  async function handleFile(next: File) {
    setFile(next);
    try {
      const table = await readExcelFile(next);
      const convertedTable = convertToCourierForm(table);
      setSource(table);
      setConverted(convertedTable);
      setReport(validate(table, convertedTable));
      setError("");
    } catch (caught) {
      setSource(null);
      setConverted(null);
      setReport(null);
      setError(
        caught instanceof ExcelFormatError
          ? caught.message
          : "엑셀 파일을 읽지 못했습니다.",
      );
    }
  }

  const ruleIssues: string[] = [];
  if (report?.emptyNameCount) {
    ruleIssues.push(`받는분성명 빈 값 ${report.emptyNameCount}건`);
  }
  if (report?.emptyProductCount) {
    ruleIssues.push(`내품명 빈 값 ${report.emptyProductCount}건`);
  }
  if (report?.invalidQuantityCount) {
    ruleIssues.push(`내품수량 숫자 형식 오류 ${report.invalidQuantityCount}건`);
  }
  if (report?.invalidPhoneCount) {
    ruleIssues.push(`전화번호 형식 오류 ${report.invalidPhoneCount}건`);
  }
  if (report?.emptyAddressCount) {
    ruleIssues.push(`받는분주소 빈 값 ${report.emptyAddressCount}건`);
  }
  if (report?.invalidZipcodeCount) {
    ruleIssues.push(`우편번호 5자리 형식 오류 ${report.invalidZipcodeCount}건`);
  }

  return (
    <section>
      <h2>1단계: 주문 → 택배 양식</h2>
      <div className="rules">
        <strong>택배사 필수 입력 규칙</strong>
        <ul>
          <li>A 받는분성명: 2글자 이상 (1글자는 자동으로 점 `.` 추가)</li>
          <li>B 내품명: 주문선택사항을 정확히 기재</li>
          <li>C 내품수량: 숫자 형식</li>
          <li>D 받는분전화번호: 하이픈이 포함된 연락처 또는 안심번호</li>
          <li>E 받는분주소(전체, 분할): 전체 도로명/지번 주소</li>
          <li>F 받는분우편번호: 5자리 우편번호</li>
        </ul>
      </div>
      <FileDrop
        label="쇼핑몰 주문 원본 엑셀을 올려 주세요"
        file={file}
        onFile={handleFile}
      />
      {error ? <p className="alert error">{error}</p> : null}

      {source && converted && report ? (
        <>
          <h2>검증 결과</h2>
          <div className="metrics">
            <Metric label="원본 건수" value={report.sourceRowCount} />
            <Metric label="변환 건수" value={report.convertedRowCount} />
            <Metric label="원본 수량 합계" value={qtyDisplay(report.sourceQtySum)} />
            <Metric label="변환 수량 합계" value={qtyDisplay(report.convertedQtySum)} />
          </div>
          <div className="badges">
            <Badge ok={report.countOk} label={`건수 ${report.countOk ? "OK" : "Mismatch"}`} />
            <Badge ok={report.qtyOk} label={`수량 ${report.qtyOk ? "OK" : "Mismatch"}`} />
            <Badge
              ok={report.rulesOk}
              label={`필수 규칙 ${report.rulesOk ? "OK" : "Mismatch"}`}
            />
          </div>
          {report.adjustedNameCount ? (
            <p className="alert info">
              1글자 성명 {report.adjustedNameCount}건에 점(.)을 자동으로 추가했습니다.
            </p>
          ) : null}
          {ruleIssues.length ? (
            <div className="alert error">
              필수 입력 오류
              <ul>
                {ruleIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "source"}
              onClick={() => setTab("source")}
            >
              원본 데이터
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "converted"}
              onClick={() => setTab("converted")}
            >
              변환된 택배 양식
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "compare"}
              onClick={() => setTab("compare")}
            >
              좌우 비교
            </button>
          </div>
          {tab === "source" ? <DataTable table={source} /> : null}
          {tab === "converted" ? (
            <DataTable
              table={converted}
              actionLabel="택배 양식 엑셀 다운로드"
              actionDisabled={!report.ok}
              onAction={() =>
                downloadBlob(
                  tableToXlsxBlob(converted, "Sheet1", COURIER_TEXT_COLUMNS),
                  timestampedName("택배양식"),
                )
              }
            />
          ) : null}
          {tab === "compare" ? (
            <div className="compare">
              <div>
                <h3>원본</h3>
                <DataTable
                  table={source}
                  columns={COMPARE_PAIRS.map((pair) => pair[0])}
                />
              </div>
              <div>
                <h3>변환</h3>
                <DataTable
                  table={converted}
                  columns={COMPARE_PAIRS.map((pair) => pair[1])}
                />
              </div>
            </div>
          ) : null}
          {!report.ok ? (
            <p className="alert error">
              건수·수량 또는 택배사 필수 입력 규칙이 맞지 않아 다운로드할 수 없습니다.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
