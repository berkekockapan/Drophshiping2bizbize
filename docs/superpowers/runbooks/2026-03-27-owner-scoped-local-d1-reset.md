# Local D1 backup/reset before owner-scoped migration

1. Stop any running `wrangler dev` process.
2. Create a timestamped backup folder:
   `New-Item -ItemType Directory -Force .backup`
3. Copy the current local D1 files:
   `Copy-Item .wrangler/state/v3/d1 .backup/d1-before-owner-scope-2026-03-27 -Recurse`
4. If a clean start is needed, delete local state:
   `Remove-Item .wrangler/state/v3/d1 -Recurse -Force`
5. Re-apply migrations:
   `pnpm --filter @trendyol-etsy/api dev`
