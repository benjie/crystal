import "graphile-build";
import "./PgTablesPlugin.js";
import "../interfaces.js";
import "graphile-config";

import type {
  PgSelectSingleStep,
  PgTypeCodec,
  PgTypeColumn,
  PgTypeColumns,
} from "@dataplan/pg";
import {
  pgSelectFromRecords,
  pgSelectSingleFromRecord,
  PgSource,
} from "@dataplan/pg";
import type { GraphileFieldConfig, SetterStep } from "grafast";
import { EXPORTABLE } from "graphile-export";
import type { GraphQLFieldConfigMap, GraphQLOutputType } from "graphql";

import { getBehavior } from "../behavior.js";
import { version } from "../index.js";

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /**
       * Given a columnName on a PgTypeCodec's columns, should return the field
       * name to use to represent this column (both for input and output).
       *
       * @remarks The method beginning with `_` implies it's not ment to
       * be called directly, instead it's called from other inflectors to give
       * them common behavior.
       */
      _columnName(
        this: GraphileBuild.Inflection,
        details: {
          codec: PgTypeCodec<any, any, any, any>;
          columnName: string;
          skipRowId?: boolean;
        },
      ): string;

      /**
       * Takes a codec and the list of column names from that codec and turns
       * it into a joined list.
       */
      _joinColumnNames(
        this: GraphileBuild.Inflection,
        codec: PgTypeCodec<any, any, any, any>,
        names: readonly string[],
      ): string;

      /**
       * The field name for a given column on that pg_class' table type. May
       * also be used in other places (e.g. the Input or Patch type associated
       * with the table).
       */
      column(
        this: GraphileBuild.Inflection,
        details: {
          columnName: string;
          codec: PgTypeCodec<any, any, any>;
        },
      ): string;
    }

    interface ScopeInputObject {
      isInputType?: boolean;
      isPgPatch?: boolean;
      isPgBaseInput?: boolean;
      isPgRowType?: boolean;
      isPgCompoundType?: boolean;
      pgColumn?: PgTypeColumn;
    }
  }
}

function unwrapCodec(
  codec: PgTypeCodec<any, any, any, any>,
): PgTypeCodec<any, any, any, any> {
  if (codec.arrayOfCodec) {
    return unwrapCodec(codec.arrayOfCodec);
  }
  return codec;
}

const getSource = EXPORTABLE(
  (PgSource) =>
    (
      baseCodec: PgTypeCodec<any, any, any, any>,
      pgSources: PgSource<any, any, any, any>[],
      $record: PgSelectSingleStep<any, any, any, any>,
    ) => {
      const executor = $record.source.executor;
      const source =
        pgSources.find(
          (potentialSource) => potentialSource.executor === executor,
        ) ?? PgSource.fromCodec(executor, baseCodec);
      return source;
    },
  [PgSource],
);

