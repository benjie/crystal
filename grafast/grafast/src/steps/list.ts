import type { ExecutionExtra, UnwrapPlanTuple } from "../interfaces.js";
import type { ExecutableStep } from "../step.js";
import { UnbatchedExecutableStep } from "../step.js";

export class ListStep<
  const TPlanTuple extends readonly ExecutableStep[],
> extends UnbatchedExecutableStep<UnwrapPlanTuple<TPlanTuple>> {
  static $$export = {
    moduleName: "grafast",
    exportName: "ListStep",
  };
  isSyncAndSafe = true;
  allowMultipleOptimizations = true;

  constructor(list: TPlanTuple) {
    super();
    for (let i = 0, l = list.length; i < l; i++) {
      this.addDependency(list[i]);
    }
  }

  toStringMeta() {
    return this.dependencies.map(($dep) => $dep.id).join(",");
  }

  execute(
    count: number,
    values: any[][], //Array<UnwrapPlanTuple<TPlanTuple>>,
  ): Array<UnwrapPlanTuple<TPlanTuple>> {
    const result: any[] = [];
    for (let i = 0; i < count; i++) {
      result[i] = values.map((list) => list[i]);
    }
    return result;
  }

  unbatchedExecute(
    extra: ExecutionExtra,
    ...values: any[] //UnwrapPlanTuple<TPlanTuple>,
  ): UnwrapPlanTuple<TPlanTuple> {
    return values as any;
  }

  deduplicate(peers: ListStep<TPlanTuple>[]): ListStep<TPlanTuple>[] {
    return peers;
  }

  /**
   * Get the original plan at the given index back again.
   */
  public at<TIndex extends keyof TPlanTuple>(
    index: TIndex,
  ): TPlanTuple[TIndex] {
    return this.getDep(index as number) as TPlanTuple[TIndex];
  }
}

/**
 * Takes a list of plans and turns it into a single plan that represents the
 * list of their values.
 */
export function list<const TPlanTuple extends readonly ExecutableStep[]>(
  list: TPlanTuple,
): ListStep<TPlanTuple> {
  return new ListStep<TPlanTuple>(list);
}
