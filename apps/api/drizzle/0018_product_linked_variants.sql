create table product_linked_variants (
  id text primary key,
  parent_product_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  trendyol_url text not null,
  trendyol_url_normalized text not null,
  source_product_id text,
  title text not null,
  brand text,
  description_raw text,
  attributes_raw text,
  images_raw text,
  current_price integer,
  current_stock_state text not null,
  last_checked_at integer not null,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);

create unique index product_linked_variants_owner_url_unique
  on product_linked_variants (owner_key, trendyol_url_normalized);

create index product_linked_variants_parent_created_idx
  on product_linked_variants (parent_product_id, created_at desc);

create index product_linked_variants_owner_parent_idx
  on product_linked_variants (owner_key, parent_product_id);
