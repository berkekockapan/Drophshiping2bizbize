create table tariff_classification_catalog (
  id text primary key,
  canonical_hs6 text not null,
  title text not null,
  description text,
  keywords_json text,
  source_type text not null,
  source_version text not null,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
);

create index tariff_classification_catalog_hs6_idx
  on tariff_classification_catalog (canonical_hs6);

create table tariff_classification_us_profiles (
  id text primary key,
  catalog_id text not null,
  htsus_code text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  summary_text text not null,
  revision_label text not null,
  created_at integer not null,
  updated_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id)
);

create unique index tariff_classification_us_profiles_catalog_id_unique
  on tariff_classification_us_profiles (catalog_id);

create table product_tariff_analysis_runs (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  status text not null,
  used_ai integer not null default 0,
  input_snapshot_json text not null,
  result_snapshot_json text,
  engine_version text not null,
  created_at integer not null,
  completed_at integer
);

create index product_tariff_analysis_runs_product_created_idx
  on product_tariff_analysis_runs (product_id, created_at desc);

create index product_tariff_analysis_runs_owner_product_created_idx
  on product_tariff_analysis_runs (owner_key, product_id, created_at desc);

create table product_tariff_selection (
  product_id text primary key,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  selection_source text not null,
  selected_by text not null,
  selected_at integer not null,
  analysis_run_id text,
  created_at integer not null,
  updated_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id),
  foreign key (us_profile_id) references tariff_classification_us_profiles(id),
  foreign key (analysis_run_id) references product_tariff_analysis_runs(id)
);

create index product_tariff_selection_owner_catalog_idx
  on product_tariff_selection (owner_key, catalog_id);

create table tariff_knowledge_candidates (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  candidate_source text not null,
  payload_json text not null,
  status text not null,
  submitted_by text not null,
  submitted_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id),
  foreign key (us_profile_id) references tariff_classification_us_profiles(id)
);

create index tariff_knowledge_candidates_owner_status_submitted_idx
  on tariff_knowledge_candidates (owner_key, status, submitted_at desc);
