-- 010: コードレビュー指摘修正

-- H3: push_subscriptionsにUPDATEポリシー追加（upsert対応）
create policy "push_subscriptions_update_own" on push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- M7: 退会済みユーザー対応はprofiles FK制約(→auth.users)により
-- sentinel行挿入不可。アプリ側でprofile欠損時に「退会済みユーザー」表示で対応。
