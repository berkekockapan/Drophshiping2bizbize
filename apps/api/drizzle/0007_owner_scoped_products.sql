alter table products add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
alter table products add column deleted_at integer;
alter table products add column deleted_reason text;

drop index if exists products_trendyol_url_unique;
create unique index products_owner_trendyol_active_unique
  on products(owner_key, trendyol_url)
  where deleted_at is null;
create index products_owner_deleted_created_idx
  on products(owner_key, deleted_at, created_at);

alter table notifications add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
update notifications
set owner_key = coalesce(
  (
    select owner_key
    from products
    where products.id = notifications.product_id
    limit 1
  ),
  'berke'
);
create index notifications_owner_created_idx on notifications(owner_key, created_at);

alter table manual_refresh_runs add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
update manual_refresh_runs
set owner_key = coalesce(
  (
    select products.owner_key
    from manual_refresh_run_items
    join products on products.id = manual_refresh_run_items.product_id
    where manual_refresh_run_items.run_id = manual_refresh_runs.id
    limit 1
  ),
  'berke'
);
create index manual_refresh_runs_owner_status_created_idx on manual_refresh_runs(owner_key, status, created_at);
