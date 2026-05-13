#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVER_HOST="${SERVER_HOST:-plotfolio-prod}"
APP_DIR="${APP_DIR:-/home/deploy/plotfolio}"
BRANCH="${BRANCH:-development}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/plotfolio_deploy_ed25519}"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local in $ROOT_DIR"
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY"
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1 || ! command -v scp >/dev/null 2>&1; then
  echo "ssh/scp is required"
  exit 1
fi

local_mongo_uri="$(grep -E '^MONGODB_URI=' .env.local | head -1 | cut -d'=' -f2-)"
if [[ -z "$local_mongo_uri" ]]; then
  echo "MONGODB_URI is missing in .env.local"
  exit 1
fi

prod_mongo_uri="$(printf '%s' "$local_mongo_uri" | sed -E 's#/(plotfolio-[^/?]*)#/plotfolio-prod#')"
if [[ "$prod_mongo_uri" != *"/plotfolio-prod"* ]]; then
  echo "Could not safely derive plotfolio-prod Mongo URI from local MONGODB_URI"
  exit 1
fi

tmp_env="$(mktemp /tmp/plotfolio-prod-env.XXXXXX)"
cleanup() {
  rm -f "$tmp_env"
}
trap cleanup EXIT

awk -v mongo_uri="$prod_mongo_uri" '
  BEGIN { hasNextAuth=0; hasAppUrl=0; hasMongoUri=0; hasMongoDb=0 }
  /^NEXTAUTH_URL=/ { print "NEXTAUTH_URL=https://plotfolio.app"; hasNextAuth=1; next }
  /^NEXT_PUBLIC_APP_URL=/ { print "NEXT_PUBLIC_APP_URL=https://plotfolio.app"; hasAppUrl=1; next }
  /^MONGODB_URI=/ { print "MONGODB_URI=" mongo_uri; hasMongoUri=1; next }
  /^MONGODB_DB=/ { print "MONGODB_DB=plotfolio-prod"; hasMongoDb=1; next }
  { print }
  END {
    if (!hasNextAuth) print "NEXTAUTH_URL=https://plotfolio.app"
    if (!hasAppUrl) print "NEXT_PUBLIC_APP_URL=https://plotfolio.app"
    if (!hasMongoUri) print "MONGODB_URI=" mongo_uri
    if (!hasMongoDb) print "MONGODB_DB=plotfolio-prod"
  }
' .env.local > "$tmp_env"

echo "Syncing hardened prod env to $SERVER_HOST ..."
scp -q -i "$SSH_KEY" "$tmp_env" "$SERVER_HOST:/tmp/.env.local.prod"

ssh -i "$SSH_KEY" "$SERVER_HOST" "set -e
install -m 600 -o deploy -g deploy /tmp/.env.local.prod $APP_DIR/.env.local
rm -f /tmp/.env.local.prod
grep -E '^(MONGODB_URI|MONGODB_DB|NEXTAUTH_URL|NEXT_PUBLIC_APP_URL)=' $APP_DIR/.env.local
grep -q '^MONGODB_DB=plotfolio-prod$' $APP_DIR/.env.local
grep -q '^MONGODB_URI=.*plotfolio-prod' $APP_DIR/.env.local
"

echo "Deploying branch $BRANCH to $SERVER_HOST ..."
ssh -i "$SSH_KEY" "$SERVER_HOST" "su - deploy -c 'cd $APP_DIR && git fetch origin $BRANCH && git reset --hard origin/$BRANCH && npm ci && npm run build && pm2 reload ecosystem.config.cjs --update-env && pm2 save'"

echo "Smoke check ..."
curl -sS -o /dev/null -w 'Apex: %{http_code}\n' --max-time 15 https://plotfolio.app/
curl -sS -o /dev/null -w 'Marketplace: %{http_code}\n' --max-time 15 https://plotfolio.app/marketplace

echo "Production deploy complete with forced plotfolio-prod DB target."
