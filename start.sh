#!/bin/bash

# Set a default if not passed
export REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8000}

# Inject the runtime API URL into config.js
CONFIG_PATH="/app/CLI/Local-CLI/local-cli-fe-full/public/config.js"
TEMPLATE_PATH="/app/CLI/Local-CLI/local-cli-fe-full/public/config.template.js"
sed "s|__REACT_APP_API_URL__|$REACT_APP_API_URL|g" "$TEMPLATE_PATH" > "$CONFIG_PATH"

# Build frontend
cd /app/CLI/Local-CLI/local-cli-fe-full
npm run build

# Start backend and frontend
cd /app
$VIRTUAL_ENV/bin/uvicorn CLI.Local-CLI.local-cli-backend.main:app --host 0.0.0.0 --port 8000 &

serve -s /app/CLI/Local-CLI/local-cli-fe-full/build -l 3001
