// This used to be called "computed columns", but they're not the same as
// Postgres' own computed columns, and they're not necessarily column-like
// (e.g. they can be relations to other tables), so we've renamed them.

import "./PgProceduresPlugin.js";
import "graphile-config";

import type {
  PgClassSingleStep,
  PgDeleteStep,
  PgInsertStep,
  PgSelectArgumentSpec,
  PgSelectStep,
  PgSource,
  PgSourceParameter,
  PgTypeCodec,
  PgTypedExecutableStep,
  PgUpdateStep,
} from "@dataplan/pg";
import {
  pgClassExpression,
  pgSelectSingleFromRecord,
  PgSelectSingleStep,
  TYPES,
} from "@dataplan/pg";
import type {
  __InputObjectStep,
  __TrackedObjectStep,
  ExecutableStep,
  FieldArgs,
  FieldInfo,
  FieldPlanResolver,
  GraphileFieldConfigArgumentMap,
} from "grafast";
import {
  __ListTransformStep,
  connection,
  constant,
  object,
  ObjectStep,
  stepAMayDependOnStepB,
} from "grafast";
import { EXPORTABLE } from "graphile-export";
import type { GraphQLInputType, GraphQLOutputType } from "graphql";

import { getBehavior } from "../behavior.js";
import { version } from "../index.js";
import { tagToString } from "../utils.js";

const $$rootQuery = Symbol("PgCustomTypeFieldPluginRootQuerySources");
const $$rootMutation = Symbol("PgCustomTypeFieldPluginRootMutationSources");
const $$computed = Symbol("PgCustomTypeFieldPluginComputedSources");

