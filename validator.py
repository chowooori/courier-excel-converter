"""원본/변환 수치와 택배사 필수 입력 규칙을 검증한다."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class ValidationReport:
    source_row_count: int
    converted_row_count: int
    source_qty_sum: float
    converted_qty_sum: float
    count_ok: bool
    qty_ok: bool
    empty_name_count: int
    empty_product_count: int
    invalid_quantity_count: int
    empty_phone_count: int
    invalid_phone_count: int
    empty_address_count: int
    invalid_zipcode_count: int
    adjusted_name_count: int

    @property
    def rules_ok(self) -> bool:
        return (
            self.empty_name_count == 0
            and self.empty_product_count == 0
            and self.invalid_quantity_count == 0
            and self.invalid_phone_count == 0
            and self.empty_address_count == 0
            and self.invalid_zipcode_count == 0
        )

    @property
    def ok(self) -> bool:
        return self.count_ok and self.qty_ok and self.rules_ok


def _qty_sum(series: pd.Series) -> float:
    numeric = pd.to_numeric(series, errors="coerce")
    return float(numeric.fillna(0).sum())


def _empty_count(series: pd.Series) -> int:
    text = series.fillna("").astype(str).str.strip()
    return int((text == "").sum())


def _text(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip()


def validate(source_df: pd.DataFrame, converted_df: pd.DataFrame) -> ValidationReport:
    source_rows = int(len(source_df))
    converted_rows = int(len(converted_df))
    source_qty = _qty_sum(source_df["주문수량"])
    converted_qty = _qty_sum(converted_df["내품수량"])
    phone_text = _text(converted_df["받는분전화번호"])
    zipcode_text = _text(converted_df["받는분우편번호"])
    source_name_text = _text(source_df["수령자명"])
    return ValidationReport(
        source_row_count=source_rows,
        converted_row_count=converted_rows,
        source_qty_sum=source_qty,
        converted_qty_sum=converted_qty,
        count_ok=source_rows == converted_rows,
        qty_ok=source_qty == converted_qty,
        empty_name_count=_empty_count(converted_df["받는분성명"]),
        empty_product_count=_empty_count(converted_df["내품명"]),
        invalid_quantity_count=int(
            pd.to_numeric(converted_df["내품수량"], errors="coerce").isna().sum()
        ),
        empty_phone_count=_empty_count(converted_df["받는분전화번호"]),
        invalid_phone_count=int(
            (~phone_text.str.fullmatch(r"\d{2,4}-\d{3,4}-\d{4}")).sum()
        ),
        empty_address_count=_empty_count(converted_df["받는분주소(전체, 분할)"]),
        invalid_zipcode_count=int(
            (~zipcode_text.str.fullmatch(r"\d{5}")).sum()
        ),
        adjusted_name_count=int((source_name_text.str.len() == 1).sum()),
    )
