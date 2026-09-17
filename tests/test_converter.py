import pandas as pd

from converter import (
    convert_to_courier_form,
    format_recipient_name,
    format_zipcode,
)
from validator import validate


def test_format_zipcode_pads_five_digits():
    assert format_zipcode(1760) == "01760"
    assert format_zipcode("35251") == "35251"


def test_one_character_recipient_name_gets_dot():
    assert format_recipient_name("집") == "집."
    assert format_recipient_name("홍길동") == "홍길동"


def test_order_rows_convert_and_match_counts():
    source = pd.DataFrame(
        {
            "수령자명": ["고객A", "고객B"],
            "주문선택사항": ["상품A 1kg", "상품B 500g"],
            "주문수량": [1, 2],
            "수령자휴대폰번호": ["010-0000-0001", "010-0000-0002"],
            "배송지주소": ["테스트 주소 1", "테스트 주소 2"],
            "배송지우편번호": [1760, 35251],
            "배송메세지": ["문 앞", ""],
        }
    )
    converted = convert_to_courier_form(source)
    report = validate(source, converted)

    assert report.ok
    assert report.rules_ok
    assert report.source_row_count == 2
    assert report.source_qty_sum == 3
    assert converted["받는분성명"].tolist() == ["고객A", "고객B"]
    assert converted["내품명"].tolist() == ["상품A 1kg", "상품B 500g"]
    assert converted["내품수량"].tolist() == [1, 2]
    assert converted.loc[0, "받는분우편번호"] == "01760"


def test_required_courier_fields_block_invalid_rows():
    source = pd.DataFrame(
        {
            "수령자명": ["집"],
            "주문선택사항": [""],
            "주문수량": ["한개"],
            "수령자휴대폰번호": ["01012345678"],
            "배송지주소": [""],
            "배송지우편번호": ["123456"],
            "배송메세지": [""],
        }
    )

    converted = convert_to_courier_form(source)
    report = validate(source, converted)

    assert converted.loc[0, "받는분성명"] == "집."
    assert report.adjusted_name_count == 1
    assert report.empty_product_count == 1
    assert report.invalid_quantity_count == 1
    assert report.invalid_phone_count == 1
    assert report.empty_address_count == 1
    assert report.invalid_zipcode_count == 1
    assert not report.rules_ok
    assert not report.ok
