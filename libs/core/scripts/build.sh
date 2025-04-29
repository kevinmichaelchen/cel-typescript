#!/bin/bash

set -e

# Change directories to where the script lives
cd libs/core

mkdir -p artifacts

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --release --zig \
    --js artifacts/native.cjs \
    --dts artifacts/native.d.ts \
    --js-package-name @kevinmichaelchen/cel-typescript
else
  npx @napi-rs/cli build --platform --target "$1" --release \
    --js artifacts/native.cjs \
    --dts artifacts/native.d.ts \
    --js-package-name @kevinmichaelchen/cel-typescript
fi

# For local development, copy the binary to artifacts so tests can find them locally
cp *.node artifacts

# Copy binaries to their respective platform package directories
if [[ "$1" == "aarch64-apple-darwin" ]]; then
  mkdir -p ../darwin-arm64
  cp cel-typescript.darwin-arm64.node ../darwin-arm64/
  echo "Copied binary to darwin-arm64 package"
fi

if [[ "$1" == "x86_64-apple-darwin" ]]; then
  mkdir -p ../darwin-x64
  cp cel-typescript.darwin-x64.node ../darwin-x64/
  echo "Copied binary to darwin-x64 package"
fi

if [[ "$1" == "x86_64-unknown-linux-gnu" ]]; then
  mkdir -p ../linux-x64-gnu
  cp cel-typescript.linux-x64-gnu.node ../linux-x64-gnu/
  echo "Copied binary to linux-x64-gnu package"
fi

if [[ "$1" == "aarch64-unknown-linux-gnu" ]]; then
  mkdir -p ../linux-arm64-gnu
  cp cel-typescript.linux-arm64-gnu.node ../linux-arm64-gnu/
  echo "Copied binary to linux-arm64-gnu package"
fi

if [[ "$1" == "x86_64-pc-windows-msvc" ]]; then
  mkdir -p ../win32-x64-msvc
  cp cel-typescript.win32-x64-msvc.node ../win32-x64-msvc/
  echo "Copied binary to win32-x64-msvc package"
fi