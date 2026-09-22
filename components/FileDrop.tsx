"use client";

import { useId, useState } from "react";

export function FileDrop({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const [over, setOver] = useState(false);

  return (
    <label
      className={`dropzone${over ? " over" : ""}`}
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const next = event.dataTransfer.files[0];
        if (next) onFile(next);
      }}
    >
      <strong>{label}</strong>
      <p className="muted">드래그 앤 드롭 또는 파일 선택을 사용할 수 있습니다. .xlsx, .xls</p>
      <span className="file-button">엑셀 선택</span>
      <input
        id={inputId}
        type="file"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next) onFile(next);
        }}
      />
      <p className="file-name">{file ? file.name : "아직 선택한 파일이 없습니다."}</p>
    </label>
  );
}