function processColumn(
  fields: GraphQLFieldConfigMap<any, any>,
  build: GraphileBuild.Build,
  context:
    | GraphileBuild.ContextObjectFields
    | GraphileBuild.ContextInterfaceFields,
  columnName: string,
  overrideName?: string,
): void {
  const {
    extend,
    graphql: { getNullableType, GraphQLNonNull, GraphQLList },
    inflection,
    getGraphQLTypeByPgCodec,
  } = build;

  const {
    scope: { pgCodec },
  } = context;
  if (!pgCodec) {
    return;
  }

  const isInterface = context.type === "GraphQLInterfaceType";

  const column = pgCodec.columns[columnName] as PgTypeColumn<any, any>;

  const behavior = getBehavior(column.extensions);
  if (!build.behavior.matches(behavior, "attribute:select", "select")) {
    // Don't allow selecting this column.
    return;
  }

  const columnFieldName =
    overrideName ??
    inflection.column({
      columnName,
      codec: pgCodec,
    });
  const baseCodec = unwrapCodec(column.codec);
  const baseType = getGraphQLTypeByPgCodec(baseCodec, "output")!;
  const arrayOrNotType = column.codec.arrayOfCodec
    ? new GraphQLList(
        baseType, // TODO: nullability
      )
    : baseType;
  if (!arrayOrNotType) {
    console.warn(
      `Couldn't find a 'output' variant for PgTypeCodec ${
        pgCodec.name
      }'s '${columnName}' column (${column.codec.name}; array=${!!column.codec
        .arrayOfCodec}, domain=${!!column.codec.domainOfCodec}, enum=${!!(
        column.codec as any
      ).values})`,
    );
    return;
  }
  const type = column.notNull
    ? new GraphQLNonNull(getNullableType(arrayOrNotType))
    : arrayOrNotType;

  if (!type) {
    // Could not determine the type, skip this field
    console.warn(
      `Could not determine the type for column '${columnName}' of ${pgCodec.name}`,
    );
    return;
  }
  const fieldSpec: GraphileFieldConfig<any, any, any, any, any> = {
    description: column.description,
    type: type as GraphQLOutputType,
  };
  if (!isInterface) {
    const makePlan = () => {
      // See if there's a source to pull record types from (e.g. for relations/etc)
      if (!baseCodec.columns) {
        // Simply get the value
        return EXPORTABLE(
          (columnName) => ($record: PgSelectSingleStep<any, any, any, any>) => {
            return $record.get(columnName);
          },
          [columnName],
        );
      } else {
        const pgSources = build.input.pgSources.filter(
          (potentialSource) =>
            potentialSource.codec === baseCodec && !potentialSource.parameters,
        );
        // TODO: this is pretty horrible in the export; we should fix that.
        if (!column.codec.arrayOfCodec) {
          const notNull = column.notNull || column.codec.notNull;
          // Single record from source
          /*
           * TODO: if we refactor `PgSelectSingleStep` we can probably
           * optimise this to do inline selection and still join against
           * the base table using e.g. `(table.column).attribute =
           * joined_thing.column`
           */
          return EXPORTABLE(
            (
                baseCodec,
                columnName,
                getSource,
                notNull,
                pgSelectSingleFromRecord,
                pgSources,
              ) =>
              ($record: PgSelectSingleStep<any, any, any, any>) => {
                const $plan = $record.get(columnName);
                const $select = pgSelectSingleFromRecord(
                  getSource(baseCodec, pgSources, $record),
                  $plan,
                );
                if (notNull) {
                  $select.coalesceToEmptyObject();
                }
                $select.getClassStep().setTrusted();
                return $select;
              },
            [
              baseCodec,
              columnName,
              getSource,
              notNull,
              pgSelectSingleFromRecord,
              pgSources,
            ],
          );
        } else {
          // Many records from source
          /*
           * TODO: if we refactor `PgSelectSingleStep` we can probably
           * optimise this to do inline selection and still join against
           * the base table using e.g. `(table.column).attribute =
           * joined_thing.column`
           */
          return EXPORTABLE(
            (
                baseCodec,
                columnName,
                getSource,
                pgSelectFromRecords,
                pgSources,
              ) =>
              ($record: PgSelectSingleStep<any, any, any, any>) => {
                const $val = $record.get(columnName);
                const $select = pgSelectFromRecords(
                  getSource(baseCodec, pgSources, $record),
                  $val,
                );
                $select.setTrusted();
                return $select;
              },
            [baseCodec, columnName, getSource, pgSelectFromRecords, pgSources],
          );
        }
      }
    };
    fieldSpec.plan = makePlan() as any;
  }
  fields = extend(
    fields,
    {
      [columnFieldName]: context.fieldWithHooks(
        {
          fieldName: columnFieldName,
          pgColumn: column,
        },
        fieldSpec,
      ),
    },
    `Adding '${columnName}' column field to PgTypeCodec '${pgCodec.name}'`,
  );
}

