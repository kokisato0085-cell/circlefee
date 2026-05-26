-- 支払い申告メモ機能（大方針Q / Issue #13）
-- payment_statusesに申告メモ用カラムを追加

alter table payment_statuses
  add column claim_date date,
  add column claim_place text check (char_length(claim_place) <= 200),
  add column claim_recipient text check (char_length(claim_recipient) <= 100);
