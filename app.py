"""택배 양식 생성과 운송장번호 연결을 한 흐름으로 제공한다."""

import importlib
from datetime import datetime

import streamlit as st

import converter
import tracking_matcher
import validator

# Streamlit Cloud의 코드 자동 업데이트 후 이전 모듈이 메모리에 남지 않게 한다.
converter = importlib.reload(converter)
validator = importlib.reload(validator)
tracking_matcher = importlib.reload(tracking_matcher)

SourceFormatError = converter.SourceFormatError
convert_to_courier_form = converter.convert_to_courier_form
courier_form_to_xlsx_bytes = converter.courier_form_to_xlsx_bytes
read_source_excel = converter.read_source_excel
match_tracking_numbers = tracking_matcher.match_tracking_numbers
sales_ledger_to_xlsx_bytes = tracking_matcher.sales_ledger_to_xlsx_bytes
validate = validator.validate

st.set_page_config(page_title="출고 엑셀 변환·운송장 연결", layout="wide")

COMPARE_PAIRS = [
    ("수령자명", "받는분성명"),
    ("주문선택사항", "내품명"),
    ("주문수량", "내품수량"),
    ("수령자휴대폰번호", "받는분전화번호"),
    ("배송지주소", "받는분주소(전체, 분할)"),
    ("배송메세지", "배송메세지1"),
]


def _status_label(ok: bool) -> str:
    return "OK" if ok else "Mismatch"


