create table source_products (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  source_title text not null,
  source_url text not null,
  source_url_normalized text not null,
  source_platform text not null check (source_platform in ('SHOPIER', 'CUSTOM_SITE', 'OTHER')),
  note text,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);

create unique index source_products_owner_source_url_unique
  on source_products (owner_key, source_url_normalized);

create index source_products_owner_updated_at_idx
  on source_products (owner_key, updated_at);

create table source_product_etsy_links (
  id text primary key,
  source_product_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  etsy_url text not null,
  etsy_url_normalized text not null,
  etsy_listing_id text,
  created_at integer not null default (unixepoch() * 1000)
);

create unique index source_product_etsy_links_owner_etsy_url_unique
  on source_product_etsy_links (owner_key, etsy_url_normalized);

create index source_product_etsy_links_source_product_id_idx
  on source_product_etsy_links (source_product_id, created_at desc);

create index source_product_etsy_links_owner_listing_id_idx
  on source_product_etsy_links (owner_key, etsy_listing_id);
