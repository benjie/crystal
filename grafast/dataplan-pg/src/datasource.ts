/* eslint-disable graphile-export/export-instances */
import chalk from "chalk";
import type {
  GrafastResultStreamList,
  GrafastValuesList,
  ObjectStep,
} from "grafast";
import {
  __ValueStep,
  arraysMatch,
  constant,
  ExecutableStep,
  exportAs,
  partitionByIndex,
} from "grafast";
import type { SQL } from "pg-sql2";
import sql from "pg-sql2";

import type {
  PgCodecAttributes,
  PgCodecAttributeVia,
  PgCodecAttributeViaExplicit,
} from "./codecs.js";
import { TYPES } from "./codecs.js";
import type {
  PgClientResult,
  PgExecutor,
  PgExecutorContextPlans,
  PgExecutorInput,
  PgExecutorMutationOptions,
  PgExecutorOptions,
} from "./executor.js";
import type {
  Expand,
  GetPgCodecColumns,
  GetPgRegistryCodecRelations,
  GetPgRegistryCodecs,
  PgCodec,
  PgCodecRelation,
  PgCodecRelationConfig,
  PgCodecWithColumns,
  PgRefDefinition,
  PgRegistry,
  PgRegistryConfig,
  PlanByUniques,
} from "./interfaces.js";
import type { PgClassExpressionStep } from "./steps/pgClassExpression.js";
import type {
  PgSelectArgumentDigest,
  PgSelectArgumentSpec,
  PgSelectIdentifierSpec,
  PgSelectMode,
  PgSelectStep,
} from "./steps/pgSelect.js";
import { pgSelect } from "./steps/pgSelect.js";
import type {
  PgSelectSinglePlanOptions,
  PgSelectSingleStep,
} from "./steps/pgSelectSingle.js";

export function EXPORTABLE<T, TScope extends any[]>(
  factory: (...args: TScope) => T,
  args: [...TScope],
): T {
  const fn: T = factory(...args);
  if (
    (typeof fn === "function" || (typeof fn === "object" && fn !== null)) &&
    !("$exporter$factory" in fn)
  ) {
    Object.defineProperties(fn, {
      $exporter$args: { value: args },
      $exporter$factory: { value: factory },
    });
  }
  return fn;
}

/**
 * Extra metadata you can attach to a unique constraint.
 */
export interface PgResourceUniqueExtensions {}

/**
 * Space for extra metadata about this resource
 */
export interface PgResourceExtensions {}

export interface PgResourceParameterExtensions {
  variant?: string;
}

/**
 * If this is a functional (rather than static) resource, this describes one of
 * the parameters it accepts.
 */
export interface PgResourceParameter<
  TName extends string | null = string | null,
  TCodec extends PgCodec = PgCodec,
> {
  /**
   * Name of the parameter, if null then we must use positional rather than
   * named arguments
   */
  name: TName;
  /**
   * The type of this parameter
   */
  codec: TCodec;
  /**
   * If true, then this parameter must be supplied, otherwise it's optional.
   */
  required: boolean;
  /**
   * If true and the parameter is supplied, then the parameter must not be
   * null.
   */
  notNull?: boolean;
  extensions?: PgResourceParameterExtensions;
}

/**
 * Description of a unique constraint on a PgResource.
 */
export interface PgResourceUnique<
  TColumns extends PgCodecAttributes = PgCodecAttributes,
> {
  /**
   * The columns that are unique
   */
  columns: ReadonlyArray<keyof TColumns & string>;
  /**
   * If this is true, this represents the "primary key" of the resource.
   */
  isPrimary?: boolean;
  /**
   * Space for you to add your own metadata
   */
  extensions?: PgResourceUniqueExtensions;
}

export interface PgCodecRefPathEntry {
  relationName: string;
  // Could add conditions here
}

export type PgCodecRefPath = PgCodecRefPathEntry[];
export interface PgCodecRefExtensions {}

export interface PgCodecRef {
  definition: PgRefDefinition;
  paths: Array<PgCodecRefPath>;
  extensions?: PgCodecRefExtensions;
}

export interface PgCodecRefs {
  [refName: string]: PgCodecRef;
}

/**
 * Configuration options for your PgResource
 */
export interface PgResourceOptions<
  TName extends string = string,
  TCodec extends PgCodec = PgCodec,
  TUniques extends ReadonlyArray<
    PgResourceUnique<GetPgCodecColumns<TCodec>>
  > = ReadonlyArray<PgResourceUnique<GetPgCodecColumns<TCodec>>>,
  TParameters extends readonly PgResourceParameter[] | undefined =
    | readonly PgResourceParameter[]
    | undefined,
