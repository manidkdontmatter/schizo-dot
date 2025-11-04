#!/bin/bash
cd /root/schizo-dot
git pull origin main
cd /root/schizo-dot/backend
npm install
pm2 restart schizo-dot
echo "Updated at $(date)" >> update.log  # Log for tracking