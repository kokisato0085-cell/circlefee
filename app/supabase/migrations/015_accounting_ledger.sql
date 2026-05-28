-- 015: サークル会計帳簿（大方針V）
-- account_entries: 入出金記録
-- expense_categories: 支出カテゴリ

-- ============================================================
-- expense_categories テーブル
-- ============================================================
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_categories_group ON expense_categories(group_id);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: 同グループメンバー
CREATE POLICY "expense_categories_select_member" ON expense_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = expense_categories.group_id
        AND memberships.user_id = auth.uid()
    )
  );

-- INSERT: 権限者以上
CREATE POLICY "expense_categories_insert_authorized" ON expense_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = expense_categories.group_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('leader', 'moderator')
    )
  );

-- DELETE: 権限者以上
CREATE POLICY "expense_categories_delete_authorized" ON expense_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = expense_categories.group_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('leader', 'moderator')
    )
  );

-- ============================================================
-- account_entries テーブル
-- ============================================================
CREATE TABLE account_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  date DATE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_entries_group ON account_entries(group_id);
CREATE INDEX idx_account_entries_group_date ON account_entries(group_id, date);
CREATE INDEX idx_account_entries_event ON account_entries(event_id);

ALTER TABLE account_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: 同グループメンバー
CREATE POLICY "account_entries_select_member" ON account_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = account_entries.group_id
        AND memberships.user_id = auth.uid()
    )
  );

-- INSERT: 権限者以上
CREATE POLICY "account_entries_insert_authorized" ON account_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = account_entries.group_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('leader', 'moderator')
    )
  );

-- UPDATE: 権限者以上
CREATE POLICY "account_entries_update_authorized" ON account_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = account_entries.group_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('leader', 'moderator')
    )
  );

-- DELETE: 権限者以上
CREATE POLICY "account_entries_delete_authorized" ON account_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.group_id = account_entries.group_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('leader', 'moderator')
    )
  );
