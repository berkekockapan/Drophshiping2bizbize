alter table source_products add column source_category_id text;
alter table source_products add column sort_order integer;
alter table source_products add column deleted_at integer;
alter table source_products add column deleted_reason text;

create table source_product_categories (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  created_at integer not null,
  updated_at integer not null
);

create unique index source_product_categories_owner_name_unique
  on source_product_categories(owner_key, lower(trim(name)));

create index source_product_categories_owner_name_idx
  on source_product_categories(owner_key, lower(trim(name)));

create index source_products_owner_active_category_sort_idx
  on source_products(owner_key, deleted_at, source_category_id, sort_order, created_at);

create index source_products_owner_deleted_idx
  on source_products(owner_key, deleted_at, created_at);

with ranked as (
  select
    id,
    row_number() over (
      partition by owner_key
      order by created_at asc, id asc
    ) - 1 as next_sort
  from source_products
  where deleted_at is null
)
update source_products
set sort_order = (
  select next_sort
  from ranked
  where ranked.id = source_products.id
)
where id in (select id from ranked);
