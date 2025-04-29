#!/bin/bash

set -e

# Change directories to where the script lives
cd libs/core

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --release --zig \
    --js src/native.cjs \
    --dts src/native.d.ts \
    --js-package-name @kevinmichaelchen/cel-typescript
else
  npx @napi-rs/cli build --platform --target "$1" --release \
    --js src/native.cjs \
    --dts src/native.d.ts \
    --js-package-name @kevinmichaelchen/cel-typescript
fi

# Copy binaries to their respective platform package directories
# Find all .node files in the current directory
echo "******************************************"
echo "DEBUG: Current directory: $(pwd)"
echo "DEBUG: Files in current directory:"
ls -la *.node || echo "No .node files found"
echo "DEBUG: Attempting to copy platform binaries..."
echo "******************************************"

for binary in cel-typescript.*.node; do
  if [ -f "$binary" ]; then
    # Extract the platform identifier (everything between 'cel-typescript.' and '.node')
    platform=$(echo "$binary" | sed -E 's/cel-typescript\.(.+)\.node/\1/')
    
    # Create target directory if it doesn't exist
    mkdir -p "../$platform"
    
    # Copy binary to the platform directory
    cp "$binary" "../$platform/"
    
    echo "******************************************"
    echo "SUCCESS: Copied $binary to ../$platform/"
    echo "******************************************"
  else
    echo "WARNING: Pattern matched $binary but it's not a file"
  fi
done

echo "******************************************"
echo "DEBUG: Platform packages after copying:"
ls -la ../*/cel-typescript.*.node || echo "No platform binaries found in packages"
echo "******************************************"