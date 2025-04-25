# cel-typescript

A TypeScript binding for the Common Expression Language (CEL) using
[cel-rust](https://github.com/clarkmcc/cel-rust). This project provides a
Node.js native module that allows you to use CEL in your TypeScript/JavaScript
projects.

## What is CEL?

[Common Expression Language (CEL)](https://github.com/google/cel-spec) is an
expression language created by Google that implements common semantics for
expression evaluation. It's a simple language for expressing boolean conditions,
calculations, and variable substitutions. CEL is used in various Google products
and open-source projects for policy enforcement, configuration validation, and
business rule evaluation.

## Usage

See the full [language definition][lang-def] for a complete overview of CEL.

[lang-def]: https://github.com/google/cel-spec/blob/master/doc/langdef.md

There are two ways to use CEL expressions in your code:

### One-Step Evaluation

For simple use cases where you evaluate an expression once:

```typescript
import { CelProgram } from "cel-typescript";

// Basic string and numeric operations
await CelProgram.evaluate("size(message) > 5", { message: "Hello World" }); // true

// Complex object traversal and comparison
await CelProgram.evaluate("user.age >= 18 && user.preferences.notifications", {
  user: {
    age: 25,
    preferences: { notifications: true },
  },
}); // true
```

### Compile Once, Execute Multiple Times

For better performance when evaluating the same expression multiple times with
different contexts:

```typescript
import { CelProgram } from "cel-typescript";

// Compile the expression once
const program = await CelProgram.compile(
  "items.filter(i, i.price < max_price).size() > 0",
);

// Execute multiple times with different contexts
await program.execute({
  items: [
    { name: "Book", price: 15 },
    { name: "Laptop", price: 1000 },
  ],
  max_price: 100,
}); // true

await program.execute({
  items: [
    { name: "Phone", price: 800 },
    { name: "Tablet", price: 400 },
  ],
  max_price: 500,
}); // true

// Date/time operations using timestamp() macro
const timeProgram = await CelProgram.compile(
  'timestamp(event_time) < timestamp("2025-01-01T00:00:00Z")',
);
await timeProgram.execute({
  event_time: "2024-12-31T23:59:59Z",
}); // true
```

> [!NOTE]
>
> Performance measurements on an Apple M3 Pro show that compiling a complex CEL
> expression (with map/filter operations) takes about 1.4ms, while execution
> takes about 0.7ms. The one-step `evaluate()` function takes roughly 2ms as it
> performs both steps.
>
> Consider pre-compiling expressions when:
>
> - You evaluate the same expression repeatedly with different data
> - You're building a rules engine or validator that reuses expressions
> - You want to amortize the compilation cost across multiple evaluations
> - Performance is critical in your application
>
> For one-off evaluations or when expressions change frequently, the convenience
> of `evaluate()` likely outweighs the performance benefit of pre-compilation.

## Architecture

This project consists of three main components:

1. **cel-rust**: The underlying Rust implementation of the CEL interpreter,
   created by clarkmcc. This provides the core CEL evaluation engine.

2. **NAPI-RS Bindings**: A thin Rust layer that bridges cel-rust with Node.js
   using [NAPI-RS](https://napi.rs/). NAPI-RS is a framework for building
   pre-compiled Node.js addons in Rust, providing:

   - Type-safe bindings between Rust and Node.js
   - Cross-platform compilation support
   - Automatic TypeScript type definitions generation

3. **TypeScript Wrapper**: A TypeScript API that provides a clean interface to
   the native module, handling type conversions and providing a more idiomatic
   JavaScript experience.

## Native Module Structure

The native module is built using NAPI-RS and provides cross-platform support:

- Platform-specific builds are named `cel-typescript.<platform>-<arch>.node`
  (e.g., `cel-typescript.darwin-arm64.node` for Apple Silicon Macs)
- NAPI-RS generates a platform-agnostic loader (`index.js`) that automatically
  detects the current platform and loads the appropriate `.node` file
- The module interface is defined in `src/binding.d.ts` which declares the types
  for the native module
- At runtime, the TypeScript wrapper (`src/index.ts`) uses the NAPI-RS loader to
  dynamically load the correct native module
- This structure allows for seamless cross-platform distribution while
  maintaining platform-specific optimizations

## How it Works

When you build this project:

1. The Rust code in `src/lib.rs` is compiled into a native Node.js addon
   (`.node` file) using NAPI-RS
2. The TypeScript code in `src/index.ts` is compiled to JavaScript
3. The native module is loaded by Node.js when you import the package

The build process creates several important files:

- `.node` file: The compiled native module containing the Rust code
- `index.js`: The compiled JavaScript wrapper around the native module
- `index.d.ts`: TypeScript type definitions generated from the Rust code

## Building

```bash
# Build the native module and TypeScript code
npm run build

# Run tests
npm test
```

## Development

### Prerequisites

1. Clone the [cel-rust](https://github.com/clarkmcc/cel-rust) repository as a
   sibling to this project:

   ```bash
   parent-directory/
   ├── cel-rust/
   └── cel-typescript/
   ```

   This is required because the project depends on `cel-interpreter` from the
   local cel-rust project (as specified in Cargo.toml).

2. Ensure you have Rust and Node.js installed.

### Project Structure

The project uses:

- `napi-rs` for Rust/Node.js bindings
- `vitest` for testing
- TypeScript for type safety
- CEL for expression evaluation

To modify the native module, edit `src/lib.rs`. To modify the TypeScript
interface, edit `src/index.ts`.

## License

[License information here]
