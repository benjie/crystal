import type { EdgeCapableStep, ExecutableStep, ExecutionExtra } from "grafast";
import {
  exportAs,
  list,
  polymorphicWrap,
  UnbatchedExecutableStep,
} from "grafast";
import type { GraphQLObjectType } from "graphql";
import type { SQL } from "pg-sql2";
import sql from "pg-sql2";

import type {
  ObjectFromPgCodecAttributes,
  PgCodecAttribute,
} from "../codecs.js";
import { TYPES } from "../codecs.js";
import type { PgResource } from "../datasource.js";
import type {
  GetPgResourceCodec,
  GetPgResourceColumns,
  GetPgResourceRelations,
  PgCodec,
  PgCodecRelation,
  PgRegistry,
  PgTypedExecutableStep,
} from "../interfaces.js";
import type { PgClassExpressionStep } from "./pgClassExpression.js";
import { pgClassExpression } from "./pgClassExpression.js";
import { PgCursorStep } from "./pgCursor.js";
import type { PgSelectMode } from "./pgSelect.js";
import { getFragmentAndCodecFromOrder, PgSelectStep } from "./pgSelect.js";
// import debugFactory from "debug";

// const debugPlan = debugFactory("datasource:pg:PgSelectSingleStep:plan");
// const debugExecute = debugFactory("datasource:pg:PgSelectSingleStep:execute");
// const debugPlanVerbose = debugPlan.extend("verbose");
// const debugExecuteVerbose = debugExecute.extend("verbose");

export interface PgSelectSinglePlanOptions {
  fromRelation?: [PgSelectSingleStep<PgResource>, string];
}

// Types that only take a few bytes so adding them to the selection would be
// cheap to do.
const CHEAP_COLUMN_TYPES = new Set([
  TYPES.int2,
  TYPES.int,
  TYPES.bigint,
  TYPES.float,
  TYPES.float4,
  TYPES.uuid,
  TYPES.boolean,
  TYPES.date,
  TYPES.timestamp,
  TYPES.timestamptz,
]);

/**
 * Represents the single result of a unique PgSelectStep. This might be
 * retrieved explicitly by PgSelectStep.single(), or implicitly (via Grafast)
 * by PgSelectStep.item(). Since this is the result of a fetch it does not make
 * sense to support changing `.where` or similar; however we now add methods
 * such as `.get` and `.cursor` which can receive specific properties by
 * telling the PgSelectStep to select the relevant expressions.
 */
