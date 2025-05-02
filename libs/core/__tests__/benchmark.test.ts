import { describe, expect, it } from "vitest";
import { type CelContext, CelProgram, evaluate } from "../src/index.js";

// Utility function to measure execution time in nanoseconds
const measureTimeNs = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  // Convert milliseconds to nanoseconds (1ms = 1,000,000ns)
  return [result, (end - start) * 1_000_000];
};

// Calculate statistics from an array of measurements
function calculateStats(measurements: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  total: number;
  count: number;
} {
  if (measurements.length === 0) {
    throw new Error("Cannot calculate statistics on empty array");
  }

  // Sort the measurements for percentile calculations
  const sorted = [...measurements].sort((a, b) => a - b);

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const total = sorted.reduce((sum, val) => sum + val, 0);
  const mean = total / sorted.length;

  // Calculate median
  const midIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
      : sorted[midIndex];

  // Calculate percentiles
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);

  const p95 = sorted[p95Index];
  const p99 = sorted[p99Index];

  return {
    min,
    max,
    mean,
    median,
    p95,
    p99,
    total,
    count: sorted.length,
  };
}

// Format a number to a readable time representation
function formatTime(ns: number): string {
  if (ns < 1_000) {
    return `${ns.toFixed(2)}ns`;
  }

  if (ns < 1_000_000) {
    return `${(ns / 1_000).toFixed(2)}µs`;
  }

  if (ns < 1_000_000_000) {
    return `${(ns / 1_000_000).toFixed(2)}ms`;
  }

  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

// Print performance stats in a readable format
function printStats(title: string, stats: ReturnType<typeof calculateStats>) {
  console.log(`\n${title}:`);
  console.log(`  Count: ${stats.count}`);
  console.log(`  Min: ${formatTime(stats.min)}`);
  console.log(`  Max: ${formatTime(stats.max)}`);
  console.log(`  Mean: ${formatTime(stats.mean)}`);
  console.log(`  Median: ${formatTime(stats.median)}`);
  console.log(`  P95: ${formatTime(stats.p95)}`);
  console.log(`  P99: ${formatTime(stats.p99)}`);
  console.log(`  Total: ${formatTime(stats.total)}`);
}

describe("CEL Performance Benchmarks", () => {
  // Test configuration
  const iterations = 100; // Number of iterations for each benchmark

  // Define different expression complexities
  const expressions = {
    simple: "a + b",
    medium: "a * b > 100 && c.startsWith('test')",
    complex: "has(items) && items.filter(i, i.price < max_price).size() > 0",
    veryComplex:
      "has(items) && items.map(i, {'id': i.id, 'discountPrice': i.price * (1 - discount)}).filter(i, i.discountPrice < max_price).size() > 0",
  };

  // Define different context sizes
  const contexts = {
    small: (): CelContext => ({
      a: 5,
      b: 10,
      c: "test string",
      // Include empty items and other required properties to avoid undeclared reference errors
      items: [],
      max_price: 50,
      discount: 0.1,
    }),
    medium: (): CelContext => ({
      a: 5,
      b: 10,
      c: "test string",
      items: Array.from({ length: 10 }, (_, i) => ({ id: i, price: i * 10 })),
      max_price: 50,
      discount: 0.1,
    }),
    large: (): CelContext => ({
      a: 5,
      b: 10,
      c: "test string",
      items: Array.from({ length: 100 }, (_, i) => ({ id: i, price: i * 10 })),
      max_price: 500,
      discount: 0.1,
      metadata: {
        user: {
          id: "user_123",
          name: "Test User",
          preferences: { theme: "dark", language: "en" },
        },
        session: {
          id: "sess_456",
          created: "2023-01-01T00:00:00Z",
          expires: "2023-01-02T00:00:00Z",
        },
        flags: Array.from({ length: 20 }, (_, i) => ({
          id: `flag_${i}`,
          enabled: i % 2 === 0,
        })),
      },
    }),
    veryLarge: (): CelContext => {
      const baseContext = contexts.large();
      // Add more nested data to increase context size
      baseContext.items = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        price: i * 10,
        name: `Product ${i}`,
        category: i % 5,
        tags: Array.from({ length: 3 }, (_, j) => `tag_${i}_${j}`),
        variants: Array.from({ length: 3 }, (_, j) => ({
          id: `variant_${i}_${j}`,
          color: j % 3 === 0 ? "red" : j % 3 === 1 ? "green" : "blue",
          size: j % 2 === 0 ? "small" : "large",
        })),
      }));
      return baseContext;
    },
  };

  // Benchmarks for one-step evaluate vs separate compile+execute
  describe("Compilation vs Execution", () => {
    // Run the benchmark for each combination
    for (const [exprComplexity, expr] of Object.entries(expressions)) {
      for (const [contextSize, contextFn] of Object.entries(contexts)) {
        it(`should benchmark "${exprComplexity}" expression with ${contextSize} context`, async () => {
          const compileTimesNs: number[] = [];
          const executeTimesNs: number[] = [];
          const evaluateTimesNs: number[] = [];

          // Warm-up (results discarded)
          const warmupProgram = await CelProgram.compile(expr);
          await warmupProgram.execute(contextFn());
          await evaluate(expr, contextFn());

          // Run the benchmark multiple times
          for (let i = 0; i < iterations; i++) {
            // Create a fresh context for each iteration
            const context = contextFn();

            // Measure compilation time
            const [program, compileTimeNs] = await measureTimeNs(() =>
              CelProgram.compile(expr),
            );
            compileTimesNs.push(compileTimeNs);

            // Measure execution time
            const [_, executeTimeNs] = await measureTimeNs(() =>
              program.execute(context),
            );
            executeTimesNs.push(executeTimeNs);

            // Measure one-step evaluation time (separate from above for fair comparison)
            const [__, evaluateTimeNs] = await measureTimeNs(() =>
              evaluate(expr, context),
            );
            evaluateTimesNs.push(evaluateTimeNs);
          }

          // Calculate statistics
          const compileStats = calculateStats(compileTimesNs);
          const executeStats = calculateStats(executeTimesNs);
          const evaluateStats = calculateStats(evaluateTimesNs);
          const combinedStats = calculateStats(
            compileTimesNs.map((compile, i) => compile + executeTimesNs[i]),
          );

          // Print statistics
          printStats(
            `Compile time (${exprComplexity} expr, ${contextSize} ctx)`,
            compileStats,
          );
          printStats(
            `Execute time (${exprComplexity} expr, ${contextSize} ctx)`,
            executeStats,
          );
          printStats(
            `Evaluate time (${exprComplexity} expr, ${contextSize} ctx)`,
            evaluateStats,
          );
          printStats(
            `Compile+Execute time (${exprComplexity} expr, ${contextSize} ctx)`,
            combinedStats,
          );

          // Calculate overhead of one-step evaluate vs separate steps
          const overheadRatio =
            evaluateStats.mean / (compileStats.mean + executeStats.mean);
          console.log(`\nOverhead ratio: ${overheadRatio.toFixed(2)}x`);

          // Basic sanity checks
          expect(compileStats.mean).toBeGreaterThan(0);
          expect(executeStats.mean).toBeGreaterThan(0);
          expect(evaluateStats.mean).toBeGreaterThan(0);

          // Should be within reasonable overhead (actual value may vary)
          expect(overheadRatio).toBeGreaterThan(0.8);
          expect(overheadRatio).toBeLessThan(1.5);
        });
      }
    }
  });

  // Benchmark for execution time vs context size with pre-compiled expressions
  describe("Context Size Impact", () => {
    // For each expression, compile once then execute with different context sizes
    for (const [exprComplexity, expr] of Object.entries(expressions)) {
      it(`should measure execution time vs context size for "${exprComplexity}" expression`, async () => {
        const program = await CelProgram.compile(expr);
        const results: Record<string, number[]> = {};

        // For each context size
        for (const [contextSize, contextFn] of Object.entries(contexts)) {
          results[contextSize] = [];

          // Warm-up
          await program.execute(contextFn());

          // Run the benchmark multiple times
          for (let i = 0; i < iterations; i++) {
            const context = contextFn();
            const [_, timeNs] = await measureTimeNs(() =>
              program.execute(context),
            );
            results[contextSize].push(timeNs);
          }
        }

        // Calculate and print statistics for each context size
        for (const [contextSize, times] of Object.entries(results)) {
          const stats = calculateStats(times);
          printStats(
            `Execute time for ${exprComplexity} with ${contextSize} context`,
            stats,
          );
        }

        // Calculate ratio between largest and smallest context
        const smallStats = calculateStats(results.small);
        const veryLargeStats = calculateStats(results.veryLarge);
        const sizeImpactRatio = veryLargeStats.mean / smallStats.mean;

        console.log(
          `\nContext size impact ratio (veryLarge/small): ${sizeImpactRatio.toFixed(2)}x`,
        );

        // Validate that context size has some impact (may vary based on expression)
        expect(sizeImpactRatio).toBeGreaterThan(1);
      });
    }
  });

  // Benchmark for realistic business logic scenarios
  describe("Business Logic Scenarios", () => {
    const scenarios = [
      {
        name: "Discount Eligibility",
        expr: "customer.type == 'premium' && order.total >= 100",
        getContext: (i: number) => ({
          customer: { id: i, type: i % 3 === 0 ? "premium" : "standard" },
          order: { id: `order_${i}`, total: 50 + (i % 10) * 10 },
        }),
      },
      {
        name: "Product Filtering",
        expr: "products.filter(p, p.category == category && p.price <= maxPrice).size() > 0",
        getContext: (i: number) => ({
          products: Array.from({ length: 50 }, (_, j) => ({
            id: j,
            category: j % 5,
            price: 10 + j * 5 + (i % 10),
          })),
          category: i % 5,
          maxPrice: 100 + (i % 5) * 50,
        }),
      },
      {
        name: "User Authorization",
        expr: "user.roles.exists(r, r == 'admin' || (r == 'editor' && resource.ownerId == user.id))",
        getContext: (i: number) => ({
          user: {
            id: i,
            roles:
              i % 5 === 0 ? ["admin"] : i % 3 === 0 ? ["editor"] : ["viewer"],
          },
          resource: {
            id: `res_${i}`,
            ownerId: i % 3 === 0 ? i : i + 1,
          },
        }),
      },
      {
        name: "Complex Pricing Calculation",
        expr: "basePrice * (1 - discount) * (1 + tax) + (hasShipping ? shippingCost : 0)",
        getContext: (i: number) => ({
          basePrice: 100 + (i % 10) * 50,
          discount: (i % 5) / 10,
          tax: 0.07,
          hasShipping: i % 2 === 0,
          shippingCost: 10 + (i % 3) * 5,
        }),
      },
    ];

    for (const scenario of scenarios) {
      it(`should benchmark "${scenario.name}" scenario`, async () => {
        const compileTimesNs: number[] = [];
        const executeTimesNs: number[] = [];

        // Warm-up
        const warmupProgram = await CelProgram.compile(scenario.expr);
        await warmupProgram.execute(scenario.getContext(0));

        // Compile once, then execute multiple times with varying contexts
        const [program, compileTimeNs] = await measureTimeNs(() =>
          CelProgram.compile(scenario.expr),
        );

        compileTimesNs.push(compileTimeNs);

        // Run the benchmark multiple times with different contexts
        for (let i = 0; i < iterations; i++) {
          const context = scenario.getContext(i);
          const [_, executeTimeNs] = await measureTimeNs(() =>
            program.execute(context),
          );
          executeTimesNs.push(executeTimeNs);
        }

        // Calculate statistics
        const compileStats = calculateStats(compileTimesNs);
        const executeStats = calculateStats(executeTimesNs);

        // Print statistics
        printStats(
          `Compile time for "${scenario.name}" scenario`,
          compileStats,
        );
        printStats(
          `Execute time for "${scenario.name}" scenario (${iterations} iterations with varying contexts)`,
          executeStats,
        );

        // Check that execution is consistently faster than compilation
        const compileToExecuteRatio = compileStats.mean / executeStats.mean;
        console.log(
          `\nCompile-to-execute ratio: ${compileToExecuteRatio.toFixed(2)}x`,
        );

        expect(compileTimeNs).toBeGreaterThan(0);
        expect(executeStats.mean).toBeGreaterThan(0);

        // Typically compilation should be more expensive than execution
        expect(compileToExecuteRatio).toBeGreaterThan(1);
      });
    }
  });

  // Amortization benchmark - measure how many executions it takes to make compilation worthwhile
  describe("Compilation Amortization", () => {
    it("should determine when compilation cost is amortized", async () => {
      const expr = expressions.complex;
      const contextFn = contexts.medium;

      // First, measure the baseline evaluate time (compile+execute in one step)
      const baselineTimesNs: number[] = [];

      // Warm-up
      await evaluate(expr, contextFn());

      // Measure one-step evaluation multiple times
      for (let i = 0; i < iterations; i++) {
        const context = contextFn();
        const [_, timeNs] = await measureTimeNs(() => evaluate(expr, context));
        baselineTimesNs.push(timeNs);
      }

      const baselineStats = calculateStats(baselineTimesNs);
      printStats("One-step evaluation time (baseline)", baselineStats);

      // Now, measure compilation once and execution multiple times
      const [program, compileTimeNs] = await measureTimeNs(() =>
        CelProgram.compile(expr),
      );

      const executeTimesNs: number[] = [];

      // Measure execution time
      for (let i = 0; i < iterations; i++) {
        const context = contextFn();
        const [_, timeNs] = await measureTimeNs(() => program.execute(context));
        executeTimesNs.push(timeNs);
      }

      const executeStats = calculateStats(executeTimesNs);
      printStats("Execution time (pre-compiled)", executeStats);

      // Calculate amortization point:
      // At what number of executions does separate compilation + multiple executions
      // become more efficient than one-step evaluate?
      const evaluateMean = baselineStats.mean;
      const executeMean = executeStats.mean;
      const amortizationPoint = Math.ceil(
        compileTimeNs / (evaluateMean - executeMean),
      );

      console.log(`\nCompilation time: ${formatTime(compileTimeNs)}`);
      console.log(`One-step evaluate mean: ${formatTime(evaluateMean)}`);
      console.log(`Pre-compiled execute mean: ${formatTime(executeMean)}`);
      console.log(
        `Compilation cost is amortized after ${amortizationPoint} executions`,
      );

      // Basic sanity checks
      expect(compileTimeNs).toBeGreaterThan(0);
      expect(executeMean).toBeGreaterThan(0);
      expect(evaluateMean).toBeGreaterThan(0);

      // Typically execution should be faster than one-step evaluation
      expect(executeMean).toBeLessThan(evaluateMean);

      // The amortization point should be a positive number
      expect(amortizationPoint).toBeGreaterThan(0);
    });
  });
});
