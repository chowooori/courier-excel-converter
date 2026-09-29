import { ConverterApp } from "@/components/ConverterApp";

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">출고 관리</p>
          <h1>출고 엑셀 변환·운송장 연결</h1>
          <p className="muted">
            원본 파일은 수정하거나 덮어쓰지 않습니다. 검증을 통과해 다운로드하면
            엑셀은 이 컴퓨터에만 저장되고, 슈파베이스에는 건수 같은 작업 로그만
            남습니다.
          </p>
        </div>
      </header>
      <div className="workspace">
        <ConverterApp />
      </div>
    </div>
  );
}
