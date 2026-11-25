#!/bin/sh
# Run-2 measurements, one after another (never in parallel: they share the machine).
# Needs: bun run build:both && bun run build:virtual
set -x
export PLAYWRIGHT_BROWSERS_PATH=0
PW=./node_modules/.bin/playwright
ALL="--project chromium --project firefox --project webkit --project chrome"
SERVE=brotli BENCH_LABEL=brotli $PW test tests/bench.pw.ts $ALL
SERVE=brotli THROTTLE=slow4g-cpu4 BENCH_LABEL=brotli-slow4g-cpu4 $PW test tests/bench.pw.ts --project chromium
VARIANT=virtual SERVE=brotli BENCH_LABEL=virtual-brotli $PW test tests/bench.pw.ts $ALL
VARIANT=virtual SERVE=brotli THROTTLE=slow4g-cpu4 BENCH_LABEL=virtual-slow4g-cpu4 $PW test tests/bench.pw.ts --project chromium
SERVE=brotli $PW test tests/verify.pw.ts -g "web vitals" $ALL
SERVE=brotli THROTTLE=slow4g-cpu4 $PW test tests/verify.pw.ts -g "web vitals" --project chromium
VARIANT=virtual SERVE=brotli $PW test tests/verify.pw.ts -g "web vitals" $ALL
node scripts/real-firefox.mjs
for label in brotli brotli-slow4g-cpu4; do node scripts/report.mjs $label > /dev/null; done
for label in virtual-brotli virtual-slow4g-cpu4; do VARIANT=virtual node scripts/report.mjs $label > /dev/null; done
node scripts/report.mjs real-browsers > /dev/null
echo RUN2-DONE
