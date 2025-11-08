#!/bin/bash
cd /root/schizo-dot

# Temp-save any local changes (rare, but safe)
git stash push -m "auto-stash before pull" 2>/dev/null || true

# Pull and capture output
PULL_OUTPUT=$(git pull origin main 2>&1)

# Check if pull fetched changes (not "Already up to date")
if echo "$PULL_OUTPUT" | grep -q "Already up to date"; then
  echo "No changes at $(date)" >> update.log
else
  echo "Changes pulled: $PULL_OUTPUT at $(date)" >> update.log
  (cd backend && npm ci --only=production)  # Faster install for prod (skip dev deps); use 'npm install' if preferred
  (cd ../frontend && npm ci --only=production) # This may not be working
  pm2 restart schizo-dot
  echo "PM2 restarted after update at $(date)" >> update.log
fi

# Pop stash if it existed (restore local changes)
git stash pop 2>/dev/null || true