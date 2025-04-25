# cel-typescript

A TypeScript binding for the Common Expression Language (CEL) using [cel-rust](https://github.com/clarkmcc/cel-rust). This project provides a Node.js native module that allows you to use CEL in your TypeScript/JavaScript projects.

## What is CEL?

[Common Expression Language (CEL)](https://github.com/google/cel-spec) is an expression language created by Google that implements common semantics for expression evaluation. It's a simple language for expressing boolean conditions, calculations, and variable substitutions. CEL is used in various Google products and open-source projects for policy enforcement, configuration validation, and business rule evaluation.

## Architecture

This project consists of three main components:

1. **cel-rust**: The underlying Rust implementation of the CEL interpreter, created by clarkmcc. This provides the core CEL evaluation engine.

2. **NAPI-RS Bindings**: A thin Rust layer that bridges cel-rust with Node.js using [NAPI-RS](https://napi.rs/). NAPI-RS is a framework for building pre-compiled Node.js addons in Rust, providing:
   - Type-safe bindings between Rust and Node.js
   - Cross-platform compilation support
   - Automatic TypeScript type definitions generation

3. **TypeScript Wrapper**: A TypeScript API that provides a clean interface to the native module, handling type conversions and providing a more idiomatic JavaScript experience.

## How it Works

When you build this project:

1. The Rust code in `src/lib.rs` is compiled into a native Node.js addon (`.node` file) using NAPI-RS
2. The TypeScript code in `src/index.ts` is compiled to JavaScript
3. The native module is loaded by Node.js when you import the package

The build process creates several important files:
- `.node` file: The compiled native module containing the Rust code
- `index.js`: The compiled JavaScript wrapper around the native module
- `index.d.ts`: TypeScript type definitions generated from the Rust code

## Usage

```typescript
import { CelProgram } from 'cel-typescript';

// Compile a CEL expression
const program = await CelProgram.compile('size(message) > 5');

// Execute the expression with a context
const result = await program.execute({ message: 'Hello World' });
console.log(result); // true
```

## Building

```bash
# Build the native module and TypeScript code
npm run build

# Run tests
npm test
```

## Development

### Prerequisites

1. Clone the [cel-rust](https://github.com/clarkmcc/cel-rust) repository as a sibling to this project:
   ```bash
   parent-directory/
   ├── cel-rust/
   └── cel-typescript/
   ```
   This is required because the project depends on `cel-interpreter` from the local cel-rust project (as specified in Cargo.toml).

2. Ensure you have Rust and Node.js installed.

### Project Structure

The project uses:
- `napi-rs` for Rust/Node.js bindings
- `vitest` for testing
- TypeScript for type safety
- CEL for expression evaluation

To modify the native module, edit `src/lib.rs`. To modify the TypeScript interface, edit `src/index.ts`.

## License

[License information here]
