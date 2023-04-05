import "graphile-build";
import "./PgTablesPlugin.js";
import "graphile-config";

import type { PgResource } from "@dataplan/pg";
import { connection } from "grafast";
import { EXPORTABLE } from "graphile-export";
import type { GraphQLObjectType, GraphQLOutputType } from "graphql";

import { getBehavior } from "../behavior.js";
import { tagToString } from "../utils.js";
import { version } from "../version.js";

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /**
       * The field name for a Cursor Connection field that returns all rows
       * from the given resource.
       */
      allRowsConnection(
        this: Inflection,
        resource: PgResource<any, any, any, any, any>,
      ): string;

      /**
       * The field name for a List field that returns all rows from the given
       * resource.
       */
      allRowsList(
        this: Inflection,
        resource: PgResource<any, any, any, any, any>,
      ): string;
    }
  }
}

export const PgAllRowsPlugin: GraphileConfig.Plugin = {
  name: "PgAllRowsPlugin",
  description: "Adds 'all rows' accessors for all table-like datasources.",
  version: version,
  // TODO: Requires PgTablesPlugin

  inflection: {
    add: {
      allRowsConnection(options, resource) {
        return this.connectionField(
          this.camelCase(
            `all-${this.pluralize(this._singularizedResourceName(resource))}`,
          ),
        );
      },
      allRowsList(options, resource) {
        return this.listField(
          this.camelCase(
            `all-${this.pluralize(this._singularizedResourceName(resource))}`,
          ),
        );
      },
    },
  },

  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const {
          graphql: { GraphQLList, GraphQLNonNull },
        } = build;
        const { fieldWithHooks } = context;
        if (!context.scope.isRootQuery) {
          return fields;
        }
        for (const resource of Object.values(
          build.input.pgRegistry.pgResources,
        )) {
          if (resource.parameters) {
            // Skip functions
            continue;
          }
          if (!resource.find || resource.isVirtual) {
            continue;
          }
          const type = build.getTypeByName(
            build.inflection.tableType(resource.codec),
          );
          if (!type) {
            continue;
          }

          const behavior = getBehavior([
            resource.codec.extensions,
            resource.extensions,
          ]);
          const defaultBehavior = "connection -list";

          if (
            build.behavior.matches(
              behavior,
              "query:source:list",
              defaultBehavior,
            )
          ) {
            const fieldName = build.inflection.allRowsList(resource);
            fields = build.extend(
              fields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    fieldBehaviorScope: `query:source:list`,
                    isPgFieldSimpleCollection: true,
                    pgResource: resource,
                  },
                  () => ({
                    type: new GraphQLList(
                      new GraphQLNonNull(type),
                    ) as GraphQLOutputType,
                    description: `Reads a set of \`${build.inflection.tableType(
                      resource.codec,
                    )}\`.`,
                    deprecationReason: tagToString(
                      resource.extensions?.tags?.deprecated,
                    ),
                    plan: EXPORTABLE(
                      (resource) =>
                        function plan() {
                          return resource.find();
                        },
                      [resource],
                    ),
                  }),
                ),
              },
              `Adding 'all rows' list field for PgResource ${resource}`,
            );
          }

          if (
            build.behavior.matches(
              behavior,
              "query:source:connection",
              defaultBehavior,
            )
          ) {
            const fieldName = build.inflection.allRowsConnection(resource);
            const connectionType = build.getTypeByName(
              build.inflection.tableConnectionType(resource.codec),
            ) as GraphQLObjectType | undefined;
            if (connectionType) {
              fields = build.extend(
                fields,
                {
                  [fieldName]: fieldWithHooks(
                    {
                      fieldName,
                      fieldBehaviorScope: `query:source:connection`,
                      isPgFieldConnection: true,
                      pgResource: resource,
                    },
                    () => ({
                      type: connectionType,
                      description: `Reads and enables pagination through a set of \`${build.inflection.tableType(
                        resource.codec,
                      )}\`.`,
                      deprecationReason: tagToString(
                        resource.extensions?.tags?.deprecated,
                      ),
                      plan: EXPORTABLE(
                        (connection, resource) =>
                          function plan() {
                            return connection(resource.find());
                          },
                        [connection, resource],
                      ),
                    }),
                  ),
                },
                `Adding 'all rows' connection field for PgResource ${resource}`,
              );
            }
          }
        }
        return fields;
      },
    },
  },
};
