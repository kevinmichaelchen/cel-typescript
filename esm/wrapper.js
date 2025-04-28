import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const nativeModule = require("../index.js");
export default nativeModule;
// Re-export all named exports
export * from "../index.js";
