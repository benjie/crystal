import {
  Server,
  IncomingMessage,
  ServerResponse,
  OutgoingHttpHeaders,
} from "http";
import { HttpRequestHandler, Middleware } from "../../interfaces";
import {
  subscribe as graphqlSubscribe,
  ExecutionResult,
  specifiedRules,
  validate,
  GraphQLError,
  parse,
  DocumentNode,
} from "graphql";
import * as WebSocket from "ws";
import {
  SubscriptionServer,
  ConnectionContext,
  ExecutionParams,
} from "subscriptions-transport-ws";
import parseUrl from "parseurl";
import { pluginHookFromOptions } from "../pluginHook";
import { isEmpty } from "./createPostGraphileHttpRequestHandler";
import liveSubscribe from "./liveSubscribe";

interface Deferred<T> extends Promise<T> {
  resolve: (input: T | PromiseLike<T>) => void;
  reject: (error: Error) => void;
}

function lowerCaseKeys(obj: object): object {
  return Object.keys(obj).reduce((memo, key) => {
    memo[key.toLowerCase()] = obj[key];
    return memo;
  }, {});
}

function deferred<T = void>(): Deferred<T> {
  let resolve: (input: T | PromiseLike<T>) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<T>((_resolve, _reject): void => {
    resolve = _resolve;
    reject = _reject;
  });
  // tslint:disable-next-line prefer-object-spread
  return Object.assign(promise, {
    // @ts-ignore This isn't used before being defined.
    resolve,
    // @ts-ignore This isn't used before being defined.
    reject,
  });
}

export async function enhanceHttpServerWithSubscriptions<
  Request extends IncomingMessage = IncomingMessage,
  Response extends ServerResponse = ServerResponse
