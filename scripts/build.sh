#!/bin/bash

# See https://napi.rs/docs/cli/build for details

if [ "$USE_ZIG" = "true" ]; then
  npx @napi-rs/cli build \
    # Add platform triple to the .node file (e.g., [name].linux-x64-gnu.node)
    --platform \
    
    # Target triple (e.g., x86_64-apple-darwin)
    --target "$1" \
    
    # The filename and path of the JavaScript binding file
    --js src/native.cjs \
    
    # TypeScript declaration file
    --dts src/native.d.ts \
    
    # Bypass to cargo build --release
    --release \

    # @napi-rs/cli will use zig as cc / cxx and linker to build your program.
    --zig

else
  npx @napi-rs/cli build \
    --platform \
    --target "$1" \
    --js src/native.cjs \
    --dts src/native.d.ts \
    --release

fi
