"""택배사 운송장번호를 EMP 매출장부의 수령자명에 연결한다."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import pandas as pd

from converter import SourceFormatError

SHIPMENT_NAME_COLUMN = "받는분"
SHIPMENT_TRACKING_COLUMN = "운송장번호"
SALES_NAME_COLUMN = "수령자명"
TRACKING_COLUMN = "운송장번호"
TRACKING_COLUMN_POSITION = 4  # Excel E열


@dataclass(frozen=True)
class TrackingMatchReport:
    shipment_row_count: int
    sales_row_count: int
    result_row_count: int
    matched_row_count: int
    unmatched_names: tuple[str, ...]
    conflict_names: tuple[str, ...]
    empty_shipment_name_count: int
    empty_tracking_count: int
    empty_sales_name_count: int
    bundled_names: tuple[str, ...]
    bundled_row_count: int
    original_data_ok: bool

    @property
    def unmatched_row_count(self) -> int:
        return self.sales_row_count - self.matched_row_count

    @property
    def ok(self) -> bool:
        return (
            self.sales_row_count == self.result_row_count
            and self.unmatched_row_count == 0
            and not self.conflict_names
            and self.empty_shipment_name_count == 0
            and self.empty_tracking_count == 0
            and self.empty_sales_name_count == 0
            and self.original_data_ok
        )


def _clean_text(value: object) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    return "" if text in {"nan", "None", "<NA>"} else text


def _require_columns(
    dataframe: pd.DataFrame, required: list[str], file_label: str
) -> None:
    missing = [column for column in required if column not in dataframe.columns]
    if missing:
        raise SourceFormatError(
            f"{file_label}에 필요한 열이 없습니다: {', '.join(missing)}"
        )


def match_tracking_numbers(
    shipment_df: pd.DataFrame, sales_df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, TrackingMatchReport]:
    """수령자명별 운송장번호를 E열에 넣은 새 매출장부를 만든다."""
    _require_columns(
        shipment_df,
        [SHIPMENT_NAME_COLUMN, SHIPMENT_TRACKING_COLUMN],
        "택배사 상세내역",
    )
    _require_columns(sales_df, [SALES_NAME_COLUMN], "EMP 매출장부")

    shipment_names = shipment_df[SHIPMENT_NAME_COLUMN].map(_clean_text)
    shipment_tracking = shipment_df[SHIPMENT_TRACKING_COLUMN].map(_clean_text)
    sales_names = sales_df[SALES_NAME_COLUMN].map(_clean_text)

    shipment_pairs = pd.DataFrame(
        {"수령자명": shipment_names, "운송장번호": shipment_tracking}
    )
    valid_pairs = shipment_pairs[
        (shipment_pairs["수령자명"] != "") & (shipment_pairs["운송장번호"] != "")
    ]
    grouped = valid_pairs.groupby("수령자명", sort=False)["운송장번호"].agg(
        lambda values: tuple(dict.fromkeys(values))
    )
    conflict_names = tuple(name for name, values in grouped.items() if len(values) > 1)
    tracking_map = {
        name: values[0]
        for name, values in grouped.items()
        if len(values) == 1 and name not in conflict_names
    }

    mapped_tracking = sales_names.map(tracking_map).fillna("")
    matched_mask = mapped_tracking != ""
    unmatched_names = tuple(
        dict.fromkeys(sales_names[(sales_names != "") & ~matched_mask])
    )

    result_df = sales_df.copy(deep=True)
    if TRACKING_COLUMN in result_df.columns:
        result_df = result_df.drop(columns=[TRACKING_COLUMN])
    insert_position = min(TRACKING_COLUMN_POSITION, len(result_df.columns))
    result_df.insert(insert_position, TRACKING_COLUMN, mapped_tracking)

    counts = sales_names[sales_names != ""].value_counts()
    bundled_names = tuple(counts[counts > 1].index.tolist())
    bundled_row_count = int(counts[counts > 1].sum())

    original_columns = [
        column for column in sales_df.columns if column != TRACKING_COLUMN
    ]
    original_data_ok = (
        len(sales_df) == len(result_df)
        and result_df[original_columns].reset_index(drop=True).equals(
            sales_df[original_columns].reset_index(drop=True)
        )
    )

    status = pd.Series("매칭 완료", index=sales_df.index)
    status.loc[~matched_mask] = "미매칭"
    status.loc[sales_names == ""] = "수령자명 없음"
    status.loc[sales_names.isin(conflict_names)] = "운송장 충돌"
    comparison_df = pd.DataFrame(
        {
            "수령자명": sales_names,
            "매칭 운송장번호": mapped_tracking,
            "상태": status,
        }
    )

    report = TrackingMatchReport(
        shipment_row_count=int(len(shipment_df)),
        sales_row_count=int(len(sales_df)),
        result_row_count=int(len(result_df)),
        matched_row_count=int(matched_mask.sum()),
        unmatched_names=unmatched_names,
        conflict_names=conflict_names,
        empty_shipment_name_count=int((shipment_names == "").sum()),
        empty_tracking_count=int((shipment_tracking == "").sum()),
        empty_sales_name_count=int((sales_names == "").sum()),
        bundled_names=bundled_names,
        bundled_row_count=bundled_row_count,
        original_data_ok=original_data_ok,
    )
    return result_df, comparison_df, report


def sales_ledger_to_xlsx_bytes(result_df: pd.DataFrame) -> bytes:
    """운송장번호 E열이 포함된 새 매출장부를 xlsx로 만든다."""
    buffer = BytesIO()
    export_df = result_df.copy(deep=True)
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        export_df.to_excel(writer, index=False, sheet_name="매출장부")
        worksheet = writer.sheets["매출장부"]
        worksheet.freeze_panes = "A2"
        worksheet.auto_filter.ref = worksheet.dimensions

        text_columns = {
            column
            for column in export_df.columns
            if "번호" in str(column) or column == TRACKING_COLUMN
        }
        for column_index, column_name in enumerate(export_df.columns, start=1):
            if column_name not in text_columns:
                continue
            for row_index in range(2, len(export_df) + 2):
                cell = worksheet.cell(row=row_index, column=column_index)
                cell.number_format = "@"
                if cell.value is None:
                    cell.value = ""
                elif isinstance(cell.value, float) and cell.value.is_integer():
                    cell.value = str(int(cell.value))
                else:
                    cell.value = str(cell.value)
    return buffer.getvalue()
