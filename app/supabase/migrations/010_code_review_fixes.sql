-- 010: コードレビュー指摘修正

-- H3: push_subscriptionsにUPDATEポリシー追加（upsert対応）
create policy "push_subscriptions_update_own" on push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- M7: アカウント削除用ダミーユーザーをprofilesに作成（FK制約対応）
-- anonymize_user関数でダミーUUIDに置換する際にFK違反を防ぐ
insert into profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000000', '退会済みユーザー')
on conflict (id) do nothing;
