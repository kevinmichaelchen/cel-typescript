export interface CelContext {
  [key: string]: any;
}

export class CelProgram {
  private static nativeModule: any;
  private native: any;

  constructor(native: any) {
    this.native = native;
  }

  static async compile(source: string): Promise<CelProgram> {
    if (!CelProgram.nativeModule) {
      // Use require instead of import for native modules
      const nativeBinding = require("../cel-typescript.darwin-arm64.node");
      CelProgram.nativeModule = nativeBinding.CelProgram;
      console.log("Imported native CelProgram:", CelProgram.nativeModule);
    }
    const native = await CelProgram.nativeModule.compile(source);
    return new CelProgram(native);
  }

  async execute(context: CelContext): Promise<any> {
    return this.native.execute(context);
  }
}

export default CelProgram;
