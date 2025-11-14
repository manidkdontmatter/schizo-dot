#!/bin/bash

# Config
LOG_FILE="/root/update.log"  # Adjust if needed
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Helper function for consistent logging
log() {
  local level="$1"
  shift
  echo "[$TIMESTAMP] [$level] $*" | tee -a "$LOG_FILE"
}

# Helper to run a command, capture output/errors, check exit code, and log
run_cmd() {
  local cmd="$1"
  local desc="$2"
  log "INFO" "Starting: $desc"
  local output
  output=$(eval "$cmd" 2>&1)
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    log "INFO" "$desc succeeded."
    echo "$output"  # Optional: echo success output if verbose needed
  else
    log "ERROR" "$desc failed with exit code $exit_code. Output: $output"
  fi
  return $exit_code
}

cd /root/schizo-dot || { log "ERROR" "Failed to cd to /root/schizo-dot"; exit 1; }

log "INFO" "=== Update script started ==="

# Temp-save any local changes
run_cmd "git stash push -m 'auto-stash before pull'" "Git stash push"

# Pull and capture output
PULL_OUTPUT=$(git pull origin main 2>&1)
PULL_EXIT=$?
log "INFO" "Git pull output: $PULL_OUTPUT (exit code: $PULL_EXIT)"

# Check if pull fetched changes (not "Already up to date")
if echo "$PULL_OUTPUT" | grep -q "Already up to date" && [ $PULL_EXIT -eq 0 ]; then
  log "INFO" "No changes detected."
else
  if [ $PULL_EXIT -ne 0 ]; then
    log "WARN" "Git pull had issues, but proceeding with rebuild anyway."
  fi
  log "INFO" "Changes detected or pull succeeded; rebuilding..."

  # Backend deps
  run_cmd "(cd backend && npm ci)" "Backend npm ci"

  # Frontend deps & build
  run_cmd "(cd frontend && npm ci && npm run build)" "Frontend npm ci + build"

  # Restart PM2
  run_cmd "pm2 restart schizo-dot" "PM2 restart"

  log "INFO" "Rebuild and restart completed (with possible errors above)."
fi

# Pop stash if it existed
run_cmd "git stash pop" "Git stash pop"

log "INFO" "=== Update script finished ==="