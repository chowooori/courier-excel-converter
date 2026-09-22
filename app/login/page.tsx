import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">허용된 관리자만 사용</p>
        <h1>Google 계정으로 로그인</h1>
        <p className="muted">
          미리 등록된 이메일만 앱을 열 수 있습니다. 엑셀 파일은 로그인 이후
          브라우저에서만 처리됩니다.
        </p>
        {error === "AccessDenied" ? (
          <p className="alert error">허용 목록에 없는 Google 계정입니다.</p>
        ) : null}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="primary-button" type="submit">
            Google로 계속하기
          </button>
        </form>
      </section>
    </main>
  );
}
