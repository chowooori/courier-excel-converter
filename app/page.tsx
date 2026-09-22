import { ConverterApp } from "@/components/ConverterApp";

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">출고 관리</p>
          <h1>출고 엑셀 변환·운송장 연결</h1>
          <p className="muted">
            원본 파일은 수정하거나 덮어쓰지 않습니다. 검증을 통과해 다운로드할
            때만 변환 결과와 작업 로그가 매출 대시보드와 같은 슈파베이스에
            저장됩니다.
          </p>
        </div>
      </header>
      <div className="workspace">
        <ConverterApp />
      </div>
    </div>
  );
}
