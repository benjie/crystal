import type {
  CrystalResultsList,
  CrystalValuesList,
  EdgeCapableStep,
} from "dataplanner";
import { ExecutableStep } from "dataplanner";
import type { SQL } from "pg-sql2";
import sql from "pg-sql2";

import type { PgTypeColumn, PgTypeColumns } from "../codecs.js";
import { TYPES } from "../codecs.js";
import type {
  PgSource,
  PgSourceParameter,
  PgSourceRelation,
  PgSourceRow,
  PgSourceUnique,
} from "../datasource.js";
import { PgSourceBuilder } from "../datasource.js";
import type { PgTypeCodec, PgTypedExecutableStep } from "../interfaces.js";
import type { PgClassExpressionStep } from "./pgClassExpression.js";
import { pgClassExpression } from "./pgClassExpression.js";
import { PgCursorStep } from "./pgCursor.js";
import type { PgSelectMode } from "./pgSelect.js";
import { PgSelectStep } from "./pgSelect.js";
// import debugFactory from "debug";

// const debugPlan = debugFactory("datasource:pg:PgSelectSingleStep:plan");
// const debugExecute = debugFactory("datasource:pg:PgSelectSingleStep:execute");
// const debugPlanVerbose = debugPlan.extend("verbose");
// const debugExecuteVerbose = debugExecute.extend("verbose");

