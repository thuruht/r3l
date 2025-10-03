#!/bin/bash

# This script adds the debug-logger.js script tag to all HTML files
# in the public directory and its subdirectories.

# The script tag to be inserted
LOGGER_SCRIPT_TAG='  <script src="/js/utils/debug-logger.js" defer></script>'

# Find all HTML files in the public directory
find public -type f -name "*.html" | while read -r file; do
    # Check if the logger script is already present
    if ! grep -q 'debug-logger.js' "$file"; then
        # Insert the script tag before the closing </head> tag
        # Using a temporary file for sed compatibility on different systems
        sed -i.bak "/<\/head>/i\\
$LOGGER_SCRIPT_TAG
" "$file"
        echo "Added logger to: $file"
        # Remove the backup file created by sed
        rm "${file}.bak"
    else
        echo "Logger already present in: $file"
    fi
done

echo "Logger integration complete."