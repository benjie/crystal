import type { TE } from "tamedevil";
import te from "tamedevil";

import * as assert from "../assert.js";
import type { Bucket } from "../bucket.js";
import { isDev } from "../dev.js";
import type { GrafastError } from "../error.js";
import { isGrafastError } from "../error.js";
import { inspect } from "../inspect.js";
import { resolveType } from "../polymorphic.js";
import type {
  ExecutableStep,
  ModifierStep,
  UnbatchedExecutableStep,
} from "../step";
import { newBucket } from "./executeBucket.js";
import type { OperationPlan } from "./OperationPlan";

/*
 * Branching: e.g. polymorphic, conditional, etc - means that different
 * directions can be chosen - the plan "branches" at that point based on a
 * condition. We should not push plans up into parents _unless_ every branch
 * uses the same plan; otherwise we're making the parent do more work than
 * necessary.
 *
 * Deferred: e.g. mutation, subscription, defer, stream - means that the values
 * are calculated "at a later time". We must not push plans up into parents
 * because the values could be out of date (mutations, subscriptions) or would
 * do premature calculation (stream, defer) thus slowing initial payload
 * delivery.
 */

/** Non-branching, non-deferred */
export interface LayerPlanReasonRoot {
  type: "root";
}
/** Non-branching, non-deferred */
export interface LayerPlanReasonNullableField {
  type: "nullableBoundary";
  /**
   * Can be used such that the same LayerPlan can be used for two selection
   * sets for the same parent plan. In this case an additional output plan
   * would be added to the LayerPlan.
   *
   * Also needed for execution (see `executeBucket`).
   */
  parentStep: ExecutableStep;
}
/** Non-branching, non-deferred */
export interface LayerPlanReasonListItem {
  type: "listItem";
  /**
   * Can be used such that the same LayerPlan can be used for two lists for
   * the same parent plan. In this case an additional output plan would be
   * added to the LayerPlan.
   *
   * Also needed for execution (see `executeBucket`).
   */
  parentStep: ExecutableStep;

  /** If this listItem is to be streamed, the configuration for that streaming */
  stream?: {
    initialCount: number;
    label?: string;
  };
}
/** Non-branching, deferred */
export interface LayerPlanReasonSubscription {
  type: "subscription";
}
/** Non-branching, deferred */
export interface LayerPlanReasonMutationField {
  type: "mutationField";
  mutationIndex: number;
}
/** Non-branching, deferred */
export interface LayerPlanReasonDefer {
  type: "defer";
  label?: string;
}
/** Branching, non-deferred */
export interface LayerPlanReasonPolymorphic {
  type: "polymorphic";
  typeNames: string[];
  /**
   * Needed for execution (see `executeBucket`).
   */
  parentStep: ExecutableStep;
}
/** Non-branching, non-deferred */
export interface LayerPlanReasonSubroutine {
  // NOTE: the plan that has a subroutine should call executeBucket from within
  // `execute`.
  type: "subroutine";
  parentStep: ExecutableStep;
}

export function isBranchingLayerPlan(layerPlan: LayerPlan<any>): boolean {
  return layerPlan.reason.type === "polymorphic";
}
export function isDeferredLayerPlan(layerPlan: LayerPlan<any>): boolean {
  const t = layerPlan.reason.type;
  return (
    t === "stream" ||
    t === "subscription" ||
    t === "mutationField" ||
    t === "defer"
  );
}
export function isPolymorphicLayerPlan(layerPlan: LayerPlan<any>): boolean {
  const t = layerPlan.reason.type;
  return t === "polymorphic";
}

export type LayerPlanReason =
  | LayerPlanReasonRoot
  | LayerPlanReasonNullableField
  | LayerPlanReasonListItem
  | LayerPlanReasonSubscription
  | LayerPlanReasonMutationField
  | LayerPlanReasonDefer
  | LayerPlanReasonPolymorphic
  | LayerPlanReasonSubroutine;

// The `A extends any ? ... : never` tells TypeScript to make this
// distributive. TypeScript can be a bit arcane.
export type HasParent<A extends LayerPlanReason> = A extends any
  ? A extends { parentStep: ExecutableStep }
    ? A
    : never
  : never;

export type LayerPlanReasonsWithParentStep = HasParent<LayerPlanReason>;

/** @internal */
export interface LayerPlanPhase {
  /**
   * A list of steps that can be ran in parallel at this point, since all
   * their previous dependencies have already been satisfied.
   */
  normalSteps?: Array<{
    step: ExecutableStep;
  }>;