export interface PgSelectSinglePlanOptions {
  fromRelation?: [PgSelectSingleStep<any, any, any, any>, string];
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
 * retrieved explicitly by PgSelectStep.single(), or implicitly (via
 * Graphile Crystal) by PgSelectStep.item(). Since this is the result of a
 * fetch it does not make sense to support changing `.where` or similar;
 * however we now add methods such as `.get` and `.cursor` which can receive
 * specific properties by telling the PgSelectStep to select the relevant
 * expressions.
 */
export class PgSelectSingleStep<
    TColumns extends PgTypeColumns | undefined,
    TUniques extends ReadonlyArray<
      PgSourceUnique<Exclude<TColumns, undefined>>
    >,
    TRelations extends {
      [identifier: string]: TColumns extends PgTypeColumns
        ? PgSourceRelation<TColumns, any>
        : never;
    },
    TParameters extends PgSourceParameter[] | undefined = undefined,
  >
  extends ExecutableStep<PgSourceRow<TColumns> | null>
  implements
    PgTypedExecutableStep<PgTypeCodec<TColumns, any, any>>,
    EdgeCapableStep<any>
{
  static $$export = {
    moduleName: "@dataplan/pg",
    exportName: "PgSelectSingleStep",
  };
  isSyncAndSafe = true;

  public readonly pgCodec: PgTypeCodec<TColumns, any, any>;
  public readonly itemStepId: number;
  public readonly mode: PgSelectMode;
  private classStepId: string;
  private nullCheckId: number | null = null;
  public readonly source: PgSource<TColumns, TUniques, TRelations, TParameters>;
  private _coalesceToEmptyObject = false;

  constructor(
    classPlan: PgSelectStep<TColumns, TUniques, TRelations, TParameters>,
    itemPlan: ExecutableStep<PgSourceRow<TColumns>>,
    private options: PgSelectSinglePlanOptions = Object.create(null),
  ) {
    super();
    this.source = classPlan.source;
    this.pgCodec = this.source.codec;
    this.mode = classPlan.mode;
    this.classStepId = classPlan.id;
    this.itemStepId = this.addDependency(itemPlan);
  }

  public coalesceToEmptyObject(): void {
    this._coalesceToEmptyObject = true;
  }

  public toStringMeta(): string {
    return this.source.name;
  }

  public getClassStep(): PgSelectStep<
    TColumns,
    TUniques,
    TRelations,
    TParameters
  > {
    if (this.opPlan.isOptimized(this)) {
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

  private getItemStep(): ExecutableStep<PgSourceRow<TColumns>> {
    const plan = this.getStep(this.dependencies[this.itemStepId]);
    return plan;
  }

  /**
   * Do not rely on this, we're going to refactor it to work a different way at some point.
   *
   * @internal
   */
  getSelfNamed(): PgClassExpressionStep<
    any,
    any,
    TColumns,
    TUniques,
    TRelations,
    TParameters
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
  get<TAttr extends keyof TColumns>(
    attr: TAttr,
  ): PgClassExpressionStep<
    any,
    any,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  > {
    if (this.mode === "aggregate") {
      throw new Error("Invalid call to .get() on aggregate plan");
    }
    if (!this.source.codec.columns && attr !== "") {
      throw new Error(
        `Cannot call ${this}.get() when the source codec (${this.source.codec.name}) has no columns to get.`,
      );
    }
    const classPlan = this.getClassStep();
    // TODO: where do we do the SQL conversion, e.g. to_json for dates to
    // enforce ISO8601? Perhaps this should be the datasource itself, and
    // `attr` should be an SQL expression? This would allow for computed
    // fields/etc too (admittedly those without arguments).
    const dataSourceColumn: PgTypeColumn | undefined =
      this.source.codec.columns?.[attr as string];
    if (!dataSourceColumn && attr !== "") {
      throw new Error(
        `${this.source} does not define an attribute named '${String(attr)}'`,
      );
    }

    if (dataSourceColumn?.via) {
      const { relation, attribute } = this.source.resolveVia(
        dataSourceColumn.via,
        attr as string,
      );
      return this.singleRelation(relation).get(attribute) as any;
    }

    if (dataSourceColumn?.identicalVia) {
      const { relation, attribute } = this.source.resolveVia(
        dataSourceColumn.identicalVia,
        attr as string,
      );

      const $existingPlan = this.existingSingleRelation(relation);
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
        Object.entries($fromPlan.source.codec.columns) as Array<
          [string, PgTypeColumn]
        >
      ).find(([name, col]) => {
        if (col.identicalVia) {
          const { relation, attribute } = $fromPlan.source.resolveVia(
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
        return $fromPlan.get(matchingColumn[0]);
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

    const sqlExpr = pgClassExpression(
      this,
      attr === ""
        ? this.source.codec
        : this.source.codec.columns![attr as string].codec,
    );
    const colPlan = dataSourceColumn
      ? dataSourceColumn.expression
        ? sqlExpr`${sql.parens(dataSourceColumn.expression(classPlan.alias))}`
        : sqlExpr`${classPlan.alias}.${sql.identifier(String(attr))}`
      : sqlExpr`${classPlan.alias}.v`; /* single column */

    if (
      this.nonNullColumn == null &&
      typeof attr === "string" &&
      attr.length > 0 &&
      dataSourceColumn &&
      !dataSourceColumn.expression &&
      dataSourceColumn.notNull
    ) {
      // We know the row is null iff this attribute is null
      this.nonNullColumn = { column: dataSourceColumn, attr };
    }

    return colPlan as any;
  }

  public select<
    TExpressionColumns extends PgTypeColumns | undefined,
    TExpressionCodec extends PgTypeCodec<TExpressionColumns, any, any>,
  >(
    fragment: SQL,
    codec: TExpressionCodec,
  ): PgClassExpressionStep<
    TExpressionColumns,
    TExpressionCodec,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  > {
    const sqlExpr = pgClassExpression(this, codec);
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

  public placeholder($plan: PgTypedExecutableStep<any>): SQL;
  public placeholder(
    $plan: ExecutableStep<any>,
    codec: PgTypeCodec<any, any, any>,
  ): SQL;
  public placeholder(
    $plan: ExecutableStep<any> | PgTypedExecutableStep<any>,
    overrideCodec?: PgTypeCodec<any, any, any>,
  ): SQL {
    return overrideCodec
      ? this.getClassStep().placeholder($plan, overrideCodec)
      : this.getClassStep().placeholder($plan as PgTypedExecutableStep<any>);
  }

  private existingSingleRelation<TRelationName extends keyof TRelations>(
    relationIdentifier: TRelationName,
  ): PgSelectSingleStep<
    TRelations[TRelationName]["source"]["TColumns"] extends PgTypeColumns
      ? TRelations[TRelationName]["source"]["TColumns"]
      : any,
    TRelations[TRelationName]["source"]["TUniques"],
    TRelations[TRelationName]["source"]["TRelations"],
    TRelations[TRelationName]["source"]["TParameters"]
  > | null {
    if (this.options.fromRelation) {
      const [$fromPlan, fromRelationName] = this.options.fromRelation;
      // check to see if we already came via this relationship
      const reciprocal = this.source.getReciprocal(
        $fromPlan.source,
        fromRelationName,
      );
      if (reciprocal) {
        const reciprocalRelationName = reciprocal[0] as string;
        if (reciprocalRelationName === relationIdentifier) {
          const reciprocalRelation: PgSourceRelation<any, any> = reciprocal[1];
          if (reciprocalRelation.isUnique) {
            return $fromPlan;
          }
        }
      }
    }
    return null;
  }

  public singleRelation<TRelationName extends keyof TRelations>(
    relationIdentifier: TRelationName,
  ): PgSelectSingleStep<
    any,
    any,
    any,
    any
    // TODO: fix the return type
    /*
    TRelations[TRelationName]["source"]["TColumns"] extends PgTypeColumns
      ? TRelations[TRelationName]["source"]["TColumns"]
      : any,
    TRelations[TRelationName]["source"]["TUniques"],
    TRelations[TRelationName]["source"]["TRelations"],
    TRelations[TRelationName]["source"]["TParameters"]
  */
  > {
    const $existingPlan = this.existingSingleRelation(relationIdentifier);
    if ($existingPlan) {
      return $existingPlan;
    }
    const relation = this.source.getRelation(relationIdentifier);
    if (!relation || !relation.isUnique) {
      throw new Error(
        `${String(relationIdentifier)} is not a unique relation on ${
          this.source
        }`,
      );
    }
    const rawRelationSource = relation.source;
    const relationSource =
      rawRelationSource instanceof PgSourceBuilder
        ? rawRelationSource.get()
        : rawRelationSource;
    const remoteColumns = relation.remoteColumns;
    const localColumns = relation.localColumns;

    const options: PgSelectSinglePlanOptions = {
      fromRelation: [this, relationIdentifier as string],
    };
    return relationSource.get(
      remoteColumns.reduce((memo, remoteColumn, columnIndex) => {
        memo[remoteColumn] = this.get(
          localColumns[columnIndex] as keyof TColumns,
        );
        return memo;
      }, Object.create(null)),
      options,
    ) as PgSelectSingleStep<any, any, any, any>;
  }

  public manyRelation<TRelationName extends keyof TRelations>(
    relationIdentifier: TRelationName,
  ): PgSelectStep<
    TRelations[TRelationName]["source"]["TColumns"] extends PgTypeColumns
      ? TRelations[TRelationName]["source"]["TColumns"]
      : any,
    TRelations[TRelationName]["source"]["TUniques"],
    TRelations[TRelationName]["source"]["TRelations"],
    TRelations[TRelationName]["source"]["TParameters"]
  > {
    const relation = this.source.getRelation(relationIdentifier);
    if (!relation) {
      throw new Error(
        `${String(relationIdentifier)} is not a relation on ${this.source}`,
      );
    }
    const rawRelationSource = relation.source;
    const relationSource =
      rawRelationSource instanceof PgSourceBuilder
        ? rawRelationSource.get()
        : rawRelationSource;
    const remoteColumns = relation.remoteColumns;
    const localColumns = relation.localColumns;

    return relationSource.find(
      remoteColumns.reduce((memo, remoteColumn, columnIndex) => {
        memo[remoteColumn] = this.get(
          localColumns[columnIndex] as keyof TColumns,
        );
        return memo;
      }, Object.create(null)),
    );
  }

  record(): PgClassExpressionStep<
    TColumns,
    PgTypeCodec<TColumns, any, any>,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  > {
    return pgClassExpression(this, this.source.codec)`${
      this.getClassStep().alias
    }`;
  }

  /**
   * Returns a plan representing the result of an expression.
   */
  expression<
    TExpressionColumns extends PgTypeColumns | undefined,
    TExpressionCodec extends PgTypeCodec<TExpressionColumns, any, any>,
  >(
    expression: SQL,
    codec: TExpressionCodec,
  ): PgClassExpressionStep<
    TExpressionColumns,
    TExpressionCodec,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  > {
    return pgClassExpression(this, codec)`${expression}`;
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
    peers: PgSelectSingleStep<any, any, any, any>[],
  ): PgSelectSingleStep<TColumns, TUniques, TRelations, TParameters> {
    const identicalPeer = peers.find((peer) => {
      if (peer.source !== this.source) {
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
    if (identicalPeer) {
      // We've been careful to not store anything locally so we shouldn't
      // need to move anything across to the peer.
      return identicalPeer;
    } else {
      return this;
    }
  }

  private nonNullColumn: { column: PgTypeColumn; attr: string } | null = null;
  private nullCheckAttributeIndex: number | null = null;
  optimize() {
    const columns = this.source.codec.columns;
    if (columns && this.getClassStep().mode === "normal") {
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

  execute(
    values: CrystalValuesList<[PgSourceRow<TColumns>]>,
  ): CrystalResultsList<PgSourceRow<TColumns> | null> {
    return values[this.itemStepId].map((result) => {
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
      return result;
    });
  }
}

/**
 * Given a plan that represents a single record (via
 * PgSelectSingleStep.record()) this turns it back into a PgSelectSingleStep
 */
export function pgSelectFromRecord<
  TColumns extends PgTypeColumns,
  TUniques extends ReadonlyArray<PgSourceUnique<Exclude<TColumns, undefined>>>,
  TRelations extends {
    [identifier: string]: TColumns extends PgTypeColumns
      ? PgSourceRelation<TColumns, any>
      : never;
  },
  TParameters extends PgSourceParameter[] | undefined = undefined,
>(
  source: PgSource<TColumns, TUniques, TRelations, TParameters>,
  record: PgClassExpressionStep<
    TColumns,
    PgTypeCodec<TColumns, any, any>,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  >,
): PgSelectStep<TColumns, TUniques, TRelations, TParameters> {
  return new PgSelectStep<TColumns, TUniques, TRelations, TParameters>({
    source,
    identifiers: [],
    from: (record) => sql`(select (${record.placeholder}).*)`,
    args: [{ plan: record, pgCodec: source.codec }],
    joinAsLateral: true,
  }) as PgSelectStep<TColumns, TUniques, TRelations, TParameters>;
}

/**
 * Given a plan that represents a single record (via
 * PgSelectSingleStep.record()) this turns it back into a PgSelectSingleStep
 */
export function pgSelectSingleFromRecord<
  TColumns extends PgTypeColumns,
  TUniques extends ReadonlyArray<PgSourceUnique<Exclude<TColumns, undefined>>>,
  TRelations extends {
    [identifier: string]: TColumns extends PgTypeColumns
      ? PgSourceRelation<TColumns, any>
      : never;
  },
  TParameters extends PgSourceParameter[] | undefined = undefined,
>(
  source: PgSource<TColumns, TUniques, TRelations, TParameters>,
  record: PgClassExpressionStep<
    TColumns,
    PgTypeCodec<TColumns, any, any>,
    TColumns,
    TUniques,
    TRelations,
    TParameters
  >,
): PgSelectSingleStep<TColumns, TUniques, TRelations, TParameters> {
  // TODO: we should be able to optimise this so that `plan.record()` returns the original record again.
  return pgSelectFromRecord(source, record).single() as PgSelectSingleStep<
    TColumns,
    TUniques,
    TRelations,
    TParameters
  >;
}

Object.defineProperty(pgSelectFromRecord, "$$export", {
  value: {
    moduleName: "@dataplan/pg",
    exportName: "pgSelectFromRecord",
  },
});

Object.defineProperty(pgSelectSingleFromRecord, "$$export", {
  value: {
    moduleName: "@dataplan/pg",
    exportName: "pgSelectSingleFromRecord",
  },
});
