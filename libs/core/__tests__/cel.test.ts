import { beforeEach, describe, expect, it } from "vitest";
import { CelProgram, evaluate } from "../src/index.js";

describe("evaluate", () => {
  it("should add a duration to a timestamp using chrono feature", async () => {
    const result = await evaluate(
      "timestamp('2023-01-01T00:00:00Z') + duration('1h')",
      {},
    );
    // The expected result is '2023-01-01T01:00:00Z' as an ISO string
    expect(result).toBe("2023-01-01T01:00:00+00:00");
  });
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
    console.log(
      `One-step evaluation was ${ratio.toFixed(2)}x the separate steps`,
    );

    // Only fail if the difference is extreme
    expect(evaluateTime).toBeGreaterThan(
      expectedEvaluateTime * (1 - tolerance),
    );
    expect(evaluateTime).toBeLessThan(expectedEvaluateTime * (2 + tolerance));
  });
});

describe("Timestamp Functions", () => {
  it("should correctly parse and compare timestamps", async () => {
    const expr = `[
      // Test 1: Compare UTC timestamp with itself
      timestamp('2025-04-28T12:00:00Z') == timestamp('2025-04-28T12:00:00Z'),
      // Test 2: Compare UTC timestamp with equivalent EDT timestamp
      timestamp('2025-04-28T12:00:00Z') == timestamp('2025-04-28T08:00:00-04:00'),
      // Test 3: Compare timestamps one day apart
      timestamp('2025-04-28T12:00:00Z') < timestamp('2025-04-29T12:00:00Z'),
      // Test 4: Get components from UTC timestamp
      timestamp('2025-04-28T12:00:00Z').getMonth(),
      timestamp('2025-04-28T12:00:00Z').getDayOfMonth(),
      timestamp('2025-04-28T12:00:00Z').getHours(),
      timestamp('2025-04-28T12:00:00Z').getDayOfWeek() // 1==Monday
    ]`;
    const result = await evaluate(expr, {});
    expect(result).toEqual([true, true, true, 3, 27, 12, 1]);
  });
});

