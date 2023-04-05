import type { GrafastResultsList, GrafastValuesList } from "grafast";
import { ExecutableStep, isDev, SafeError } from "grafast";

/**
 * Lightweight plan to validate cursor. We couldn't do this with a lambda
 * because we want it to be optimised away, and for that we need to implement
 * the deduplicate method.
 *
 * @internal
 */
export class PgValidateParsedCursorStep extends ExecutableStep<undefined> {
  static $$export = {
    moduleName: "@dataplan/pg",
    exportName: "PgValidateParsedCursorStep",
  };

  isSyncAndSafe = true;

  constructor(
    $parsedCursorPlan: ExecutableStep<readonly any[] | null>,
    private digest: string,
    private orderCount: number,
    private beforeOrAfter: "before" | "after",
  ) {
    super();
    this.addDependency($parsedCursorPlan);
  }

  deduplicate(
    plans: PgValidateParsedCursorStep[],
  ): PgValidateParsedCursorStep[] {
    return plans.filter(
      (plan) =>
        plan.digest === this.digest &&
        plan.orderCount === this.orderCount &&
        plan.beforeOrAfter === this.beforeOrAfter,
    );
  }

  execute(
    _count: number,
    values: [GrafastValuesList<string | null>],
  ): GrafastResultsList<undefined> {
    const parsedCursors = values[0];
    return parsedCursors.map((decoded) => {
      if (!decoded) {
        return;
      }
      try {
        const [cursorDigest, ...cursorParts] = decoded;
        if (!cursorDigest || cursorDigest !== this.digest) {
          throw new Error(
            `Invalid cursor digest - '${cursorDigest}' !== '${this.digest}'`,
          );
        }
        if (cursorDigest === "natural") {
          if (cursorParts.length !== 1 || typeof cursorParts[0] !== "number") {
            throw new Error(`Invalid 'natural' cursor value - ${cursorParts}`);
          }
        } else if (cursorParts.length !== this.orderCount) {
          throw new Error(
            `Invalid cursor length - ${cursorParts.length} !== ${this.orderCount}`,
          );
        }
        return undefined;
      } catch (e) {
        if (isDev) {
          console.error("Invalid cursor:");
          console.error(e);
        }
        throw new SafeError(
          `Invalid '${this.beforeOrAfter}' cursor - a cursor is only valid within a specific ordering, if you change the order then you'll need different cursors.`,
        );
      }
    });
  }
}

/**
 * Validates the given cursor matches the given details.
 */
export const pgValidateParsedCursor = (
  $parsedCursorPlan: ExecutableStep<readonly any[] | null>,
  digest: string,
  orderCount: number,
  beforeOrAfter: "before" | "after",
) =>
  new PgValidateParsedCursorStep(
    $parsedCursorPlan,
    digest,
    orderCount,
    beforeOrAfter,
  );
