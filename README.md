# cel-typescript

A TypeScript binding for the Common Expression Language (CEL) using
[cel-rust][cel-rust]. This project provides a Node.js native module that allows
you to use CEL in your TypeScript/JavaScript projects.

[cel-spec]: https://github.com/google/cel-spec
[cel-rust]: https://github.com/clarkmcc/cel-rust

## What is CEL?

[Common Expression Language (CEL)][cel-spec] is an expression language created
by Google that implements common semantics for expression evaluation. It's a
simple language for expressing boolean conditions, calculations, and variable
substitutions. CEL is used in various Google products and open-source projects
for policy enforcement, configuration validation, and business rule evaluation.

## Installation

```bash
npm install @kevinmichaelchen/cel-typescript-core
```

> [!NOTE]
>
> You'll need Node.js 18 or later. You'll also need to install one of several
> platform-specific packages:
>
> | Platform                    | Package                                                                                                                              |
> | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
> | macOS ARM64 (Apple Silicon) | [`@kevinmichaelchen/cel-typescript-darwin-arm64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-arm64)       |
> | macOS x64 (Intel)           | [`@kevinmichaelchen/cel-typescript-darwin-x64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-x64)           |
> | Linux x64                   | [`@kevinmichaelchen/cel-typescript-linux-x64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-x64-gnu)     |
> | Linux ARM64                 | [`@kevinmichaelchen/cel-typescript-linux-arm64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-arm64-gnu) |
> | Windows x64                 | [`@kevinmichaelchen/cel-typescript-win32-x64-msvc`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-win32-x64-msvc)   |

## Usage

See the full [language definition][lang-def] for a complete overview of CEL.

[lang-def]: https://github.com/google/cel-spec/blob/master/doc/langdef.md

There are two ways to use CEL expressions in your code:

### One-Step Evaluation

For simple use cases where you evaluate an expression once:

```typescript
import { evaluate } from "@kevinmichaelchen/cel-typescript-core";

// Basic string and numeric operations
await evaluate(
  // 1️⃣ Provide a CEL expression
  "size(message) > 5",

  // 2️⃣ Provide a context object
  { message: "Hello World" },
); // true

// Complex object traversal and comparison
await evaluate("user.age >= 18 && user.preferences.notifications", {
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
import { CelProgram } from "@kevinmichaelchen/cel-typescript-core";

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

> [!NOTE]
>
> Only ESM is supported by this package.

### Native Module Structure

The native module is built using NAPI-RS and provides cross-platform support:

- Platform-specific builds are named `cel-typescript.<platform>-<arch>.node`
- NAPI-RS generates a platform-agnostic [loader][loader] that automatically
  detects the current platform and loads the appropriate `.node` file
- At runtime, the TypeScript [wrapper][wrapper] uses the NAPI-RS loader to
  dynamically load the correct native module
- This structure allows for seamless cross-platform distribution while
  maintaining platform-specific optimizations

[loader]: ./libs/core/src/native.cjs
[wrapper]: ./libs/core/src/index.ts

### Package Size

Packages are sized at no more than 3 MB unpacked.

> | Platform                    | Package                                                                                                                              |
> | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
> | macOS ARM64 (Apple Silicon) | [`@kevinmichaelchen/cel-typescript-darwin-arm64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-arm64)       |
> | macOS x64 (Intel)           | [`@kevinmichaelchen/cel-typescript-darwin-x64`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-darwin-x64)           |
> | Linux x64                   | [`@kevinmichaelchen/cel-typescript-linux-x64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-x64-gnu)     |
> | Linux ARM64                 | [`@kevinmichaelchen/cel-typescript-linux-arm64-gnu`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-linux-arm64-gnu) |
> | Windows x64                 | [`@kevinmichaelchen/cel-typescript-win32-x64-msvc`](https://www.npmjs.com/package/@kevinmichaelchen/cel-typescript-win32-x64-msvc)   |

## Contributing

### cel-rust submodule

This project uses git submodules for its Rust dependencies. To get started:

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/clarkmcc/cel-typescript.git

# Or if you've already cloned the repository
git submodule update --init --recursive
```

After cloning:

```bash
npm install    # Install dependencies
npm run build  # Build the project
npm test       # Run tests
```

## License

[License information here]
