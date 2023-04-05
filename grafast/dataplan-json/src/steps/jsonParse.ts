import chalk from "chalk";
import type {
  AccessStep,
  GrafastResultsList,
  GrafastValuesList,
  PromiseOrDirect,
} from "grafast";
import { access, ExecutableStep, exportAs } from "grafast";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | Array<JSONValue>;

/**
 * This plan accepts as JSON string as its only input and will result in the
 * parsed JSON object (or array, boolean, string, etc).
 */
export class JSONParseStep<
  TJSON extends JSONValue,
> extends ExecutableStep<TJSON> {
  static $$export = {
    moduleName: "@dataplan/json",
    exportName: "JSONParseStep",
  };
  // We're not safe because if parsing JSON fails we'll include a rejected
  // promise.
  isSyncAndSafe = false;

  constructor($stringPlan: ExecutableStep<string | null>) {
    super();
    this.addDependency($stringPlan);
  }

  toStringMeta(): string {
    return chalk.bold.yellow(String(this.dependencies[0].id));
  }

  get<TKey extends keyof TJSON>(
    key: TKey,
  ): AccessStep<
    TJSON extends { [key: string]: unknown } ? TJSON[TKey] : never
  > {
    return access(this, [key as string]);
  }

  at<TIndex extends keyof TJSON & number>(
    index: TIndex,
  ): AccessStep<TJSON[TIndex]> {
    return access(this, [index]);
  }

  execute(
    count: number,
    values: [GrafastValuesList<string>],
  ): GrafastResultsList<TJSON> {
    const result: Array<PromiseOrDirect<TJSON>> = []; // new Array(count);
    const list = values[0];
    for (let i = 0; i < count; i++) {
      const v = list[i];
      if (typeof v === "string") {
        try {
          result[i] = JSON.parse(v);
        } catch (e) {
          result[i] = Promise.reject(e);
        }
      } else if (v == null) {
        result[i] = null as any;
      } else {
        result[i] = Promise.reject(
          new Error(
            `JSONParseStep: expected string to parse, but received ${
              Array.isArray(v) ? "array" : typeof v
            }`,
          ),
        );
      }
    }
    return result;
  }
}

/**
 * This plan accepts as JSON string as its only input and will result in the
 * parsed JSON object (or array, boolean, string, etc).
 */
export function jsonParse<TJSON extends JSONValue>(
  $string: ExecutableStep<string | null>,
): JSONParseStep<TJSON> {
  return new JSONParseStep<TJSON>($string);
}

exportAs("@dataplan/json", jsonParse, "jsonParse");
