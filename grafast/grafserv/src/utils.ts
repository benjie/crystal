import type { Readable } from "node:stream";

import type { PromiseOrDirect } from "grafast";
import { execute, hookArgs, SafeError, stripAnsi, subscribe } from "grafast";
import type {
  AsyncExecutionResult,
  ExecutionArgs,
  ExecutionResult,
  GraphQLSchema,
} from "grafast/graphql";
import * as graphql from "grafast/graphql";
import type { ServerOptions, SubscribePayload } from "graphql-ws";
import type { Extra } from "graphql-ws/lib/use/ws";

import { getGrafservHooks } from "./hooks.js";
import type { GrafservBase } from "./index.js";
import type {
  GrafservBody,
  JSONValue,
  NormalizedRequestDigest,
  ParsedGraphQLBody,
  RequestDigest,
} from "./interfaces.js";
import { $$normalizedHeaders } from "./interfaces.js";
import {
  makeParseAndValidateFunction,
  validateGraphQLBody,
} from "./middleware/graphql.js";

const { GraphQLError } = graphql;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function handleErrors(
  payload: ExecutionResult | AsyncExecutionResult,
): void {
  if ("errors" in payload && payload.errors) {
    (payload.errors as any[]) = payload.errors.map((e) => {
      const obj =
        e instanceof GraphQLError
          ? e.toJSON()
          : { message: (e as any).message, ...(e as object) };
      return Object.assign(obj, {
        message: stripAnsi(obj.message),
        extensions: {
          ...(e instanceof GraphQLError ? e.extensions : null),
          ...(e.stack
            ? {
                stack: stripAnsi(e.stack).split("\n"),
              }
            : null),
          ...(e.cause
            ? {
                cause: stripAnsi(String(e.cause)),
              }
            : null),
        },
      });
    });
  }
}

// Designed to be equivalent to `import('node:http').IncomingHttpHeaders` but without the import
type IncomingHttpHeaders = Record<string, string | string[] | undefined>;

export function processHeaders(
  headers: IncomingHttpHeaders,
): Record<string, string> {
  const headerDigest: Record<string, string> = Object.create(null);
  for (const key in headers) {
    const val = headers[key];
    if (val == null) {
      continue;
    }
    if (typeof val === "string") {
      headerDigest[key] = val;
    } else {
      headerDigest[key] = val.join("\n");
    }
  }
  return headerDigest;
}

export function getBodyFromRequest(
  req: Readable /* IncomingMessage */,
  maxLength: number,
): Promise<GrafservBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let len = 0;
    const handleData = (chunk: Buffer) => {
      chunks.push(chunk);
      len += chunk.length;
      if (len > maxLength) {
        req.off("end", done);
        req.off("error", reject);
        req.off("data", handleData);
        reject(httpError(413, "Too much data"));
      }
    };
    const done = () => {
      resolve({ type: "buffer", buffer: Buffer.concat(chunks) });
    };
    req.on("end", done);
    req.on("error", reject);
    req.on("data", handleData);
  });
}

/**
 * Using this is a hack, it sniffs the data and tries to determine the type.
 * Really you should ask your framework of choice what type of data it has given
 * you.
 */
export function getBodyFromFrameworkBody(body: unknown): GrafservBody {
  if (typeof body === "string") {
    return {
      type: "text",
      text: body,
    };
  } else if (Buffer.isBuffer(body)) {
    return {
      type: "buffer",
      buffer: body,
    };
  } else if (typeof body === "object" && body != null) {
    return {
      type: "json",
      json: body as JSONValue,
    };
  } else {
    throw new Error(
      `Grafserv adaptor doesn't know how to interpret this request body`,
    );
  }
}

export function memo<T>(fn: () => T): () => T {
  let cache: T;
  let called = false;
  return function memoized(this: any) {
    if (called) {
      return cache;
    } else {
      called = true;
      cache = fn.call(this);
      return cache;
    }
  };
}