def _qty_display(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return str(value)


def render_courier_form_step() -> None:
    st.header("1단계: 주문 → 택배 양식")
    with st.expander("택배사 필수 입력 규칙", expanded=True):
        st.markdown(
            """
- **A 받는분성명**: 2글자 이상 (1글자는 자동으로 점 `.` 추가)
- **B 내품명**: 주문선택사항을 정확히 기재
- **C 내품수량**: 숫자 형식
- **D 받는분전화번호**: 하이픈이 포함된 연락처 또는 안심번호
- **E 받는분주소(전체, 분할)**: 전체 도로명/지번 주소
- **F 받는분우편번호**: 5자리 우편번호
"""
        )
    uploaded = st.file_uploader(
        "쇼핑몰 주문 원본 엑셀을 올려 주세요",
        type=["xlsx", "xls"],
        help="드래그 앤 드롭 또는 파일 선택을 사용할 수 있습니다.",
        key="courier_source",
    )

    if uploaded is None:
        st.info("주문 원본 엑셀(.xlsx 또는 .xls)을 올리면 변환 결과가 나타납니다.")
        return

    try:
        source_df = read_source_excel(uploaded.getvalue(), uploaded.name)
        converted_df = convert_to_courier_form(source_df)
    except SourceFormatError as exc:
        st.error(str(exc))
        return

    report = validate(source_df, converted_df)
    st.subheader("검증 결과")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("원본 건수", report.source_row_count)
    m2.metric("변환 건수", report.converted_row_count)
    m3.metric("원본 수량 합계", _qty_display(report.source_qty_sum))
    m4.metric("변환 수량 합계", _qty_display(report.converted_qty_sum))

    c1, c2, c3 = st.columns(3)
    with c1:
        (st.success if report.count_ok else st.error)(
            f"건수 {_status_label(report.count_ok)}"
        )
    with c2:
        (st.success if report.qty_ok else st.error)(
            f"수량 {_status_label(report.qty_ok)}"
        )
    with c3:
        (st.success if report.rules_ok else st.error)(
            f"필수 규칙 {_status_label(report.rules_ok)}"
        )

    if report.adjusted_name_count:
        st.info(
            f"1글자 성명 {report.adjusted_name_count}건에 점(.)을 자동으로 추가했습니다."
        )

    rule_issues = []
    if report.empty_name_count:
        rule_issues.append(f"받는분성명 빈 값 {report.empty_name_count}건")
    if report.empty_product_count:
        rule_issues.append(f"내품명 빈 값 {report.empty_product_count}건")
    if report.invalid_quantity_count:
        rule_issues.append(
            f"내품수량 숫자 형식 오류 {report.invalid_quantity_count}건"
        )
    if report.invalid_phone_count:
        rule_issues.append(
            f"전화번호 형식 오류 {report.invalid_phone_count}건"
        )
    if report.empty_address_count:
        rule_issues.append(f"받는분주소 빈 값 {report.empty_address_count}건")
    if report.invalid_zipcode_count:
        rule_issues.append(
            f"우편번호 5자리 형식 오류 {report.invalid_zipcode_count}건"
        )
    if rule_issues:
        st.error("필수 입력 오류\n\n- " + "\n- ".join(rule_issues))

    tab_source, tab_converted, tab_compare = st.tabs(
        ["원본 데이터", "변환된 택배 양식", "좌우 비교"]
    )
    with tab_source:
        st.dataframe(source_df, use_container_width=True, hide_index=True)
    with tab_converted:
        st.dataframe(converted_df, use_container_width=True, hide_index=True)
    with tab_compare:
        left_cols = [pair[0] for pair in COMPARE_PAIRS]
        right_cols = [pair[1] for pair in COMPARE_PAIRS]
        left, right = st.columns(2)
        with left:
            st.markdown("**원본**")
            st.dataframe(
                source_df[left_cols], use_container_width=True, hide_index=True
            )
        with right:
            st.markdown("**변환**")
            st.dataframe(
                converted_df[right_cols], use_container_width=True, hide_index=True
            )

    st.subheader("엑셀 다운로드")
    if report.ok:
        stamp = datetime.now().strftime("택배양식_%Y%m%d_%H%M.xlsx")
        st.download_button(
            "택배 양식 엑셀 다운로드",
            courier_form_to_xlsx_bytes(converted_df),
            file_name=stamp,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
        )
    else:
        st.error(
            "건수·수량 또는 택배사 필수 입력 규칙이 맞지 않아 다운로드할 수 없습니다."
        )


def render_tracking_step() -> None:
    st.header("2단계: 운송장 → EMP 매출장부")
    st.caption(
        "택배사 상세내역의 받는분과 운송장번호를 EMP 매출장부 수령자명에 연결합니다."
    )
    left, right = st.columns(2)
    with left:
        shipment_file = st.file_uploader(
            "① 택배사 파일접수 상세내역",
            type=["xlsx", "xls"],
            key="shipment_detail",
        )
    with right:
        sales_file = st.file_uploader(
            "② 원본 EMP 매출장부",
            type=["xlsx", "xls"],
            key="sales_ledger",
        )

    if shipment_file is None or sales_file is None:
        st.info("두 파일을 모두 올리면 운송장번호를 매칭하고 검증합니다.")
        return

    try:
        shipment_df = read_source_excel(
            shipment_file.getvalue(), shipment_file.name
        )
        sales_df = read_source_excel(sales_file.getvalue(), sales_file.name)
        result_df, comparison_df, report = match_tracking_numbers(
            shipment_df, sales_df
        )
    except SourceFormatError as exc:
        st.error(str(exc))
        return

    st.subheader("매칭 검증")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("매출장부 전체 행", report.sales_row_count)
    m2.metric("운송장 매칭 행", report.matched_row_count)
    m3.metric(
        "합배송",
        f"{len(report.bundled_names)}명 / {report.bundled_row_count}행",
    )
    m4.metric("미매칭 행", report.unmatched_row_count)

    if report.ok:
        st.success(
            "검증 OK — 모든 행이 매칭됐고 기존 데이터와 행 순서가 유지됐습니다."
        )
    else:
        st.error("검증 Mismatch — 아래 오류를 확인해 주세요. 다운로드할 수 없습니다.")

    if report.unmatched_names:
        st.warning("택배사 파일에 없는 수령자: " + ", ".join(report.unmatched_names))
    if report.conflict_names:
        st.error(
            "같은 이름에 서로 다른 운송장번호가 있습니다: "
            + ", ".join(report.conflict_names)
        )
    if (
        report.empty_shipment_name_count
        or report.empty_tracking_count
        or report.empty_sales_name_count
    ):
        st.warning(
            "빈 값 — "
            f"택배사 수령자 {report.empty_shipment_name_count}건, "
            f"운송장번호 {report.empty_tracking_count}건, "
            f"매출장부 수령자 {report.empty_sales_name_count}건"
        )

    tab_match, tab_shipment, tab_sales, tab_result = st.tabs(
        ["매칭 결과", "택배사 상세내역", "원본 매출장부", "완성 매출장부"]
    )
    with tab_match:
        st.dataframe(comparison_df, use_container_width=True, hide_index=True)
    with tab_shipment:
        st.dataframe(shipment_df, use_container_width=True, hide_index=True)
    with tab_sales:
        st.dataframe(sales_df, use_container_width=True, hide_index=True)
    with tab_result:
        st.caption("운송장번호가 E열에 추가된 결과입니다.")
        st.dataframe(result_df, use_container_width=True, hide_index=True)

    st.subheader("엑셀 다운로드")
    if report.ok:
        stamp = datetime.now().strftime("EMP_매출장부_운송장완료_%Y%m%d_%H%M.xlsx")
        st.download_button(
            "운송장번호가 입력된 매출장부 다운로드",
            sales_ledger_to_xlsx_bytes(result_df),
            file_name=stamp,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
        )
    else:
        st.error("미매칭·충돌·빈 값이 해결되기 전에는 다운로드할 수 없습니다.")


st.title("출고 엑셀 변환·운송장 연결")
st.caption(
    "원본 파일은 수정하거나 덮어쓰지 않습니다. 검증을 통과한 결과만 새 파일로 다운로드합니다."
)
step = st.radio(
    "작업 선택",
    ["1단계: 주문 → 택배 양식", "2단계: 운송장 → EMP 매출장부"],
    horizontal=True,
)

if step.startswith("1단계"):
    render_courier_form_step()
else:
    render_tracking_step()
