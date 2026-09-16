from io import BytesIO

import pandas as pd

from tracking_matcher import (
    match_tracking_numbers,
    sales_ledger_to_xlsx_bytes,
)

def test_bundled_orders_match_all_sales_rows():
    shipment = pd.DataFrame(
        {
            "받는분": ["고객A", "고객B", "고객C"],
            "운송장번호": ["1000-0001", "1000-0002", "1000-0003"],
        }
    )
    sales = pd.DataFrame(
        {
            "주문고유번호": [1, 2, 3, 4, 5, 6],
            "판매사이트명": ["쇼핑몰"] * 6,
            "결제일": ["2026-09-16"] * 6,
            "판매사이트 주문번호": [11, 12, 21, 22, 23, 31],
            "수령자명": ["고객A", "고객A", "고객B", "고객B", "고객B", "고객C"],
        }
    )
    original = sales.copy(deep=True)

    result, comparison, report = match_tracking_numbers(shipment, sales)

    assert report.ok
    assert report.shipment_row_count == 3
    assert report.sales_row_count == 6
    assert report.matched_row_count == 6
    assert set(report.bundled_names) == {"고객A", "고객B"}
    assert report.bundled_row_count == 5
    assert list(result.columns)[4] == "운송장번호"
    assert set(comparison["상태"]) == {"매칭 완료"}
    pd.testing.assert_frame_equal(sales, original)

    customer_a = result[result["수령자명"] == "고객A"]["운송장번호"]
    customer_b = result[result["수령자명"] == "고객B"]["운송장번호"]
    assert customer_a.tolist() == ["1000-0001"] * 2
    assert customer_b.tolist() == ["1000-0002"] * 3


def test_conflicting_tracking_numbers_block_result():
    shipment = pd.DataFrame(
        {
            "받는분": ["동명이인", "동명이인"],
            "운송장번호": ["1111", "2222"],
        }
    )
    sales = pd.DataFrame({"수령자명": ["동명이인"]})

    _, comparison, report = match_tracking_numbers(shipment, sales)

    assert not report.ok
    assert report.conflict_names == ("동명이인",)
    assert comparison.loc[0, "상태"] == "운송장 충돌"


def test_unmatched_recipient_blocks_result():
    shipment = pd.DataFrame({"받는분": ["홍길동"], "운송장번호": ["1111"]})
    sales = pd.DataFrame({"수령자명": ["홍길동", "없는사람"]})

    _, _, report = match_tracking_numbers(shipment, sales)

    assert not report.ok
    assert report.matched_row_count == 1
    assert report.unmatched_names == ("없는사람",)


def test_export_keeps_tracking_in_column_e_and_long_order_number_as_text():
    result = pd.DataFrame(
        {
            "주문고유번호": [102012723275],
            "판매사이트명": ["테스트"],
            "결제일": ["2026-09-16"],
            "판매사이트 주문번호": [2026091651299791],
            "운송장번호": ["1000-0001"],
            "수령자명": ["고객A"],
        }
    )

    exported = sales_ledger_to_xlsx_bytes(result)
    loaded = pd.read_excel(BytesIO(exported), dtype=str)

    assert list(loaded.columns)[4] == "운송장번호"
    assert loaded.loc[0, "판매사이트 주문번호"] == "2026091651299791"
    assert loaded.loc[0, "운송장번호"] == "1000-0001"
