#!/bin/bash

# Script to clean JWT cookies in common browsers
# This helps during development to ensure a clean state

echo "🍪 Clearing JWT cookies..."

# Define browser data paths for Linux
CHROME_PATH="$HOME/.config/google-chrome/Default"
FIREFOX_PATH="$HOME/.mozilla/firefox"
EDGE_PATH="$HOME/.config/microsoft-edge/Default"
BRAVE_PATH="$HOME/.config/BraveSoftware/Brave-Browser/Default"

# Function to clear cookies with sqlite3
clear_cookies_sqlite() {
  local db_path=$1
  local domain=$2
  
  if [ -f "$db_path" ]; then
    echo "  - Clearing cookies in $db_path for domain $domain"
    sqlite3 "$db_path" "DELETE FROM cookies WHERE host_key LIKE '%$domain%' AND (name='r3l_jwt' OR name='r3l_session' OR name='r3l_auth_state');" 2>/dev/null
    return $?
  fi
  return 1
}

# Clear Chrome cookies
if [ -d "$CHROME_PATH" ]; then
  echo "🔍 Attempting to clear Chrome cookies..."
  if pkill -f "chrome" 2>/dev/null; then
    echo "  - Chrome process stopped"
    sleep 1
  fi
  clear_cookies_sqlite "$CHROME_PATH/Cookies" "workers.dev"
  clear_cookies_sqlite "$CHROME_PATH/Cookies" "localhost"
fi

# Clear Firefox cookies (more complex due to random profile directories)
if [ -d "$FIREFOX_PATH" ]; then
  echo "🦊 Attempting to clear Firefox cookies..."
  if pkill -f "firefox" 2>/dev/null; then
    echo "  - Firefox process stopped"
    sleep 1
  fi
  
  # Find profile directories
  for profile_dir in $(find "$FIREFOX_PATH" -name "cookies.sqlite"); do
    clear_cookies_sqlite "$profile_dir" "workers.dev"
    clear_cookies_sqlite "$profile_dir" "localhost"
  done
fi

# Clear Edge cookies
if [ -d "$EDGE_PATH" ]; then
  echo "🌐 Attempting to clear Edge cookies..."
  if pkill -f "msedge" 2>/dev/null; then
    echo "  - Edge process stopped"
    sleep 1
  fi
  clear_cookies_sqlite "$EDGE_PATH/Cookies" "workers.dev"
  clear_cookies_sqlite "$EDGE_PATH/Cookies" "localhost"
fi

# Clear Brave cookies
if [ -d "$BRAVE_PATH" ]; then
  echo "🦁 Attempting to clear Brave cookies..."
  if pkill -f "brave" 2>/dev/null; then
    echo "  - Brave process stopped"
    sleep 1
  fi
  clear_cookies_sqlite "$BRAVE_PATH/Cookies" "workers.dev"
  clear_cookies_sqlite "$BRAVE_PATH/Cookies" "localhost"
fi

echo "✅ Cookies clearing process completed"
echo "NOTE: For this to be fully effective, you should close all browser instances before running this script."
