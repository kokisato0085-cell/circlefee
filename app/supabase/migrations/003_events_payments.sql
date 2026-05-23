-- Phase 2: イベント・支払いステータス スキーマ
-- 適用: Supabase SQL Editor にて実行

-- 1. events テーブル
create table events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 50),
  amount integer not null check (amount between 1 and 999999),
  due_date date,
  description text check (char_length(description) <= 200),
  month text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- 2. payment_statuses テーブル
create type payment_status as enum ('unpaid', 'claimed', 'paid');

create table payment_statuses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id),
  status payment_status not null default 'unpaid',
  sub_status text check (char_length(sub_status) <= 50),
  adjusted_amount integer check (adjusted_amount is null or adjusted_amount between 0 and 999999),
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- 3. RLS有効化
alter table events enable row level security;
alter table payment_statuses enable row level security;

-- 4. events RLSポリシー
create policy "events_select_member" on events for select
  using (group_id in (select get_my_group_ids()));

create policy "events_insert_moderator" on events for insert
  with check (
    group_id in (select get_my_group_ids())
    and exists (
      select 1 from memberships
      where memberships.group_id = events.group_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('leader', 'moderator')
    )
  );

create policy "events_update_moderator" on events for update
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = events.group_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('leader', 'moderator')
    )
  );

create policy "events_delete_moderator" on events for delete
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = events.group_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('leader', 'moderator')
    )
  );

-- 5. payment_statuses RLSポリシー
create policy "payment_statuses_select_member" on payment_statuses for select
  using (
    event_id in (
      select id from events where group_id in (select get_my_group_ids())
    )
  );

create policy "payment_statuses_insert_moderator" on payment_statuses for insert
  with check (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

create policy "payment_statuses_update_own_claim" on payment_statuses for update
  using (
    user_id = auth.uid()
    and status = 'unpaid'
  )
  with check (
    status = 'claimed'
  );

create policy "payment_statuses_update_moderator" on payment_statuses for update
  using (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );
