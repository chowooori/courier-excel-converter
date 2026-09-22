"use client";

import { useMemo, useState } from "react";
import { asText } from "@/lib/excel/courier";
import type { ExcelValue, TableData } from "@/lib/excel/workbook";

const PAGE_SIZES = [10, 25, 50];
const NAME_COLUMNS = ["수령자명", "받는분성명", "받는분", "이름"];

function statusTone(value: string): "paid" | "due" | "inactive" | "open" {
  if (["매칭 완료", "OK"].some((token) => value.includes(token))) return "paid";
  if (["미매칭", "Mismatch", "충돌", "오류"].some((token) => value.includes(token))) {
    return "due";
  }
  if (["없음"].some((token) => value.includes(token))) return "inactive";
  return "open";
}

function cellText(value: ExcelValue | undefined): string {
  return asText(value);
}

export function DataTable({
  table,
  columns,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  table: TableData;
  columns?: string[];
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  const headers = columns ?? table.headers;
  const indexes = headers.map((header) => table.headers.indexOf(header));
  const nameHeader = headers.find((header) => NAME_COLUMNS.includes(header));
  const nameIndex = nameHeader ? headers.indexOf(nameHeader) : -1;
  const statusHeader = headers.includes("상태") ? "상태" : undefined;
  const idHeader = headers.find(
    (header) => header.includes("번호") && header !== nameHeader,
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<string>("#");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const rows = table.rows.map((row, originalIndex) => ({ row, originalIndex }));
    const needle = query.trim().toLowerCase();
    const searched = needle
      ? rows.filter(({ row }) =>
          indexes.some((index) =>
            cellText(index === -1 ? "" : row[index]).toLowerCase().includes(needle),
          ),
        )
      : rows;

    const sorted = [...searched].sort((left, right) => {
      if (sortKey === "#") {
        return sortDir === "asc"
          ? left.originalIndex - right.originalIndex
          : right.originalIndex - left.originalIndex;
      }
      const column = headers.indexOf(sortKey);
      const source = indexes[column] ?? -1;
      const a = cellText(source === -1 ? "" : left.row[source]);
      const b = cellText(source === -1 ? "" : right.row[source]);
      return sortDir === "asc" ? a.localeCompare(b, "ko") : b.localeCompare(a, "ko");
    });
    return sorted;
  }, [headers, indexes, query, sortDir, sortKey, table.rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const allVisibleSelected =
    visible.length > 0 && visible.every(({ originalIndex }) => selected.has(originalIndex));

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function toggleAllVisible() {
    const next = new Set(selected);
    if (allVisibleSelected) {
      visible.forEach(({ originalIndex }) => next.delete(originalIndex));
    } else {
      visible.forEach(({ originalIndex }) => next.add(originalIndex));
    }
    setSelected(next);
  }

  function toggleRow(index: number) {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  }

  return (
    <section className="table-card">
      <div className="table-toolbar">
        {selected.size > 0 ? (
          <div className="selection-chip">
            <span>{selected.size} selected</span>
          </div>
        ) : (
          <label className="table-search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11.5L14 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              aria-label="표 검색"
            />
          </label>
        )}
        {actionLabel && onAction ? (
          <button
            className="primary-button"
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
          >
            + {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th className="check-col">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allVisibleSelected}
                  className={`check${allVisibleSelected ? " is-on" : ""}`}
                  onClick={toggleAllVisible}
                  aria-label="현재 페이지 모두 선택"
                />
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => toggleSort("#")}>
                  # <span>{sortKey === "#" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
              {headers.map((header) => (
                <th key={header}>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => toggleSort(header)}
                  >
                    {header}{" "}
                    <span>
                      {sortKey === header ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, originalIndex }, rowIndex) => {
              const checked = selected.has(originalIndex);
              return (
                <tr key={originalIndex} className={checked ? "is-selected" : undefined}>
                  <td className="check-col">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      className={`check${checked ? " is-on" : ""}`}
                      onClick={() => toggleRow(originalIndex)}
                      aria-label={`${originalIndex + 1}행 선택`}
                    />
                  </td>
                  <td className="index-col">{start + rowIndex + 1}</td>
                  {headers.map((header, columnIndex) => {
                    const source = indexes[columnIndex];
                    const value = cellText(source === -1 ? "" : row[source]);
                    if (columnIndex === nameIndex) {
                      const idValue = idHeader
                        ? cellText(row[table.headers.indexOf(idHeader)])
                        : String(originalIndex + 1).padStart(8, "0");
                      return (
                        <td key={header}>
                          <div className="name-cell">
                            <strong>{value || "-"}</strong>
                            <small>{idValue}</small>
                          </div>
                        </td>
                      );
                    }
                    if (header === statusHeader) {
                      return (
                        <td key={header}>
                          <span className={`status-pill ${statusTone(value)}`}>{value}</span>
                        </td>
                      );
                    }
                    return <td key={header}>{value}</td>;
                  })}
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={headers.length + 2}>
                  표시할 행이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          {filtered.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, filtered.length)} of{" "}
          {filtered.length}
        </span>
        <div className="pager">
          <label>
            Rows per page:
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="page-nav">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            <span>
              {currentPage}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={currentPage === pageCount}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? "ok" : "bad"}`}>{label}</span>;
}

export function qtyDisplay(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function timestampedName(prefix: string): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${prefix}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}