export class PgSelectSingleStep<
    TResource extends PgResource<any, any, any, any, any> = PgResource,
  >
  extends UnbatchedExecutableStep<
    unknown[] /* What we return will be a tuple based on the values selected */
  >
  implements
    PgTypedExecutableStep<
      TResource extends PgResource<any, infer UCodec, any, any, any>
        ? UCodec
        : never
    >,
    EdgeCapableStep<any>
{
  static $$export = {
    moduleName: "@dataplan/pg",
    exportName: "PgSelectSingleStep",
  };
  isSyncAndSafe = true;

  public readonly pgCodec: GetPgResourceCodec<TResource>;
  public readonly itemStepId: number;
  public readonly mode: PgSelectMode;
  private classStepId: number;
  private nullCheckId: number | null = null;
  public readonly resource: TResource;
  private _coalesceToEmptyObject = false;
  private typeStepIndexList: number[] | null = null;

  constructor(
    $class: PgSelectStep<TResource>,
    $item: ExecutableStep<unknown[]>,
    private options: PgSelectSinglePlanOptions = Object.create(null),
  ) {
    super();
    this.itemStepId = this.addDependency($item);
    this.resource = $class.resource;
    this.pgCodec = this.resource.codec as GetPgResourceCodec<TResource>;
    this.mode = $class.mode;
    this.classStepId = $class.id;
  }

  public coalesceToEmptyObject(): void {
    this._coalesceToEmptyObject = true;
  }

  public toStringMeta(): string {
    return this.resource.name;
  }

  public getClassStep(): PgSelectStep<TResource> {
    if (this.isOptimized) {
      throw new Error(`Cannot ${this}.getClassStep() after we're optimized.`);
    }
    const plan = this.getStep(this.classStepId);
    if (!(plan instanceof PgSelectStep)) {
      throw new Error(
        `Expected ${this.classStepId} (${plan}) to be a PgSelectStep`,
      );
    }
    return plan;
  }

  private getItemStep(): ExecutableStep<unknown[]> {
    const plan = this.getDep(this.itemStepId);
    return plan;
  }

  /**
   * Do not rely on this, we're going to refactor it to work a different way at some point.
   *
   * @internal
   */
  getSelfNamed(): PgClassExpressionStep<
    GetPgResourceCodec<TResource>,
    TResource
  > {
    if (this.mode === "aggregate") {
      throw new Error("Invalid call to getSelfNamed on aggregate plan");
    }
    // Hack because I don't want to duplicate the code.
    return this.get("" as any) as any;
  }

  /**
   * Returns a plan representing a named attribute (e.g. column) from the class
   * (e.g. table).
   */
  get<TAttr extends keyof GetPgResourceColumns<TResource>>(
    attr: TAttr,
  ): PgClassExpressionStep<
    GetPgResourceColumns<TResource>[TAttr] extends PgCodecAttribute<
      infer UCodec,
      any
    >
      ? UCodec
      : never,
    TResource
  > {
    if (this.mode === "aggregate") {
      throw new Error("Invalid call to .get() on aggregate plan");
    }
    if (!this.resource.codec.columns && attr !== "") {
      throw new Error(
        `Cannot call ${this}.get() when the resource codec (${this.resource.codec.name}) has no columns to get.`,
      );
    }
    const classPlan = this.getClassStep();
    // TODO: where do we do the SQL conversion, e.g. to_json for dates to
    // enforce ISO8601? Perhaps this should be the datasource itself, and
    // `attr` should be an SQL expression? This would allow for computed
    // fields/etc too (admittedly those without arguments).
    const resourceColumn: PgCodecAttribute | undefined =
      this.resource.codec.columns?.[attr as string];
    if (!resourceColumn && attr !== "") {
      throw new Error(
        `${this.resource} does not define an attribute named '${String(attr)}'`,
      );
    }

    if (resourceColumn?.via) {
      const { relation, attribute } = this.resource.resolveVia(
        resourceColumn.via,
        attr as string,
      );
      return this.singleRelation(relation as any).get(attribute) as any;
    }

    if (resourceColumn?.identicalVia) {
      const { relation, attribute } = this.resource.resolveVia(
        resourceColumn.identicalVia,
        attr as string,
      );

      const $existingPlan = this.existingSingleRelation(relation as any);
      if ($existingPlan) {
        // Relation exists already; load it from there for efficiency
        return $existingPlan.get(attribute) as any;
      } else {
        // Load it from ourself instead
      }
    }

    if (this.options.fromRelation) {
      const [$fromPlan, fromRelationName] = this.options.fromRelation;
      const matchingColumn = (
        Object.entries($fromPlan.resource.codec.columns!) as Array<
          [string, PgCodecAttribute]
        >
      ).find(([name, col]) => {
        if (col.identicalVia) {
          const { relation, attribute } = $fromPlan.resource.resolveVia(
            col.identicalVia,
            name,
          );
          if (attribute === attr && relation === fromRelationName) {
            return true;
          }
        }
        return false;
      });
      if (matchingColumn) {
        return $fromPlan.get(matchingColumn[0]) as any;
      }
    }

    /*
     * Only cast to `::text` during select; we want to use it uncasted in
     * conditions/etc. The reasons we cast to ::text include:
     *
     * - to make return values consistent whether they're direct or in nested
     *   arrays
     * - to make sure that that various PostgreSQL clients we support do not
     *   mangle the data in unexpected ways - we take responsibility for
     *   decoding these string values.
     */

    const sqlExpr = pgClassExpression<any, TResource>(
      this,
      attr === ""
        ? this.resource.codec
        : this.resource.codec.columns![attr as string].codec,
    );
    const colPlan = resourceColumn
      ? resourceColumn.expression
        ? sqlExpr`${sql.parens(resourceColumn.expression(classPlan.alias))}`
        : sqlExpr`${classPlan.alias}.${sql.identifier(String(attr))}`
      : sqlExpr`${classPlan.alias}.v`; /* single column */

    if (
      this.nonNullColumn == null &&
      typeof attr === "string" &&
      attr.length > 0 &&
      resourceColumn &&
      !resourceColumn.expression &&
      resourceColumn.notNull
    ) {
      // We know the row is null iff this attribute is null
      this.nonNullColumn = { column: resourceColumn, attr };
    }

    return colPlan as any;
  }

  public select<TExpressionCodec extends PgCodec>(
    fragment: SQL,
    codec: TExpressionCodec,
  ): PgClassExpressionStep<TExpressionCodec, TResource> {
    const sqlExpr = pgClassExpression<TExpressionCodec, TResource>(this, codec);
    return sqlExpr`${fragment}`;
  }

  /**
   * Advanced method; rather than returning a plan it returns an index.
   * Generally useful for PgClassExpressionStep.
   *
   * @internal
   */
  public selectAndReturnIndex(fragment: SQL): number {
    return this.getClassStep().selectAndReturnIndex(fragment);
  }

  public placeholder($step: PgTypedExecutableStep<any>): SQL;
  public placeholder($step: ExecutableStep, codec: PgCodec): SQL;
  public placeholder(
    $step: ExecutableStep | PgTypedExecutableStep<any>,
    overrideCodec?: PgCodec,
  ): SQL {
    return overrideCodec
      ? this.getClassStep().placeholder($step, overrideCodec)
      : this.getClassStep().placeholder($step as PgTypedExecutableStep<any>);
  }

  private existingSingleRelation<
    TRelationName extends keyof GetPgResourceRelations<TResource>,
  >(
    relationIdentifier: TRelationName,
  ): PgSelectSingleStep<
    GetPgResourceRelations<TResource>[TRelationName]["remoteResource"]
  > | null {
    if (this.options.fromRelation) {
      const [$fromPlan, fromRelationName] = this.options.fromRelation;
      // check to see if we already came via this relationship
      const reciprocal = this.resource.getReciprocal(
        $fromPlan.resource.codec,
        fromRelationName,
      );
      if (reciprocal) {
        const reciprocalRelationName = reciprocal[0];
        if (reciprocalRelationName === relationIdentifier) {
          const reciprocalRelation = reciprocal[1];
          if (reciprocalRelation.isUnique) {
            return $fromPlan as PgSelectSingleStep<any>;
          }
        }
      }
    }
    return null;
  }

  public singleRelation<
    TRelationName extends keyof GetPgResourceRelations<TResource>,
  >(
    relationIdentifier: TRelationName,
  ): PgSelectSingleStep<
    GetPgResourceRelations<TResource>[TRelationName]["remoteResource"]
  > {
    const $existingPlan = this.existingSingleRelation(relationIdentifier);
    if ($existingPlan) {
      return $existingPlan;
    }
    const relation = this.resource.getRelation(
      relationIdentifier,
    ) as PgCodecRelation;
    if (!relation || !relation.isUnique) {
      throw new Error(
        `${String(relationIdentifier)} is not a unique relation on ${
          this.resource
        }`,
      );
    }
    const { remoteResource, remoteColumns, localColumns } = relation;

    const options: PgSelectSinglePlanOptions = {
      fromRelation: [
        this as PgSelectSingleStep<any>,
        relationIdentifier as string,
      ],
    };
    return remoteResource.get(
      remoteColumns.reduce((memo, remoteColumn, columnIndex) => {
        memo[remoteColumn] = this.get(localColumns[columnIndex]);
        return memo;
      }, Object.create(null)),
      options,
    ) as PgSelectSingleStep<any>;
  }

  public manyRelation<
    TRelationName extends keyof GetPgResourceRelations<TResource>,
  >(
    relationIdentifier: TRelationName,
  ): PgSelectStep<
    GetPgResourceRelations<TResource>[TRelationName]["remoteResource"]
  > {
    const relation = this.resource.getRelation(
      relationIdentifier,
    ) as PgCodecRelation;
    if (!relation) {
      throw new Error(
        `${String(relationIdentifier)} is not a relation on ${this.resource}`,
      );
    }
    const { remoteResource, remoteColumns, localColumns } = relation;

    return (remoteResource as PgResource).find(
      remoteColumns.reduce((memo, remoteColumn, columnIndex) => {
        memo[remoteColumn] = this.get(localColumns[columnIndex]);
        return memo;
      }, Object.create(null)),
    ) as any;
  }

  public record(): PgClassExpressionStep<
    GetPgResourceCodec<TResource>,
    TResource
  > {
    return pgClassExpression<GetPgResourceCodec<TResource>, TResource>(
      this,
      this.resource.codec as GetPgResourceCodec<TResource>,
    )`${this.getClassStep().alias}`;
  }

  /**
   * Returns a plan representing the result of an expression.
   */
  expression<TExpressionCodec extends PgCodec>(
    expression: SQL,
    codec: TExpressionCodec,
  ): PgClassExpressionStep<TExpressionCodec, TResource> {
    return pgClassExpression<TExpressionCodec, TResource>(
      this,
      codec,
    )`${expression}`;
  }

  /**
   * @internal
   * For use by PgCursorStep
   */
  public getCursorDigestAndStep(): [string, ExecutableStep] {
    const classPlan = this.getClassStep();
    const digest = classPlan.getOrderByDigest();
    const orders = classPlan.getOrderBy();
    const step = list(
      orders.length > 0
        ? orders.map((o) => {
            const [frag, codec] = getFragmentAndCodecFromOrder(
              this.getClassStep().alias,
              o,
              this.getClassStep().resource.codec,
            );
            return this.expression(frag, codec);
          })
        : // No ordering; so use row number
          [this.expression(sql`row_number() over (partition by 1)`, TYPES.int)],
    );
    return [digest, step];
  }

  /**
   * When selecting a connection we need to be able to get the cursor. The
   * cursor is built from the values of the `ORDER BY` clause so that we can
   * find nodes before/after it.
   */
  public cursor(): PgCursorStep<this> {
    const cursorPlan = new PgCursorStep<this>(this);
    return cursorPlan;
  }

  /**
   * For compatibility with EdgeCapableStep.
   */
  public node(): this {
    return this;
  }

  deduplicate(
    peers: PgSelectSingleStep<any>[],
  ): PgSelectSingleStep<TResource>[] {
    // We've been careful to not store anything locally so we shouldn't
    // need to move anything across to the peer.
    return peers.filter((peer) => {
      if (peer.resource !== this.resource) {
        return false;
      }
      if (peer.getClassStep() !== this.getClassStep()) {
        return false;
      }
      if (peer.getItemStep() !== this.getItemStep()) {
        return false;
      }
      return true;
    });
  }

  planForType(type: GraphQLObjectType): ExecutableStep {
    const poly = (this.resource.codec as PgCodec).polymorphism;
    if (poly?.mode === "single") {
      return this;
    } else if (poly?.mode === "relational") {
      for (const spec of Object.values(poly.types)) {
        if (spec.name === type.name) {
          return this.singleRelation(spec.relationName as any);
        }
      }
      throw new Error(
        `${this} Could not find matching name for relational polymorphic '${type.name}'`,
      );
    } else {
      throw new Error(
        `${this}: Don't know how to plan this as polymorphic for ${type}`,
      );
    }
  }

  private nonNullColumn: { column: PgCodecAttribute; attr: string } | null =
    null;
  private nullCheckAttributeIndex: number | null = null;
  optimize() {
    const poly = (this.resource.codec as PgCodec).polymorphism;
    if (poly?.mode === "single" || poly?.mode === "relational") {
      const $class = this.getClassStep();
      this.typeStepIndexList = poly.typeColumns.map((col) => {
        const attr = this.resource.codec.columns![col];
        const expr = sql`${$class.alias}.${sql.identifier(String(col))}`;

        return $class.selectAndReturnIndex(
          attr.codec.castFromPg
            ? attr.codec.castFromPg(expr)
            : sql`${expr}::text`,
        );
      });
    } else {
      this.typeStepIndexList = null;
    }

    const columns = this.resource.codec.columns;
    if (columns && this.getClassStep().mode !== "aggregate") {
      // We need to see if this row is null. The cheapest way is to select a
      // non-null column, but failing that we invoke the codec's
      // nonNullExpression (indirectly).
      const getSuitableColumn = () => {
        // We want to find a _cheap_ not-null column to select to prove that
        // the row is not null. Critically this must be a column that we can
        // always select (i.e.  is not prevented by any column-level select
        // privileges).
        for (const attr of Object.keys(columns)) {
          const column = columns[attr];
          if (
            column.notNull &&
            CHEAP_COLUMN_TYPES.has(column.codec) &&
            !column.restrictedAccess
          ) {
            return {
              column,
              attr,
            };
          }
        }
        return null;
      };
      const nonNullColumn = this.nonNullColumn ?? getSuitableColumn();
      if (nonNullColumn != null) {
        const {
          column: { codec },
          attr,
        } = nonNullColumn;
        const expression = sql`${this.getClassStep().alias}.${sql.identifier(
          attr,
        )}`;
        this.nullCheckAttributeIndex = this.getClassStep().selectAndReturnIndex(
          codec.castFromPg
            ? codec.castFromPg(expression)
            : sql`${sql.parens(expression)}::text`,
        );
      } else {
        this.nullCheckId = this.getClassStep().getNullCheckIndex();
      }
    }
    return this;
  }

  finalize() {
    const poly = this.resource.codec.polymorphism;
    if (poly?.mode === "single" || poly?.mode === "relational") {
      this.handlePolymorphism = (val) => {
        if (val == null) return val;
        const typeList = this.typeStepIndexList!.map((i) => val[i]);
        const key = String(typeList);
        const entry = poly.types[key];
        if (entry) {
          return polymorphicWrap(entry.name, val);
        }
        return null;
      };
    }
    return super.finalize();
  }

  handlePolymorphism?: (result: any) => any;

  unbatchedExecute(
    extra: ExecutionExtra,
    result: ObjectFromPgCodecAttributes<GetPgResourceColumns<TResource>>,
  ): unknown[] {
    if (result == null) {
      return this._coalesceToEmptyObject ? Object.create(null) : null;
    } else if (this.nullCheckAttributeIndex != null) {
      const nullIfAttributeNull = result[this.nullCheckAttributeIndex];
      if (nullIfAttributeNull == null) {
        return this._coalesceToEmptyObject ? Object.create(null) : null;
      }
    } else if (this.nullCheckId != null) {
      const nullIfExpressionNotTrue = result[this.nullCheckId];
      if (
        nullIfExpressionNotTrue == null ||
        TYPES.boolean.fromPg(nullIfExpressionNotTrue) != true
      ) {
        return this._coalesceToEmptyObject ? Object.create(null) : null;
      }
    }
    return this.handlePolymorphism ? this.handlePolymorphism(result) : result;
  }
}

