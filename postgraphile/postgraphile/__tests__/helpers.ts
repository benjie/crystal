// It's helpful to see the full error stack
Error.stackTraceLimit = Infinity;

if (process.env.DEBUG) {
  // When debug is set, outputting the console logs makes the tests slow.
  jest.setTimeout(30000);
}

import "@dataplan/pg/adaptors/node-postgres";
import "graphile-config";
import "graphile-build-pg";

import type {
  PgClient,
  PgClientQuery,
  PgClientResult,
  WithPgClient,
} from "@dataplan/pg";
import { PgSubscriber } from "@dataplan/pg";
import { promises as fsp } from "fs";
import type { BaseGraphQLContext } from "grafast";
import {
  $$bypassGraphQL,
  execute as grafastExecute,
  hookArgs,
  subscribe as grafastSubscribe,
} from "grafast";
import { StreamDeferPlugin } from "graphile-build";
import type {
  AsyncExecutionResult,
  ExecutionArgs,
  ExecutionPatchResult,
  GraphQLError,
  GraphQLSchema,
  SubscriptionArgs,
} from "graphql";
import {
  execute as graphqlExecute,
  getOperationAST,
  parse,
  subscribe as graphqlSubscribe,
  validate,
  validateSchema,
} from "graphql";
import { isAsyncIterable } from "iterall";
import JSON5 from "json5";
import type { JwtPayload } from "jsonwebtoken";
import { decode } from "jsonwebtoken";
import { relative } from "path";
import type { PoolClient } from "pg";
import { Pool } from "pg";

import { withTestWithPgClient } from "../../../grafast/dataplan-pg/__tests__/sharedHelpers.js";
import { makeSchema } from "..";
import AmberPreset from "../src/presets/amber.js";
import { makeV4Preset } from "../src/presets/v4.js";

/**
 * We go beyond what Jest snapshots allow; so we have to manage it ourselves.
 * If UPDATE_SNAPSHOTS is set then we'll write updated snapshots, otherwise
 * we'll do the default behaviour of comparing to existing snapshots.
 */
export const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === "1";

async function getServerVersionNum(pgClient: Pool | PoolClient) {
  const versionResult = await pgClient.query("show server_version_num;");
  return parseInt(versionResult.rows[0].server_version_num, 10);
}

const kitchenSinkData = () =>
  fsp.readFile(`${__dirname}/kitchen-sink-data.sql`, "utf8");

const pg11Data = () => fsp.readFile(`${__dirname}/pg11-data.sql`, "utf8");

const SHARED_JWT_SECRET =
  "This is static for the tests, use a better one if you set one!";

// TODO: this file shares a lot in common with the equivalent file in
// dataplan-pg; we should extract the common utilities.

/** Sorts two GraphQLError paths. */
const pathCompare = (
  path1: readonly (string | number)[],
  path2: readonly (string | number)[],
) => {
  const l = Math.min(path1.length, path2.length);
  for (let i = 0; i < l; i++) {
    const a = path1[i];
    const z = path2[i];
    if (typeof a === "number") {
      if (typeof z !== "number") {
        throw new Error("Type mismatch; expected number");
      }
      const v = a - z;
      if (v !== 0) {
        return v;
      }
    } else if (typeof a === "string") {
      if (typeof z !== "string") {
        throw new Error("Type mismatch; expected string");
      }
      const v = a.localeCompare(z);
      if (v !== 0) {
        return v;
      }
    } else {
      throw new Error("Unexpected type");
    }
  }
  return path1.length - path2.length;
};

/** Postgres pool */
let testPool: Pool | null = null;

export const connectionString = process.env.TEST_DATABASE_URL || "pggql_test";

beforeAll(() => {
  testPool = new Pool({
    connectionString,
  });
  testPool.on("connect", (client) => {
    client.on("error", () => {});
    client.query(`set TimeZone to '+04:00'`).catch(() => {});
  });
  testPool.on("error", (e) => {
    console.error("Pool error:", e);
  });
});

afterAll(async () => {
  await testPool.end();
  const p = testPool as any;
  if (p._clients.length > 0) {
    console.warn(`Warning: ${p._clients.length} clients are still in the pool`);
  }
  testPool = null;
});

