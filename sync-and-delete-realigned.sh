#!/bin/bash

# Script to ensure all files from r3l-realigned are properly synced to the main r3l directory,
# remove any files in r3l that don't exist in r3l-realigned, and then delete the r3l-realigned directory

# Set the source and destination directories
SRC_DIR="/home/jelicopter/Desktop/r3l/r3l-realigned"
DEST_DIR="/home/jelicopter/Desktop/r3l"

# Files to keep in r3l even if they don't exist in r3l-realigned
ESSENTIAL_FILES=(
  "README.md"
  "project-documentation.md"
  "sync-and-delete-realigned.sh"
)

# Ensure the script exits on any error
set -e

# Function to compare files and sync if different
sync_file() {
    local src_file="$1"
    local dest_file="$2"
    
    # Create destination directory if it doesn't exist
    mkdir -p "$(dirname "$dest_file")"
    
    # If destination file doesn't exist or is different, copy it
    if [ ! -f "$dest_file" ] || ! cmp -s "$src_file" "$dest_file"; then
        echo "Syncing: $src_file -> $dest_file"
        cp -f "$src_file" "$dest_file"
    else
        echo "Files identical, no sync needed: $src_file"
    fi
}

# Function to recursively process directories for syncing
process_directory() {
    local src_path="$1"
    local dest_path="$2"
    
    # Create destination directory if it doesn't exist
    mkdir -p "$dest_path"
    
    # Process each item in the source directory
    for item in "$src_path"/*; do
        local item_name=$(basename "$item")
        local dest_item="$dest_path/$item_name"
        
        if [ -d "$item" ]; then
            # If it's a directory, process it recursively
            process_directory "$item" "$dest_item"
        elif [ -f "$item" ]; then
            # If it's a file, sync it
            sync_file "$item" "$dest_item"
        fi
    done
}

# Function to check if a file is in the essential files list
is_essential_file() {
    local file="$1"
    local base_file=$(basename "$file")
    
    for essential_file in "${ESSENTIAL_FILES[@]}"; do
        if [ "$base_file" == "$essential_file" ]; then
            return 0  # True, it's an essential file
        fi
    done
    
    return 1  # False, not an essential file
}

# Function to remove files/directories in dest that don't exist in src
clean_directory() {
    local src_path="$1"
    local dest_path="$2"
    local rel_path="${3:-}"  # Relative path from DEST_DIR
    
    # Skip processing r3l-realigned directory inside r3l
    if [[ "$dest_path" == *"/r3l-realigned"* ]]; then
        return
    fi
    
    # Process each item in the destination directory
    for item in "$dest_path"/*; do
        # Skip if item doesn't exist (in case of glob expansion failure)
        [ ! -e "$item" ] && continue
        
        local item_name=$(basename "$item")
        local src_item="$src_path/$item_name"
        local item_rel_path="${rel_path:+$rel_path/}$item_name"
        
        # If the item is r3l-realigned directory, skip it
        if [ "$item_name" == "r3l-realigned" ]; then
            continue
        fi
        
        if [ -d "$item" ]; then
            # If it's a directory in dest
            if [ -d "$src_item" ]; then
                # If directory exists in both src and dest, clean it recursively
                clean_directory "$src_item" "$item" "$item_rel_path"
            else
                # If directory exists only in dest, check if it should be deleted
                echo "Removing directory that doesn't exist in source: $item"
                rm -rf "$item"
            fi
        elif [ -f "$item" ]; then
            # If it's a file in dest
            if [ ! -f "$src_item" ]; then
                # If file doesn't exist in src, check if it's essential
                if is_essential_file "$item_rel_path"; then
                    echo "Keeping essential file: $item"
                else
                    echo "Removing file that doesn't exist in source: $item"
                    rm -f "$item"
                fi
            fi
        fi
    done
}

# Main execution
echo "Starting synchronization from r3l-realigned to r3l..."
process_directory "$SRC_DIR" "$DEST_DIR"
echo "Synchronization complete."

echo "Cleaning up files in r3l that don't exist in r3l-realigned..."
clean_directory "$SRC_DIR" "$DEST_DIR"
echo "Cleanup complete."

# Verify all files are synchronized
echo "Verifying synchronization..."
all_synced=true

# Function to verify files
verify_directory() {
    local src_path="$1"
    local dest_path="$2"
    
    for item in "$src_path"/*; do
        local item_name=$(basename "$item")
        local dest_item="$dest_path/$item_name"
        
        if [ -d "$item" ]; then
            # If it's a directory, verify it recursively
            verify_directory "$item" "$dest_item"
        elif [ -f "$item" ]; then
            # If it's a file, verify it
            if [ ! -f "$dest_item" ]; then
                echo "ERROR: Destination file missing: $dest_item"
                all_synced=false
            elif ! cmp -s "$item" "$dest_item"; then
                echo "ERROR: Files are different: $item vs $dest_item"
                all_synced=false
            fi
        fi
    done
}

# Verify all directories are synchronized
verify_directory "$SRC_DIR" "$DEST_DIR"

# Check if verification passed
if [ "$all_synced" = true ]; then
    echo "Verification successful. All files are properly synchronized."
    
    # List the files that were kept (essential files)
    echo "The following essential files were kept in r3l:"
    for file in "${ESSENTIAL_FILES[@]}"; do
        if [ -f "$DEST_DIR/$file" ]; then
            echo "- $file"
        fi
    done
    
    # Confirm before deleting
    read -p "Are you sure you want to delete the r3l-realigned directory? (y/N): " confirm
    if [[ "$confirm" == [Yy]* ]]; then
        echo "Deleting r3l-realigned directory..."
        rm -rf "$SRC_DIR"
        echo "r3l-realigned directory has been deleted."
    else
        echo "Deletion cancelled. The r3l-realigned directory remains intact."
    fi
else
    echo "Verification failed. Please check the errors above and fix them before deleting r3l-realigned."
fi
