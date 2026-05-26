-- 支払い申告メッセージ機能（Issue #14）
-- 申告者が任意の備考メッセージを添付できるようにする

alter table payment_statuses
  add column claim_message text check (char_length(claim_message) <= 500);