export async function withPoolClient<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const poolClient = await testPool.connect();
  try {
    return await callback(poolClient);
  } finally {
    poolClient.release();
  }
}

export async function withPoolClientTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withPoolClient(async (poolClient) => {
    await poolClient.query("begin;");
    try {
      return await callback(poolClient);
    } finally {
      await poolClient.query("rollback");
    }
  });
}

export async function runTestQuery(
  source: string,
  config: {
    variableValues?: { [key: string]: any };
    directPg?: boolean;
    schema?: string | string[];
    graphileBuildOptions?: any;
    ignoreRBAC?: boolean;
    setofFunctionsContainNulls?: boolean;
    viewUniqueKey?: string;
    subscriptions?: boolean;
  },
  options: {
    callback?: (
      client: PoolClient | null,
      payloads: Omit<AsyncExecutionResult, "hasNext">[],
    ) => Promise<void>;
    path: string;
    prepare?: boolean;
  } = Object.create(null),
): Promise<{
  payloads?: Array<{
    data?: { [key: string]: any };
    errors?: readonly GraphQLError[];
    extensions?: any;
  }>;
  data?: { [key: string]: any };
  errors?: readonly GraphQLError[];
  queries: PgClientQuery[];
  extensions?: any;
}> {
  const { variableValues, graphileBuildOptions } = config;
  const { path } = options;

  const queries: PgClientQuery[] = [];
  const schemas = Array.isArray(config.schema)
    ? config.schema
    : typeof config.schema === "string"
    ? [config.schema]
    : ["a", "b", "c"];
  const preset: GraphileConfig.Preset = {
    extends: [AmberPreset],
    plugins: [StreamDeferPlugin],
    pgSources: [
      {
        adaptor: "@dataplan/pg/adaptors/node-postgres",
        name: "main",
        withPgClientKey: "withPgClient",
        pgSettingsKey: "pgSettings",
        pgSettingsForIntrospection:
          config.ignoreRBAC == false
            ? {
                role: "postgraphile_test_authenticator",
              }
            : null,
        pgSettings:
          config.ignoreRBAC === false
            ? () => ({
                role: "postgraphile_test_visitor",
                "jwt.claims.user_id": "3",
              })
            : undefined,
        schemas: schemas,
        adaptorSettings: {
          connectionString,
        },
      } as GraphileConfig.PgDatabaseConfiguration<"@dataplan/pg/adaptors/node-postgres">,
    ],
    schema: {
      pgForbidSetofFunctionsToReturnNull:
        config.setofFunctionsContainNulls === false,
      ...graphileBuildOptions,
    },
    grafast: {
      explain: ["mermaid-js"],
    },
  };

  if (path.includes("/v4") || path.includes("/polymorphic")) {
    applyV4Stuff(preset, config);
  }

  if (!testPool) {
    throw new Error("No pool!");
  }

  // Load test data
  await testPool.query(await kitchenSinkData());
  const serverVersionNum = await getServerVersionNum(testPool);
  if (serverVersionNum >= 110000) {
    await testPool.query(await pg11Data());
  }

  const { schema, resolvedPreset } = await makeSchema(preset);
  return withTestWithPgClient(
    testPool,
    queries,
    config.directPg,
    async (withPgClient) => {
      const pgSubscriber = new PgSubscriber(testPool);
      try {
        const document = parse(source);
        const args: ExecutionArgs = {
          schema,
          document,
          variableValues,
        };

        await hookArgs(args, {}, resolvedPreset);

        // We must override the context so that we can listen to the SQL queries.
        args.contextValue = {
          pgSettings: (args.contextValue as any).pgSettings,
          withPgClient,
          pgSubscriber,
        };

        const schemaValidationErrors = validateSchema(schema);
        if (schemaValidationErrors.length > 0) {
          throw new Error(
            `Invalid schema: ${schemaValidationErrors
              .map((e) => String(e))
              .join(",")}`,
          );
        }

        const operationAST = getOperationAST(document, undefined);
        const operationType = operationAST.operation;

        const validationErrors = validate(schema, document);
        if (validationErrors.length > 0) {
          throw new Error(
            `Invalid operation document: ${validationErrors
              .map((e) => String(e))
              .join(",")}`,
          );
        }

        const execute =
          options.prepare ?? true
            ? grafastExecute
            : (args: ExecutionArgs) => graphqlExecute(args);
        const subscribe =
          options.prepare ?? true
            ? grafastSubscribe
            : (args: SubscriptionArgs) => graphqlSubscribe(args);

        const result =
          operationType === "subscription"
            ? await subscribe(args, resolvedPreset)
            : await execute(args, resolvedPreset);

        if (isAsyncIterable(result)) {
          let errors: GraphQLError[] | undefined = undefined;
          // hasNext changes based on payload order; remove it.
          const originalPayloads: Omit<AsyncExecutionResult, "hasNext">[] = [];

          // Start collecting the payloads
          const promise = (async () => {
            for await (const entry of result) {
              const { hasNext, ...rest } = entry;
              if (Object.keys(rest).length > 0 || hasNext) {
                // Do not add the trailing `{hasNext: false}` entry to the snapshot
                originalPayloads.push(rest);
              }
              if (entry.errors) {
                if (!errors) {
                  errors = [];
                }
                errors.push(...entry.errors);
              }
            }
          })();

          // In parallel to collecting the payloads, run the callback
          if (options.callback) {
            if (!config.directPg) {
              throw new Error("Can only use callback in directPg mode");
            }
            const poolClient = await testPool.connect();
            try {
              await options.callback(poolClient, originalPayloads);
            } catch (e) {
              console.error(
                "Detected error during test callback; here's the payloads we have thus far:",
              );
              console.error(originalPayloads);
              throw e;
            } finally {
              poolClient.release();
            }
          }

          if (operationType === "subscription") {
            const iterator = result[Symbol.asyncIterator]();
            // Terminate the subscription
            iterator.return?.();
          }

          // Now wait for all payloads to have been collected
          await promise;

          // Now we're going to reorder the payloads so that they're always in a
          // consistent order for the snapshots.
          const sortPayloads = (
            payload1: ExecutionPatchResult,
            payload2: ExecutionPatchResult,
          ) => {
            const ONE_AFTER_TWO = 1;
            const ONE_BEFORE_TWO = -1;
            if (!payload1.path) {
              return 0;
            }
            if (!payload2.path) {
              return 0;
            }

            // Make it so we can assume payload1 has the longer (or equal) path
            if (payload2.path.length > payload1.path.length) {
              return -sortPayloads(payload2, payload1);
            }

            for (let i = 0, l = payload1.path.length; i < l; i++) {
              let key1 = payload1.path[i];
              let key2 = payload2.path[i];
              if (key2 === undefined) {
                return ONE_AFTER_TWO;
              }
              if (key1 === key2) {
                /* continue */
              } else if (typeof key1 === "number" && typeof key2 === "number") {
                const res = key1 - key2;
                if (res !== 0) {
                  return res;
                }
              } else if (typeof key1 === "string" && typeof key2 === "string") {
                const res = key1.localeCompare(key2);
                if (res !== 0) {
                  return res;
                }
              } else {
                throw new Error("Type mismatch");
              }
            }
            // We should do canonical JSON... but whatever.
            return JSON.stringify(payload1).localeCompare(
              JSON.stringify(payload2),
            );
          };
          const payloads = [
            originalPayloads[0],
            ...originalPayloads.slice(1).sort(sortPayloads),
          ];

          return {
            payloads,
            errors,
            queries,
            extensions: payloads[0].extensions,
          };
        } else {
          // Throw away symbol keys/etc
          const { data, errors, extensions } = JSON.parse(
            JSON.stringify(result),
          );
          if (errors) {
            console.error(errors[0].originalError || errors[0]);
          }
          if (options.callback) {
            throw new Error(
              "Callback is only appropriate when operation returns an async iterable" +
                String(errors ? errors[0].originalError || errors[0] : ""),
            );
          }
          return { data, errors, queries, extensions };
        }
      } finally {
        await pgSubscriber.release();
      }
    },
  );
}

