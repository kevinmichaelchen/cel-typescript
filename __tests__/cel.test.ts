import { beforeEach, describe, expect, it } from "vitest";
import { CelProgram } from "../src/index.js";

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

describe("CelProgram.evaluate", () => {
  it("should evaluate a simple expression in one step", async () => {
    const result = await CelProgram.evaluate("size(message) > 5", {
      message: "Hello World",
    });
    expect(result).toBe(true);
  });

  it("should handle errors gracefully", async () => {
    await expect(
      CelProgram.evaluate("invalid expression", {}),
    ).rejects.toThrow();
  });

  it("should handle complex expressions and data structures", async () => {
    const result = await CelProgram.evaluate(
      '{"name": "test", "items": [1, 2, 3].map(i, {"id": i})}',
      {},
    );
    expect(result).toEqual({
      name: "test",
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
  });

  it("should handle cart validation in one step", async () => {
    const expr =
      'has(cart.items) && cart.items.exists(item, item.productId == "prod_123" && item.quantity >= 1)';
    const result = await CelProgram.evaluate(expr, {
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
});
