-- Phase 5: 特別イベント + アカウント削除匿名化
-- 適用: Supabase SQL Editor にて実行

-- 1. special_events テーブル
create table special_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 50),
  amount integer not null check (amount between 1 and 999999),
  description text check (char_length(description) <= 200),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- 2. special_event_roles テーブル（フォーム内権限者）
create table special_event_roles (
  id uuid primary key default gen_random_uuid(),
  special_event_id uuid not null references special_events(id) on delete cascade,
  user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (special_event_id, user_id)
);

-- 3. special_payment_statuses テーブル
create table special_payment_statuses (
  id uuid primary key default gen_random_uuid(),
  special_event_id uuid not null references special_events(id) on delete cascade,
  user_id uuid not null references profiles(id),
  status payment_status not null default 'unpaid',
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (special_event_id, user_id)
);

-- 4. RLS有効化
alter table special_events enable row level security;
alter table special_event_roles enable row level security;
alter table special_payment_statuses enable row level security;

-- 5. special_events RLSポリシー
create policy "special_events_select_member" on special_events for select
  using (group_id in (select get_my_group_ids()));

create policy "special_events_insert_leader" on special_events for insert
  with check (
    group_id in (select get_my_group_ids())
    and is_group_leader(group_id)
  );

create policy "special_events_delete_leader" on special_events for delete
  using (is_group_leader(group_id));

-- 6. special_event_roles RLSポリシー
create policy "special_event_roles_select_member" on special_event_roles for select
  using (
    special_event_id in (
      select id from special_events where group_id in (select get_my_group_ids())
    )
  );

create policy "special_event_roles_insert_leader" on special_event_roles for insert
  with check (
    special_event_id in (
      select id from special_events where is_group_leader(group_id)
    )
  );

create policy "special_event_roles_delete_leader" on special_event_roles for delete
  using (
    special_event_id in (
      select id from special_events where is_group_leader(group_id)
    )
  );

-- 7. special_payment_statuses RLSポリシー
create policy "special_payment_statuses_select_member" on special_payment_statuses for select
  using (
    special_event_id in (
      select id from special_events where group_id in (select get_my_group_ids())
    )
  );

create policy "special_payment_statuses_insert_authorized" on special_payment_statuses for insert
  with check (
    special_event_id in (
      select se.id from special_events se
      where is_group_leader(se.group_id)
    )
    or special_event_id in (
      select se.id from special_events se
      join memberships m on m.group_id = se.group_id
      where m.user_id = auth.uid() and m.role in ('leader', 'moderator')
    )
  );

create policy "special_payment_statuses_update_own_claim" on special_payment_statuses for update
  using (user_id = auth.uid() and status = 'unpaid')
  with check (status = 'claimed');

create policy "special_payment_statuses_update_authorized" on special_payment_statuses for update
  using (
    special_event_id in (
      select ser.special_event_id from special_event_roles ser
      where ser.user_id = auth.uid()
    )
    or special_event_id in (
      select se.id from special_events se
      join memberships m on m.group_id = se.group_id
      where m.user_id = auth.uid() and m.role in ('leader', 'moderator')
    )
  );

-- 8. アカウント削除用の匿名化関数
create or replace function anonymize_user(p_user_id uuid) returns void as $$
begin
  update payment_statuses set user_id = '00000000-0000-0000-0000-000000000000'
    where user_id = p_user_id;
  update special_payment_statuses set user_id = '00000000-0000-0000-0000-000000000000'
    where user_id = p_user_id;
  delete from special_event_roles where user_id = p_user_id;
  delete from memberships where user_id = p_user_id;
  delete from join_requests where user_id = p_user_id;
  delete from notifications where target_user_id = p_user_id;
  delete from push_subscriptions where user_id = p_user_id;
  delete from profiles where id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- 9. Realtime有効化
alter publication supabase_realtime add table special_payment_statuses;
