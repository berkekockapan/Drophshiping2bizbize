CREATE TABLE IF NOT EXISTS prompt_library_pages (
  id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS prompt_library_pages_owner_active_sort_idx
  ON prompt_library_pages(owner_key, deleted_at, sort_order, updated_at);

CREATE TABLE IF NOT EXISTS prompt_library_cards (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  owner_key TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'normal' CHECK (card_type IN ('master', 'normal')),
  title TEXT NOT NULL,
  prompt_markdown TEXT NOT NULL DEFAULT '',
  image_r2_key TEXT,
  image_content_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (page_id) REFERENCES prompt_library_pages(id)
);

CREATE INDEX IF NOT EXISTS prompt_library_cards_owner_page_active_sort_idx
  ON prompt_library_cards(owner_key, page_id, deleted_at, card_type, sort_order, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS prompt_library_cards_one_active_master_per_page
  ON prompt_library_cards(page_id)
  WHERE card_type = 'master' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS prompt_library_revisions (
  id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'card')),
  entity_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS prompt_library_revisions_entity_created_idx
  ON prompt_library_revisions(entity_type, entity_id, created_at);