  /**
   * A list of 'isSyncAndSafe' steps with unbatchedExecute methods that can be
   * ran once the `normalSteps` have completed; they must only depend on steps
   * that have already been executed before them (including previous
   * unbatchedSyncAndSafeSteps in the same list).
   */
  unbatchedSyncAndSafeSteps?: Array<{
    step: UnbatchedExecutableStep;

    /**
     * Store the result of the step here if you want - useful to avoid lookups
     * and when there's no storage. HIGHLY VOLATILE, will not survive a tick!
     */
    scratchpad: any;
  }>;

  /**
   * Optimization - a digest of all steps in normalSteps and unbatchedSyncAndSafeSteps
   *
   * @internal
   */
  _allSteps: ExecutableStep[];
}

/**
 * A LayerPlan represents (via "reason") either the root (root), when something
 * happens at a later time (mutationField, defer), when plurality changes
 * (list, stream, subscription, polymorphic), or when a subprocess needs to be
 * computed (subroutine).
 *
 * Layer plans belong to an operation plan.
 *
 * Every layer plan (except for the root layer plan) has exactly one parent
 * layer plan.
 *
 * Every layer plan is caused by a parent step.
 *
 * The LayerPlan of a step influences:
 *
 * 1. how steps are deduplicated
 * 2. the order in which the steps are executed
 * 3. where the result of executing the step is stored
 * 4. when the step execution cache is allowed to be GC'd
 *
 * NOTE: `__ListTransformStep`'s effectively have a temporary bucket inside
 * them (built on the `__Item`) that's thrown away once the transform is
 * complete.
 *
 */
export class LayerPlan<TReason extends LayerPlanReason = LayerPlanReason> {
  id: number;

  /**
   * Every layer plan has a "root step" that shapes the value the layer
   * returns. Note that this step may be dependent on other steps included in
   * the LayerPlan, or could be provided externally.
   *
   * The root step is different for different layer step reasons:
   *
   * - root: the `operationPlan.rootValue`
   * - listItem: the `__ItemStep`
   * - stream: also the `__ItemStep`
   * - subscription: also the `__ItemStep`
   * - mutationField: the result plan of the mutation field
   * - defer: the parent layer's rootStep (defer always results in an object, unless an error occurs)
   * - polymorphic: the plan for the particular type
   * - subroutine: the result (returned) plan of the subroutine
   *
   * @internal
   */
  public readonly rootStep: ExecutableStep | null = null;

  /**
   * Which plans the results for which are available in a parent bucket need to
   * be "copied across" to this bucket because plans in this bucket still
   * reference them?
   *
   * @internal
   */
  // TODO: rename to copyStepIds
  public copyPlanIds: number[] = [];

  /** @internal */
  public children: LayerPlan[] = [];

  /** @internal */
  steps: ExecutableStep[] = [];
  /** @internal */
  pendingSteps: ExecutableStep[] = [];

  /**
   * Describes the order in which the steps within this LayerPlan are executed.
   *
   * Special attention must be paid to steps that have side effects.
   *
   * @internal
   */
  phases: Array<LayerPlanPhase> = [];

  /**
   * The list of layerPlans that steps added to this LayerPlan may depend upon.
   *
   * @internal
   */
  ancestry: LayerPlan[];

  constructor(
    public readonly operationPlan: OperationPlan,
    public parentLayerPlan: LayerPlan | null,
    public readonly reason: TReason, //parentStep: ExecutableStep | null,
    public polymorphicPaths: ReadonlySet<string>,
  ) {
    if (parentLayerPlan) {
      this.ancestry = [...parentLayerPlan.ancestry, this];
    } else {
      this.ancestry = [this];
    }
    this.id = operationPlan.addLayerPlan(this);
    if (!parentLayerPlan) {
      assert.strictEqual(
        this.id,
        0,
        "All but the first LayerPlan must have a parent",
      );
    } else {
      assert.ok(
        reason.type != "root",
        "Non-root LayerPlan must have a parentStep",
      );
      parentLayerPlan.children.push(this);
    }
  }

  toString() {
    let chain = "";
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: LayerPlan | null = this;
    while ((current = current.parentLayerPlan)) {
      chain = chain + `∈${current.id}`;
    }
    const reasonExtra =
      this.reason.type === "polymorphic"
        ? `{${this.reason.typeNames.join(",")}}`
        : "";
    const deps = this.copyPlanIds.length > 0 ? `%${this.copyPlanIds}` : "";
    return `LayerPlan<${this.id}${chain}?${this.reason.type}${reasonExtra}!${
      this.rootStep?.id ?? "x"
    }${deps}>`;
  }

  print(depth = 0) {
    const output = [`${" ".repeat(depth * 2)}${this}`];
    for (const child of this.children) {
      output.push(child.print(depth + 1));
    }
    return output.join("\n");
  }

