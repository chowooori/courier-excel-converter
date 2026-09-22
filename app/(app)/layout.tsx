import { auth, signOut } from "@/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">출고 관리</p>
          <h1>출고 엑셀 변환·운송장 연결</h1>
          <p className="muted">
            원본 파일은 수정하거나 덮어쓰지 않습니다. 검증을 통과한 결과만 새
            파일로 다운로드합니다. 업로드한 엑셀은 브라우저에서만 처리되며
            서버로 전송되지 않습니다.
          </p>
        </div>
        {session?.user ? (
          <div className="user-meta">
            <span>{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="ghost-button" type="submit">
                로그아웃
              </button>
            </form>
          </div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