> {
  /**
   * The associated codec for this resource
   */
  codec: TCodec;
  /**
   * The PgExecutor to use when servicing this resource; different executors can
   * have different caching rules. A plan that uses one executor cannot be
   * inlined into a plan for a different executor.
   */
  executor: PgExecutor;

  // TODO: auth should also apply to insert, update and delete, maybe via insertAuth, updateAuth, etc
  selectAuth?: (
    $step: PgSelectStep<PgResource<any, any, any, any, any>>,
  ) => void;

  name: TName;
  identifier?: string;
  source: TParameters extends readonly PgResourceParameter[]
    ? (...args: PgSelectArgumentDigest[]) => SQL
    : SQL;
  uniques?: TUniques;
  extensions?: PgResourceExtensions;
  parameters?: TParameters;
  description?: string;
  /**
   * Set true if this resource will only return at most one record - this is
   * generally only useful for PostgreSQL function resources, in which case you
   * should set it false if the function `returns setof` and true otherwise.
   */
  isUnique?: boolean;
  sqlPartitionByIndex?: SQL;
  isMutation?: boolean;
  /**
   * If true, this indicates that this was originally a list (array) and thus
   * should be treated as having a predetermined and reasonable length rather
   * than being unbounded. It's just a hint to schema generation, it doesn't
   * affect planning.
   */
  isList?: boolean;

  /**
   * "Virtual" resources cannot be selected from/inserted to/etc, they're
   * normally used to generate other resources that are _not_ virtual.
   */
  isVirtual?: boolean;
}

export interface PgFunctionResourceOptions<
  TNewName extends string = string,
  TCodec extends PgCodec = PgCodec,
  TUniques extends ReadonlyArray<
    PgResourceUnique<GetPgCodecColumns<TCodec>>
  > = ReadonlyArray<PgResourceUnique<GetPgCodecColumns<TCodec>>>,
  TNewParameters extends readonly PgResourceParameter[] = readonly PgResourceParameter[],
> {
  name: TNewName;
  identifier?: string;
  source: (...args: PgSelectArgumentDigest[]) => SQL;
  parameters: TNewParameters;
  returnsSetof: boolean;
  returnsArray: boolean;
  uniques?: TUniques;
  extensions?: PgResourceExtensions;
  isMutation?: boolean;
  selectAuth?: (
    $step: PgSelectStep<PgResource<any, any, any, any, any>>,
  ) => void;
  description?: string;
}

const $$codecSource = Symbol("codecSource");
const $$codecCounter = Symbol("codecCounter");

// TODO: is this needed any more, now that we've moved codecs to owning relations?
type CodecWithSource<TCodec extends PgCodec> = TCodec & {
  [$$codecSource]?: Map<any, any>;
  [$$codecCounter]?: number;
};

/**
 * PgResource represents any resource of SELECT-able data in Postgres: tables,
 * views, functions, etc.
 */
export class PgResource<
  TName extends string = string,
  TCodec extends PgCodec = PgCodec,
  TUniques extends ReadonlyArray<
    PgResourceUnique<GetPgCodecColumns<TCodec>>
  > = ReadonlyArray<PgResourceUnique<GetPgCodecColumns<TCodec>>>,
  TParameters extends readonly PgResourceParameter[] | undefined =
    | readonly PgResourceParameter[]
    | undefined,
  TRegistry extends PgRegistry<any, any, any> = PgRegistry<any, any, any>,
