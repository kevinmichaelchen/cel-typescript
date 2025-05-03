# cel-typescript

A TypeScript binding for the [Common Expression Language (CEL)][cel-spec] using
[cel-rust][cel-rust]. This project provides a Node.js native module that allows
you to use CEL in your TypeScript/JavaScript projects.

CEL is a familiar C/C++/Java/Python-like language for expressing boolean
conditions, calculations, and variable substitutions. It's especially useful for
policy enforcement, configuration validation, and business rule evaluation.

[cel-spec]: https://github.com/google/cel-spec
[cel-rust]: https://github.com/clarkmcc/cel-rust

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

> [!TIP]
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

## FAQ

### Is it performant?

Evaluations are easily sub-millisecond, more on the order of hundreds of
microseconds. Compiling is a bit more expensive, but still rarely exceeds a
millisecond.

For more deatils, see
[`benchmark-results.md`](libs/core/__tests__/benchmark-results.md).

### Is it conformant / feature-complete?

The underlying `cel-rust` library — and, by extension, this library — is more
feature-complete than all of its peers in the JS/TS ecosystem here.

See the [cel-js-evaluation][cel-js-evaluation] repository for a comparison of
the features provided by this library versus its peers.

[cel-js-evaluation]: https://github.com/kevinmichaelchen/cel-js-evaluation

### What does the architecture look like?

This project consists of three main components:

1. [**cel-rust**][cel-rust]: The underlying Rust implementation of the CEL
   interpreter, created by clarkmcc. This provides the core CEL evaluation
   engine.

2. **NAPI-RS Bindings**: A thin Rust layer that bridges cel-rust with Node.js
   using [NAPI-RS][napi]. NAPI-RS is a framework for building pre-compiled
   Node.js addons in Rust, providing:

   - Type-safe bindings between Rust and Node.js
   - Cross-platform compilation support
   - Automatic TypeScript type definitions generation

3. **TypeScript Wrapper**: A TypeScript API that provides a clean interface to
   the native module, handling type conversions and providing a more idiomatic
   JavaScript experience.

> [!NOTE]
>
> Only ESM is supported by this package.

### How does NAPI work?

[napi]: https://napi.rs/

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