/**
 * If UPDATE_SNAPSHOTS is set then wrotes the given snapshot to the given
 * filePath, otherwise it asserts that the snapshot matches the previous
 * snapshot.
 */
export async function snapshot(actual: string, filePath: string) {
  let expected: string | null = null;
  try {
    expected = await fsp.readFile(filePath, "utf8");
  } catch (e) {
    /* noop */
  }
  if (expected == null || UPDATE_SNAPSHOTS) {
    if (expected !== actual) {
      console.warn(`Updated snapshot in '${filePath}'`);
      await fsp.writeFile(filePath, actual);
    }
  } else {
    expect(actual).toEqual(expected);
  }
}

const sqlSnapshotAliases = new Map();
let sqlSnapshotAliasCount = 0;

beforeEach(() => {
  sqlSnapshotAliases.clear();
  sqlSnapshotAliasCount = 0;
});
afterAll(() => {
  sqlSnapshotAliases.clear();
});

/**
 * Replace non-deterministic parts of the query with more deterministic
 * equivalents.
 */
function makeSQLSnapshotSafe(sql: string): string {
  return sql.replace(/__cursor_[0-9]+__/g, (t) => {
    const substitute = sqlSnapshotAliases.get(t);
    if (substitute != null) {
      return substitute;
    } else {
      const sub = `__SNAPSHOT_CURSOR_${sqlSnapshotAliasCount++}__`;
      sqlSnapshotAliases.set(t, sub);
      return sub;
    }
  });
}

