#!/bin/bash

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --release --zig \
    --js src/native.cjs --dts src/native.d.ts
else
  npx @napi-rs/cli build --platform --target "$1" --release \
    --js src/native.cjs --dts src/native.d.ts
fi
