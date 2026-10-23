<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 프로젝트 규칙: 출고 엑셀 변환·운송장 연결

쇼핑몰 주문 엑셀을 택배 양식으로 바꾸고(1단계), 택배사 운송장번호를 EMP 매출장부에 연결하는(2단계) Next.js 웹앱이다. Vercel에 배포한다. 사용자는 비전공자 관리자이므로 화면 문구와 설명은 한국어로 쓴다.

## 구조

- `lib/excel/courier.ts`: 1단계 변환과 검증
- `lib/excel/tracking.ts`: 2단계 운송장 매칭과 검증
- `lib/excel/workbook.ts`: SheetJS 읽기/쓰기, 다운로드
- `lib/supabase/`, `app/api/conversion/route.ts`: 작업 로그 저장 (서버 비밀 키 사용)
- `components/`: 화면 (클라이언트 컴포넌트)
- `tests/`: Vitest 테스트

## 반드시 지킬 것

- 원본 파일을 수정하거나 덮어쓰지 않는다. 변환은 브라우저 메모리에서 하고 결과는 새 `.xlsx`로만 내려받는다.
- 이름·전화번호·주소 같은 개인정보는 슈파베이스나 다른 서버로 보내지 않는다. 슈파베이스 `conversion_jobs`에는 단계, 파일명, 건수, 수량 합계만 저장한다.
- 검증(건수, 수량 합계, 필수 규칙, 미매칭·충돌·빈 값)을 통과하지 못하면 다운로드를 막는다. 검증을 느슨하게 바꾸지 않는다.
- 실제 주문 엑셀(`*.xls`, `*.xlsx`, `*.csv`)과 `.env*.local`은 커밋하지 않는다. 테스트 데이터는 코드 안에서 만든다.
- `SUPABASE_SECRET_KEY`는 서버 코드에서만 쓴다. `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

## 작업을 끝내기 전에

아래 세 명령이 모두 통과해야 한다.

```
npm test
npm run lint
npm run build
```

변환·매칭 로직을 바꾸면 `tests/`에 테스트를 추가한다.
