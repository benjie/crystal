import type {
  ExecutionExtra,
  GrafastResultsList,
  GrafastValuesList,
} from "../interfaces.js";
import type { ExecutableStep } from "../step.js";
import { UnbatchedExecutableStep } from "../step.js";
import { ListStep } from "./list.js";

export class FirstStep<TData> extends UnbatchedExecutableStep<TData> {
  static $$export = {
    moduleName: "grafast",
    exportName: "FirstStep",
  };
  isSyncAndSafe = true;
  allowMultipleOptimizations = true;

  constructor(parentPlan: ExecutableStep<ReadonlyArray<TData>>) {
    super();
    this.addDependency(parentPlan);
  }

  execute(
    count: number,
    values: GrafastValuesList<[ReadonlyArray<TData>]>,
  ): GrafastResultsList<TData> {
    const result: Array<TData> = [];
    const dep = values[0];
    for (let i = 0; i < count; i++) {
      result[i] = dep[i]?.[0];
    }
    return result;
  }

  unbatchedExecute(extra: ExecutionExtra, list: any[]) {
    return list?.[0];
  }

  deduplicate(peers: FirstStep<TData>[]): FirstStep<TData>[] {
    return peers;
  }

  optimize() {
    const parent = this.getDep(0);
    // The first of a list plan is just the first dependency of the list plan.
    if (parent instanceof ListStep) {
      return parent.getDep(0);
    }
    return this;
  }
}

/**
 * A plan that resolves to the first entry in the list returned by the given
 * plan.
 */
export function first<TData>(
  plan: ExecutableStep<ReadonlyArray<TData>>,
): FirstStep<TData> {
  return new FirstStep(plan);
}