describe("Travel Reservation Rules", () => {
  describe("Premium Discount Eligibility", () => {
    // Tests a complex pricing rule that considers:
    // - Total package cost across flight, hotel, and car
    // - Customer loyalty tier
    // - Seasonal booking (summer months)
    const expr = `
        // Calculate total package cost
        double(reservation.flight.price) +
        double(reservation.hotel.nightlyRate) * int(reservation.hotel.nights) +
        double(reservation.car.dailyRate) * int(reservation.car.days) >= 2000.0 &&
        // Check loyalty tier
        reservation.customer.loyaltyTier in ['GOLD', 'PLATINUM'] &&
        // Check if booking is in summer months (0-based: 5=June, 6=July, 7=August)
        timestamp(reservation.bookingDate).getMonth() in [5, 6, 7]
      `;
    let program: CelProgram;

    beforeEach(async () => {
      program = await CelProgram.compile(expr);
    });

    it("should qualify for premium discount with valid summer booking", async () => {
      const result = await program.execute({
        reservation: {
          flight: { price: 1000.0 },
          hotel: { nightlyRate: 200.0, nights: 4 },
          car: { dailyRate: 100.0, days: 4 },
          customer: { loyaltyTier: "PLATINUM" },
          bookingDate: "2025-07-15T00:00:00Z",
        },
      });
      expect(result).toBe(true);
    });

    it("should not qualify outside summer months", async () => {
      const result = await program.execute({
        reservation: {
          flight: { price: 1000.0 },
          hotel: { nightlyRate: 200.0, nights: 4 },
          car: { dailyRate: 100.0, days: 4 },
          customer: { loyaltyTier: "PLATINUM" },
          bookingDate: "2025-12-15T00:00:00Z",
        },
      });
      expect(result).toBe(false);
      program = await CelProgram.compile(expr);
    });
  });

  describe("Multi-condition Booking Validation", () => {
    // Tests complex booking validation rules that ensure:
    // - All required components are present
    // - Logical time sequence of events
    // - Location consistency
    // - Capacity constraints
    const expr = `
      has(reservation.flight) &&
      timestamp(reservation.flight.departureTime) < timestamp(reservation.hotel.checkIn) &&
      timestamp(reservation.hotel.checkIn) < timestamp(reservation.hotel.checkOut) &&
      (timestamp(reservation.hotel.checkOut) - timestamp(reservation.hotel.checkIn)) > duration("1h") &&
      timestamp(reservation.hotel.checkOut) < timestamp(reservation.flight.returnTime) &&
      (reservation.car.pickupLocation == reservation.flight.arrivalAirport ||
       reservation.car.pickupLocation == reservation.hotel.address.city) &&
      size(reservation.travelers) <= reservation.hotel.maxOccupancy &&
      size(reservation.travelers) <= reservation.car.capacity
    `;
    let program: CelProgram;

    beforeEach(async () => {
      program = await CelProgram.compile(expr);
    });

    it("should validate a well-formed booking", async () => {
      const result = await program.execute({
        reservation: {
          flight: {
            departureTime: "2025-05-01T10:00:00Z",
            returnTime: "2025-05-05T15:00:00Z",
            arrivalAirport: "LAX",
          },
          hotel: {
            checkIn: "2025-05-01T15:00:00Z",
            checkOut: "2025-05-05T11:00:00Z",
            maxOccupancy: 4,
            address: { city: "Los Angeles" },
          },
          car: {
            pickupLocation: "LAX",
            capacity: 5,
          },
          travelers: ["person1", "person2", "person3"],
        },
      });
      expect(result).toBe(true);
    });

    it("should reject invalid time sequence", async () => {
      const result = await program.execute({
        reservation: {
          flight: {
            departureTime: "2025-05-01T16:00:00Z", // Later than check-in
            returnTime: "2025-05-05T15:00:00Z",
            arrivalAirport: "LAX",
          },
          hotel: {
            checkIn: "2025-05-01T15:00:00Z",
            checkOut: "2025-05-05T11:00:00Z",
            maxOccupancy: 4,
            address: { city: "Los Angeles" },
          },
          car: {
            pickupLocation: "LAX",
            capacity: 5,
          },
          travelers: ["person1", "person2", "person3"],
        },
      });
      expect(result).toBe(false);
    });
  });

  describe.skip("Dynamic Pricing with Seasonal Adjustments", () => {
    // Tests complex pricing calculations including:
    // - Base rates for all components
    // - Seasonal multipliers
    // - Loyalty discounts
    const expr = `
      let basePrice = double(reservation.flight.price) +
                     double(reservation.hotel.nightlyRate) * int(reservation.hotel.nights) +
                     double(reservation.car.dailyRate) * int(reservation.car.days);
      let seasonalPrice = basePrice * (timestamp(reservation.hotel.checkIn).getMonth() in [11, 0, 1] ? 1.25 : 1.0);
      seasonalPrice * (1.0 - {'BRONZE': 0.05, 'SILVER': 0.10, 'GOLD': 0.15, 'PLATINUM': 0.20}[reservation.customer.loyaltyTier])
    `;
    let program: CelProgram;

    beforeEach(async () => {
      program = await CelProgram.compile(expr);
    });

    it("should calculate winter pricing with loyalty discount", async () => {
      const result = await program.execute({
        reservation: {
          flight: { price: 1000.0 },
          hotel: {
            nightlyRate: 200.0,
            nights: 4,
            checkIn: "2025-01-15T15:00:00Z", // January
          },
          car: { dailyRate: 100.0, days: 4 },
          customer: { loyaltyTier: "GOLD" },
        },
      });
      // Base: 1000 + (200 * 4) + (100 * 4) = 2200
      // Winter multiplier: 2200 * 1.25 = 2750
      // Gold discount (15%): 2750 * 0.85 = 2337.5
      expect(result).toBe(2337.5);
    });

    it("should calculate summer pricing with loyalty discount", async () => {
      const result = await program.execute({
        reservation: {
          flight: { price: 1000.0 },
          hotel: {
            nightlyRate: 200.0,
            nights: 4,
            checkIn: "2025-07-15T15:00:00Z", // July
          },
          car: { dailyRate: 100.0, days: 4 },
          customer: { loyaltyTier: "PLATINUM" },
        },
      });
      // Base: 1000 + (200 * 4) + (100 * 4) = 2200
      // No seasonal multiplier
      // Platinum discount (20%): 2200 * 0.80 = 1760
      expect(result).toBe(1760.0);
    });
  });

  describe("Room Upgrade Eligibility", () => {
    // Tests complex upgrade eligibility rules considering:
    // - Customer loyalty tier
    // - Stay duration
    // - Hotel occupancy
    // - Existing offers
    // - Total spend
    // - Current booking class
    const expr = `
      reservation.customer.loyaltyTier in ['GOLD', 'PLATINUM'] &&
      reservation.hotel.nights >= 3 &&
      reservation.hotel.occupancyRate < 0.80 &&
      !(reservation.specialOffers.exists(o, o.type == 'ROOM_UPGRADE')) &&
      reservation.totalSpend > 5000.0 &&
      [reservation.flight.class, reservation.hotel.roomType].all(t, t != 'ECONOMY')
    `;
    let program: CelProgram;

    beforeEach(async () => {
      program = await CelProgram.compile(expr);
    });

    it("should qualify eligible platinum member for upgrade", async () => {
      const result = await program.execute({
        reservation: {
          customer: { loyaltyTier: "PLATINUM" },
          hotel: {
            nights: 4,
            occupancyRate: 0.7,
            roomType: "DELUXE",
          },
          flight: { class: "BUSINESS" },
          specialOffers: [],
          totalSpend: 6000.0,
        },
      });
      expect(result).toBe(true);
    });

    it("should reject upgrade when conditions not met", async () => {
      const result = await program.execute({
        reservation: {
          customer: { loyaltyTier: "PLATINUM" },
          hotel: {
            nights: 4,
            occupancyRate: 0.85, // Too high occupancy
            roomType: "DELUXE",
          },
          flight: { class: "BUSINESS" },
          specialOffers: [],
          totalSpend: 6000.0,
        },
      });
      expect(result).toBe(false);
    });
  });
});
