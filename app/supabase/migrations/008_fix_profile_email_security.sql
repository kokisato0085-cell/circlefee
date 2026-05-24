-- 008: profiles.email列を削除しemail漏洩リスクを解消
-- RLSは行レベル制御のためカラム単位の制限不可。emailをprofilesから除去し、
-- auth.getUser()経由でのみ本人が取得可能にする。

-- 1. email列を削除
alter table profiles drop column email;

-- 2. トリガー関数を更新（email列への挿入を除去）
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'ユーザー')
  );
  return new;
end;
$$ language plpgsql security definer;
