// import type { GraphQLScalarType } from "graphql";

import type { LayerPlan } from "./engine/LayerPlan";
import type { MetaByMetaKey } from "./engine/OperationPlan";
import type { ExecutionEventEmitter } from "./interfaces.js";

// TODO: rename this, it clashes with Grafast.RequestContext.
/**
 * @internal
 */
export interface RequestContext {
  // readonly toSerialize: Array<{
  //   /** object (or array) */
  //   o: object;
  //   /** key (or index) */
  //   k: string | number;
  //   /** serializer */
  //   s: GraphQLScalarType["serialize"];
  //   /** GraphQL request path */
  //   p: Array<string | number>;
  // }>;

  readonly eventEmitter: ExecutionEventEmitter | undefined;

  metaByMetaKey: MetaByMetaKey;

  /**
   * If we're running inside GraphQL then we should not serialize scalars,
   * otherwise we'll face the double-serialization problem.
   */
  insideGraphQL: boolean;
}

/**
 * A "bucket" is where the results from plans are stored so that other plans
 * can retrieve them, it may take on different forms depending on the mode of
 * execution. A "LayerPlan" is used to both identify the bucket and to specify
 * why it exists and how it behaves.
 *
 * Every `ExecutableStep` belongs to exactly one LayerPlan (and thus bucket),
 * specified by `plan.layerPlan`.
 *
 * @internal
 */
export interface Bucket {
  /**
   * The LayerPlan definition this bucket adheres to
   */
  layerPlan: LayerPlan;

  /**
   * How many entries are there in the bucket?
   */
  size: number;

  /**
   * The polymorphic path through which each of the entries (respectively) has
   * travelled. This influences the steps that will be executed using the
   * related inputs.
   */
  polymorphicPathList: readonly string[];

  /**
   * Every entry in the store is a list with the same length as the bucket has
   * `size`.
   *
   * The entry for '-1' is the request indexes, so we can associate the results
   * back to the request that triggered them.
   */
  store: Map<number, any[]>;

  /**
   * Set this true when the bucket is fully executed.
   *
   * Initialize it to false.
   */
  isComplete: boolean;

  // PERF: we should be able to convert this into a set of planIds that have
  // errors, then we can use this as we cascade forward to the next bucket.
  /**
   * If an error occurred at any stage we need to drop down to more careful
   * (and slower) handling.
   *
   * Initialize it to false.
   */
  hasErrors: boolean;

  /**
   * The child buckets of this bucket.
   */
  children: {
    [layerPlanId: number]: {
      bucket: Bucket;
      map: Map<number, number | number[]>;
    };
  };
}
