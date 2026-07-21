create table product_etsy_links (
  id text primary key,
  product_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  etsy_url text not null,
  etsy_url_normalized text not null,
  etsy_listing_id text,
  created_at integer not null default (unixepoch() * 1000)
);

create unique index product_etsy_links_owner_etsy_url_unique
  on product_etsy_links (owner_key, etsy_url_normalized);

create index product_etsy_links_product_id_idx
  on product_etsy_links (product_id, created_at desc);

create index product_etsy_links_owner_listing_id_idx
  on product_etsy_links (owner_key, etsy_listing_id);
