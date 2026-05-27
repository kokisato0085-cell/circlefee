-- メンバーバッジ機能（大方針S / Issue #23）

-- 学年バッジ: membershipsにgradeカラム追加
alter table memberships
  add column grade smallint check (grade >= 1 and grade <= 4);

-- 係バッジ定義テーブル
create table group_roles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 20),
  created_at timestamptz not null default now(),
  unique(group_id, name)
);

-- 係の割り当てテーブル
create table member_roles (
  id uuid primary key default gen_random_uuid(),
  group_role_id uuid not null references group_roles(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_role_id, membership_id)
);

-- RLS有効化
alter table group_roles enable row level security;
alter table member_roles enable row level security;

-- group_roles RLS: 同グループメンバーはSELECT可、部長のみ変更可
create policy "group_roles_select" on group_roles for select using (
  exists (select 1 from memberships where memberships.group_id = group_roles.group_id and memberships.user_id = auth.uid())
);
create policy "group_roles_insert" on group_roles for insert with check (
  exists (select 1 from memberships where memberships.group_id = group_roles.group_id and memberships.user_id = auth.uid() and memberships.role = 'leader')
);
create policy "group_roles_delete" on group_roles for delete using (
  exists (select 1 from memberships where memberships.group_id = group_roles.group_id and memberships.user_id = auth.uid() and memberships.role = 'leader')
);

-- member_roles RLS: 同グループメンバーはSELECT可、部長のみ変更可
create policy "member_roles_select" on member_roles for select using (
  exists (
    select 1 from memberships m
    join group_roles gr on gr.id = member_roles.group_role_id
    where m.group_id = gr.group_id and m.user_id = auth.uid()
  )
);
create policy "member_roles_insert" on member_roles for insert with check (
  exists (
    select 1 from memberships m
    join group_roles gr on gr.id = member_roles.group_role_id
    where m.group_id = gr.group_id and m.user_id = auth.uid() and m.role = 'leader'
  )
);
create policy "member_roles_delete" on member_roles for delete using (
  exists (
    select 1 from memberships m
    join group_roles gr on gr.id = member_roles.group_role_id
    where m.group_id = gr.group_id and m.user_id = auth.uid() and m.role = 'leader'
  )
);