> {
  public readonly registry: TRegistry;
  public readonly codec: TCodec;
  public readonly executor: PgExecutor;
  public readonly name: TName;
  public readonly identifier: string;
  public readonly source: SQL | ((...args: PgSelectArgumentDigest[]) => SQL);
  public readonly uniques: TUniques;
  private selectAuth?: (
    $step: PgSelectStep<PgResource<any, any, any, any, any>>,
  ) => void;

  // TODO: make a public interface for this information
  /**
   * If present, implies that the resource represents a `setof composite[]` (i.e.
   * an array of arrays) - and thus is not appropriate to use for GraphQL
   * Cursor Connections.
   *
   * @internal
   */
  public sqlPartitionByIndex: SQL | null = null;

  public readonly parameters: TParameters;
  public readonly description: string | undefined;
  public readonly isUnique: boolean;
  public readonly isMutation: boolean;
  /**
   * If true, this indicates that this was originally a list (array) and thus
   * should be treated as having a predetermined and reasonable length rather
   * than being unbounded. It's just a hint to schema generation, it doesn't
   * affect planning.
   */
  public readonly isList: boolean;

  /**
   * "Virtual" resources cannot be selected from/inserted to/etc, they're
   * normally used to generate other resources that are _not_ virtual.
   */
  public readonly isVirtual: boolean;

  public extensions: Partial<PgResourceExtensions> | undefined;

  // TODO: delete me?
  static configFromCodec<TCodec extends PgCodec>(
    executor: PgExecutor,
    baseCodec: TCodec,
  ): PgResourceOptions<
    string,
    TCodec,
    ReadonlyArray<PgResourceUnique<GetPgCodecColumns<TCodec>>>,
    undefined
  > {
    const codec: CodecWithSource<typeof baseCodec> = baseCodec;
    if (!codec[$$codecSource]) {
      codec[$$codecSource] = new Map();
    }
    if (codec[$$codecSource].has(executor)) {
      return codec[$$codecSource].get(executor);
    }

    let counter = codec[$$codecCounter];
    if (counter) {
      counter++;
    } else {
      counter = 1;
    }
    codec[$$codecCounter] = counter;

    // "From Codec"
    const name = `frmcdc_${codec.name}_${counter}`;
    const resource = EXPORTABLE(
      (codec, executor, name, sql) => ({
        executor,
        source: sql`(select 1/0 /* codec-only resource; should not select directly */)`,
        codec,
        name,
        identifier: name,
      }),
      [codec, executor, name, sql],
    );

    codec[$$codecSource].set(executor, resource);

    return resource;
  }

  /**
   * @param source - the SQL for the `FROM` clause (without any
   * aliasing). If this is a subquery don't forget to wrap it in parens.
   * @param name - a nickname for this resource. Doesn't need to be unique
   * (but should be). Used for making the SQL query and debug messages easier
   * to understand.
   */
  constructor(
    registry: TRegistry,
    options: PgResourceOptions<TName, TCodec, TUniques, TParameters>,
  ) {
    const {
      codec,
      executor,
      name,
      identifier,
      source,
      uniques,
      extensions,
      parameters,
      description,
      isUnique,
      sqlPartitionByIndex,
      isMutation,
      selectAuth,
      isList,
      isVirtual,
    } = options;
    this.registry = registry;
    this.extensions = extensions;
    this.codec = codec;
    this.executor = executor;
    this.name = name;
    this.identifier = identifier ?? name;
    this.source = source;
    this.uniques = uniques ?? ([] as never);
    this.parameters = parameters as TParameters;
    this.description = description;
    this.isUnique = !!isUnique;
    this.sqlPartitionByIndex = sqlPartitionByIndex ?? null;
    this.isMutation = !!isMutation;
    this.isList = !!isList;
    this.isVirtual = isVirtual ?? false;
    this.selectAuth = selectAuth;
    // parameters is null iff source is not a function
    const sourceIsFunction = typeof this.source === "function";
    if (this.parameters == null && sourceIsFunction) {
      throw new Error(
        `Resource ${this} is invalid - it's a function but without a parameters array. If the function accepts no parameters please pass an empty array.`,
      );
    }
    if (this.parameters != null && !sourceIsFunction) {
      throw new Error(
        `Resource ${this} is invalid - parameters can only be specified when the resource is a function.`,
      );
    }

    if (this.codec.arrayOfCodec?.columns) {
      throw new Error(
        `Resource ${this} is invalid - creating a resource that returns an array of a composite type is forbidden; please \`unnest\` the array.`,
      );
    }

    if (this.isUnique && this.sqlPartitionByIndex) {
      throw new Error(
        `Resource ${this} is invalid - cannot be unique and also partitionable`,
      );
    }
  }

  /**
   * Often you can access table records from a table directly but also from a
   * view or materialized view.  This method makes it convenient to construct
   * multiple datasources that all represent the same underlying table
   * type/relations/etc.
   */
  static alternativeResourceOptions<
    TCodec extends PgCodec,
    const TNewUniques extends ReadonlyArray<
      PgResourceUnique<GetPgCodecColumns<TCodec>>
    >,
    const TNewName extends string,
  >(
    baseOptions: PgResourceOptions<any, TCodec, any, undefined>,
    overrideOptions: {
      name: TNewName;
      identifier?: string;
      source: SQL;
      uniques?: TNewUniques;
      extensions?: PgResourceExtensions;
    },
  ): PgResourceOptions<TNewName, TCodec, TNewUniques, undefined> {
    const { name, identifier, source, uniques, extensions } = overrideOptions;
    const { codec, executor, selectAuth } = baseOptions;
    return {
      codec,
      executor,
      name,
      identifier,
      source,
      uniques,
      parameters: undefined,
      extensions,
      selectAuth,
    };
  }

  /**
   * Often you can access table records from a table directly but also from a
   * number of functions. This method makes it convenient to construct multiple
   * datasources that all represent the same underlying table
   * type/relations/etc but pull their rows from functions.
   */
  static functionResourceOptions<
    TCodec extends PgCodec,
    const TNewParameters extends readonly PgResourceParameter[],
    const TNewUniques extends ReadonlyArray<
      PgResourceUnique<GetPgCodecColumns<TCodec>>
    >,
    const TNewName extends string,
  >(
    baseOptions: PgResourceOptions<any, TCodec, any, any>,
    overrideOptions: PgFunctionResourceOptions<
      TNewName,
      TCodec,
      TNewUniques,
      TNewParameters
    >,
  ): PgResourceOptions<TNewName, TCodec, TNewUniques, TNewParameters> {
    const { codec, executor, selectAuth } = baseOptions;
    const {
      name,
      identifier,
      source: fnSource,
      parameters,
      returnsSetof,
      returnsArray,
      uniques,
      extensions,
      isMutation,
      selectAuth: overrideSelectAuth,
      description,
    } = overrideOptions;
    if (!returnsArray) {
      // This is the easy case
      return {
        codec,
        executor,
        name,
        identifier,
        source: fnSource as any,
        uniques,
        parameters,
        extensions,
        isUnique: !returnsSetof,
        isMutation: Boolean(isMutation),
        selectAuth: overrideSelectAuth ?? selectAuth,
        description,
      };
    } else if (!returnsSetof) {
      // This is a `composite[]` function; convert it to a `setof composite` function:
      const source = EXPORTABLE(
        (fnSource, sql) =>
          (...args: PgSelectArgumentDigest[]) =>
            sql`unnest(${fnSource(...args)})`,
        [fnSource, sql],
      );
      return {
        codec,
        executor,
        name,
        identifier,
        source: source as any,
        uniques,
        parameters,
        extensions,
        isUnique: false, // set now, not unique
        isMutation: Boolean(isMutation),
        selectAuth: overrideSelectAuth ?? selectAuth,
        isList: true,
        description,
      };
    } else {
      // This is a `setof composite[]` function; convert it to `setof composite` and indicate that we should partition it.
      const sqlTmp = sql.identifier(Symbol(`${name}_tmp`));
      const sqlPartitionByIndex = sql.identifier(Symbol(`${name}_idx`));
      const source = EXPORTABLE(
        (fnSource, sql, sqlPartitionByIndex, sqlTmp) =>
          (...args: PgSelectArgumentDigest[]) =>
            sql`${fnSource(
              ...args,
            )} with ordinality as ${sqlTmp} (arr, ${sqlPartitionByIndex}) cross join lateral unnest (${sqlTmp}.arr)`,
        [fnSource, sql, sqlPartitionByIndex, sqlTmp],
      );
      return {
        codec,
        executor,
        name,
        identifier,
        source: source as any,
        uniques,
        parameters,
        extensions,
        isUnique: false, // set now, not unique
        sqlPartitionByIndex,
        isMutation: Boolean(isMutation),
        selectAuth: overrideSelectAuth ?? selectAuth,
        description,
      };
    }
  }

  public toString(): string {
    return chalk.bold.blue(`PgResource(${this.name})`);
  }

  public getRelations(): GetPgRegistryCodecRelations<TRegistry, TCodec> {
    return this.registry.pgRelations[this.codec.name] as any;
  }

  public getRelation<
    TRelationName extends keyof GetPgRegistryCodecRelations<TRegistry, TCodec>,
  >(
    name: TRelationName,
  ): GetPgRegistryCodecRelations<TRegistry, TCodec>[TRelationName] {
    return this.getRelations()[name];
  }

  public resolveVia(
    via: PgCodecAttributeVia,
    attr: string,
  ): PgCodecAttributeViaExplicit {
    if (!via) {
      throw new Error("No via to resolve");
    }
    if (typeof via === "string") {
      // Check
      const relation = this.getRelation(via) as unknown as
        | PgCodecRelation
        | undefined;
      if (!relation) {
        throw new Error(`Unknown relation '${via}' in ${this}`);
      }
      if (!relation.remoteResource.codec.columns![attr]) {
        throw new Error(
          `${this} relation '${via}' does not have column '${attr}'`,
        );
      }
      return { relation: via, attribute: attr };
    } else {
      return via;
    }
  }

  public getReciprocal<
    TOtherCodec extends GetPgRegistryCodecs<TRegistry>,
    TOtherRelationName extends keyof GetPgRegistryCodecRelations<
      TRegistry,
      TOtherCodec
    >,
  >(
    otherCodec: TOtherCodec,
    otherRelationName: TOtherRelationName,
  ):
    | [
        relationName: keyof GetPgRegistryCodecRelations<TRegistry, TCodec>,
        relation: GetPgRegistryCodecRelations<
          TRegistry,
          TCodec
        >[keyof GetPgRegistryCodecRelations<TRegistry, TCodec>],
      ]
    | null {
    if (this.parameters) {
      throw new Error(
        ".getReciprocal() cannot be used with functional resources; please use .execute()",
      );
    }
    const otherRelation =
      this.registry.pgRelations[otherCodec.name]?.[otherRelationName];
    const relations = this.getRelations() as unknown as Record<
      string,
      PgCodecRelation
    >;
    const reciprocal = Object.entries(relations).find(
      ([_relationName, relation]) => {
        if (relation.remoteResource.codec !== otherCodec) {
          return false;
        }
        if (!arraysMatch(relation.localColumns, otherRelation.remoteColumns)) {
          return false;
        }
        if (!arraysMatch(relation.remoteColumns, otherRelation.localColumns)) {
          return false;
        }
        return true;
      },
    );
    return (reciprocal as [any, any]) || null;
  }

  public get(
    spec: PlanByUniques<GetPgCodecColumns<TCodec>, TUniques>,
    // This is internal, it's an optimisation we can use but you shouldn't.
    _internalOptionsDoNotPass?: PgSelectSinglePlanOptions,
  ): GetPgCodecColumns<TCodec> extends PgCodecAttributes
    ? PgSelectSingleStep<this>
    : PgClassExpressionStep<TCodec, this> {
    if (this.parameters) {
      throw new Error(
        ".get() cannot be used with functional resources; please use .execute()",
      );
    }
    if (!spec) {
      throw new Error(`Cannot ${this}.get without a valid spec`);
    }
    const keys = Object.keys(spec) as ReadonlyArray<string> as ReadonlyArray<
      keyof GetPgCodecColumns<TCodec>
    >;
    if (
      !this.uniques.some((uniq) =>
        uniq.columns.every((key) => keys.includes(key as any)),
      )
    ) {
      throw new Error(
        `Attempted to call ${this}.get({${keys.join(
          ", ",
        )}}) at child field (TODO: which one?) but that combination of columns is not unique (uniques: ${JSON.stringify(
          this.uniques,
        )}). Did you mean to call .find() instead?`,
      );
    }
    return this.find(spec).single(_internalOptionsDoNotPass) as any;
  }

  public find(
    spec: {
      [key in keyof GetPgCodecColumns<TCodec>]?:
        | ExecutableStep
        | string
        | number;
    } = Object.create(null),
  ): PgSelectStep<this> {
    if (this.parameters) {
      throw new Error(
        ".get() cannot be used with functional resources; please use .execute()",
      );
    }
    if (!this.codec.columns) {
      throw new Error("Cannot call find if there's no columns");
    }
    const columns = this.codec.columns as NonNullable<
      GetPgCodecColumns<TCodec>
    >;
    const keys = Object.keys(spec); /* as Array<keyof typeof columns>*/
    const invalidKeys = keys.filter((key) => columns[key] == null);
    if (invalidKeys.length > 0) {
      throw new Error(
        `Attempted to call ${this}.get({${keys.join(
          ", ",
        )}}) but that request included columns that we don't know about: '${invalidKeys.join(
          "', '",
        )}'`,
      );
    }

    const identifiers = keys.map((key): PgSelectIdentifierSpec => {
      const column = columns[key];
      if ("via" in column && column.via) {
        throw new Error(
          `Attribute '${String(
            key,
          )}' is defined with a 'via' and thus cannot be used as an identifier for '.find()' or '.get()' calls (requested keys: '${keys.join(
            "', '",
          )}').`,
        );
      }
      const { codec } = column;
      const stepOrConstant = spec[key];
      if (stepOrConstant == undefined) {
        throw new Error(
          `Attempted to call ${this}.find({${keys.join(
            ", ",
          )}}) but failed to provide a plan for '${String(key)}'`,
        );
      }
      return {
        step:
          stepOrConstant instanceof ExecutableStep
            ? stepOrConstant
            : constant(stepOrConstant),
        codec,
        matches: (alias: SQL) =>
          typeof column.expression === "function"
            ? column.expression(alias)
            : sql`${alias}.${sql.identifier(key as string)}`,
      };
    });
    return pgSelect({ resource: this, identifiers });
  }

  execute(
    args: Array<PgSelectArgumentSpec> = [],
    mode: PgSelectMode = this.isMutation ? "mutation" : "normal",
  ): ExecutableStep<unknown> {
    const $select = pgSelect({
      resource: this,
      identifiers: [],
      args,
      mode,
    });
    if (this.isUnique) {
      return $select.single();
    }
    const sqlPartitionByIndex = this.sqlPartitionByIndex;
    if (sqlPartitionByIndex) {
      // We're a setof array of composite type function, e.g. `setof users[]`, so we need to reconstitute the plan.
      return partitionByIndex(
        $select,
        ($row) =>
          ($row as PgSelectSingleStep<any>).select(
            sqlPartitionByIndex,
            TYPES.int,
          ),
        // Ordinality is 1-indexed but we want a 0-indexed number
        1,
      );
    } else {
      return $select;
    }
  }

  public applyAuthorizationChecksToPlan($step: PgSelectStep<this>): void {
    if (this.selectAuth) {
      this.selectAuth($step as any);
    }
    // e.g. $step.where(sql`user_id = ${me}`);
    return;
  }

  /**
   * @deprecated Please use `.executor.context()` instead - all resources for the
   * same executor must use the same context to allow for SQL inlining, unions,
   * etc.
   */
  public context(): ObjectStep<PgExecutorContextPlans> {
    return this.executor.context();
  }

  public executeWithCache<TInput = any, TOutput = any>(
    values: GrafastValuesList<PgExecutorInput<TInput>>,
    options: PgExecutorOptions,
  ): Promise<{ values: GrafastValuesList<ReadonlyArray<TOutput>> }> {
    return this.executor.executeWithCache(values, options);
  }

  public executeWithoutCache<TInput = any, TOutput = any>(
    values: GrafastValuesList<PgExecutorInput<TInput>>,
    options: PgExecutorOptions,
  ): Promise<{ values: GrafastValuesList<ReadonlyArray<TOutput>> }> {
    return this.executor.executeWithoutCache(values, options);
  }

  public executeStream<TInput = any, TOutput = any>(
    values: GrafastValuesList<PgExecutorInput<TInput>>,
    options: PgExecutorOptions,
  ): Promise<{ streams: GrafastResultStreamList<TOutput> }> {
    return this.executor.executeStream(values, options);
  }

  public executeMutation<TData>(
    options: PgExecutorMutationOptions,
  ): Promise<PgClientResult<TData>> {
    return this.executor.executeMutation<TData>(options);
  }

  /**
   * Returns an SQL fragment that evaluates to `'true'` (string) if the row is
   * non-null and `'false'` or `null` otherwise.
   *
   * @see {@link PgCodec.notNullExpression}
   */
  public getNullCheckExpression(alias: SQL): SQL | null {
    if (this.codec.notNullExpression) {
      // Use the user-provided check
      return this.codec.notNullExpression(alias);
    } else {
      // Every column in a primary key is non-nullable; so just see if one is null
      const pk = this.uniques.find((u) => u.isPrimary);
      const nonNullableColumn = this.codec.columns
        ? Object.entries(this.codec.columns).find(
            ([_columnName, spec]) =>
              !spec.via && !spec.expression && spec.notNull,
          )?.[0]
        : null ?? pk?.columns[0];
      if (nonNullableColumn) {
        const firstColumn = sql`${alias}.${sql.identifier(nonNullableColumn)}`;
        return sql`(not (${firstColumn} is null))::text`;
      } else {
        // Fallback

        // NOTE: we cannot use `is distinct from null` here because it's
        // commonly used for `select * from ((select my_table.composite).*)`
        // and the rows there _are_ distinct from null even if the underlying
        // data is not.

        return sql`(not (${alias} is null))::text`;
      }
    }
  }
}
exportAs("@dataplan/pg", PgResource, "PgResource");