>(
  websocketServer: Server,
  postgraphileMiddleware: HttpRequestHandler,
  subscriptionServerOptions?: {
    keepAlive?: number;
  },
): Promise<void> {
  if (websocketServer["__postgraphileSubscriptionsEnabled"]) {
    return;
  }
  websocketServer["__postgraphileSubscriptionsEnabled"] = true;
  const {
    options,
    getGraphQLSchema,
    withPostGraphileContextFromReqRes,
    handleErrors,
  } = postgraphileMiddleware;
  const pluginHook = pluginHookFromOptions(options);
  const externalUrlBase = options.externalUrlBase || "";
  const graphqlRoute = options.graphqlRoute || "/graphql";

  const schema = await getGraphQLSchema();

  const keepalivePromisesByContextKey: {
    [contextKey: string]: Deferred<void> | null;
  } = {};

  const contextKey = (ws: WebSocket, opId: string): string =>
    ws["postgraphileId"] + "|" + opId;

  const releaseContextForSocketAndOpId = (
    ws: WebSocket,
    opId: string,
  ): void => {
    const promise = keepalivePromisesByContextKey[contextKey(ws, opId)];
    if (promise) {
      promise.resolve();
      keepalivePromisesByContextKey[contextKey(ws, opId)] = null;
    }
  };

  const addContextForSocketAndOpId = (
    context: GraphileEngine.GraphileResolverContext,
    ws: WebSocket,
    opId: string,
  ): Deferred<void> => {
    releaseContextForSocketAndOpId(ws, opId);
    const promise = deferred();
    promise["context"] = context;
    keepalivePromisesByContextKey[contextKey(ws, opId)] = promise;
    return promise;
  };

  const applyMiddleware = async (
    middlewares: Array<Middleware<Request, Response>> = [],
    req: Request,
    res: Response,
  ): Promise<void> => {
    for (const middleware of middlewares) {
      // TODO: add Koa support
      await new Promise<void>((resolve, reject): void => {
        middleware(req, res, (err) => (err ? reject(err) : resolve()));
      });
    }
  };

  const reqResFromSocket = async (
    socket: WebSocket,
  ): Promise<{
    req: Request;
    res: Response;
  }> => {
    const req = socket["__postgraphileReq"];
    if (!req) {
      throw new Error("req could not be extracted");
    }
    let dummyRes: Response | undefined = socket["__postgraphileRes"];
    if (req.res) {
      throw new Error(
        "Please get in touch with Benjie; we weren't expecting req.res to be present but we want to reserve it for future usage.",
      );
    }
    if (!dummyRes) {
      dummyRes = new ServerResponse(req) as Response;
      dummyRes.writeHead = function (
        this: Response,
        statusCode: number,
        _reasonPhrase?: OutgoingHttpHeaders | string | undefined,
        headers?: OutgoingHttpHeaders | undefined,
      ): Response {
        if (statusCode && statusCode > 200) {
          // tslint:disable-next-line no-console
          console.error(
            `Something used 'writeHead' to write a '${statusCode}' error for websockets - check the middleware you're passing!`,
          );
          socket.close();
        } else if (headers) {
          // tslint:disable-next-line no-console
          console.error(
            "Passing headers to 'writeHead' is not supported with websockets currently - check the middleware you're passing",
          );
          socket.close();
        }
        return this;
      } as any;
      await applyMiddleware(options.websocketMiddlewares, req, dummyRes);

      // reqResFromSocket is only called once per socket, so there's no race condition here
      // eslint-disable-next-line require-atomic-updates
      socket["__postgraphileRes"] = dummyRes;
    }
    return { req, res: dummyRes };
  };

  const getContext = (
    socket: WebSocket,
    opId: string,
  ): Promise<GraphileEngine.GraphileResolverContext> => {
    return new Promise((resolve, reject): void => {
      reqResFromSocket(socket)
        .then(({ req, res }) =>
          withPostGraphileContextFromReqRes(
            req,
            res,
            { singleStatement: true },
            (context) => {
              const promise = addContextForSocketAndOpId(context, socket, opId);
              resolve(promise["context"]);
              return promise;
            },
          ),
        )
        .then(null, reject);
    });
  };

  const wss = new WebSocket.Server({ noServer: true });

  let socketId = 0;

  websocketServer.on("upgrade", (req, socket, head) => {
    const { pathname = "" } = parseUrl(req) || {};
    const isGraphqlRoute = pathname === externalUrlBase + graphqlRoute;
    if (isGraphqlRoute) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });
  const staticValidationRules = pluginHook(
    "postgraphile:validationRules:static",
    specifiedRules,
    {
      options,
    },
  );

  SubscriptionServer.create(
    {
      schema,
      validationRules: staticValidationRules,
      execute: () => {
        throw new Error(
          "Only subscriptions are allowed over websocket transport",
        );
      },
      subscribe: options.live ? liveSubscribe : graphqlSubscribe,
      onConnect(
        connectionParams: object,
        _socket: WebSocket,
        connectionContext: ConnectionContext,
      ) {
        const { socket, request } = connectionContext;
        socket["postgraphileId"] = ++socketId;
        if (!request) {
          throw new Error("No request!");
        }
        const normalizedConnectionParams = lowerCaseKeys(connectionParams);
        request["connectionParams"] = connectionParams;
        request["normalizedConnectionParams"] = normalizedConnectionParams;
        socket["__postgraphileReq"] = request;
        if (
          !request.headers.authorization &&
          normalizedConnectionParams["authorization"]
        ) {
          /*
           * Enable JWT support through connectionParams.
           *
           * For other headers you'll need to do this yourself for security
           * reasons (e.g. we don't want to allow overriding of Origin /
           * Referer / etc)
           */
          request.headers.authorization = String(
            normalizedConnectionParams["authorization"],
          );
        }

        socket["postgraphileHeaders"] = {
          ...normalizedConnectionParams,
          // The original headers must win (for security)
          ...request.headers,
        };
      },
      // tslint:disable-next-line no-any
      async onOperation(
        message: any,
        params: ExecutionParams,
        socket: WebSocket,
      ) {
        const opId = message.id;
        const context = await getContext(socket, opId);

        // Override schema (for --watch)
        params.schema = await getGraphQLSchema();

        Object.assign(params.context, context);

        const { req, res } = await reqResFromSocket(socket);
        const meta = {};
        const formatResponse = <
          TExecutionResult extends ExecutionResult = ExecutionResult
        >(
          response: TExecutionResult,
        ): TExecutionResult => {
          if (response.errors) {
            response.errors = handleErrors(response.errors, req, res);
          }
          if (!isEmpty(meta)) {
            response["meta"] = meta;
          }

          return response;
        };
        // onOperation is only called once per params object, so there's no race condition here
        // eslint-disable-next-line require-atomic-updates
        params.formatResponse = formatResponse;
        const hookedParams = pluginHook
          ? pluginHook("postgraphile:ws:onOperation", params, {
              message,
              params,
              socket,
              options,
            })
          : params;
        const finalParams: typeof hookedParams & { query: DocumentNode } = {
          ...hookedParams,
          query:
            typeof hookedParams.query !== "string"
              ? hookedParams.query
              : parse(hookedParams.query),
        };

        // You are strongly encouraged to use
        // `postgraphile:validationRules:static` if possible - you should
        // only use this one if you need access to variables.
        const moreValidationRules = pluginHook(
          "postgraphile:validationRules",
          [],
          {
            options,
            req,
            res,
            variables: params.variables,
            operationName: params.operationName,
            meta,
          },
        );
        if (moreValidationRules.length) {
          const validationErrors: ReadonlyArray<GraphQLError> = validate(
            params.schema,
            finalParams.query,
            moreValidationRules,
          );
          if (validationErrors.length) {
            const error = new Error(
              "Query validation failed: \n" +
                validationErrors.map((e) => e.message).join("\n"),
            );
            error["errors"] = validationErrors;
            return Promise.reject(error);
          }
        }

        return finalParams;
      },
      onOperationComplete(socket: WebSocket, opId: string) {
        releaseContextForSocketAndOpId(socket, opId);
      },

      /*
       * Heroku times out after 55s:
       *   https://devcenter.heroku.com/articles/error-codes#h15-idle-connection
       *
       * The subscriptions-transport-ws client times out by default 30s after last keepalive:
       *   https://github.com/apollographql/subscriptions-transport-ws/blob/52758bfba6190169a28078ecbafd2e457a2ff7a8/src/defaults.ts#L1
       *
       * GraphQL Playground times out after 20s:
       *   https://github.com/prisma/graphql-playground/blob/fa91e1b6d0488e6b5563d8b472682fe728ee0431/packages/graphql-playground-react/src/state/sessions/fetchingSagas.ts#L81
       *
       * Pick a number under these ceilings.
       */
      keepAlive: 15000,

      ...subscriptionServerOptions,
    },
    wss,
  );
}
