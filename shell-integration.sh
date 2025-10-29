#!/bin/bash

# Shell wrapper for cd-vs-local that actually changes directory
# Usage: source this script or add it to your bashrc/profile

function cd-vs-local() {
    # Run the actual cd-vs-local command and capture output
    local output
    output=$(command cd-vs-local "$@" 2>&1)
    local exit_code=$?
    
    # Print the output (except for CHANGE_DIR line)
    echo "$output" | grep -v "^CHANGE_DIR="
    
    # If successful, extract the CHANGE_DIR and actually change directory
    if [ $exit_code -eq 0 ]; then
        local new_dir
        new_dir=$(echo "$output" | grep "^CHANGE_DIR=" | cut -d'=' -f2)
        if [ -n "$new_dir" ]; then
            cd "$new_dir"
        fi
    fi
    
    return $exit_code
}

# Also create wrapper functions for the other tools
function mv-vs-local() {
    command mv-vs-local "$@"
}

function rm-vs-local() {
    command rm-vs-local "$@"
}

echo "✅ VS Code workspace-safe tools loaded"
echo "   cd-vs-local, mv-vs-local, rm-vs-local are now available"
echo "   These tools will keep you within your workspace boundaries"