const UUID_REGEXP = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * Replaces non-deterministic parts of the response with more deterministic
 * equivalents.
 */
function makeResultSnapshotSafe(
  data: any,
  replacements: { uuid: Map<string, number>; uuidCounter: number },
): any {
  if (Array.isArray(data)) {
    return data.map((entry) => makeResultSnapshotSafe(entry, replacements));
  } else if (typeof data === "object") {
    if (data == null) {
      return data;
    }
    const keys = Object.keys(data);
    return keys.reduce((memo, key) => {
      if (key.startsWith("jwt") && typeof data[key] === "string") {
        try {
          const content = decode(data[key]) as JwtPayload;
          if (typeof content.iat === "number") {
            content.iat = "<number>" as any;
          }

          memo[key] = `JWT<${JSON5.stringify(content)} (unverified)>`;
          return memo;
        } catch (e) {
          // ignore
        }
      }
      memo[key] = makeResultSnapshotSafe(data[key], replacements);
      return memo;
    }, {} as any);
  } else if (
    typeof data === "string" &&
    UUID_REGEXP.test(data) &&
    !data.includes("-0000-0000-")
  ) {
    const uuidNumber = replacements.uuid.has(data)
      ? replacements.uuid.get(data)
      : replacements.uuidCounter++;
    if (!replacements.uuid.has(data)) {
      replacements.uuid.set(data, uuidNumber);
    }
    return `<UUID ${uuidNumber}>`;
  } else {
    return data;
  }
}

function makePayloadSnapshotSafe(
  payload: any,
  replacements: { uuid: Map<string, number>; uuidCounter: number },
) {
  const p = { ...payload };
  delete p.extensions;
  return makeResultSnapshotSafe(p, replacements);
}

function mask(data: any, config: any) {
  if (!config.mask) {
    return data;
  }
  const masks = Array.isArray(config.mask) ? config.mask : [config.mask];
  const copy = JSON.parse(JSON.stringify(data));
  const known: any[] = [];
  const maskIt = (v: any) => {
    if (!v) {
      // Make sure `null` and `undefined` don't get masked
      return v;
    }
    let i = known.indexOf(v);
    if (i < 0) {
      i = known.push(v) - 1;
    }
    return `<MASKED-${i}>`;
  };
  for (const mask of masks) {
    const parts = mask.split(".");
    let obj = copy;
    for (let i = 0, l = parts.length - 1; i < l && obj; i++) {
      obj = obj[parts[i]];
    }
    if (obj) {
      obj[parts[parts.length - 1]] = maskIt(obj[parts[parts.length - 1]]);
    }
  }
  return copy;
}

/**
 * Build the snapshot for the given mode ('only') and then assert it matches
 * (or store it).
 */
