import { $$noExec, ExecutableStep } from "../step.js";
import type { AccessStep } from "./access.js";
import { access } from "./access.js";

/**
 * Implements `__ValueStep(opPlan)` which is never executed; it's purely
 * internal - we populate the value as part of the algorithm - see
 * `GetValueStepId` and `PopulateValueStep`.
 */
export class __ValueStep<TData> extends ExecutableStep<TData> {
  static $$export = {
    moduleName: "grafast",
    exportName: "__ValueStep",
  };
  isSyncAndSafe = true;
  [$$noExec] = true;

  constructor() {
    super();
  }

  toStringMeta(): string | null {
    switch (this) {
      case this.layerPlan.operationPlan.rootValueStep:
        return "rootValue";
      case this.layerPlan.operationPlan
        .variableValuesStep as __ValueStep<unknown>:
        return "variableValues";
      case this.layerPlan.operationPlan.contextStep as __ValueStep<unknown>:
        return "context";
      default:
        return null;
    }
  }

  execute(): never {
    // This is still an "executable plan"; we just side-step execution internally.
    throw new Error(
      `GrafastInternalError<7696a514-f452-4d47-92d3-85aeb5b23f48>: ${this} is a __ValueStep and thus must never execute`,
    );
  }

  get<TAttr extends keyof TData>(attrName: TAttr): AccessStep<TData[TAttr]> {
    return access(this, [attrName as string]);
  }

  at<TIndex extends keyof TData>(index: TIndex): AccessStep<TData[TIndex]> {
    return access(this, [index as number]);
  }
}
