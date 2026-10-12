-- supabase_login.sql – 교육 신청 현황 관리 · Phase 5 「로그인과 내 신청 취소」 (4회차 예제 2-4)
-- supabase_setup.sql(Phase 4)을 이미 실행한 academy 프로젝트에서, 그 다음에 실행합니다.
-- 사용법 : SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
-- 여러 번 실행해도 됩니다. (setup.sql을 다시 실행했다면 이 파일도 다시 실행하세요)
-- 실행 뒤 : Authentication → Sign In / Providers → Email → "Confirm email" 끄기 (교육용 — 메일 확인 없이 바로 로그인)

-- ============ 1. 칸 추가 ============
-- R-08 신청한 계정 : DB가 로그인한 계정(auth.uid())으로 채운다. 화면은 이 칸을 보낼 권한이 없다
alter table public.edu_apps
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
-- 처음 가상 8건은 user_id가 비어 있음 = 아무도 지울 수 없는 기록


-- ============ 2. 누가 무엇을 할 수 있나 (Phase 4 규칙을 로그인 기준으로 바꿈) ============
drop policy if exists "edu_과정_정원변경" on public.edu_courses;
drop policy if exists "edu_신청_등록"     on public.edu_apps;
drop policy if exists "edu_신청_상태변경" on public.edu_apps;
drop policy if exists "edu_신청_삭제"     on public.edu_apps;

-- 읽기는 그대로 누구나 (edu_과정_읽기 · edu_신청_읽기)
-- R-07 쓰기는 로그인한 사람만
create policy "edu_과정_정원변경" on public.edu_courses for update to authenticated using (true) with check (true);
create policy "edu_신청_등록"     on public.edu_apps    for insert to authenticated with check (user_id = auth.uid());
create policy "edu_신청_상태변경" on public.edu_apps    for update to authenticated using (true) with check (true);
-- R-09 삭제는 내 신청 + '신청' 상태만
create policy "edu_신청_삭제"     on public.edu_apps    for delete to authenticated
  using (user_id = auth.uid() and status = '신청');

-- 칸별 권한 : 공개용 키(anon)는 읽기만. user_id는 누구도 직접 못 넣음
revoke all on public.edu_courses, public.edu_apps from anon, authenticated;
grant select on public.edu_courses, public.edu_apps to anon, authenticated;
grant insert (course, date, hours, name, team) on public.edu_apps to authenticated;
grant update (status)   on public.edu_apps    to authenticated;
grant update (capacity) on public.edu_courses to authenticated;
grant delete on public.edu_apps to authenticated;


-- 확인 : user_id 칸이 생기고, 정책 6개가 나오면 성공
select policyname, cmd, roles from pg_policies where tablename in ('edu_apps', 'edu_courses') order by tablename, policyname;