/**
 * Given a plan that represents a single record (via
 * PgSelectSingleStep.record()) this turns it back into a PgSelectSingleStep
 */
export function pgSelectFromRecord<
  TResource extends PgResource<
    any,
    PgCodec<any, any, any, any, any, any, any>,
    any,
    any,
    PgRegistry
  >,
>(
  resource: TResource,
  $record: PgClassExpressionStep<GetPgResourceCodec<TResource>, TResource>,
): PgSelectStep<TResource> {
  return new PgSelectStep<TResource>({
    resource: resource,
    identifiers: [],
    from: (record) => sql`(select (${record.placeholder}).*)`,
    args: [{ step: $record, pgCodec: resource.codec }],
    joinAsLateral: true,
  });
}

/**
 * Given a plan that represents a single record (via
 * PgSelectSingleStep.record()) this turns it back into a PgSelectSingleStep
 */
export function pgSelectSingleFromRecord<
  TResource extends PgResource<any, any, any, any>,
>(
  resource: TResource,
  $record: PgClassExpressionStep<GetPgResourceCodec<TResource>, TResource>,
): PgSelectSingleStep<TResource> {
  // OPTIMIZE: we should be able to optimise this so that `plan.record()` returns the original record again.
  return pgSelectFromRecord(
    resource,
    $record,
  ).single() as PgSelectSingleStep<TResource>;
}

exportAs("@dataplan/pg", pgSelectFromRecord, "pgSelectFromRecord");
exportAs("@dataplan/pg", pgSelectSingleFromRecord, "pgSelectSingleFromRecord");
