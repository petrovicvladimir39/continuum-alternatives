#!/usr/bin/env bash
# Website-enrichment supervisor: restart until every RS site with a website
# has a website_crawl provenance envelope. Resumable by construction.
cd /c/dev/continuum-alternatives/packages/pipeline || exit 1
for i in $(seq 1 400); do
  echo "=== enrich iteration $i @ $(date +%H:%M:%S) ==="
  pnpm exec tsx src/serbia-site-enrich.ts 2>&1 | grep -E "entities with a website|done:|logos |Error:" | tail -6
  sleep 3
done
