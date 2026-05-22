-- Phase 1: 初期スキーマ（profiles, groups, memberships, invite_links, join_requests）

-- profiles: ユーザー情報（Auth連携）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  email text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own_email"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_select_display_name"
  on profiles for select
  using (
    exists (
      select 1 from memberships m1
      join memberships m2 on m1.group_id = m2.group_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auth登録時にprofilesレコードを自動作成するトリガー
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'ユーザー'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- groups: グループ（サークル）
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  password_hash text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table groups enable row level security;

create policy "groups_select_member"
  on groups for select
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = groups.id
      and memberships.user_id = auth.uid()
    )
  );

create policy "groups_insert_authenticated"
  on groups for insert
  with check (auth.uid() = created_by);

create policy "groups_update_leader"
  on groups for update
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = groups.id
      and memberships.user_id = auth.uid()
      and memberships.role = 'leader'
    )
  );

-- memberships: グループ所属・ロール
create type member_role as enum ('leader', 'moderator', 'member');

create table memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id),
  role member_role not null default 'member',
  version integer not null default 1,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table memberships enable row level security;

create policy "memberships_select_same_group"
  on memberships for select
  using (
    exists (
      select 1 from memberships m
      where m.group_id = memberships.group_id
      and m.user_id = auth.uid()
    )
  );

create policy "memberships_insert_leader"
  on memberships for insert
  with check (
    exists (
      select 1 from memberships m
      where m.group_id = memberships.group_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
    )
    or
    -- グループ作成時に自分を部長として追加する場合
    (memberships.user_id = auth.uid() and memberships.role = 'leader')
  );

create policy "memberships_update_leader"
  on memberships for update
  using (
    exists (
      select 1 from memberships m
      where m.group_id = memberships.group_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
    )
  );

create policy "memberships_delete_leader"
  on memberships for delete
  using (
    exists (
      select 1 from memberships m
      where m.group_id = memberships.group_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
    )
  );

-- invite_links: 招待リンク
create table invite_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table invite_links enable row level security;

create policy "invite_links_select_member"
  on invite_links for select
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = invite_links.group_id
      and memberships.user_id = auth.uid()
    )
  );

create policy "invite_links_select_by_token"
  on invite_links for select
  using (true);

create policy "invite_links_insert_leader"
  on invite_links for insert
  with check (
    exists (
      select 1 from memberships
      where memberships.group_id = invite_links.group_id
      and memberships.user_id = auth.uid()
      and memberships.role = 'leader'
    )
  );

-- join_requests: 参加リクエスト
create type join_request_status as enum ('pending', 'approved', 'rejected');

create table join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id),
  status join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table join_requests enable row level security;

create policy "join_requests_select_leader"
  on join_requests for select
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = join_requests.group_id
      and memberships.user_id = auth.uid()
      and memberships.role = 'leader'
    )
  );

create policy "join_requests_select_own"
  on join_requests for select
  using (auth.uid() = user_id);

create policy "join_requests_insert_authenticated"
  on join_requests for insert
  with check (auth.uid() = user_id);

create policy "join_requests_update_leader"
  on join_requests for update
  using (
    exists (
      select 1 from memberships
      where memberships.group_id = join_requests.group_id
      and memberships.user_id = auth.uid()
      and memberships.role = 'leader'
    )
  );
