#!/bin/bash

mkdir -p artifacts

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build --platform --target "$1" --release --zig \
    --js artifacts/native.cjs --dts artifacts/native.d.ts
else
  npx @napi-rs/cli build --platform --target "$1" --release \
    --js artifacts/native.cjs --dts artifacts/native.d.ts
fi

cp *.node artifacts

mkdir -p dist/artifacts
cp -r artifacts/ dist/artifacts