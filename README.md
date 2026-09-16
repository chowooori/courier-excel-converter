# 출고 엑셀 변환·운송장 연결

쇼핑몰 주문부터 택배사 운송장번호가 입력된 EMP 매출장부까지 연결하는 로컬 Streamlit 앱입니다.

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
- 업로드 파일은 메모리에서만 처리합니다.
- 결과는 새 파일로만 다운로드합니다.
- 실제 Excel 주문 파일은 `.gitignore`로 GitHub 업로드가 차단됩니다.

## Windows에서 실행

1. Python 3.11 이상을 설치합니다.
2. `웹앱실행.bat`를 더블클릭합니다.
3. 브라우저에서 앱이 열리면 원하는 작업 단계를 선택합니다.

직접 실행하려면:

```powershell
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

## 검사

```powershell
python -m pytest -q
```

## 웹 배포

비공개 Streamlit Community Cloud 앱:

- App: https://courier-excel-converter.streamlit.app/
- Repository: `chowooori/courier-excel-converter`
- Branch / Main file: `main` / `app.py`
- 접근 범위: Private — 허용된 로그인 사용자만 접근

## 기술

- Python
- Streamlit
- pandas
- openpyxl
- xlrd

화면은 Airbnb-inspired 밝은 테마와 Plus Jakarta Sans 글꼴을 사용합니다.
