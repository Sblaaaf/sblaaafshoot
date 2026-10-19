#!/bin/sh
# Installe les dépendances dans le volume nommé node_modules quand
# package-lock.json a changé depuis la dernière installation.
# Évite d'avoir à lancer `npm ci` à la main après chaque pull.
set -e

lock_hash_file=node_modules/.package-lock.sha256

if [ -f package-lock.json ]; then
  current_hash=$(sha256sum package-lock.json | cut -d' ' -f1)
  if [ ! -f "$lock_hash_file" ] || [ "$(cat "$lock_hash_file")" != "$current_hash" ]; then
    echo "[entrypoint] package-lock.json modifié : npm ci…"
    npm ci --no-audit --no-fund
    echo "$current_hash" > "$lock_hash_file"
  fi
fi

exec "$@"
