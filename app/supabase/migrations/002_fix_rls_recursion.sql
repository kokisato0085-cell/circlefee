-- Phase 1 修正: RLSポリシーの無限再帰を解消
-- 適用済み: 2026-05-23 Supabase SQL Editor にて実行
--
-- 問題: membershipsテーブルのSELECTポリシーが自己参照しており、
--       PostgreSQLが無限再帰を検出してエラー (42P17) を返していた。
-- 解決: security definerヘルパー関数でRLSをバイパスし、再帰を回避。

-- 1. ヘルパー関数
create or replace function get_my_group_ids()
returns setof uuid as $$
  select group_id from public.memberships where user_id = auth.uid();
$$ language sql security definer stable set search_path = public;

create or replace function is_group_leader(gid uuid)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where group_id = gid
    and user_id = auth.uid()
    and role = 'leader'
  );
$$ language sql security definer stable set search_path = public;

-- 2. membershipsポリシー修正（自己参照を排除）
drop policy if exists "memberships_select_same_group" on memberships;
create policy "memberships_select_same_group" on memberships for select
  using (group_id in (select get_my_group_ids()));

drop policy if exists "memberships_insert_leader" on memberships;
create policy "memberships_insert_leader" on memberships for insert
  with check (
    is_group_leader(group_id)
    or (user_id = auth.uid() and role = 'leader')
  );

drop policy if exists "memberships_update_leader" on memberships;
create policy "memberships_update_leader" on memberships for update
  using (is_group_leader(group_id));

drop policy if exists "memberships_delete_leader" on memberships;
create policy "memberships_delete_leader" on memberships for delete
  using (is_group_leader(group_id));

-- 3. groupsポリシー修正
drop policy if exists "groups_select_member" on groups;
drop policy if exists "groups_select_creator" on groups;
create policy "groups_select_member" on groups for select
  using (id in (select get_my_group_ids()));

drop policy if exists "groups_update_leader" on groups;
create policy "groups_update_leader" on groups for update
  using (is_group_leader(id));

-- 4. 他テーブルのポリシー修正
drop policy if exists "invite_links_insert_leader" on invite_links;
create policy "invite_links_insert_leader" on invite_links for insert
  with check (is_group_leader(group_id));

drop policy if exists "join_requests_select_leader" on join_requests;
create policy "join_requests_select_leader" on join_requests for select
  using (is_group_leader(group_id));

drop policy if exists "join_requests_update_leader" on join_requests;
create policy "join_requests_update_leader" on join_requests for update
  using (is_group_leader(group_id));

-- 5. グループ作成RPC関数（caller_user_id対応版）
create or replace function create_group_with_leader(
  group_name text,
  group_password_hash text,
  caller_user_id uuid default null
) returns uuid as $$
declare
  actual_user_id uuid;
  new_group_id uuid;
begin
  actual_user_id := coalesce(auth.uid(), caller_user_id);
  if actual_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into groups (name, password_hash, created_by)
  values (group_name, group_password_hash, actual_user_id)
  returning id into new_group_id;

  insert into memberships (group_id, user_id, role)
  values (new_group_id, actual_user_id, 'leader');

  return new_group_id;
end;
$$ language plpgsql security definer set search_path = public;