export const assertSnapshotsMatch = async (
  only: "sql" | "result" | "errors" | "mermaid",
  props: {
    result: ReturnType<typeof runTestQuery>;
    document: string;
    path: string;
    config: any;
    ext?: string;
  },
): Promise<void> => {
  const { path, result, ext, config } = props;
  const basePath = path.replace(/\.test\.graphql$/, "");
  if (basePath === path) {
    throw new Error(`Failed to trim .test.graphql from '${path}'`);
  }

  const { data, payloads, queries, errors, extensions } = await result;

  const replacements = { uuid: new Map<string, number>(), uuidCounter: 1 };

  if (only === "result") {
    const resultFileName = basePath + (ext || "") + ".json5";
    const processedResults = payloads
      ? payloads.map((payload) =>
          makePayloadSnapshotSafe(payload, replacements),
        )
      : makePayloadSnapshotSafe(data, replacements);
    const maskedResults = mask(processedResults, config);
    const formattedData =
      //prettier.format(
      JSON5.stringify(maskedResults, {
        space: 2,
        quote: '"',
      }) + "\n";
    // , {
    //   parser: "json5",
    //   printWidth: 120,
    // });
    await snapshot(formattedData, resultFileName);
  } else if (only === "errors") {
    const errorsFileName = basePath + (ext || "") + ".errors.json5";
    const processedErrors = errors
      ? makeResultSnapshotSafe(errors, replacements).sort(
          (e1: GraphQLError, e2: GraphQLError) => {
            return pathCompare(e1.path, e2.path);
          },
        )
      : null;
    const formattedErrors = processedErrors //prettier.format(
      ? JSON5.stringify(processedErrors, null, 2)
      : "null";
    //   {
    //     parser: "json5",
    //     printWidth: 120,
    //   },
    // );
    await snapshot(formattedErrors, errorsFileName);
  } else if (only === "sql") {
    const sqlFileName = basePath + (ext || "") + ".sql";
    const formattedQueries = queries
      .map((q) => makeSQLSnapshotSafe(q.text))
      .join("\n\n");
    await snapshot(formattedQueries, sqlFileName);
  } else if (only === "mermaid") {
    const graphString = extensions?.explain?.operations?.find(
      (op) => op.type === "mermaid-js",
    )?.diagram;
    const mermaidFileName = basePath + (ext || "") + ".mermaid";
    if (!graphString) {
      throw new Error("No plan was emitted for this test!");
    }
    const lines = graphString.split("\n");
    const relativePath = relative(__dirname, basePath);
    const i = lines.indexOf("    subgraph Buckets");
    if (i < 0) {
      lines.splice(1, 0, `    subgraph "${relativePath}"`, `    end`);
    } else {
      lines.splice(i, 1, `    subgraph "Buckets for ${relativePath}"`);
    }
    const content = `${lines.join("\n")}\n`;
    await snapshot(content, mermaidFileName);
  } else {
    throw new Error(
      `Unexpected argument to assertSnapshotsMatch; expected result|sql, received '${only}'`,
    );
  }
};

export const assertResultsMatch = async (
  result1: ReturnType<typeof runTestQuery>,
  result2: ReturnType<typeof runTestQuery>,
  { config }: { config: any },
): Promise<void> => {
  const { data: data1 } = await result1;
  const { data: data2 } = await result2;
  const data1a = makeResultSnapshotSafe(data1, {
    uuid: new Map<string, number>(),
    uuidCounter: 1,
  });
  const data2a = makeResultSnapshotSafe(data1, {
    uuid: new Map<string, number>(),
    uuidCounter: 1,
  });

  const maskedData1 = mask(data1a, config);
  const maskedData2 = mask(data2a, config);
  expect(maskedData2).toEqual(maskedData1);
};

export const assertErrorsMatch = async (
  result1: ReturnType<typeof runTestQuery>,
  result2: ReturnType<typeof runTestQuery>,
  { config }: { config: any },
): Promise<void> => {
  const { errors: errors1 } = await result1;
  const { errors: errors2 } = await result2;
  expect(errors2).toEqual(errors1);
};

function applyV4Stuff(
  preset: GraphileConfig.Preset,
  config: Record<string, any>,
): void {
  (preset.extends as Array<GraphileConfig.Preset>).push(
    makeV4Preset({
      ...config,
      ...(config.jwtSecret === true
        ? {
            jwtSecret: SHARED_JWT_SECRET,
          }
        : null),
    }),
  );
}
