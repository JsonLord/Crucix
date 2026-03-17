#!/bin/bash


echo "--- Starting background services ---"
# --- DIAGNOSTIC LINES TO CHECK THE VARIABLE ---
echo "--- CHECKING ENVIRONMENT VARIABLES ---"
echo "DATABASE_URL is set to: $DATABASE_URL"
echo "------------------------------------"
(
  echo "[+] Launching mem0 server on port 7000..."
  python3 -m uvicorn mem0.server.main:app --host 0.0.0.0 --port 7000
) > /tmp/mem0.log 2>&1 &

(
  echo "[+] Launching mcp-mem0 server on port 8000..."
  cd /code/mcp-mem0/src && python3 main.py
) > /tmp/mcp-mem0.log 2>&1 &

sleep 5

echo "--- Tailing logs ---"
tail -f /tmp/mem0.log &
tail -f /tmp/mcp-mem0.log &

echo "--- Starting Nginx in foreground (main process) ---"
nginx -g 'daemon off;'