declare global {
  namespace GraphileBuild {
    interface Build {
      pgGetArgDetailsFromParameters(
        source: PgSource<any, any, any, any>,
        parameters?: PgSourceParameter[],
      ): Array<{
        graphqlArgName: string;
        postgresArgName: string | null;
        pgCodec: PgTypeCodec<any, any, any, any>;
        inputType: GraphQLInputType;
        required: boolean;
      }>;
    }

    interface InflectionCustomFieldProcedureDetails {
      source: PgSource<any, any, any, PgSourceParameter[]>;
    }
    interface InflectionCustomFieldArgumentDetails {
      source: PgSource<any, any, any, PgSourceParameter[]>;
      param: PgSourceParameter;
      index: number;
    }
    interface InflectionCustomFieldMutationResult {
      source: PgSource<any, any, any, PgSourceParameter[]>;
      returnGraphQLTypeName: string;
    }

    interface Inflection {
      _functionName(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customMutationField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customMutationPayload(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customMutationInput(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customQueryField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customQueryConnectionField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      customQueryListField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      computedColumnField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      computedColumnConnectionField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      computedColumnListField(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      argument(
        this: Inflection,
        details: InflectionCustomFieldArgumentDetails,
      ): string;
      recordFunctionConnectionType(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      scalarFunctionConnectionType(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      recordFunctionEdgeType(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      scalarFunctionEdgeType(
        this: Inflection,
        details: InflectionCustomFieldProcedureDetails,
      ): string;
      functionMutationResultFieldName(
        this: Inflection,
        details: InflectionCustomFieldMutationResult,
      ): string;
    }
  }
}

function getArgDetailsFromParameters(
  build: GraphileBuild.Build,
  source: PgSource<any, any, any, any>,
  parameters: PgSourceParameter[],
) {
  const {
    graphql: { GraphQLList, GraphQLNonNull },
    getGraphQLTypeByPgCodec,
  } = build;
  const argDetails = parameters.map((param, index) => {
    const argName = build.inflection.argument({
      param,
      source,
      index,
    });
    const paramBaseCodec = param.codec.arrayOfCodec ?? param.codec;
    const variant = param.extensions?.variant ?? "input";
    const baseInputType = getGraphQLTypeByPgCodec(paramBaseCodec, variant);
    if (!baseInputType) {
      throw new Error(
        `Failed to find a suitable type for argument codec '${param.codec.name}'; not adding function field for '${source}'`,
      );
    }

    // Not necessarily a list type... Need to rename this
    // variable.
    const listType = param.codec.arrayOfCodec
      ? new GraphQLList(baseInputType)
      : baseInputType;

    const inputType =
      param.notNull && param.required ? new GraphQLNonNull(listType) : listType;
    return {
      graphqlArgName: argName,
      postgresArgName: param.name,
      pgCodec: param.codec,
      inputType,
      required: param.required,
    };
  });
  return argDetails;
}

function shouldUseCustomConnection(
  pgSource: PgSource<any, any, any, any>,
): boolean {
  // 'setof <scalar>' functions should use a connection based on the function name, not a generic connection
  return !pgSource.codec.columns || pgSource.codec.isAnonymous || false;
}

function defaultProcSourceBehavior(
  s: PgSource<any, any, any, any>,
  options: GraphileBuild.GraphileBuildSchemaOptions,
): string {
  const { simpleCollections } = options;
  const behavior = [];
  const firstParameter = (s as PgSource<any, any, any, PgSourceParameter[]>)
    .parameters[0];
  if (
    !s.isMutation &&
    s.parameters &&
    // Don't default to this being a queryField if it looks like a computed column function
    (!firstParameter?.codec?.columns ||
      firstParameter?.codec?.extensions?.isTableLike === false)
  ) {
    behavior.push("queryField");
  } else {
    behavior.push("-queryField");
  }

  if (s.isMutation && s.parameters) {
    behavior.push("mutationField");
  } else {
    behavior.push("-mutationField");
  }

  if (s.parameters && s.parameters?.[0]?.codec?.columns && !s.isMutation) {
    behavior.push("typeField");
  } else {
    behavior.push("-typeField");
  }

  if (s.parameters && !s.isUnique) {
    const canUseConnection =
      !s.sqlPartitionByIndex && !s.isList && !s.codec.arrayOfCodec;
    const defaultBehavior = canUseConnection
      ? simpleCollections === "both"
        ? "connection list"
        : simpleCollections === "only"
        ? "list"
        : "connection"
      : "list";
    behavior.push(defaultBehavior);
  }

  return behavior.join(" ");
}

function hasRecord(
  $row: ExecutableStep,
): $row is
  | PgSelectSingleStep<any, any, any, any>
  | PgInsertStep<any, any, any>
  | PgUpdateStep<any, any, any>
  | PgDeleteStep<any, any, any> {
  return "record" in $row && typeof ($row as any).record === "function";
}

declare global {
  namespace GraphileBuild {
    interface Build {
      [$$rootQuery]: Array<PgSource<any, any, any, any>>;
      [$$rootMutation]: Array<PgSource<any, any, any, any>>;
      [$$computed]: Map<
        PgTypeCodec<any, any, any, any>,
        Array<PgSource<any, any, any, any>>
      >;
    }
  }
}

export const PgCustomTypeFieldPlugin: GraphileConfig.Plugin = {
  name: "PgCustomTypeFieldPlugin",
  description:
    "Adds GraphQL fields based on PostgreSQL functions (in PostGraphile v4 these were called 'custom query functions', 'custom mutation functions' and 'computed column functions'",
  version: version,

  inflection: {
    add: {
      _functionName(options, details) {
        return details.source.extensions?.tags?.name ?? details.source.name;
      },
      customMutationField(options, details) {
        return this.camelCase(this._functionName(details));
      },
      customMutationPayload(options, details) {
        return this.upperCamelCase(this._functionName(details) + "-payload");
      },
      customMutationInput(options, details) {
        return this.inputType(this.upperCamelCase(this._functionName(details)));
      },
      customQueryField(options, details) {
        return this.camelCase(this._functionName(details));
      },
      customQueryConnectionField(options, details) {
        return this.connectionField(this.customQueryField(details));
      },
      customQueryListField(options, details) {
        return this.listField(this.camelCase(this.customQueryField(details)));
      },
      computedColumnField(options, details) {
        const explicitName = details.source.extensions?.tags?.fieldName;
        if (typeof explicitName === "string") {
          return this.camelCase(explicitName);
        }
        const name = details.source.name;
        const codecName =
          details.source.parameters[0].codec.extensions?.tags?.originalName;
        const legacyPrefix = codecName + "_";
        if (name.startsWith(legacyPrefix)) {
          return this.camelCase(name.slice(legacyPrefix.length));
        } else {
          return this.camelCase(name);
        }
      },
      computedColumnConnectionField(options, details) {
        return this.connectionField(this.computedColumnField(details));
      },
      computedColumnListField(options, details) {
        return this.listField(this.computedColumnField(details));
      },
      argument(options, details) {
        return this.camelCase(details.param.name || `arg${details.index}`);
      },
      recordFunctionConnectionType(options, details) {
        return this.connectionType(
          this.upperCamelCase(this._functionName(details)),
        );
      },
      scalarFunctionConnectionType(options, details) {
        return this.connectionType(
          this.upperCamelCase(this._functionName(details)),
        );
      },
      recordFunctionEdgeType(options, details) {
        return this.edgeType(this.upperCamelCase(this._functionName(details)));
      },
      scalarFunctionEdgeType(options, details) {
        return this.edgeType(this.upperCamelCase(this._functionName(details)));
      },
      functionMutationResultFieldName(_options, _details) {
        return "result";
      },
    },
  },

  schema: {
    hooks: {
      build: {
        callback(build) {
          build[$$rootQuery] = [];
          build[$$rootMutation] = [];
          build[$$computed] = new Map();
          const {
            graphql: { GraphQLList, GraphQLNonNull, isInputType },
          } = build;
          build.pgGetArgDetailsFromParameters = (
            source,
            parameters = source.parameters,
          ) => {
            const argDetails = parameters.map((param, index) => {
              const argName = build.inflection.argument({
                param,
                source,
                index,
              });
              const paramBaseCodec = param.codec.arrayOfCodec ?? param.codec;
              const variant = param.extensions?.variant ?? "input";
              const baseInputType = build.getGraphQLTypeByPgCodec!(
                paramBaseCodec,
                variant,
              );
              if (!baseInputType || !isInputType(baseInputType)) {
                throw new Error(
                  `Failed to find a suitable type for argument codec '${param.codec.name}'; not adding function field for '${source}'`,
                );
              }

              // Not necessarily a list type... Need to rename this
              // variable.
              const listType = param.codec.arrayOfCodec
                ? new GraphQLList(baseInputType)
                : baseInputType;

              const inputType =
                param.notNull && param.required
                  ? new GraphQLNonNull(listType)
                  : listType;
              return {
                graphqlArgName: argName,
                postgresArgName: param.name,
                pgCodec: param.codec,
                inputType,
                required: param.required,
              };
            });
            return argDetails;
          };

          return build;
        },
      },
      init: {
        after: ["PgCodecs"],
        callback(_, build) {
          const {
            graphql: { GraphQLList, GraphQLString },
            inflection,
            options,
            pgGetArgDetailsFromParameters,
          } = build;

          // Loop through all the sources and add them to the relevant
          // collection(s) on build. Note that if we have an error creating a
          // payload type for a mutation (for example) then that mutation
          // should not be added - it would not make sense to add the mutation
          // anyway but using the previously declared mutation payload for a
          // different field - this is why we later use this information in the
          // fields hook to determine which fields to add.
          for (const source of build.input.pgSources) {
            build.recoverable(null, () => {
              // Add connection type for functions that need it
              const isFunctionSourceRequiringConnection =
                source.parameters &&
                !source.isMutation &&
                !source.codec.arrayOfCodec &&
                shouldUseCustomConnection(source);

              if (isFunctionSourceRequiringConnection) {
                const connectionTypeName = source.codec.columns
                  ? inflection.recordFunctionConnectionType({
                      source: source,
                    })
                  : inflection.scalarFunctionConnectionType({
                      source: source,
                    });
                const edgeTypeName = source.codec.columns
                  ? inflection.recordFunctionEdgeType({ source: source })
                  : inflection.scalarFunctionEdgeType({ source: source });
                const typeName = source.codec.columns
                  ? inflection.tableType(source.codec)
                  : build.getGraphQLTypeNameByPgCodec(source.codec, "output");
                if (typeName) {
                  build.registerCursorConnection({
                    connectionTypeName,
                    edgeTypeName,
                    typeName,
                    scope: {
                      isPgConnectionRelated: true,
                      pgCodec: source.codec,
                    },
                    // When dealing with scalars, nulls are allowed in setof
                    nonNullNode: source.codec.columns
                      ? options.pgForbidSetofFunctionsToReturnNull
                      : false,
                  });
                } else {
                  // Skip this entirely
                  throw new Error(
                    `Could not find a type for codec ${source}'s codec`,
                  );
                }
              }

              // "custom query"
              // Find non-mutation function sources that don't accept a row type
              // as the first argument
              const isQuerySource =
                source.parameters &&
                build.behavior.matches(
                  getBehavior(source.extensions),
                  "queryField",
                  defaultProcSourceBehavior(source, options),
                );
              if (isQuerySource) {
                build.recoverable(null, () => {
                  build[$$rootQuery].push(source);
                });
              }

              // "custom mutation"
              // Find mutation function sources
              const isMutationProcSource =
                // source.isMutation &&
                source.parameters &&
                build.behavior.matches(
                  getBehavior(source.extensions),
                  "mutationField",
                  defaultProcSourceBehavior(source, options),
                );
              // Add payload type for mutation functions
              if (isMutationProcSource) {
                build.recoverable(null, () => {
                  const inputTypeName = inflection.customMutationInput({
                    source,
                  });

                  const fieldName = inflection.customMutationField({ source });
                  build.registerInputObjectType(
                    inputTypeName,
                    { isMutationInput: true },
                    () => {
                      const argDetails = pgGetArgDetailsFromParameters(
                        source,
                        source.parameters,
                      );

                      // Not used for isMutation; that's handled elsewhere
                      const fields = argDetails.reduce(
                        (memo, { inputType, graphqlArgName }) => {
                          memo[graphqlArgName] = {
                            type: inputType,
                          };
                          return memo;
                        },
                        {
                          clientMutationId: {
                            type: GraphQLString,
                            applyPlan: EXPORTABLE(
                              () =>
                                function plan(
                                  $input: ObjectStep<any>,
                                  val: FieldArgs,
                                ) {
                                  $input.set("clientMutationId", val.get());
                                },
                              [],
                            ),
                          },
                        },
                      );

                      return {
                        description: `All input for the \`${fieldName}\` mutation.`,
                        fields,
                      };
                    },
                    "PgCustomTypeFieldPlugin mutation function input type",
                  );

                  ////////////////////////////////////////

                  const payloadTypeName = inflection.customMutationPayload({
                    source,
                  });

                  const isVoid = source.codec === TYPES.void;

                  const returnGraphQLTypeName =
                    build.getGraphQLTypeNameByPgCodec(
                      source.codec.arrayOfCodec ?? source.codec,
                      "output",
                    );
                  const resultFieldName =
                    isVoid || !returnGraphQLTypeName
                      ? null
                      : inflection.functionMutationResultFieldName({
                          source,
                          returnGraphQLTypeName,
                        });

                  build.registerObjectType(
                    payloadTypeName,
                    {
                      isMutationPayload: true,
                      pgCodec: source.codec,
                      pgTypeSource: source,
                    },
                    ObjectStep,
                    () => ({
                      description: `The output of our \`${fieldName}\` mutation.`,
                      fields: () => {
                        const fields = {
                          clientMutationId: {
                            type: GraphQLString,
                            plan: EXPORTABLE(
                              (constant) =>
                                function plan($object: ObjectStep<any>) {
                                  return (
                                    $object.getStepForKey(
                                      "clientMutationId",
                                      true,
                                    ) ?? constant(undefined)
                                  );
                                },
                              [constant],
                            ),
                          },
                        };
                        if (isVoid) {
                          return fields;
                        }
                        const baseType = getFunctionSourceReturnGraphQLType(
                          build,
                          source,
                        );
                        if (!baseType || !resultFieldName) {
                          console.warn(
                            `Procedure source ${source} has a return type, but we couldn't build it; skipping output field`,
                          );
                          return {};
                        }
                        const type = source.isUnique
                          ? baseType
                          : new GraphQLList(
                              build.nullableIf(
                                // When dealing with scalars, nulls are allowed in setof
                                build.graphql.isLeafType(
                                  build.graphql.getNamedType(baseType),
                                ) ||
                                  !options.pgForbidSetofFunctionsToReturnNull,
                                baseType,
                              ),
                            );
                        fields[resultFieldName] = {
                          type,
                          plan: EXPORTABLE(
                            () =>
                              (
                                $object: ObjectStep<{
                                  result: PgClassSingleStep<any, any, any, any>;
                                }>,
                              ) => {
                                return $object.get("result");
                              },
                            [],
                          ),
                        };
                        return fields;
                      },
                    }),
                    "PgCustomTypeFieldPlugin mutation function payload type",
                  );
                  build[$$rootMutation].push(source);
                });
              }

              // "computed column"
              // Find non-mutation function sources that accept a row type of the
              // matching codec as the first argument
              const isComputedSource =
                source.parameters &&
                build.behavior.matches(
                  getBehavior(source.extensions),
                  "typeField",
                  defaultProcSourceBehavior(source, options),
                );
              if (isComputedSource) {
                // TODO: should we allow other forms of computed columns here,
                // e.g. accepting the row id rather than the row itself.
                const pgCodec = source.parameters?.[0]?.codec;
                if (pgCodec) {
                  const list = build[$$computed].get(pgCodec) ?? [];
                  list.push(source);
                  build[$$computed].set(pgCodec, list);
                }
              }

              return;
            });
          }

          return _;
        },
      },

      GraphQLObjectType_fields(fields, build, context) {
        const {
          graphql: {
            GraphQLList,
            GraphQLNonNull,
            GraphQLObjectType,
            GraphQLInputObjectType,
          },
          inflection,
          options,
          pgGetArgDetailsFromParameters,
        } = build;
        const {
          Self,
          scope: { isPgTableType, pgCodec, isRootQuery, isRootMutation },
          fieldWithHooks,
        } = context;
        const SelfName = Self.name;
        if (!(isPgTableType && pgCodec) && !isRootQuery && !isRootMutation) {
          return fields;
        }
        const procSources = isRootQuery
          ? build[$$rootQuery]
          : isRootMutation
          ? build[$$rootMutation]
          : pgCodec
          ? build[$$computed].get(pgCodec) ?? []
          : [];
        if (procSources.length === 0) {
          return fields;
        }

        return procSources.reduce(
          (memo, source) =>
            build.recoverable(memo, () => {
              // "Computed columns" skip a parameter
              const remainingParameters = (
                isRootMutation || isRootQuery
                  ? source.parameters
                  : source.parameters.slice(1)
              ) as PgSourceParameter[];

              const argDetails = pgGetArgDetailsFromParameters(
                source,
                remainingParameters,
              );

              // Not used for isMutation; that's handled elsewhere.
              // This is a factory because we don't want mutations to one set
              // of args to affect the others!
              const makeFieldArgs = () =>
                argDetails.reduce((memo, { inputType, graphqlArgName }) => {
                  memo[graphqlArgName] = {
                    type: inputType,
                  };
                  return memo;
                }, {} as GraphileFieldConfigArgumentMap<any, any, any, any>);

              const argDetailsSimple = argDetails.map(
                ({ graphqlArgName, pgCodec, required, postgresArgName }) => ({
                  graphqlArgName,
                  postgresArgName,
                  pgCodec,
                  required,
                }),
              );
              let indexAfterWhichAllArgsAreNamed = 0;
              const argDetailsLength = argDetails.length;
              for (let i = 0; i < argDetailsLength; i++) {
                if (!argDetails[i].postgresArgName) {
                  indexAfterWhichAllArgsAreNamed = i + 1;
                }
              }

              const makeArgs = EXPORTABLE(
                (
                    argDetailsLength,
                    argDetailsSimple,
                    constant,
                    indexAfterWhichAllArgsAreNamed,
                  ) =>
                  (args: FieldArgs, path: string[] = []) => {
                    const selectArgs: PgSelectArgumentSpec[] = [];

                    let skipped = false;
                    for (let i = 0; i < argDetailsLength; i++) {
                      const {
                        graphqlArgName,
                        postgresArgName,
                        pgCodec,
                        required,
                      } = argDetailsSimple[i];
                      const $raw = args.getRaw([...path, graphqlArgName]);
                      let step: ExecutableStep;
                      if ($raw.evalIs(undefined)) {
                        if (
                          !required &&
                          i >= indexAfterWhichAllArgsAreNamed - 1
                        ) {
                          skipped = true;
                          continue;
                        } else {
                          step = constant(null);
                        }
                      } else {
                        step = args.get([...path, graphqlArgName]);
                      }

                      if (skipped) {
                        const name = postgresArgName;
                        if (!name) {
                          throw new Error(
                            "GraphileInternalError<6f9e0fbc-6c73-4811-a7cf-c2bc2b3c0946>: This should not be possible since we asserted that allArgsAreNamed",
                          );
                        }
                        selectArgs.push({
                          step,
                          pgCodec,
                          name,
                        });
                      } else {
                        selectArgs.push({
                          step,
                          pgCodec,
                        });
                      }
                    }

                    return selectArgs;
                  },
                [
                  argDetailsLength,
                  argDetailsSimple,
                  constant,
                  indexAfterWhichAllArgsAreNamed,
                ],
              );

              const getSelectPlanFromParentAndArgs: FieldPlanResolver<
                any,
                ExecutableStep,
                any
              > = isRootQuery
                ? // Not computed
                  EXPORTABLE(
                    (makeArgs, source) => ($root, args, _info) => {
                      const selectArgs = makeArgs(args);
                      return source.execute(selectArgs);
                    },
                    [makeArgs, source],
                  )
                : isRootMutation
                ? // Mutation uses 'args.input' rather than 'args'
                  EXPORTABLE(
                    (makeArgs, object, source) => ($root, args, _info) => {
                      const selectArgs = makeArgs(args, ["input"]);
                      const $result = source.execute(selectArgs, "mutation");
                      return object({
                        result: $result,
                      });
                    },
                    [makeArgs, object, source],
                  )
                : // Otherwise computed:
                  EXPORTABLE(
                    (
                        PgSelectSingleStep,
                        hasRecord,
                        makeArgs,
                        pgClassExpression,
                        pgSelectSingleFromRecord,
                        source,
                        stepAMayDependOnStepB,
                      ) =>
                      ($in, args, _info) => {
                        if (!hasRecord($in)) {
                          // TODO: these should be PgInsertSingleStep, etc
                          throw new Error(
                            `Invalid plan, exepcted 'PgSelectSingleStep', 'PgInsertStep', 'PgUpdateStep' or 'PgDeleteStep', but found ${$in}`,
                          );
                        }
                        const extraSelectArgs = makeArgs(args);
                        /**
                         * An optimisation - if all our dependencies are
                         * compatible with the expression's class plan then we
                         * can inline ourselves into that, otherwise we must
                         * issue the query separately.
                         */
                        const canUseExpressionDirectly =
                          $in instanceof PgSelectSingleStep &&
                          extraSelectArgs.every((a) =>
                            stepAMayDependOnStepB($in.getClassStep(), a.step),
                          );
                        const $row = canUseExpressionDirectly
                          ? $in
                          : pgSelectSingleFromRecord($in.source, $in.record());
                        const selectArgs: PgSelectArgumentSpec[] = [
                          { step: $row.record() },
                          ...extraSelectArgs,
                        ];
                        if (
                          source.isUnique &&
                          !source.codec.columns &&
                          typeof source.source === "function"
                        ) {
                          // This is a scalar computed column, let's inline the expression
                          const placeholders = selectArgs.map((arg, i) => {
                            if (i === 0) {
                              return $row.getClassStep().alias;
                            } else if ("pgCodec" in arg && arg.pgCodec) {
                              return $row.placeholder(arg.step, arg.pgCodec);
                            } else {
                              return $row.placeholder(
                                arg.step as PgTypedExecutableStep<any>,
                              );
                            }
                          });
                          return pgClassExpression(
                            $row,
                            source.codec,
                          )`${source.source(
                            ...placeholders.map((placeholder) => ({
                              placeholder,
                            })),
                          )}`;
                        }
                        // TODO: or here, if scalar add select to `$row`?
                        return source.execute(selectArgs);
                      },
                    [
                      PgSelectSingleStep,
                      hasRecord,
                      makeArgs,
                      pgClassExpression,
                      pgSelectSingleFromRecord,
                      source,
                      stepAMayDependOnStepB,
                    ],
                  );

              if (isRootMutation) {
                // mutation type
                const fieldName = inflection.customMutationField({ source });
                const payloadTypeName = inflection.customMutationPayload({
                  source,
                });
                const payloadType = build.getTypeByName(payloadTypeName);
                const inputTypeName = inflection.customMutationInput({
                  source,
                });
                const inputType = build.getTypeByName(inputTypeName);
                if (!(payloadType instanceof GraphQLObjectType)) {
                  return memo;
                }
                if (!(inputType instanceof GraphQLInputObjectType)) {
                  return memo;
                }
                memo[fieldName] = fieldWithHooks(
                  { fieldName, fieldBehaviorScope: "mutationField" },
                  {
                    description: source.extensions?.description,
                    deprecationReason: tagToString(
                      source.extensions?.tags?.deprecated,
                    ),
                    type: build.nullableIf(
                      !source.extensions?.tags?.notNull,
                      payloadType,
                    ),
                    args: {
                      input: {
                        type: new GraphQLNonNull(inputType),
                        applyPlan: EXPORTABLE(
                          () =>
                            function plan(_: any, $object: ObjectStep<any>) {
                              return $object;
                            },
                          [],
                        ),
                      },
                    },
                    plan: getSelectPlanFromParentAndArgs as any,
                  },
                );
              } else if (source.isUnique) {
                const type = getFunctionSourceReturnGraphQLType(build, source);
                if (!type) {
                  return memo;
                }

                const fieldName = isRootQuery
                  ? inflection.customQueryField({ source })
                  : inflection.computedColumnField({ source });
                memo[fieldName] = fieldWithHooks(
                  {
                    fieldName,
                    // TODO: just because it's unique doesn't mean it doesn't
                    // return a list. But even if it does, we can't order it or
                    // filter it... So maybe `single` is fine?
                    fieldBehaviorScope: isRootQuery
                      ? "queryField:single"
                      : "typeField:single",
                  },
                  {
                    description: source.description,
                    deprecationReason: tagToString(
                      source.extensions?.tags?.deprecated,
                    ),
                    type: build.nullableIf(
                      !source.extensions?.tags?.notNull,
                      type!,
                    ),
                    args: makeFieldArgs(),
                    plan: getSelectPlanFromParentAndArgs as any,
                  },
                );
              } else {
                const type = getFunctionSourceReturnGraphQLType(build, source);
                if (!type) {
                  return memo;
                }

                // isUnique is false => this is a 'setof' source.

                // If the source still has an array type, then it's a 'setof
                // foo[]' which __MUST NOT USE__ GraphQL connections; see:
                // https://relay.dev/graphql/connections.htm#sec-Node
                const canUseConnection =
                  !source.sqlPartitionByIndex && !source.isList;

                const behavior = getBehavior(source.extensions);

                const baseScope = isRootQuery ? `queryField` : `typeField`;
                const connectionFieldBehaviorScope = `${baseScope}:connection`;
                const listFieldBehaviorScope = `${baseScope}:list`;
                if (
                  canUseConnection &&
                  build.behavior.matches(
                    behavior,
                    connectionFieldBehaviorScope,
                    defaultProcSourceBehavior(source, options),
                  )
                ) {
                  const fieldName = isRootQuery
                    ? inflection.customQueryConnectionField({ source })
                    : inflection.computedColumnConnectionField({ source });

                  const namedType = build.graphql.getNamedType(type!);
                  const connectionTypeName = shouldUseCustomConnection(source)
                    ? source.codec.columns
                      ? inflection.recordFunctionConnectionType({ source })
                      : inflection.scalarFunctionConnectionType({ source })
                    : source.codec.columns
                    ? inflection.tableConnectionType(source.codec)
                    : namedType
                    ? inflection.connectionType(namedType.name)
                    : null;

                  const ConnectionType = connectionTypeName
                    ? build.getOutputTypeByName(connectionTypeName)
                    : null;

                  if (ConnectionType) {
                    memo = build.recoverable(memo, () =>
                      build.extend(
                        memo,
                        {
                          [fieldName]: fieldWithHooks(
                            {
                              fieldName,
                              fieldBehaviorScope: connectionFieldBehaviorScope,
                              isPgFieldConnection: true,
                              pgSource: source,
                            },
                            {
                              description:
                                source.description ??
                                `Reads and enables pagination through a set of \`${inflection.tableType(
                                  source.codec,
                                )}\`.`,
                              deprecationReason: tagToString(
                                source.extensions?.tags?.deprecated,
                              ),
                              type: build.nullableIf(
                                isRootQuery ?? false,
                                ConnectionType,
                              ),
                              args: makeFieldArgs(),
                              plan: EXPORTABLE(
                                (connection, getSelectPlanFromParentAndArgs) =>
                                  function plan(
                                    $parent: ExecutableStep,
                                    args: FieldArgs,
                                    info: FieldInfo,
                                  ) {
                                    const $select =
                                      getSelectPlanFromParentAndArgs(
                                        $parent,
                                        args,
                                        info,
                                      ) as PgSelectStep<any, any, any, any>;
                                    return connection(
                                      $select,
                                      ($item) => $item,
                                      ($item: any) =>
                                        $item.getParentStep
                                          ? $item.getParentStep().cursor()
                                          : $item.cursor(),
                                    );
                                  },
                                [connection, getSelectPlanFromParentAndArgs],
                              ),
                            },
                          ),
                        },
                        `Adding field '${fieldName}' to '${SelfName}' from function source '${source.name}'`,
                      ),
                    );
                  }
                }

                if (
                  build.behavior.matches(
                    behavior,
                    listFieldBehaviorScope,
                    defaultProcSourceBehavior(source, options),
                  )
                ) {
                  const fieldName = isRootQuery
                    ? source.isList
                      ? inflection.customQueryField({ source })
                      : inflection.customQueryListField({ source })
                    : source.isList
                    ? inflection.computedColumnField({ source })
                    : inflection.computedColumnListField({ source });
                  memo = build.recoverable(memo, () =>
                    build.extend(
                      memo,
                      {
                        [fieldName]: fieldWithHooks(
                          {
                            fieldName,
                            fieldBehaviorScope: listFieldBehaviorScope,
                            isPgFieldSimpleCollection: source.isList
                              ? false // No pagination if it returns an array - just return it.
                              : true,
                            pgSource: source,
                          },
                          {
                            description: source.description,
                            deprecationReason: tagToString(
                              source.extensions?.tags?.deprecated,
                            ),
                            type: build.nullableIf(
                              !source.extensions?.tags?.notNull,
                              new GraphQLList(
                                build.nullableIf(
                                  !source.extensions?.tags?.notNull &&
                                    (source.isList ||
                                      !options.pgForbidSetofFunctionsToReturnNull),
                                  type!,
                                ),
                              ),
                            ),
                            args: makeFieldArgs(),
                            plan: getSelectPlanFromParentAndArgs as any,
                          },
                        ),
                      },
                      `Adding list field '${fieldName}' to ${SelfName} from function source '${source.name}'`,
                    ),
                  );
                }
              }
              return memo;
            }),
          fields,
        );
      },
    },
  },
};

function getFunctionSourceReturnGraphQLType(
  build: GraphileBuild.Build,
  source: PgSource<any, any, any, any>,
): GraphQLOutputType | null {
  const sourceInnerCodec: PgTypeCodec<any, any, any> =
    source.codec.arrayOfCodec ?? source.codec;
  if (!sourceInnerCodec) {
    return null;
  }
  const isVoid = sourceInnerCodec === TYPES.void;
  const innerType = isVoid
    ? null
    : (build.getGraphQLTypeByPgCodec(sourceInnerCodec, "output") as
        | GraphQLOutputType
        | undefined);
  if (!innerType && !isVoid) {
    console.warn(
      `Failed to find a suitable type for codec '${source.codec.name}'; not adding function field`,
    );
    return null;
  } else if (!innerType) {
    return null;
  }

  // TODO: nullability
  const type =
    innerType && source.codec.arrayOfCodec
      ? new build.graphql.GraphQLList(innerType)
      : innerType;
  return type;
}
