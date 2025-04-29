#!/bin/bash

# Exit on error
set -e

# See https://napi.rs/docs/cli/build for details

# Debug information
echo "Script location: $0"
echo "Current directory: $(pwd)"
echo "Arguments: $@"

# Change to the core directory where Cargo.toml is located
cd "$(dirname "$0")/.." || exit 1
echo "Changed to directory: $(pwd)"

# Set default target if not provided
TARGET=${1:-""}

# Build command with proper error handling
build_native() {
  # Use a temporary file to capture any error output
  local temp_err=$(mktemp)
  
  if [ "$USE_ZIG" = "true" ]; then
    npx @napi-rs/cli build \
      --platform \
      --target "$TARGET" \
      --js src/native.cjs \
      --dts src/native.d.ts \
      --release \
      --zig 2>"$temp_err" || { cat "$temp_err"; rm "$temp_err"; exit 1; }
  else
    npx @napi-rs/cli build \
      --platform \
      --target "$TARGET" \
      --js src/native.cjs \
      --dts src/native.d.ts \
      --release 2>"$temp_err" || { cat "$temp_err"; rm "$temp_err"; exit 1; }
  fi
  
  rm "$temp_err"
  return 0
}

# Execute the build function
build_native

# If we get here, the build was successful
echo "Build completed successfully"
exit 0