export interface PgRegistryBuilder<
  TCodecs extends {
    [name in string]: PgCodec<
      name,
      PgCodecAttributes | undefined,
      any,
      any,
      any,
      any,
      any
    >;
  },
  TResources extends {
    [name in string]: PgResourceOptions<
      name,
      PgCodec,
      ReadonlyArray<PgResourceUnique<PgCodecAttributes>>,
      readonly PgResourceParameter[] | undefined
    >;
  },
  TRelations extends {
    [codecName in keyof TCodecs]?: {
      [relationName in string]: PgCodecRelationConfig<
        PgCodec<string, PgCodecAttributes, any, any, undefined, any, undefined>,
        PgResourceOptions<any, PgCodecWithColumns, any, any>
      >;
    };
  },
> {
  getRegistryConfig(): PgRegistryConfig<
    Expand<TCodecs>,
    Expand<TResources>,
    Expand<TRelations>
  >;
  addCodec<const TCodec extends PgCodec>(
    codec: TCodec,
  ): PgRegistryBuilder<
    TCodecs & {
      [name in TCodec["name"]]: TCodec;
    },
    TResources,
    TRelations
  >;

  addResource<const TResource extends PgResourceOptions<any, any, any, any>>(
    resource: TResource,
  ): PgRegistryBuilder<
    TCodecs & {
      [name in TResource["codec"]["name"]]: TResource["codec"];
    },
    TResources & {
      [name in TResource["name"]]: TResource;
    },
    TRelations
  >;

  addRelation<
    TCodec extends PgCodec,
    const TCodecRelationName extends string,
    const TRemoteResource extends PgResourceOptions<any, any, any, any>,
    const TCodecRelation extends Omit<
      PgCodecRelationConfig<TCodec, TRemoteResource>,
      "localCodec" | "remoteResourceOptions"
    >,
  >(
    codec: TCodec,
    relationName: TCodecRelationName,
    remoteResource: TRemoteResource,
    relation: TCodecRelation,
  ): PgRegistryBuilder<
    TCodecs,
    TResources,
    TRelations & {
      [codecName in TCodec["name"]]: {
        [relationName in TCodecRelationName]: TCodecRelation & {
          localCodec: TCodec;
          remoteResourceOptions: TRemoteResource;
        };
      };
    }
  >;

  build(): PgRegistry<Expand<TCodecs>, Expand<TResources>, Expand<TRelations>>;
}

