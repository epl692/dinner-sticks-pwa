#!/bin/sh
# Runs at container start (nginx image runs everything in /docker-entrypoint.d). Writes the runtime config the app
# reads on launch. With RELAY_URL unset the app keeps its built-in default sync server.
set -eu
out=/usr/share/nginx/html/config.json
if [ -n "${RELAY_URL:-}" ]; then
  # Refuse anything that could break out of the JSON string.
  case "$RELAY_URL" in
    *\"*|*\\*|*[[:space:]]*) echo "RELAY_URL must not contain quotes, backslashes or spaces" >&2; exit 1 ;;
  esac
  printf '{ "relayUrl": "%s" }\n' "$RELAY_URL" > "$out"
  echo "dinner-sticks: sync server set to $RELAY_URL"
else
  printf '{}\n' > "$out"
  echo "dinner-sticks: RELAY_URL not set, using the app's default sync server"
fi
