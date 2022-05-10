import "graphile-config";

import { __ValuePlan } from "dataplanner";

import { isValidObjectType } from "../utils.js";

/**
 * This plugin registers the operation type for the 'query' operation; the
 * GraphQL spec current requires GraphQL schemas to have an object type for the
 * 'query' operation that defines at least one non-introspection field.
 *
 * By default we call this type `Query`, but you can rename it using the
 * `builtin` inflector.
 *
 * Trivia: this requirement in the GraphQL spec may be lifted in future to
 * allow for Mutation- or Subscription-only schemas.
 *
 * Removing this plugin will result in an invalid GraphQL schema.
 */
export const QueryPlugin: GraphileConfig.Plugin = {
  name: "QueryPlugin",
  version: "1.0.0",
  description: `Registers the operation type for the 'query' operation.`,
  schema: {
    hooks: {
      init: {
        callback: (_, build, _context) => {
          const { registerObjectType, inflection } = build;
          registerObjectType(
            inflection.builtin("Query"),
            {
              isRootQuery: true,
            },
            __ValuePlan,
            () => {
              return {
                description:
                  "The root query type which gives access points into the data universe.",
              };
            },
            `graphile-build built-in (root query type)`,
          );
          return _;
        },

        provides: ["Query"],
      },

      GraphQLSchema: {
        callback: (schema, build, _context) => {
          const { getTypeByName, extend, inflection, handleRecoverableError } =
            build;

          // IIFE to get the mutation type, handling errors occurring during
          // validation.
          const Query = (() => {
            try {
              const Type = getTypeByName(inflection.builtin("Query"));

              if (isValidObjectType(Type)) {
                return Type;
              }
            } catch (e) {
              handleRecoverableError(e);
            }
            return null;
          })();

          if (Query == null) {
            return schema;
          }

          // Errors thrown here (e.g. due to naming conflicts) should be raised,
          // hence this is outside of the IIFE.
          return extend(
            schema,
            { query: Query },
            "Adding query type to schema",
          );
        },
        provides: ["Query"],
      },
    },
  },
};
