-- 大方針O: イベント投票機能
-- 適用: Supabase SQL Editor にて実行

-- 1. event_polls テーブル（1イベントにつき1投票）
create table event_polls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 50),
  created_at timestamptz not null default now()
);

-- 2. event_poll_options テーブル（選択肢 2〜10個）
create table event_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references event_polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 20),
  sort_order integer not null default 0
);

-- 3. event_poll_votes テーブル（1人1票）
create table event_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references event_polls(id) on delete cascade,
  user_id uuid not null references profiles(id),
  option_id uuid not null references event_poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

-- 4. RLS有効化
alter table event_polls enable row level security;
alter table event_poll_options enable row level security;
alter table event_poll_votes enable row level security;

-- 5. event_polls RLSポリシー
create policy "event_polls_select_member" on event_polls for select
  using (
    event_id in (
      select id from events where group_id in (select get_my_group_ids())
    )
  );

create policy "event_polls_insert_moderator" on event_polls for insert
  with check (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

create policy "event_polls_update_moderator" on event_polls for update
  using (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

create policy "event_polls_delete_moderator" on event_polls for delete
  using (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

-- 6. event_poll_options RLSポリシー
create policy "event_poll_options_select_member" on event_poll_options for select
  using (
    poll_id in (
      select ep.id from event_polls ep
      join events e on e.id = ep.event_id
      where e.group_id in (select get_my_group_ids())
    )
  );

create policy "event_poll_options_insert_moderator" on event_poll_options for insert
  with check (
    poll_id in (
      select ep.id from event_polls ep
      join events e on e.id = ep.event_id
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

create policy "event_poll_options_update_moderator" on event_poll_options for update
  using (
    poll_id in (
      select ep.id from event_polls ep
      join events e on e.id = ep.event_id
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

create policy "event_poll_options_delete_moderator" on event_poll_options for delete
  using (
    poll_id in (
      select ep.id from event_polls ep
      join events e on e.id = ep.event_id
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid()
      and m.role in ('leader', 'moderator')
    )
  );

-- 7. event_poll_votes RLSポリシー
create policy "event_poll_votes_select_member" on event_poll_votes for select
  using (
    poll_id in (
      select ep.id from event_polls ep
      join events e on e.id = ep.event_id
      where e.group_id in (select get_my_group_ids())
    )
  );

create policy "event_poll_votes_insert_own" on event_poll_votes for insert
  with check (user_id = auth.uid());

create policy "event_poll_votes_update_own" on event_poll_votes for update
  using (user_id = auth.uid());

create policy "event_poll_votes_delete_own" on event_poll_votes for delete
  using (user_id = auth.uid());
