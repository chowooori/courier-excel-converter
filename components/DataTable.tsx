import { asText } from "@/lib/excel/courier";
import type { TableData } from "@/lib/excel/workbook";

export function DataTable({
  table,
  columns,
}: {
  table: TableData;
  columns?: string[];
}) {
  const headers = columns ?? table.headers;
  const indexes = headers.map((header) => table.headers.indexOf(header));

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {indexes.map((index, columnIndex) => (
                <td key={`${rowIndex}-${columnIndex}`}>
                  {asText(index === -1 ? "" : row[index])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
