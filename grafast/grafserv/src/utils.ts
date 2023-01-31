import { stripAnsi } from "grafast";
import type { AsyncExecutionResult, ExecutionResult } from "graphql";
import { GraphQLError } from "graphql";
import type { Readable } from "node:stream";

import type {
  GrafservBody,
  JSONValue,
  NormalizedRequestDigest,
  RequestDigest,
} from "./interfaces.js";
import { $$normalizedHeaders } from "./interfaces.js";

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
        extensions: { stack: stripAnsi(e.stack ?? "").split("\n") },
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
        // FIXME: validate this approach
        reject(new Error("Too much data"));
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
      `Grafserv Express adaptor doesn't know how to interpret this request body`,
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
  }
  return request as NormalizedRequestDigest;
}

export function httpError(
  statusCode: number,
  message: string,
): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}
