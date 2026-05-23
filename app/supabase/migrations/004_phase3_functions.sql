-- Phase 3: 部長委譲RPC + 2ヶ月未払いチェック関数
-- 適用: Supabase SQL Editor にて実行

-- 1. 部長委譲（楽観的ロック付き）
create or replace function transfer_leader(
  p_group_id uuid,
  p_old_leader_id uuid,
  p_new_leader_id uuid,
  p_old_version integer,
  p_new_version integer
) returns boolean as $$
declare
  rows_affected integer;
begin
  update memberships
  set role = 'member', version = p_old_version + 1
  where group_id = p_group_id
  and user_id = p_old_leader_id
  and role = 'leader'
  and version = p_old_version;

  get diagnostics rows_affected = row_count;
  if rows_affected = 0 then
    return false;
  end if;

  update memberships
  set role = 'leader', version = p_new_version + 1
  where group_id = p_group_id
  and user_id = p_new_leader_id
  and version = p_new_version;

  get diagnostics rows_affected = row_count;
  if rows_affected = 0 then
    raise exception 'version mismatch on new leader';
  end if;

  return true;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. 2ヶ月連続未払いチェック（大方針G条件）
create or replace function check_consecutive_unpaid(
  p_group_id uuid,
  p_user_id uuid
) returns boolean as $$
declare
  prev_month text;
  prev_prev_month text;
  unpaid_count integer;
begin
  prev_month := to_char(now() - interval '1 month', 'YYYY-MM');
  prev_prev_month := to_char(now() - interval '2 months', 'YYYY-MM');

  select count(*) into unpaid_count
  from payment_statuses ps
  join events e on e.id = ps.event_id
  where e.group_id = p_group_id
  and ps.user_id = p_user_id
  and ps.status = 'unpaid'
  and e.month in (prev_month, prev_prev_month);

  return unpaid_count >= 2;
end;
$$ language plpgsql security definer stable set search_path = public;
