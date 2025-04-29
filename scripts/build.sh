#!/bin/bash

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --js src/native.cjs --release --zig
else
  npx @napi-rs/cli build --platform --target "$1" --js src/native.cjs --release
fi
