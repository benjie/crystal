import "./PgTablesPlugin";

import type {
  PgSelectPlan,
  PgSelectSinglePlan,
  PgTypeCodec,
} from "@dataplan/pg";
import type { ConnectionPlan, InputPlan } from "dataplanner";
import { getEnumValueConfig } from "dataplanner";
import { EXPORTABLE } from "graphile-export";
import "graphile-plugin";
import type { GraphQLEnumType, GraphQLSchema } from "graphql";
import { inspect } from "util";

import { getBehavior } from "../behavior";
import { version } from "../index";

declare global {
  namespace GraphileBuild {
    interface Inflection {
      orderByType(this: Inflection, typeName: string): string;
    }
    interface ScopeEnum {
      pgCodec?: PgTypeCodec<any, any, any, any>;
      isPgRowSortEnum?: boolean;
    }
  }
}

// TODO: rename this, it's not just for connections
export const PgConnectionArgOrderByPlugin: GraphilePlugin.Plugin = {
  name: "PgConnectionArgOrderByPlugin",
  description:
    "Adds the 'orderBy' argument to connections and simple collections",
  version: version,

  inflection: {
    add: {
      orderByType(options, typeName) {
        return this.upperCamelCase(`${typeName}-order-by`);
      },
    },
  },

  schema: {
    hooks: {
      init(_, build) {
        const { inflection, pgCodecMetaLookup } = build;
        pgCodecMetaLookup.forEach((meta, codec) => {
          if (!codec.columns || codec.isAnonymous) return;
          const behavior = getBehavior(codec.extensions);
          if (behavior && !behavior.includes("order")) {
            return;
          }

          const tableTypeName = inflection.tableType(codec);
          /* const TableOrderByType = */
          const typeName = inflection.orderByType(tableTypeName);
          build.registerEnumType(
            typeName,
            {
              pgCodec: codec,
              isPgRowSortEnum: true,
            },
            () => ({
              description: build.wrapDescription(
                `Methods to use when ordering \`${tableTypeName}\`.`,
                "type",
              ),
              values: {
                [inflection.builtin("NATURAL")]: {
                  extensions: {
                    graphile: {
                      // NATURAL means to not change the sort order
                      plan: EXPORTABLE(() => () => {}, []),
                    },
                  },
                },
              },
            }),
            `Adding connection "orderBy" argument for ${codec.name}.`,
            // TODO:
            /* `You can rename the table's GraphQL type via a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(
              table,
              {
                name: "newNameHere",
              },
            )}`,*/
          );
        });
        return _;
      },

      GraphQLObjectType_fields_field_args(args, build, context) {
        const {
          extend,
          getTypeByName,
          graphql: { GraphQLList, GraphQLNonNull },
          inflection,
        } = build;
        const {
          scope: {
            fieldName,
            isPgFieldConnection,
            isPgFieldSimpleCollection,
            pgSource,
          },
          Self,
        } = context;

        if (!isPgFieldConnection && !isPgFieldSimpleCollection) {
          return args;
        }

        if (!pgSource || !pgSource.codec.columns) {
          return args;
        }
        const behavior = getBehavior(pgSource.extensions);
        if (behavior && !behavior.includes("order")) {
          return args;
        }

        const tableTypeName = inflection.tableType(pgSource.codec);
        const tableOrderByTypeName = inflection.orderByType(tableTypeName);
        const TableOrderByType = getTypeByName(
          tableOrderByTypeName,
        ) as GraphQLEnumType;
        if (!TableOrderByType) {
          return args;
        }

        return extend(
          args,
          {
            orderBy: {
              description: build.wrapDescription(
                `The method to use when ordering \`${tableTypeName}\`.`,
                "arg",
              ),
              type: new GraphQLList(new GraphQLNonNull(TableOrderByType)),
              plan: isPgFieldConnection
                ? EXPORTABLE(
                    (applyOrderToPlan, tableOrderByTypeName) =>
                      function plan(
                        _: any,
                        $connection: ConnectionPlan<
                          PgSelectSinglePlan<any, any, any, any>,
                          PgSelectPlan<any, any, any, any>
                        >,
                        $value: InputPlan,
                        info: { schema: GraphQLSchema },
                      ) {
                        const $select = $connection.getSubplan();
                        applyOrderToPlan(
                          $select,
                          $value,
                          info.schema.getType(
                            tableOrderByTypeName,
                          ) as GraphQLEnumType,
                        );
                        return null;
                      },
                    [applyOrderToPlan, tableOrderByTypeName],
                  )
                : EXPORTABLE(
                    (applyOrderToPlan, tableOrderByTypeName) =>
                      function plan(
                        _: any,
                        $select: PgSelectPlan<any, any, any, any>,
                        $value: InputPlan,
                        info: { schema: GraphQLSchema },
                      ) {
                        applyOrderToPlan(
                          $select,
                          $value,
                          info.schema.getType(
                            tableOrderByTypeName,
                          ) as GraphQLEnumType,
                        );
                        return null;
                      },
                    [applyOrderToPlan, tableOrderByTypeName],
                  ),
            },
          },
          `Adding 'orderBy' argument to field '${fieldName}' of '${Self.name}'`,
        );
      },
    },
  },
};

export const applyOrderToPlan = EXPORTABLE(
  (getEnumValueConfig, inspect) =>
    (
      $select: PgSelectPlan<any, any, any, any>,
      $value: InputPlan,
      TableOrderByType: GraphQLEnumType,
    ) => {
      const val = $value.eval();
      if (!Array.isArray(val)) {
        throw new Error("Invalid!");
      }
      val.forEach((order) => {
        const config = getEnumValueConfig(TableOrderByType, order);
        const plan = config?.extensions?.graphile?.plan;
        if (typeof plan !== "function") {
          console.error(
            `Internal server error: invalid orderBy configuration: expected function, but received ${inspect(
              plan,
            )}`,
          );
          throw new Error(
            "Internal server error: invalid orderBy configuration",
          );
        }
        plan($select);
      });
    },
  [getEnumValueConfig, inspect],
);
