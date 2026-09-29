-- 공개 키(anon, authenticated)로는 이 테이블을 읽거나 쓰지 못합니다.
-- 변환 결과 저장은 서버에만 있는 비밀 키가 합니다. 비밀 키는 RLS를 통과합니다.

revoke all on table public.sales_lines from anon, authenticated;
revoke all on table public.settle_lines from anon, authenticated;
revoke all on table public.upload_log from anon, authenticated;
revoke all on table public.order_totals from anon, authenticated;
revoke all on table public.manual_steps from anon, authenticated;
revoke all on table public.production_jobs from anon, authenticated;
revoke all on table public.production_rows from anon, authenticated;
revoke all on table public.conversion_jobs from anon, authenticated;
revoke all on table public.conversion_rows from anon, authenticated;

drop policy if exists sales_lines_anon_all on public.sales_lines;
drop policy if exists settle_lines_anon_all on public.settle_lines;
drop policy if exists upload_log_anon_all on public.upload_log;
drop policy if exists order_totals_anon_all on public.order_totals;
drop policy if exists manual_steps_anon_all on public.manual_steps;
drop policy if exists production_jobs_anon_all on public.production_jobs;
drop policy if exists production_rows_anon_all on public.production_rows;
drop policy if exists conversion_jobs_anon_all on public.conversion_jobs;
drop policy if exists conversion_rows_anon_all on public.conversion_rows;

alter table public.sales_lines enable row level security;
alter table public.settle_lines enable row level security;
alter table public.upload_log enable row level security;
alter table public.order_totals enable row level security;
alter table public.manual_steps enable row level security;
alter table public.production_jobs enable row level security;
alter table public.production_rows enable row level security;
alter table public.conversion_jobs enable row level security;
alter table public.conversion_rows enable row level security;
