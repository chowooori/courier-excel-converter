# 출고 엑셀 변환·운송장 연결

쇼핑몰 주문부터 택배사 운송장번호가 입력된 EMP 매출장부까지 연결하는 Vercel 웹앱입니다.

## 제공 기능

### 1단계: 주문 → 택배 양식

- 쇼핑몰 주문 원본 `.xls` 또는 `.xlsx` 업로드
- 택배사 입고용 9개 열로 변환
- 원본/변환 건수와 수량 합계 검증
- 원본, 변환 결과 및 좌우 비교
- 검증 통과 후 새 `.xlsx` 다운로드

### 2단계: 운송장 → EMP 매출장부

- 택배사 파일접수 상세내역과 EMP 매출장부 업로드
- `받는분`과 `수령자명`을 기준으로 운송장번호 연결
- 합배송 주문의 여러 행에 같은 운송장번호 입력
- EMP 매출장부 E열에 `운송장번호` 추가
- 미매칭, 빈 값, 같은 이름의 서로 다른 운송장번호 충돌 검사
- 검증 통과 후 새 `.xlsx` 다운로드

## 안전 원칙

- 원본 파일을 수정하거나 덮어쓰지 않습니다.
- 업로드 파일은 브라우저 메모리에서만 처리하고 서버로 보내지 않습니다.
- 결과는 새 파일로만 다운로드합니다.
- 실제 Excel 주문 파일은 `.gitignore`로 GitHub 업로드가 차단됩니다.
- Google 로그인과 허용 이메일 목록을 통과한 사용자만 앱을 엽니다.

## 로컬 실행

1. Node.js 20 이상을 설치합니다.
2. `.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.
3. 아래를 실행합니다.

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Google 로그인 설정

Vercel 환경변수와 `.env.local`에 아래를 넣습니다.

- `AUTH_SECRET`: 임의의 긴 비밀값
- `AUTH_GOOGLE_ID`: Google OAuth 클라이언트 ID
- `AUTH_GOOGLE_SECRET`: Google OAuth 클라이언트 비밀값
- `ALLOWED_EMAILS`: 허용할 이메일. 여러 개는 쉼표로 구분. 비어 있으면 `min4639@gmail.com`만 허용합니다.

Google Cloud Console의 승인된 리디렉션 URI에는 아래를 등록합니다.

- 로컬: `http://localhost:3000/api/auth/callback/google`
- Vercel: `https://<배포주소>/api/auth/callback/google`

## 검사

```powershell
npm test
npm run lint
npm run build
```

## 웹 배포

이 저장소는 Vercel Next.js 앱입니다. Streamlit의 `app.py`는 제거했습니다.

- Repository: `chowooori/courier-excel-converter`
- Branch: `main`
- Framework: Next.js
- 접근 범위: Google 로그인 + `ALLOWED_EMAILS`

Vercel 프로젝트에 GitHub `main` 브랜치를 연결한 뒤, 위의 환경변수를 Production에 저장하고 다시 배포합니다.

## 기술

- Next.js
- TypeScript
- Auth.js (Google)
- SheetJS (`xlsx`)

화면은 Airbnb-inspired 밝은 테마와 Plus Jakarta Sans 글꼴을 사용합니다.
