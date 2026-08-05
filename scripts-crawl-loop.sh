#!/usr/bin/env bash
# Serbia crawl supervisor: restart the harvester until the sitemap is exhausted.
# Each iteration resumes from the DB, so a crash costs only a restart.
cd /c/dev/continuum-alternatives/packages/pipeline || exit 1
for i in $(seq 1 400); do
  echo "=== iteration $i @ $(date +%H:%M:%S) ==="
  pnpm exec tsx src/serbia-kompanije.ts crawl 2>&1 | grep -E "already done|crawl done|Error:" | tail -5
  n=$(pnpm exec tsx src/rs-count.ts 2>/dev/null | grep -oE '^[0-9]+' | head -1)
  echo "count: $n/4166"
  if [ -n "$n" ] && [ "$n" -ge 4160 ]; then echo "=== ALL DONE ==="; break; fi
  sleep 3
done
