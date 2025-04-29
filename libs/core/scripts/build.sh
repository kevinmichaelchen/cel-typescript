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

# TODO we only want to do this locally so unit tests pass
cp *.node artifacts

# TODO we do not want to put binaries into dist
mkdir -p dist/artifacts
cp -r artifacts/ dist/artifacts