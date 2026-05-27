-- 大方針U: 特別イベントメンバー選択制 + メンバー削除時のRLS修正
-- payment_statuses DELETEポリシー追加（部長がメンバー削除時に残データを消せるように）
-- special_payment_statusesのDELETEポリシー追加（権限者/フォーム内権限者がメンバー削除可能に）
-- INSERTポリシー更新（フォーム内権限者もメンバー追加可能に）

-- 0. payment_statuses DELETEポリシー追加（部長/権限者がメンバー削除時に必要）
create policy "payment_statuses_delete_authorized" on payment_statuses for delete
  using (
    event_id in (
      select e.id from events e
      join memberships m on m.group_id = e.group_id
      where m.user_id = auth.uid() and m.role in ('leader', 'moderator')
    )
  );

-- 1. special_payment_statuses DELETEポリシー追加
create policy "special_payment_statuses_delete_authorized" on special_payment_statuses for delete
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

-- 2. INSERTポリシー更新（フォーム内権限者を追加）
drop policy "special_payment_statuses_insert_authorized" on special_payment_statuses;
create policy "special_payment_statuses_insert_authorized" on special_payment_statuses for insert
  with check (
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
