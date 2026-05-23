-- Phase 4: 通知テーブル + push_subscriptions
-- 適用: Supabase SQL Editor にて実行

-- 1. 通知種別enum
create type notification_type as enum (
  'payment_claimed',
  'payment_approved',
  'payment_rejected',
  'reminder',
  'event_created',
  'join_request',
  'leader_transferred'
);

-- 2. notifications テーブル
create table notifications (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  target_user_id uuid not null references profiles(id),
  type notification_type not null,
  message text not null check (char_length(message) between 1 and 200),
  is_read boolean not null default false,
  related_event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_notifications_target on notifications(target_user_id, is_read, created_at desc);

-- 3. push_subscriptions テーブル（Web Push用、Phase 4後半で使用）
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  keys_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- 4. RLS有効化
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- 5. notifications RLSポリシー
create policy "notifications_select_own" on notifications for select
  using (target_user_id = auth.uid());

create policy "notifications_update_own" on notifications for update
  using (target_user_id = auth.uid())
  with check (target_user_id = auth.uid());

create policy "notifications_insert_member" on notifications for insert
  with check (
    group_id in (select get_my_group_ids())
  );

create policy "notifications_delete_own" on notifications for delete
  using (target_user_id = auth.uid());

-- 6. push_subscriptions RLSポリシー
create policy "push_subscriptions_select_own" on push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own" on push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own" on push_subscriptions for delete
  using (user_id = auth.uid());

-- 7. Realtimeを有効化（通知テーブル）
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table payment_statuses;
alter publication supabase_realtime add table events;
