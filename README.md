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
- 변환은 브라우저에서 하고, 검증을 통과해 다운로드할 때만 작업 로그와 변환된 행이 슈파베이스에 저장됩니다.
- 결과는 새 파일로만 다운로드합니다.
- 실제 Excel 주문 파일은 `.gitignore`로 GitHub 업로드가 차단됩니다.
- 지금은 로그인 없이 바로 변환 화면이 열립니다.
- 이름·전화·주소가 저장됩니다. 매출 장부(`sales_lines`)와는 다른 테이블을 씁니다.

## 로컬 실행

1. Node.js 20 이상을 설치합니다.
2. `.env.example`을 복사해 `.env.local`을 만들고, 매출 대시보드와 같은 슈파베이스 URL·키를 넣습니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

3. 아래를 실행합니다.

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검사

```powershell
npm test
npm run lint
npm run build
```

## 웹 배포

이 저장소는 Vercel Next.js 앱입니다. Streamlit의 `app.py`와 Google 로그인은 제거했습니다.

- Repository: `chowooori/courier-excel-converter`
- Branch: `main`
- Framework: Next.js
- 환경변수:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Vercel 프로젝트에도 위 두 값을 넣어야 배포본이 저장됩니다. 값은 매출 대시보드 슈파베이스와 같습니다.

다운로드하면 `conversion_jobs`(작업 로그)와 `conversion_rows`(변환 행)에 쌓입니다.

## 기술

- Next.js
- TypeScript
- SheetJS (`xlsx`)
- Supabase (`conversion_jobs`, `conversion_rows`)

화면은 Airbnb-inspired 밝은 테마와 Plus Jakarta Sans 글꼴을 사용합니다.