  setRootStep($root: ExecutableStep): void {
    this.operationPlan.stepTracker.setLayerPlanRootStep(this, $root);
  }

  /** @internal Use plan.getStep(id) instead. */
  public getStep(id: number, requestingStep: ExecutableStep): ExecutableStep {
    return this.operationPlan.getStep(id, requestingStep);
  }

  /** @internal */
  public _addStep(step: ExecutableStep): number {
    return this.operationPlan._addStep(step);
  }

  /** @internal */
  public _addModifierStep(step: ModifierStep<any>): string {
    return this.operationPlan._addModifierStep(step);
  }

  public makeNewBucketCallback(
    this: LayerPlan<TReason>,
    inner: TE,
  ): typeof this.newBucket {
    return te.run`\
const that = ${te.ref(this)};
const newBucket = ${te.ref(newBucket)};
return function ${te.identifier(`newBucket${this.id}`)}(parentBucket) {
  const store = new Map();
  const polymorphicPathList = ${
    this.reason.type === "mutationField"
      ? te`parentBucket.polymorphicPathList`
      : te`[]`
  };
  const map = new Map();
  let size = 0;

${inner}

  if (size > 0) {
    // Reference
    const childBucket = newBucket({
      layerPlan: that,
      size,
      store,
      // PERF: not necessarily, if we don't copy the errors, we don't have the errors.
      hasErrors: parentBucket.hasErrors,
      polymorphicPathList,
    });
    // PERF: set ourselves in more places so that we never have to call 'getChildBucketAndIndex'.
    parentBucket.children[${te.lit(this.id)}] = {
      bucket: childBucket,
      map,
    };

    return childBucket;
  } else {
    return null;
  }
}
`;
  }

  public finalize(): void {
    const copyStepIds = [...this.copyPlanIds];
    if (this.reason.type === "nullableBoundary") {
      // PERF: if parent bucket has no nulls/errors in itemStepId
      // then we can just copy everything wholesale rather than building
      // new arrays and looping.

      this.newBucket = this.makeNewBucketCallback(te`\
${
  isDev
    ? te`/*
makeNewBucketCallback called for LayerPlan with id: ${te.subcomment(this.id)}.
Reason type: ${te.subcomment(this.reason.type)}
Root step: ${te.subcomment(this.rootStep?.id)}
Copy step ids: ${te.subcomment(copyStepIds.join(","))}
*/
`
    : te.blank
}\
  const itemStepId = ${te.lit(this.rootStep!.id)};
  const nullableStepStore = parentBucket.store.get(itemStepId);

  const itemStepIdList = [];
  store.set(itemStepId, itemStepIdList);

  // Prepare store with an empty list for each copyPlanId
${te.join(
  copyStepIds.map(
    (planId) => te`\
  const ${te.identifier(`source${planId}`)} = parentBucket.store.get(${te.lit(
      planId,
    )});
  const ${te.identifier(`target${planId}`)} = [];
  store.set(${te.lit(planId)}, ${te.identifier(`target${planId}`)});
`,
  ),
  "",
)}

  // We'll typically be creating fewer nullableBoundary bucket entries
  // than we have parent bucket entries (because we exclude nulls), so
  // we must "multiply up" (down) the store entries.
  for (
    let originalIndex = 0;
    originalIndex < parentBucket.size;
    originalIndex++
  ) {
    const fieldValue = nullableStepStore[originalIndex];
    if (fieldValue != null) {
      const newIndex = size++;
      map.set(originalIndex, newIndex);
      itemStepIdList[newIndex] = fieldValue;

      polymorphicPathList[newIndex] = parentBucket.polymorphicPathList[originalIndex];
${te.join(
  copyStepIds.map(
    (planId) => te`\
      ${te.identifier(`target${planId}`)}[newIndex] = ${te.identifier(
      `source${planId}`,
    )}[originalIndex];
`,
  ),
  "",
)}
    }
  }
`);
    } else if (this.reason.type === "listItem") {
      this.newBucket = this.makeNewBucketCallback(te`\
  const listStepStore = parentBucket.store.get(${te.lit(
    this.reason.parentStep.id,
  )});

  const itemStepIdList = [];
  store.set(${te.lit(this.rootStep!.id)}, itemStepIdList);

  // Prepare store with an empty list for each copyPlanId
  ${te.join(
    copyStepIds.map(
      (planId) => te`\
  const ${te.identifier(`source${planId}`)} = parentBucket.store.get(${te.lit(
        planId,
      )});
  const ${te.identifier(`target${planId}`)} = [];
  store.set(${te.lit(planId)}, ${te.identifier(`target${planId}`)});
  `,
    ),
    "",
  )}

  // We'll typically be creating more listItem bucket entries than we
  // have parent buckets, so we must "multiply up" the store entries.
  for (
    let originalIndex = 0;
    originalIndex < parentBucket.size;
    originalIndex++
  ) {
    const list = listStepStore[originalIndex];
    if (Array.isArray(list)) {
      const newIndexes = [];
      map.set(originalIndex, newIndexes);
      for (let j = 0, l = list.length; j < l; j++) {
        const newIndex = size++;
        newIndexes.push(newIndex);
        itemStepIdList[newIndex] = list[j];

        polymorphicPathList[newIndex] = parentBucket.polymorphicPathList[originalIndex];
        ${te.join(
          copyStepIds.map(
            (planId) => te`\
        ${te.identifier(`target${planId}`)}[newIndex] = ${te.identifier(
              `source${planId}`,
            )}[originalIndex];
        `,
          ),
          "",
        )}
      }
    }
  }

`);
    }
  }

