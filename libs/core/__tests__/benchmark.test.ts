import fs from "node:fs";
import path from "node:path";
import { markdownTable } from "@adam-rocska/markdown-table";
import { benchmark } from "kelonio";
import { afterAll, describe, it } from "vitest";
import { CelProgram, evaluate } from "../src/index.js";

const invokeCompileAndExecute = async () => {
  const program = await CelProgram.compile("size(message) > 5");
  await program.execute({ message: "Hello World" });
};

const invokeEvaluate = async () => {
  await evaluate("timestamp('2023-01-01T00:00:00Z') + duration('1h')", {});
};

const NUM_ITERATIONS = 100;

type Result = {
  name: string;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
};

describe("CEL Performance Benchmarks", () => {
  it("compile performance", async () => {
    await benchmark.record(["compileAndExecute"], invokeCompileAndExecute, {
      iterations: NUM_ITERATIONS,
    });
  });

  it("execute performance", async () => {
    await benchmark.record(["evaluate"], invokeEvaluate, {
      iterations: NUM_ITERATIONS,
    });
  });

  afterAll(async () => {
    const measurements = benchmark.measurements;

    const results: Result[] = [];

    for (const m of measurements) {
      const p50 = calculatePercentile(m.durations, 50);
      const p90 = calculatePercentile(m.durations, 90);
      const p99 = calculatePercentile(m.durations, 99);

      const result: Result = {
        name: m.description.join(" - "),
        p50,
        p90,
        p99,
        mean: m.mean,
        min: m.min,
        max: m.max,
      };

      results.push(result);
    }

    console.log(results);

    writeResults(results);
  });
});

const calculatePercentile = (
  durations: number[],
  percentile: number,
): number => {
  if (durations.length === 0) return 0;
  const sorted = durations.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

const writeResults = (results: Result[]) => {
  // Create markdown table
  const numDecimals = 2;

  const rows = results.map((r) => [
    r.name,
    r.p50.toFixed(numDecimals),
    r.p90.toFixed(numDecimals),
    r.p99.toFixed(numDecimals),
    r.mean.toFixed(numDecimals),
    r.min.toFixed(numDecimals),
    r.max.toFixed(numDecimals),
  ]);

  console.log("rows", rows);

  const md = markdownTable(
    [
      "Test Name",
      "p50 (ms)",
      "p90 (ms)",
      "p99 (ms)",
      "Mean (ms)",
      "Min (ms)",
      "Max (ms)",
    ],
    ...rows,
  );

  // Write to file
  const outPath = path.join(__dirname, "benchmark-results.md");
  fs.writeFileSync(outPath, md);

  // Optional: log summary
  console.log("\nBenchmark results written to", outPath);
  console.log(md);
};
