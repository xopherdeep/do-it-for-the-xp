#!/usr/bin/env bash
# Usage: [CONFIG=vue.config.js] [COLD=1] tools/bench/build-bench.sh <build|serve> [run-label]
# serve mode: one run = cold start + HMR rebuild; results append to bench.tsv
set -u
cd "$(dirname "$0")/../.."
MODE=${1:-build}; RUN=${2:-1}
CONFIG=${CONFIG:-vue.config.js}
SP=${BENCH_DIR:-${TMPDIR:-/tmp}/xp-bench}; mkdir -p "$SP"
TSV=$SP/bench.tsv; DEST=$SP/bench-dist; LOG=$SP/bench-${CONFIG%.js}-$MODE-${COLD:-0}-$RUN-$$.log; PORT=8199
export VUE_CLI_SERVICE_CONFIG_PATH=$PWD/$CONFIG
[ "${COLD:-0}" = 1 ] && rm -rf node_modules/.cache/webpack
# wait up to 3 min for 1-min load <= 8 (WAIT=0 skips)
for _ in $(seq 9); do [ "${WAIT:-1}" = 0 ] && break; [ "$(cut -d. -f1 /proc/loadavg)" -le 8 ] && break; sleep 20; done
errs() { grep -ciE 'ERROR in|Failed to compile|Module build failed' "$LOG"; }
now() { date +%s.%N; }
rec() { printf '%s\t%s\t%s\t%s\t%s\t%s\tload=%s\n' "$CONFIG" "$1" "$RUN" "$2" "$(git rev-parse --short HEAD)" "$(date -Is)" "$(cut -d' ' -f1 /proc/loadavg)" >> "$TSV"; echo "$1 ${2}s cold=${COLD:-0} errs=$(errs) load=$(cut -d' ' -f1 /proc/loadavg)"; }
secs() { awk "BEGIN{printf \"%.1f\", $2-$1}"; }
compiles() { grep -ciE 'compiled successfully|compiled with [0-9]* ?warning' "$LOG" 2>/dev/null; }

if [ "$MODE" = build ]; then
  rm -rf "$DEST"; t0=$(now)
  npx vue-cli-service build --dest "$DEST" >"$LOG" 2>&1; rc=$?
  t=$(secs "$t0" "$(now)"); [ $rc != 0 ] && echo "build exit=$rc (check $LOG; foreign errors?)"
  rec build "$t"; grep -E 'error +in ' "$LOG" | sort | uniq -c | head -5
  echo "dist $(du -sh "$DEST" | cut -f1) largest-js $(find "$DEST" -name '*.js' -printf '%s %f\n' | sort -n | tail -1)"
elif [ "$MODE" = serve ]; then
  t0=$(now)
  npx vue-cli-service serve --port $PORT >"$LOG" 2>&1 &
  trap 'kill $(lsof -ti:$PORT) 2>/dev/null; kill $! 2>/dev/null' EXIT
  wait_compile() { # $1 = compile count to exceed
    for _ in $(seq 1800); do [ "$(compiles)" -gt "$1" ] && return 0; sleep 0.2; done; echo TIMEOUT; tail -20 "$LOG"; return 1
  }
  wait_compile 0 || exit 1
  rec serve_start "$(secs "$t0" "$(now)")"
  sleep "${SETTLE:-45}" # let webpack finish writing its fs cache pack
  for i in 1 2 3; do
    n=$(compiles); t1=$(now); touch src/App.vue
    wait_compile "$n" || exit 1
    rec "serve_hmr$i" "$(secs "$t1" "$(now)")"; [ $i -lt 3 ] && sleep 15
  done
  curl -s http://localhost:$PORT/ | head -c 300; echo
  js=$(curl -s http://localhost:$PORT/ | grep -o 'src="[^"]*\.js[^"]*"' | head -1 | cut -d'"' -f2)
  echo "chunk $js -> $(curl -s -o /dev/null -w '%{http_code} %{size_download}B' "http://localhost:$PORT${js#.}")"
else echo "mode: build|serve"; exit 2; fi
