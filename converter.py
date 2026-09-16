"""쇼핑몰 주문 엑셀을 택배 입고용 양식으로 변환한다. 원본 값은 복사만 한다."""

from __future__ import annotations

from io import BytesIO

import pandas as pd

REQUIRED_SOURCE_COLUMNS = [
    "수령자명",
    "주문선택사항",
    "주문수량",
    "수령자휴대폰번호",
    "배송지주소",
    "배송지우편번호",
    "배송메세지",
]

OUTPUT_COLUMNS = [
    "받는분성명",
    "내품명",
    "내품수량",
    "받는분전화번호",
    "받는분주소(전체, 분할)",
    "받는분우편번호",
    "배송메세지1",
    "발송업체명",
    "업체요청 메시지",
]

TEXT_OUTPUT_COLUMNS = {
    "받는분성명",
    "내품명",
    "받는분전화번호",
    "받는분주소(전체, 분할)",
    "받는분우편번호",
    "배송메세지1",
    "발송업체명",
    "업체요청 메시지",
}


class SourceFormatError(ValueError):
    """원본 엑셀에 필수 컬럼이 없거나 읽을 수 없을 때 사용한다."""


def read_source_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """업로드된 파일을 메모리에서만 읽는다. 디스크의 원본은 건드리지 않는다."""
    buffer = BytesIO(file_bytes)
    name = filename.lower()
    try:
        if name.endswith(".xls") and not name.endswith(".xlsx"):
            df = pd.read_excel(buffer, engine="xlrd")
        else:
            df = pd.read_excel(buffer, engine="openpyxl")
    except Exception as exc:  # noqa: BLE001 — 관리자에게 읽기 실패만 안내
        raise SourceFormatError(f"엑셀 파일을 읽지 못했습니다: {exc}") from exc
    return df


def missing_source_columns(source_df: pd.DataFrame) -> list[str]:
    return [col for col in REQUIRED_SOURCE_COLUMNS if col not in source_df.columns]


def format_zipcode(value: object) -> str:
    """변환 파일에서만 우편번호를 5자리 문자로 맞춘다. 원본 표는 그대로 둔다."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if pd.isna(value):
        return ""
    text = str(value).strip()
    if text in {"", "nan", "None", "<NA>"}:
        return ""
    if text.endswith(".0") and text[:-2].replace("-", "").isdigit():
        text = text[:-2]
    digits = "".join(ch for ch in text if ch.isdigit())
    if not digits:
        return text
    return digits.zfill(5)


def _as_text(value: object) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if pd.isna(value):
        return ""
    text = str(value).strip()
    if text in {"nan", "None", "<NA>"}:
        return ""
    return text


def _as_quantity(value: object) -> int | float:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return pd.NA
    if pd.isna(value):
        return pd.NA
    numeric = pd.to_numeric(value, errors="coerce")
    if pd.isna(numeric):
        return pd.NA
    if float(numeric).is_integer():
        return int(numeric)
    return float(numeric)


def convert_to_courier_form(source_df: pd.DataFrame) -> pd.DataFrame:
    """원본 DataFrame은 변경하지 않고, 새 변환표만 만든다."""
    missing = missing_source_columns(source_df)
    if missing:
        raise SourceFormatError(
            "원본 엑셀에 필요한 열이 없습니다: " + ", ".join(missing)
        )

    converted = pd.DataFrame(
        {
            "받는분성명": source_df["수령자명"].map(_as_text),
            "내품명": source_df["주문선택사항"].map(_as_text),
            "내품수량": source_df["주문수량"].map(_as_quantity),
            "받는분전화번호": source_df["수령자휴대폰번호"].map(_as_text),
            "받는분주소(전체, 분할)": source_df["배송지주소"].map(_as_text),
            "받는분우편번호": source_df["배송지우편번호"].map(format_zipcode),
            "배송메세지1": source_df["배송메세지"].map(_as_text),
            "발송업체명": "",
            "업체요청 메시지": "",
        }
    )
    return converted[OUTPUT_COLUMNS].copy()


def courier_form_to_xlsx_bytes(converted_df: pd.DataFrame) -> bytes:
    """다운로드용 새 xlsx만 만든다. 우편번호·전화번호는 텍스트로 저장한다."""
    buffer = BytesIO()
    export_df = converted_df[OUTPUT_COLUMNS].copy()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        export_df.to_excel(writer, index=False, sheet_name="Sheet1")
        worksheet = writer.sheets["Sheet1"]
        for col_idx, column_name in enumerate(OUTPUT_COLUMNS, start=1):
            if column_name not in TEXT_OUTPUT_COLUMNS:
                continue
            for row_idx in range(2, len(export_df) + 2):
                cell = worksheet.cell(row=row_idx, column=col_idx)
                cell.number_format = "@"
                if cell.value is None:
                    cell.value = ""
                else:
                    cell.value = str(cell.value)
    return buffer.getvalue()
