import type { GrafastResultsList } from "../interfaces.js";
import { UnbatchedExecutableStep } from "../step.js";
import { arrayOfLength } from "../utils.js";

/**
 * Converts a constant value (e.g. a string/number/etc) into a plan
 */
export class ConstantStep<TData> extends UnbatchedExecutableStep<TData> {
  static $$export = {
    moduleName: "grafast",
    exportName: "ConstantStep",
  };
  isSyncAndSafe = true;

  constructor(private data: TData) {
    super();
  }

  execute(values: [[undefined]]): GrafastResultsList<TData> {
    return arrayOfLength(values[0].length, this.data);
  }

  eval() {
    return this.data;
  }

  evalIs(value: any) {
    return this.data === value;
  }

  unbatchedExecute() {
    return this.data;
  }

  isNull() {
    return this.data === null;
  }
}

function isTemplateStringsArray(data: any): data is TemplateStringsArray {
  return (
    Array.isArray(data) &&
    "raw" in data &&
    Array.isArray((data as TemplateStringsArray).raw)
  );
}

/**
 * Call this as a template string or as a function. Only intended for handling
 * scalar values, not arrays/objects/etc.
 */
export function constant(
  strings: TemplateStringsArray & [string],
): ConstantStep<string>;
export function constant<TData>(data: TData): ConstantStep<TData>;
export function constant<TData>(
  data: TData | (TemplateStringsArray & [TData]),
): ConstantStep<TData> {
  if (isTemplateStringsArray(data)) {
    if (data.length !== 1) {
      throw new Error(
        "constant`...` doesn't currently support placeholders; please use 'constant(`...`)' instead",
      );
    }
    return new ConstantStep<TData>(data[0]);
  }
  return new ConstantStep<TData>(data);
}
