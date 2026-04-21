create table etsy_shops (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  etsy_shop_url text not null check (length(trim(etsy_shop_url)) > 0),
  description text,
  created_at integer not null,
  updated_at integer not null
);

create unique index etsy_shops_owner_name_unique
  on etsy_shops(owner_key, lower(trim(name)));

create index etsy_shops_owner_created_idx
  on etsy_shops(owner_key, created_at desc);

create table product_etsy_shops (
  product_id text not null,
  shop_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  created_at integer not null,
  primary key (product_id, shop_id)
);

create index product_etsy_shops_shop_created_idx
  on product_etsy_shops(shop_id, created_at desc);

create index product_etsy_shops_owner_product_idx
  on product_etsy_shops(owner_key, product_id);
