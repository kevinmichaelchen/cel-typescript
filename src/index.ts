export interface CelContext {
  [key: string]: any;
}

export class CelProgram {
  private static nativeModule: any;
  private native: any;

  constructor(native: any) {
    this.native = native;
  }

  /**
   * Compiles a CEL expression into a reusable program.
   *
   * Performance advantages:
   * - Parsing and compilation are done only once: The CEL expression is parsed into an Abstract
   *   Syntax Tree (AST) and compiled into an optimized internal representation in Rust
   * - Type checking and validation happen during compilation: Any syntax errors or type
   *   mismatches are caught early, before execution
   * - The compiled program is cached in memory: The native Rust program object is retained
   *   and can be reused without re-parsing or re-validating the expression
   * - Execution is optimized: When executing the compiled program, it only needs to convert
   *   the input context to CEL values and evaluate the pre-compiled expression tree
   *
   * This is particularly beneficial when you need to evaluate the same expression multiple
   * times with different contexts, as you avoid the overhead of parsing, validation, and
   * compilation for each evaluation.
   *
   * @param source The CEL expression to compile
   * @returns A compiled CelProgram instance ready for execution
   */
  static async compile(source: string): Promise<CelProgram> {
    if (!CelProgram.nativeModule) {
      // Use the NAPI-RS generated loader which handles platform detection
      const nativeBinding = await import("../index.js");
      CelProgram.nativeModule = nativeBinding.CelProgram;
      console.log("Imported native CelProgram:", CelProgram.nativeModule);
    }
    const native = await CelProgram.nativeModule.compile(source);
    return new CelProgram(native);
  }

  async execute(context: CelContext): Promise<any> {
    return this.native.execute(context);
  }

  /**
   * Convenience method to compile and execute a CEL expression in one step.
   * Note: If you plan to evaluate the same expression multiple times with different contexts,
   * it's more efficient to use compile() once and then call execute() multiple times.
   */
  static async evaluate(source: string, context: CelContext): Promise<any> {
    const program = await CelProgram.compile(source);
    return program.execute(context);
  }
}

export default CelProgram;