export function makeRegistry<
  TCodecs extends {
    [name in string]: PgCodec<
      name,
      PgCodecAttributes | undefined,
      any,
      any,
      any,
      any,
      any
    >;
  },
  TResourceOptions extends {
    [name in string]: PgResourceOptions<
      name,
      PgCodec,
      ReadonlyArray<PgResourceUnique<PgCodecAttributes<any>>>,
      readonly PgResourceParameter[] | undefined
    >;
  },
  TRelations extends {
    [codecName in keyof TCodecs]?: {
      [relationName in string]: PgCodecRelationConfig<
        PgCodec<string, PgCodecAttributes, any, any, undefined, any, undefined>,
        PgResourceOptions<any, PgCodecWithColumns, any, any>
      >;
    };
  },
>(
  config: PgRegistryConfig<TCodecs, TResourceOptions, TRelations>,
): PgRegistry<TCodecs, TResourceOptions, TRelations> {
  const registry: PgRegistry<TCodecs, TResourceOptions, TRelations> = {
    pgCodecs: Object.create(null) as any,
    pgResources: Object.create(null) as any,
    pgRelations: Object.create(null) as any,
  };

  // Tell the system to read the built pgCodecs, pgResources, pgRelations from the registry
  Object.defineProperties(registry.pgCodecs, {
    $exporter$args: { value: [registry] },
    $exporter$factory: {
      value: (registry: PgRegistry<any, any, any>) => registry.pgCodecs,
    },
  });
  Object.defineProperties(registry.pgResources, {
    $exporter$args: { value: [registry] },
    $exporter$factory: {
      value: (registry: PgRegistry<any, any, any>) => registry.pgResources,
    },
  });
  Object.defineProperties(registry.pgRelations, {
    $exporter$args: { value: [registry] },
    $exporter$factory: {
      value: (registry: PgRegistry<any, any, any>) => registry.pgRelations,
    },
  });

  function addCodec(codec: PgCodec): PgCodec {
    const codecName = codec.name;
    if (registry.pgCodecs[codecName]) {
      return registry.pgCodecs[codecName];
    } else if ((codec as any).$$export || (codec as any).$exporter$factory) {
      registry.pgCodecs[codecName as keyof TCodecs] = codec as any;
      return codec;
    } else {
      // Custom spec, pin it back to the registry
      registry.pgCodecs[codecName as keyof TCodecs] = codec as any;

      if (codec.columns) {
        const prevCols = codec.columns as PgCodecAttributes;
        for (const col of Object.values(prevCols)) {
          addCodec(col.codec);
        }
      }
      if (codec.arrayOfCodec) {
        addCodec(codec.arrayOfCodec);
      }
      if (codec.domainOfCodec) {
        addCodec(codec.domainOfCodec);
      }
      if (codec.rangeOfCodec) {
        addCodec(codec.rangeOfCodec);
      }

      // Tell the system to read the built codec from the registry
      Object.defineProperties(codec, {
        $exporter$args: { value: [registry, codecName] },
        $exporter$factory: {
          value: (registry: PgRegistry<any, any, any>, codecName: string) =>
            registry.pgCodecs[codecName],
        },
      });

      return codec;
    }
  }

  for (const [codecName, codecSpec] of Object.entries(config.pgCodecs)) {
    if (codecName !== codecSpec.name) {
      throw new Error(`Codec added to registry with wrong name`);
    }
    addCodec(codecSpec);
  }

  for (const [resourceName, rawConfig] of Object.entries(
    config.pgResources,
  ) as [keyof TResourceOptions, PgResourceOptions<any, any, any, any>][]) {
    const resourceConfig = {
      ...rawConfig,
      codec: addCodec(rawConfig.codec),
      parameters: rawConfig.parameters
        ? (rawConfig.parameters as readonly PgResourceParameter[]).map((p) => ({
            ...p,
            codec: addCodec(p.codec),
          }))
        : rawConfig.parameters,
    };
    const resource = new PgResource(registry, resourceConfig) as any;

    // This is the magic that breaks the circular reference: rather than
    // building PgResource via a factory we tell the system to just retrieve it
    // from the already build registry.
    Object.defineProperties(resource, {
      $exporter$args: { value: [registry, resourceName] },
      $exporter$factory: {
        value: (registry: PgRegistry<any, any, any>, resourceName: string) =>
          registry.pgResources[resourceName],
      },
    });

    registry.pgResources[resourceName] = resource;
  }

  for (const codecName of Object.keys(
    config.pgRelations,
  ) as (keyof typeof config.pgRelations)[]) {
    const relations = config.pgRelations[codecName];
    if (!relations) {
      continue;
    }

    const builtRelations = Object.create(null);

    // Tell the system to read the built relations from the registry
    Object.defineProperties(builtRelations, {
      $exporter$args: { value: [registry, codecName] },
      $exporter$factory: {
        value: (registry: PgRegistry<any, any, any>, codecName: string) =>
          registry.pgRelations[codecName],
      },
    });

    for (const relationName of Object.keys(
      relations,
    ) as (keyof typeof relations)[]) {
      const relationConfig = relations![
        relationName
      ] as unknown as PgCodecRelationConfig;
      if (!relationConfig) {
        continue;
      }
      const { localCodec, remoteResourceOptions, ...rest } = relationConfig;

      const builtRelation = {
        ...(rest as any),
        localCodec: addCodec(localCodec),
        remoteResource: registry.pgResources[remoteResourceOptions.name],
      } as PgCodecRelation;

      // Tell the system to read the built relation from the registry
      Object.defineProperties(builtRelation, {
        $exporter$args: { value: [registry, codecName, relationName] },
        $exporter$factory: {
          value: (
            registry: PgRegistry<any, any, any>,
            codecName: string,
            relationName: string,
          ) => registry.pgRelations[codecName][relationName],
        },
      });

      builtRelations[relationName] = builtRelation;
    }

    registry.pgRelations[codecName] = builtRelations;
  }

  validateRelations(registry);

  return registry;
}
exportAs("@dataplan/pg", makeRegistry, "makeRegistry");

