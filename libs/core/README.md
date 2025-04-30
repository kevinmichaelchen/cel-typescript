# `@kevinmichaelchen/cel-typescript-core`

[![npm version](https://img.shields.io/npm/v/@kevinmichaelchen/cel-typescript-core.svg)](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-core)
[![npm downloads](https://img.shields.io/npm/dm/@kevinmichaelchen/cel-typescript-core.svg)](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-core)

TypeScript bindings for the [cel-rust] library.

> [Common Expression Language (CEL)][cel] is an expression language that’s fast,
> portable, and safe to execute in performance-critical applications.

The bindings to Rust are powered by [napi-rs].

[cel]: https://cel.dev/
[cel-rust]: https://github.com/clarkmcc/cel-rust
[napi-rs]: https://github.com/napi-rs/napi-rs

This package automatically detects your platform and loads the appropriate
native binary from one of the platform-specific packages (which you will also
need to install):

- [`@kevinmichaelchen/cel-typescript-darwin-arm64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-arm64) -
  macOS ARM64 (Apple Silicon)
- [`@kevinmichaelchen/cel-typescript-darwin-x64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-x64) -
  macOS x64 (Intel)
- [`@kevinmichaelchen/cel-typescript-linux-x64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-x64-gnu) -
  Linux x64
- [`@kevinmichaelchen/cel-typescript-linux-arm64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-arm64-gnu) -
  Linux ARM64
- [`@kevinmichaelchen/cel-typescript-win32-x64-msvc`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-win32-x64-msvc) -
  Windows x64

## Documentation

For full documentation and usage examples, please refer to the
[main repository](https://github.com/kevinmichaelchen/cel-typescript).
