/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

/*
 * TODO: THIS FILE IS SUPER OUT OF DATE... WE SHOULD DELETE IT?
 */

/*
 * Regular forum. Except, some forums are private.
 *
 * Forums are owned by an organization.
 *
 * Users can only see posts in a private forum if:
 * 1. they are a member of the parent organization, and
 * 2. the organization's subscription is active.
 *
 * To assert the parent organization is up to date with their subscription, we
 * check with Stripe. (Poor example, we'd normally do this with database
 * column, but shows integration of external data into query planning.)
 */

import { makePgAdaptorWithPgClient } from "@dataplan/pg/adaptors/pg";
import {
  __TrackedObjectStep,
  __ValueStep,
  grafastGraphql,
  isAsyncIterable,
  stripAnsi,
} from "grafast";
import type { AsyncExecutionResult, ExecutionResult } from "graphql";
import { resolve } from "path";
import { Pool } from "pg";
import prettier from "prettier";

import { PgSubscriber } from "../src/adaptors/pg.js";
import { makeExampleSchema } from "../src/examples/exampleSchema.js";
import { WithPgClient } from "../src/index.js";

const schema = makeExampleSchema();

// Convenience so we don't have to type these out each time. These used to be
// separate plans, but required too much maintenance.
/*+--------------------------------------------------------------------------+
  |                            PLANS SPECS                                   |
  +--------------------------------------------------------------------------+*/

/*+--------------------------------------------------------------------------+
  |                          GRAPHQL HELPERS                                 |
  +--------------------------------------------------------------------------+*/

/*
class ConnectionStep<TSubplan extends ExecutableStep> extends ExecutableStep<Opaque<any>> {
  constructor(public readonly subplan: TSubplan) {
    super();
  }

  /*
  executeWith(deps: any) {
    /*
     * Connection doesn't do anything itself; so `connection { __typename }` is
     * basically a no-op. However subfields will need access to the deps so
     * that they may determine which fetched rows relate to them.
     * /
    return { ...deps };
  }
  * /
}
*/

/*+--------------------------------------------------------------------------+
  |                             THE EXAMPLE                                  |
  +--------------------------------------------------------------------------+*/

function regexpEscape(str: string): string {
  return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
function replaceAll(
  string: string,
  matcher: string | RegExp,
  replacement: string,
) {
  // Use native version if available.
  if (typeof String.prototype["replaceAll"] === "function") {
    return string["replaceAll"](matcher, replacement);
  }
  // Fall back to a polyfill-esque option.
  if (typeof matcher === "string") {
    return string.replace(new RegExp(regexpEscape(matcher), "g"), replacement);
  } else {
    // TODO: need to ensure matcher is `/g`
    return string.replace(matcher, replacement);
  }
}

const testPool = new Pool({ connectionString: "graphile_grafast" });

async function main() {
  //console.log(printSchema(schema));
  function logGraphQLResult(
    result: ExecutionResult<any> | AsyncExecutionResult,
  ): void {
    const { data, errors, extensions } = result;

    const ops = (extensions?.explain as any)?.operations;
    if (ops) {
      for (const op of ops) {
        if (op.type === "mermaid-js") {
          console.log(op.diagram);
        } else {
          console.log(`UNKNOWN: ${op.type}`);
        }
      }
    }

    const nicerErrors = errors?.map((e, idx) => {
      return idx > 0
        ? e.message // Flatten all but first error
        : {
            message: stripAnsi(e.message),
            path: e.path?.join("."),
            locs: e.locations?.map((l) => `${l.line}:${l.column}`).join(", "),
            stack: e.stack
              ? replaceAll(
                  replaceAll(stripAnsi(e.stack), resolve(process.cwd()), "."),
                  // My vim highlighting goes wrong without the extra backslash! >‿<
                  // eslint-disable-next-line no-useless-escape
                  /(?:\/[^\s\/]+)*\/node_modules\//g,
                  "~/",
                ).split("\n")
              : e.stack,
          };
    });
    const formattedResult = {
      ...(data !== undefined ? { data } : null),
      ...(nicerErrors !== undefined ? { errors: nicerErrors } : null),
    };
    console.log(
      prettier.format(JSON.stringify(formattedResult), {
        parser: "json5",
        printWidth: 200,
      }),
    );
  }

  async function test(source: string, variableValues = Object.create(null)) {
    const withPgClient = makePgAdaptorWithPgClient(testPool);
    const pgSubscriber = new PgSubscriber(testPool);
    const contextValue: Grafast.Context = {
      pgSettings: {},
      withPgClient,
      pgSubscriber,
    };
    console.log();
    console.log();
    console.log();
    console.log("=".repeat(80));
    console.log();
    console.log();
    console.log();
    console.log(prettier.format(source, { parser: "graphql" }));
    console.log();
    console.log();
    console.log();
    const result = await grafastGraphql(
      {
        schema,
        source,
        variableValues,
        contextValue,
        rootValue: null,
      },
      {
        // explain: ["mermaid-js"],
      },
    );

    console.log("GraphQL result:");
    if (isAsyncIterable(result)) {
      for await (const payload of result) {
        logGraphQLResult(payload);
        if (payload.errors) {
          throw new Error("Aborting due to errors");
        }
      }
    } else {
      logGraphQLResult(result);
      if (result.errors) {
        throw new Error("Aborting due to errors");
      }
    }
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        forums {
          name
        }
      }
    `);
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        forums {
          name
          self {
            id
            name
          }
        }
      }
    `);
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        forums {
          name
          messagesList(
            first: 5
            condition: { featured: true }
            includeArchived: INHERIT
          ) {
            body
            author {
              username
              gravatarUrl
            }
          }
        }
      }
    `);
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        allMessagesConnection {
          edges {
            cursor
            node {
              body
              author {
                username
                gravatarUrl
              }
            }
          }
        }
      }
    `);
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        forums {
          name
          messagesConnection(
            first: 5
            condition: { featured: true }
            includeArchived: INHERIT
          ) {
            nodes {
              body
              author {
                username
                gravatarUrl
              }
            }
            edges {
              cursor
              node {
                body
                author {
                  username
                  gravatarUrl
                }
              }
            }
          }
        }
      }
    `);
  }

  if (Math.random() > 2) {
    await test(/* GraphQL */ `
      {
        forums(first: 2) {
          name
          messagesConnection(first: 2) {
            nodes {
              body
              author {
                username
                gravatarUrl
              }
            }
            edges {
              cursor
              node {
                body
                author {
                  username
                  gravatarUrl
                }
              }
            }
          }
        }
      }
    `);
  }

  // interfaces-single-table/nested-more-fragments.test.graphql
  await test(/* GraphQL */ `
    {
      people {
        __typename
        username
        items: singleTableItemsList {
          __typename
          parent {
            __typename
            ...Item
          }
          ...Item
        }
      }
    }

    fragment Item on SingleTableItem {
      id
      type
      type2
      author {
        __typename
        username
      }
      position
      createdAt
      updatedAt
      isExplicitlyArchived
      archivedAt
      ... on SingleTableTopic {
        title
      }
      ... on SingleTablePost {
        title
        description
        note
      }
      ... on SingleTableDivider {
        title
        color
      }
      ... on SingleTableChecklist {
        title
      }
      ... on SingleTableChecklistItem {
        description
        note
      }
    }
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => testPool.end());
