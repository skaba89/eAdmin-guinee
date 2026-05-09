#!/bin/bash
while true; do
  cd /home/z/my-project
  NODE_ENV=production npx next start -p 3000
  echo "Server died, restarting in 2s..."
  sleep 2
done
