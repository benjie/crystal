import { GraphQLResolveInfo } from "graphql";
import {
  GraphQLArguments,
  CrystalResult,
  FutureDependencies,
  PathIdentity,
  Plan,
  $$path,
  $$batch,
  $$data,
} from "./interfaces";
import { getPathIdentityFromResolveInfo } from "./utils";
import { isCrystalResult } from "./crystalResult";
import { Aether } from "./aether";
import { futurize, future } from "./future";
import { mapValues } from "lodash";

/**
 * What a Batch knows about a particular PathIdentity
 */
interface Info {
  pathIdentity: PathIdentity;
  graphile: GraphileEngine.GraphQLObjectTypeGraphileExtension | null;
  plan: Plan;
}

/**
 * When a resolver needs a plan to be executed, that execution takes place
 * within a Batch. The first resolver (field) to create the Batch is called the
 * "batch root". We'll try and expand as far from the batch root as we can,
 * looking ahead in the GraphQL query and pro-actively calling the plans for
 * subfields, arguments, etc. A batch has "dependencies", the values used from
 * variables, context, rootValue, etc. Next time we come to build a Batch in a
 * batch root we will look at the previous Batches, and if the dependencies
 * match we can consider re-using the previous Batch.
 *
 * IMPORTANT: the same "batch root" field may result in many calls to create a
 * batch, but like in DataLoader, future calls should be grouped - we can do
 * so using the PathIdentity of the batch root.
 */
export class Batch {
  private infoByPathIdentity: Map<PathIdentity, Info>;
  private plan: any;

  constructor(
    public readonly aether: Aether,
    parent: unknown,
    args: GraphQLArguments,
    context: GraphileEngine.GraphileResolverContext,
    info: GraphQLResolveInfo,
  ) {
    this.infoByPathIdentity = new Map();
    this.execute(parent, args, context, info);
  }

  /**
   * Populates infoByPathIdentity **synchronously**.
   */
  execute(
    parent: unknown,
    args: GraphQLArguments,
    context: GraphileEngine.GraphileResolverContext,
    info: GraphQLResolveInfo,
  ) {
    /*
     * NOTE: although we have access to 'parent' here, we're only using it for
     * meta-data (path, batch, etc); we must not use the *actual* data in it
     * here, that's for `getResultFor` below.
     */

    const pathIdentity = getPathIdentityFromResolveInfo(
      info,
      isCrystalResult(parent) ? parent[$$path] : undefined,
    );
    const digest = this.aether.doc.digestForPath(
      pathIdentity,
      info.variableValues,
    );

    if (digest?.plan) {
      const trackedArgs = new TrackedObject(args);
      const trackedContext = new TrackedObject(context);
      const $deps: FutureDependencies<any> = future();
      const plan = digest?.plan($deps, trackedArgs, trackedContext);

      // TODO: apply the args here
      /*
       * Since a batch runs for a single (optionally aliased) field in the
       * operation, we know that the args for all entries within the batch will
       * be the same. Note, however, that the selection set may differ.
       */
      /*
      for (const arg of digest.args) {
        if (arg.name in args) {
          const graphile: GraphileEngine.GraphQLFieldGraphileExtension =
            arg.extensions?.graphile;
          if (graphile) {
            graphile.argPlan?.(
              this,
              args[arg.name],
              parent?.[$$record],
              args,
              context,
            );
          }
        }
      }
      */
      // TODO (somewhere else): selection set fields' dependencies
      // TODO (somewhere else): selection set fields' args' dependencies (e.g. includeArchived: 'inherit')

      this.plan = plan.finalize();
    } else {
      return null;
    }
  }

  appliesTo(pathIdentity: PathIdentity): boolean {
    return !!this.infoByPathIdentity.get(pathIdentity);
  }

  async getResultFor(
    parent: unknown,
    info: GraphQLResolveInfo,
  ): Promise<CrystalResult> {
    const data = await this.plan.executeWith(parent);
    const pathIdentity = getPathIdentityFromResolveInfo(
      info,
      isCrystalResult(parent) ? parent[$$path] : undefined,
    );
    return {
      [$$batch]: this,
      [$$data]: data,
      [$$path]: pathIdentity,
    };
  }
}
