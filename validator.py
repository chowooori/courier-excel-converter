"""원본과 변환 결과의 건수·수량만 비교한다. 원본 값은 바꾸지 않는다."""

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
    empty_phone_count: int
    empty_address_count: int

    @property
    def ok(self) -> bool:
        return self.count_ok and self.qty_ok


def _qty_sum(series: pd.Series) -> float:
    numeric = pd.to_numeric(series, errors="coerce")
    return float(numeric.fillna(0).sum())


def _empty_count(series: pd.Series) -> int:
    text = series.fillna("").astype(str).str.strip()
    return int((text == "").sum())


def validate(source_df: pd.DataFrame, converted_df: pd.DataFrame) -> ValidationReport:
    source_rows = int(len(source_df))
    converted_rows = int(len(converted_df))
    source_qty = _qty_sum(source_df["주문수량"])
    converted_qty = _qty_sum(converted_df["내품수량"])
    return ValidationReport(
        source_row_count=source_rows,
        converted_row_count=converted_rows,
        source_qty_sum=source_qty,
        converted_qty_sum=converted_qty,
        count_ok=source_rows == converted_rows,
        qty_ok=source_qty == converted_qty,
        empty_name_count=_empty_count(converted_df["받는분성명"]),
        empty_phone_count=_empty_count(converted_df["받는분전화번호"]),
        empty_address_count=_empty_count(converted_df["받는분주소(전체, 분할)"]),
    )
