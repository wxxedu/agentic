#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if VAULT_PATHS is set
if [ -z "$VAULT_PATHS" ]; then
    echo "Error: VAULT_PATHS environment variable is not set"
    exit 1
fi

# Build the plugin
echo "Building plugin..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
fi

# Deploy to each vault path
IFS=':' read -ra PATHS <<< "$VAULT_PATHS"
for vault_path in "${PATHS[@]}"; do
    plugin_dir="$vault_path/.obsidian/plugins/obs-math"
    
    # Create plugin directory if it doesn't exist
    mkdir -p "$plugin_dir"
    
    # Copy built files to plugin directory
    echo "Deploying to $plugin_dir"
    cp main.js manifest.json styles.css "$plugin_dir"
    
    if [ $? -eq 0 ]; then
        echo "Successfully deployed to $vault_path"
    else
        echo "Error: Failed to deploy to $vault_path"
        exit 1
    fi
done

echo "Deployment complete!"
