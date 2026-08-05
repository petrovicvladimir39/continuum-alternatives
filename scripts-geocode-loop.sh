#!/usr/bin/env bash
# Register-address geocoding supervisor: restart until no RS entity with a
# street address lacks precise coordinates. Resumable by construction.
cd /c/dev/continuum-alternatives/packages/pipeline || exit 1
for i in $(seq 1 400); do
  echo "=== geocode iteration $i @ $(date +%H:%M:%S) ==="
  pnpm exec tsx src/serbia-geocode.ts 2>&1 | grep -E "without precise|done:|rooftop |Error:" | tail -5
  sleep 3
done