export function normalizeRequest(
  request: RequestDigest | NormalizedRequestDigest,
): NormalizedRequestDigest {
  if (!request[$$normalizedHeaders]) {
    const r = request as NormalizedRequestDigest;
    const normalized = Object.create(null);
    for (const key in r.headers) {
      normalized[key.toLowerCase()] = r.headers[key];
    }
    r[$$normalizedHeaders] = normalized;
    r.preferJSON = Boolean(r.preferJSON);
    r.getHeader = (key) => normalized[key.toLowerCase()];
    r.getBody = memo(r.getBody);
    r.getQueryParams = memo(r.getQueryParams);

    if (r.method === "HEAD") {
      // Pretend that 'HEAD' requests are actually 'GET' requests; Node will
      // take care of stripping the response body for us.
      r.method = "GET";
    }
  }
  return request as NormalizedRequestDigest;
}

export function httpError(statusCode: number, message: string): SafeError {
  return new SafeError(message, { statusCode });
}

export function makeGraphQLWSConfig(instance: GrafservBase): ServerOptions {
  const {
    resolvedPreset,
    dynamicOptions: { maskExecutionResult },
  } = instance;

  const hooks = getGrafservHooks(resolvedPreset);

  let latestSchema: GraphQLSchema;
  let latestSchemaOrPromise: PromiseOrDirect<GraphQLSchema>;
  let latestParseAndValidate: ReturnType<typeof makeParseAndValidateFunction>;
  let schemaPrepare: Promise<boolean> | null = null;

  return {
    async onSubscribe(ctx, message) {
      // Get up to date schema, in case we're in watch mode
      const schemaOrPromise = instance.getSchema();
      if (schemaOrPromise !== latestSchemaOrPromise) {
        if ("then" in schemaOrPromise) {
          latestSchemaOrPromise = schemaOrPromise;
          schemaPrepare = (async () => {
            latestSchema = await schemaOrPromise;
            latestSchemaOrPromise = schemaOrPromise;
            latestParseAndValidate = makeParseAndValidateFunction(latestSchema);
            schemaPrepare = null;
            return true;
          })();
        } else {
          latestSchemaOrPromise = schemaOrPromise;
          if (latestSchema === schemaOrPromise) {
            // No action necessary
          } else {
            latestSchema = schemaOrPromise;
            latestParseAndValidate = makeParseAndValidateFunction(latestSchema);
          }
        }
      }
      if (schemaPrepare !== null) {
        const schemaReady = await Promise.race([
          schemaPrepare,
          sleep(instance.dynamicOptions.schemaWaitTime),
        ]);
        if (schemaReady !== true) {
          // Handle missing schema
          throw new Error(`Schema isn't ready`);
        }
      }
      const schema = latestSchema;
      const parseAndValidate = latestParseAndValidate;

      const parsedBody = parseGraphQLJSONBody(message.payload);
      try {
        await hooks.process("processGraphQLRequestBody", {
          body: parsedBody,
          graphqlWsContext: ctx,
        });
      } catch (e) {
        if (e instanceof SafeError) {
          return  [
              new GraphQLError(
                e.message,
                null,
                undefined,
                undefined,
                undefined,
                e,
                undefined,
              ),
            ]
        } else {
          throw e;
        }
      }

      const { query, operationName, variableValues } =
        validateGraphQLBody(parsedBody);
      const { errors, document } = parseAndValidate(query);
      if (errors !== undefined) {
        return errors;
      }
      const args: ExecutionArgs = {
        schema,
        document,
        rootValue: null,
        contextValue: Object.create(null),
        variableValues,
        operationName,
      };

      await hookArgs(args, resolvedPreset, {
        ws: {
          request: (ctx.extra as Extra).request,
          socket: (ctx.extra as Extra).socket,
          connectionParams: ctx.connectionParams,
        },
      });

      return args;
    },
    async execute(args: ExecutionArgs) {
      return maskExecutionResult(await execute(args, resolvedPreset));
    },
    async subscribe(args: ExecutionArgs) {
      return maskExecutionResult(await subscribe(args, resolvedPreset));
    },
  };
}

export function parseGraphQLJSONBody(
  params: JSONValue | (SubscribePayload & { id?: string; documentId?: string }),
): ParsedGraphQLBody {
  if (!params) {
    throw httpError(400, "No body");
  }
  if (typeof params !== "object" || Array.isArray(params)) {
    throw httpError(400, "Invalid body; expected object");
  }
  const id = params.id;
  const documentId = params.documentId;
  const query = params.query;
  const operationName = params.operationName ?? undefined;
  const variableValues = params.variables ?? undefined;
  const extensions = params.extensions ?? undefined;
  return {
    id,
    documentId,
    query,
    operationName,
    variableValues,
    extensions,
  };
}
