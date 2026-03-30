create table tariff_master_us_entries (
  id text primary key,
  hts_code_8 text not null,
  hts_code_10 text not null,
  description text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  duty_summary text not null,
  source_revision text not null,
  source_url text,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
);

alter table tariff_classification_catalog add column profile_name text;
alter table tariff_classification_catalog add column confidence_mode text not null default 'low_confidence';
alter table tariff_classification_catalog add column master_entry_id text;
alter table tariff_classification_catalog add column default_shipentegra_usd real;

create table product_variant_cost_overrides (
  variant_id text primary key,
  product_id text not null,
  owner_key text not null,
  manual_product_cost_amount real,
  manual_product_cost_currency text,
  manual_shipping_cost_amount real,
  manual_shipping_cost_currency text,
  created_at integer not null,
  updated_at integer not null
);