function validateRelations(registry: PgRegistry<any, any, any>): void {
  // PERF: skip this if not isDev?

  const reg = registry as PgRegistry;

  for (const codec of Object.values(reg.pgCodecs)) {
    // Check that all the `via` and `identicalVia` match actual relations.
    const relationKeys = Object.keys(reg.pgRelations[codec.name] ?? {});
    if (codec.columns) {
      Object.entries(codec.columns).forEach(([columnName, col]) => {
        const { via, identicalVia } = col;
        if (via) {
          if (typeof via === "string") {
            if (!relationKeys.includes(via)) {
              throw new Error(
                `${codec.name} claims column '${columnName}' is via relation '${via}', but there is no such relation.`,
              );
            }
          } else {
            if (!relationKeys.includes(via.relation)) {
              throw new Error(
                `${codec.name} claims column '${columnName}' is via relation '${via.relation}', but there is no such relation.`,
              );
            }
          }
        }
        if (identicalVia) {
          if (typeof identicalVia === "string") {
            if (!relationKeys.includes(identicalVia)) {
              throw new Error(
                `${codec.name} claims column '${columnName}' is identicalVia relation '${identicalVia}', but there is no such relation.`,
              );
            }
          } else {
            if (!relationKeys.includes(identicalVia.relation)) {
              throw new Error(
                `${codec.name} claims column '${columnName}' is identicalVia relation '${identicalVia.relation}', but there is no such relation.`,
              );
            }
          }
        }
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function makeRegistryBuilder(): PgRegistryBuilder<{}, {}, {}> {
  const registryConfig: PgRegistryConfig<any, any, any> = {
    pgCodecs: Object.create(null),
    pgResources: Object.create(null),
    pgRelations: Object.create(null),
  };

  const builder: PgRegistryBuilder<any, any, any> = {
    getRegistryConfig() {
      return registryConfig;
    },

    addCodec(codec) {
      if (!registryConfig.pgCodecs[codec.name]) {
        registryConfig.pgCodecs[codec.name] = codec;
        if (codec.arrayOfCodec) {
          this.addCodec(codec.arrayOfCodec);
        }
        if (codec.domainOfCodec) {
          this.addCodec(codec.domainOfCodec);
        }
        if (codec.rangeOfCodec) {
          this.addCodec(codec.rangeOfCodec);
        }
        if (codec.columns) {
          for (const col of Object.values(codec.columns)) {
            this.addCodec(col.codec);
          }
        }
      }
      return builder;
    },

    addResource(resource) {
      this.addCodec(resource.codec);
      registryConfig.pgResources[resource.name] = resource;
      return builder;
    },

    addRelation(localCodec, relationName, remoteResourceOptions, relation) {
      if (!registryConfig.pgCodecs[localCodec.name]) {
        throw new Error(
          `Adding a relation before adding the codec is forbidden.`,
        );
      }
      if (!registryConfig.pgResources[remoteResourceOptions.name]) {
        throw new Error(
          `Adding a relation before adding the resource is forbidden.`,
        );
      }
      if (!registryConfig.pgRelations[localCodec.name]) {
        registryConfig.pgRelations[localCodec.name] = Object.create(null);
      }
      registryConfig.pgRelations[localCodec.name][relationName] = {
        localCodec,
        remoteResourceOptions,
        ...relation,
      } as PgCodecRelationConfig<
        PgCodecWithColumns,
        PgResourceOptions<any, PgCodecWithColumns, any, any>
      >;
      return builder;
    },

    build() {
      return EXPORTABLE(
        (makeRegistry, registryConfig) => makeRegistry(registryConfig),
        [makeRegistry, registryConfig],
      );
    },
  };
  return builder;
}

exportAs("@dataplan/pg", makeRegistryBuilder, "makeRegistryBuilder");

export function makePgResourceOptions<
  const TResourceOptions extends PgResourceOptions<any, any, any, any>,
>(options: TResourceOptions) {
  return { ...options };
}

exportAs("@dataplan/pg", makePgResourceOptions, "makePgResourceOptions");
