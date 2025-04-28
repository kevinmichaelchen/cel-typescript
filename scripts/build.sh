#!/bin/bash

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --release --zig
else
  npx @napi-rs/cli build --platform --target "$1" --release
fi
