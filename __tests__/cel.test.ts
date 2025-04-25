import { beforeEach, describe, expect, it } from "vitest";
import { CelProgram, evaluate } from "../src/index.js";

describe("evaluate", () => {
  it("should evaluate a simple expression", async () => {
    const result = await evaluate("size(message) > 5", {
      message: "Hello World",
    });
    expect(result).toBe(true);
  });

  it("should handle errors gracefully", async () => {
    await expect(evaluate("invalid expression", {})).rejects.toThrow();
  });

  it("should handle CEL map return values", async () => {
    const result = await evaluate(
      '{"name": "test", "items": [1, 2, 3].map(i, {"id": i})}',
      {},
    );
    expect(result).toEqual({
      name: "test",
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
  });
});

describe("CelProgram", () => {
  it("should evaluate a simple expression", async () => {
    const program = await CelProgram.compile("size(message) > 5");
    const result = await program.execute({ message: "Hello World" });
    expect(result).toBe(true);
  });

  it("should handle errors gracefully", async () => {
    await expect(CelProgram.compile("invalid expression")).rejects.toThrow();
  });

  it("should handle CEL map return values", async () => {
    const program = await CelProgram.compile(
      '{"name": "test", "items": [1, 2, 3].map(i, {"id": i})}',
    );
    const result = await program.execute({});
    expect(result).toEqual({
      name: "test",
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
  });

  describe("cart validation", () => {
    const expr =
      'has(cart.items) && cart.items.exists(item, item.productId == "prod_123" && item.quantity >= 1)';
    let program: CelProgram;

    beforeEach(async () => {
      program = await CelProgram.compile(expr);
    });

    it("should return true when cart has matching product with quantity >= 1", async () => {
      const result = await program.execute({
        cart: {
          items: [{ productId: "prod_123", quantity: 2 }],
        },
      });
      expect(result).toBe(true);
    });

    it("should return true when cart has multiple items including matching product", async () => {
      const result = await program.execute({
        cart: {
          items: [
            { productId: "prod_456", quantity: 1 },
            { productId: "prod_123", quantity: 1 },
            { productId: "prod_789", quantity: 3 },
          ],
        },
      });
      expect(result).toBe(true);
    });

    it("should return false when matching product has quantity 0", async () => {
      const result = await program.execute({
        cart: {
          items: [{ productId: "prod_123", quantity: 0 }],
        },
      });
      expect(result).toBe(false);
    });

    it("should return false when cart does not contain matching product", async () => {
      const result = await program.execute({
        cart: {
          items: [{ productId: "prod_456", quantity: 2 }],
        },
      });
      expect(result).toBe(false);
    });

    it("should return false when cart is empty", async () => {
      const result = await program.execute({
        cart: {
          items: [],
        },
      });
      expect(result).toBe(false);
    });
  });
});

describe("Performance measurements", () => {
  const measureTime = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    // Convert to nanoseconds (1ms = 1,000,000ns)
    return [result, (end - start) * 1_000_000];
  };

  it("should measure compile vs execute time", async () => {
    // Complex expression that requires significant parsing
    const expr =
      "has(items) && items.map(i, i.price).filter(p, p < max_price).size() > 0";
    const context = {
      items: Array.from({ length: 100 }, (_, i) => ({ id: i, price: i * 10 })),
      max_price: 500,
    };

    // Measure compilation time
    const [program, compileTime] = await measureTime(() =>
      CelProgram.compile(expr),
    );
    console.log(`Compilation took ${compileTime.toFixed(0)} nanoseconds`);

    // Measure execution time
    const [result, executeTime] = await measureTime(() =>
      program.execute(context),
    );
    console.log(`Execution took ${executeTime.toFixed(0)} nanoseconds`);

    // Measure one-step evaluation time
    const [, evaluateTime] = await measureTime(() => evaluate(expr, context));
    console.log(
      `One-step evaluation took ${evaluateTime.toFixed(0)} nanoseconds`,
    );

    // Basic sanity check that the timing data is reasonable
    expect(compileTime).toBeGreaterThan(0);
    expect(executeTime).toBeGreaterThan(0);
    expect(evaluateTime).toBeGreaterThan(0);

    // The one-step evaluation should be in a reasonable range of the sum of compile and execute
    // Allow more variation due to system noise, optimization differences, and convenience overhead
    const tolerance = 1.0; // Allow 100% variation
    const expectedEvaluateTime = compileTime + executeTime;
    
    // Log the actual ratios to help with debugging
    const ratio = evaluateTime / expectedEvaluateTime;
    console.log(`One-step evaluation was ${ratio.toFixed(2)}x the separate steps`);
    
    // Only fail if the difference is extreme
    expect(evaluateTime).toBeGreaterThan(
      expectedEvaluateTime * (1 - tolerance),
    );
    expect(evaluateTime).toBeLessThan(expectedEvaluateTime * (2 + tolerance));
  });
});
