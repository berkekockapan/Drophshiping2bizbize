alter table products add column user_category_id text;

create index products_owner_category_created_idx
  on products(owner_key, user_category_id, created_at);

create table product_categories (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  created_at integer not null,
  updated_at integer not null
);

create unique index product_categories_owner_name_unique
  on product_categories(owner_key, lower(trim(name)));

create index product_categories_owner_name_idx
  on product_categories(owner_key, lower(trim(name)));
