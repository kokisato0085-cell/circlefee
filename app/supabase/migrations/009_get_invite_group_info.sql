-- 009: 招待リンクからグループ情報を取得するRPC関数
-- 既にSupabase SQL Editorで手動適用済みだが、マイグレーション管理に追加

create or replace function get_invite_group_info(invite_token uuid)
returns table (
  group_id uuid,
  group_name text,
  password_hash text,
  expires_at timestamptz
) as $$
  select g.id as group_id, g.name as group_name, g.password_hash, il.expires_at
  from invite_links il
  join groups g on g.id = il.group_id
  where il.token = invite_token;
$$ language sql security definer stable set search_path = public;