  public newBucket(parentBucket: Bucket): Bucket | null {
    const copyStepIds = this.copyPlanIds;
    const store: Bucket["store"] = new Map();
    const polymorphicPathList: string[] =
      this.reason.type === "mutationField"
        ? (parentBucket.polymorphicPathList as string[])
        : [];
    const map: Map<number, number | number[]> = new Map();
    let size = 0;
    switch (this.reason.type) {
      case "nullableBoundary": {
        const itemStepId = this.rootStep?.id;
        assert.ok(
          itemStepId != null,
          "GrafastInternalError<f8136364-46c7-4886-b2ae-51319826f97d>: nullableStepStore layer plan has no rootStepId",
        );
        const nullableStepStore = parentBucket.store.get(itemStepId);
        if (!nullableStepStore) {
          throw new Error(
            `GrafastInternalError<017dc8bf-1db1-4983-a41e-e69c6652e4c7>: could not find entry '${itemStepId}' (${parentBucket.layerPlan.operationPlan.dangerouslyGetStep(
              itemStepId,
            )}) in store for ${parentBucket.layerPlan}`,
          );
        }

        // PERF: if parent bucket has no nulls/errors in `itemStepId`
        // then we can just copy everything wholesale rather than building
        // new arrays and looping.
        const hasNoNullsOrErrors = false;

        if (hasNoNullsOrErrors) {
          store.set(itemStepId, nullableStepStore);
          for (const planId of copyStepIds) {
            store.set(planId, parentBucket.store.get(planId)!);
          }
          for (
            let originalIndex = 0;
            originalIndex < parentBucket.size;
            originalIndex++
          ) {
            const newIndex = size++;
            map.set(originalIndex, newIndex);
            polymorphicPathList[newIndex] =
              parentBucket.polymorphicPathList[originalIndex];
          }
        } else {
          const itemStepIdList: any[] = [];
          store.set(itemStepId, itemStepIdList);

          // Prepare store with an empty list for each copyPlanId
          for (const planId of copyStepIds) {
            store.set(planId, []);
          }

          // We'll typically be creating fewer nullableBoundary bucket entries
          // than we have parent bucket entries (because we exclude nulls), so
          // we must "multiply up" (down) the store entries.
          for (
            let originalIndex = 0;
            originalIndex < parentBucket.size;
            originalIndex++
          ) {
            const fieldValue: any[] | null | undefined | GrafastError =
              nullableStepStore[originalIndex];
            if (fieldValue != null) {
              const newIndex = size++;
              map.set(originalIndex, newIndex);
              itemStepIdList[newIndex] = fieldValue;

              polymorphicPathList[newIndex] =
                parentBucket.polymorphicPathList[originalIndex];
              for (const planId of copyStepIds) {
                store.get(planId)![newIndex] =
                  parentBucket.store.get(planId)![originalIndex];
              }
            }
          }
        }

        break;
      }
      case "listItem": {
        const listStepId = this.reason.parentStep.id;
        const listStepStore = parentBucket.store.get(listStepId);
        if (!listStepStore) {
          throw new Error(
            `GrafastInternalError<314865b0-f7e8-4e81-b966-56e5a0de562e>: could not find entry '${listStepId}' (${parentBucket.layerPlan.operationPlan.dangerouslyGetStep(
              listStepId,
            )}) in store for layerPlan ${parentBucket.layerPlan}`,
          );
        }

        const itemStepId = this.rootStep?.id;
        if (itemStepId == null) {
          throw new Error(
            "GrafastInternalError<b3a2bff9-15c6-47e2-aa82-19c862324f1a>: listItem layer plan has no rootStepId",
          );
        }
        store.set(itemStepId, []);

        // Prepare store with an empty list for each copyPlanId
        for (const planId of copyStepIds) {
          store.set(planId, []);
        }

        // We'll typically be creating more listItem bucket entries than we
        // have parent buckets, so we must "multiply up" the store entries.
        for (
          let originalIndex = 0;
          originalIndex < parentBucket.size;
          originalIndex++
        ) {
          const list: any[] | null | undefined | GrafastError =
            listStepStore[originalIndex];
          if (Array.isArray(list)) {
            const newIndexes: number[] = [];
            map.set(originalIndex, newIndexes);
            for (let j = 0, l = list.length; j < l; j++) {
              const newIndex = size++;
              newIndexes.push(newIndex);
              store.get(itemStepId)![newIndex] = list[j];

              polymorphicPathList[newIndex] =
                parentBucket.polymorphicPathList[originalIndex];
              for (const planId of copyStepIds) {
                store.get(planId)![newIndex] =
                  parentBucket.store.get(planId)![originalIndex];
              }
            }
          }
        }

        break;
      }
      case "mutationField": {
        // This is a 1-to-1 map, so we can mostly just copy from parent bucket
        size = parentBucket.size;
        for (let i = 0; i < parentBucket.size; i++) {
          map.set(i, i);
        }
        for (const planId of copyStepIds) {
          store.set(planId, parentBucket.store.get(planId)!);
        }

        break;
      }
      case "polymorphic": {
        const polymorphicPlanId = this.reason.parentStep.id;
        const polymorphicPlanStore = parentBucket.store.get(polymorphicPlanId);
        if (!polymorphicPlanStore) {
          throw new Error(
            `GrafastInternalError<af1417c6-752b-466e-af7e-cfc35724c3bc>: Entry for '${parentBucket.layerPlan.operationPlan.dangerouslyGetStep(
              polymorphicPlanId,
            )}' not found in bucket for '${parentBucket.layerPlan}'`,
          );
        }

        // We're only copying over the entries that match this type (note:
        // they may end up being null, but that's okay)
        const targetTypeNames = this.reason.typeNames;

        for (const planId of copyStepIds) {
          store.set(planId, []);
          if (!parentBucket.store.has(planId)) {
            throw new Error(
              `GrafastInternalError<548f0d84-4556-4189-8655-fb16aa3345a6>: new bucket for ${this} wants to copy ${this.operationPlan.dangerouslyGetStep(
                planId,
              )}, but bucket for ${
                parentBucket.layerPlan
              } doesn't contain that plan`,
            );
          }
        }

        for (
          let originalIndex = 0;
          originalIndex < parentBucket.size;
          originalIndex++
        ) {
          const value = polymorphicPlanStore[originalIndex];
          if (value == null) {
            continue;
          }
          if (isGrafastError(value)) {
            continue;
          }
          const typeName = resolveType(value);
          if (!targetTypeNames.includes(typeName)) {
            continue;
          }
          const newIndex = size++;
          map.set(originalIndex, newIndex);

          // PERF: might be faster if we look this up as a constant rather than using concatenation here
          const newPolymorphicPath =
            parentBucket.polymorphicPathList[originalIndex] + ">" + typeName;

          polymorphicPathList[newIndex] = newPolymorphicPath;
          for (const planId of copyStepIds) {
            store.get(planId)![newIndex] =
              parentBucket.store.get(planId)![originalIndex];
          }
        }

        break;
      }
      case "subscription":
      case "defer": {
        // TODO
        throw new Error("TODO");
      }
      case "subroutine": {
        throw new Error(
          "Subroutines are experimental and must currently handle their own bucket creation",
        );
      }
      case "root": {
        throw new Error(
          // *confused emoji*
          "GrafastInternalError<05fb7069-81b5-43f7-ae71-f62547d2c2b7>: root cannot be not the root (...)",
        );
      }
      default: {
        const never: never = this.reason;
        throw new Error(
          `GrafastInternalError<8162e6c2-3d66-4d67-ba03-5310a4f9a6d4>: unhandled reason '${inspect(
            never,
          )}'`,
        );
      }
    }

    if (size > 0) {
      // Reference
      const childBucket = newBucket({
        layerPlan: this,
        size,
        store,
        // PERF: not necessarily, if we don't copy the errors, we don't have the errors.
        hasErrors: parentBucket.hasErrors,
        polymorphicPathList,
      });
      parentBucket.children[this.id] = {
        bucket: childBucket,
        map,
      };

      return childBucket;
    } else {
      return null;
    }
  }
}
