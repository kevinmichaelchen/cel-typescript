export declare class CelProgram {
  static compile(source: string): Promise<CelProgram>;
  execute(context: Record<string, any>): Promise<any>;
}
