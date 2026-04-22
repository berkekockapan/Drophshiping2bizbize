alter table source_products add column user_category_id text;

create table source_product_etsy_shops (
  source_product_id text not null,
  shop_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  created_at integer not null,
  primary key (source_product_id, shop_id)
);

create index source_product_etsy_shops_owner_source_product_idx
  on source_product_etsy_shops(owner_key, source_product_id);

create index source_product_etsy_shops_shop_created_idx
  on source_product_etsy_shops(shop_id, created_at desc);
