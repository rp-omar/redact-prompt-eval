#!/bin/sh
# Run-2 timing conditions, one after another (never in parallel: they share the machine).
set -x
export PLAYWRIGHT_BROWSERS_PATH=0
PW=./node_modules/.bin/playwright
SERVE=brotli BENCH_LABEL=brotli $PW test tests/bench.pw.ts
SERVE=brotli THROTTLE=slow4g-cpu4 BENCH_LABEL=brotli-slow4g-cpu4 $PW test tests/bench.pw.ts --project chromium
VARIANT=virtual SERVE=brotli BENCH_LABEL=virtual-brotli $PW test tests/bench.pw.ts
VARIANT=virtual SERVE=brotli THROTTLE=slow4g-cpu4 BENCH_LABEL=virtual-slow4g-cpu4 $PW test tests/bench.pw.ts --project chromium