export const PgColumnsPlugin: GraphileConfig.Plugin = {
  name: "PgColumnsPlugin",
  description:
    "Adds PostgreSQL columns (attributes) to the relevant GraphQL object/input object types",
  version: version,
  // TODO: Requires PgTablesPlugin

  inflection: {
    add: {
      _columnName(options, { columnName, codec }) {
        const column = codec.columns[columnName];
        return this.coerceToGraphQLName(
          column.extensions?.tags?.name || columnName,
        );
      },

      _joinColumnNames(options, codec, names) {
        return names
          .map((columnName) => {
            return this.column({ columnName, codec });
          })
          .join("-and-");
      },

      column(options, details) {
        const columnFieldName = this.camelCase(this._columnName(details));
        // Avoid conflict with 'id' field used for Relay.
        return columnFieldName === "id" && !details.codec.isAnonymous
          ? "rowId"
          : columnFieldName;
      },
    },
  },

  schema: {
    hooks: {
      GraphQLInterfaceType_fields(fields, build, context) {
        const {
          scope: { pgCodec, pgPolymorphism },
        } = context;

        if (!pgPolymorphism || !pgCodec?.columns) {
          return fields;
        }

        for (const columnName in pgCodec.columns) {
          switch (pgPolymorphism.mode) {
            case "single": {
              if (!pgPolymorphism.commonColumns.includes(columnName)) {
                continue;
              }
              break;
            }
            case "relational": {
              break;
            }
            case "union": {
              break;
            }
            default: {
              const never: never = pgPolymorphism;
              throw new Error(
                `Unhandled polymorphism mode ${(never as any).mode}}`,
              );
            }
          }
          processColumn(fields, build, context, columnName);
        }
        return fields;
      },
      GraphQLObjectType_fields(fields, build, context) {
        const {
          scope: {
            pgCodec,
            isPgTableType,
            pgPolymorphism,
            pgPolymorphicSingleTableType,
          },
        } = context;

        if (!isPgTableType || !pgCodec?.columns) {
          return fields;
        }

        for (const columnName in pgCodec.columns) {
          let overrideName: string | undefined = undefined;
          if (pgPolymorphism) {
            switch (pgPolymorphism.mode) {
              case "single": {
                const match = pgPolymorphicSingleTableType?.columns.find(
                  (c) => c.column === columnName,
                );
                if (
                  !pgPolymorphism.commonColumns.includes(columnName) &&
                  !match
                ) {
                  continue;
                }
                if (match?.rename) {
                  overrideName = match.rename;
                }

                break;
              }
              case "relational": {
                break;
              }
              case "union": {
                break;
              }
              default: {
                const never: never = pgPolymorphism;
                throw new Error(
                  `Unhandled polymorphism mode ${(never as any).mode}}`,
                );
              }
            }
          }
          processColumn(fields, build, context, columnName, overrideName);
        }
        return fields;
      },
      GraphQLInputObjectType_fields(fields, build, context) {
        const { extend, inflection } = build;
        const {
          scope: {
            isPgRowType,
            isPgCompoundType,
            isPgPatch,
            isPgBaseInput,
            pgCodec,
          },
          fieldWithHooks,
        } = context;
        if (
          !(isPgRowType || isPgCompoundType) ||
          !pgCodec ||
          !pgCodec.columns ||
          pgCodec.isAnonymous
        ) {
          return fields;
        }

        return Object.entries(pgCodec.columns as PgTypeColumns).reduce(
          (memo, [columnName, column]) =>
            build.recoverable(memo, () => {
              const behavior = getBehavior(column.extensions);

              const action = isPgBaseInput
                ? "base"
                : isPgPatch
                ? "update"
                : "insert";

              const fieldBehaviorScope = `attribute:${action}`;
              if (
                !build.behavior.matches(behavior, fieldBehaviorScope, action)
              ) {
                return memo;
              }

              const fieldName = inflection.column({
                columnName,
                codec: pgCodec,
              });
              if (memo[fieldName]) {
                throw new Error(
                  `Two columns produce the same GraphQL field name '${fieldName}' on input PgTypeCodec '${pgCodec.name}'; one of them is '${columnName}'`,
                );
              }
              const columnType = build.getGraphQLTypeByPgCodec(
                column.codec,
                "input",
              );
              if (!columnType) {
                return memo;
              }
              return extend(
                memo,
                {
                  [fieldName]: fieldWithHooks(
                    {
                      fieldName,
                      fieldBehaviorScope,
                      pgCodec,
                      pgColumn: column,
                    },
                    {
                      description: column.description,
                      type: build.nullableIf(
                        isPgBaseInput ||
                          isPgPatch ||
                          (!column.notNull &&
                            !column.extensions?.tags?.notNull) ||
                          column.hasDefault ||
                          Boolean(column.extensions?.tags?.hasDefault),
                        columnType,
                      ),
                      applyPlan: EXPORTABLE(
                        (columnName) =>
                          function plan($insert: SetterStep<any, any>, val) {
                            $insert.set(columnName, val.get());
                          },
                        [columnName],
                      ),
                    },
                  ),
                },
                `Adding input object field for ${pgCodec.name}.`,
                // TODO:
                /* `You can rename this field with a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(
                  attr,
                  {
                    name: "newNameHere",
                  },
                )}`, */
              );
            }),
          fields,
        );
      },
    },
  },
};
