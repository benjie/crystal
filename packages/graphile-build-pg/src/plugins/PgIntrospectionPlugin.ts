import "graphile-build";

import type { WithPgClient } from "@dataplan/pg";
import { PgExecutor } from "@dataplan/pg";
import type { GatherPluginContext } from "graphile-build";
import type { ExecutablePlan, PromiseOrDirect } from "graphile-crystal";
import { context, object } from "graphile-crystal";
import { EXPORTABLE } from "graphile-exporter";
import type {
  GatherHelpers,
  GatherHooks,
  Plugin,
  PluginGatherConfig,
  PluginHook,
} from "graphile-plugin";

import { version } from "../index";
import type {
  Introspection,
  PgAttribute,
  PgAuthMembers,
  PgClass,
  PgConstraint,
  PgDepend,
  PgDescription,
  PgEnum,
  PgExtension,
  PgIndex,
  PgLanguage,
  PgNamespace,
  PgProc,
  PgRange,
  PgRoles,
  PgType,
} from "../introspection";
import { makeIntrospectionQuery } from "../introspection";

type KeysOfType<TObject, TValueType> = {
  [key in keyof TObject]: TObject[key] extends TValueType ? key : never;
}[keyof TObject];

// TODO: rename
interface Database {
  name: string;
  schemas: string[];
  /** The key on 'context' where the pgSettings for this DB will be sourced */
  pgSettingsKey: KeysOfType<
    GraphileEngine.GraphileResolverContext,
    { [key: string]: string } | null
  >;
  /** The key on 'context' where the withPgClient function will be sourced */
  withPgClientKey: KeysOfType<
    GraphileEngine.GraphileResolverContext,
    WithPgClient
  >;
  /** A function to allow us to run queries during the data gathering phase */
  withPgClient: WithPgClient;
  listen?(topic: string): AsyncIterable<string>;
}

declare global {
  namespace GraphileEngine {
    interface GraphileBuildGatherOptions {
      pgDatabases: ReadonlyArray<Database>;
    }
  }
}

export type PgEntityWithId =
  | PgNamespace
  | PgClass
  | PgConstraint
  | PgProc
  | PgRoles
  | PgType
  | PgEnum
  | PgExtension
  | PgExtension
  | PgIndex
  | PgLanguage;

declare module "graphile-plugin" {
  interface GatherHelpers {
    pgIntrospection: {
      getIntrospection(): Promise<
        Array<{ introspection: Introspection; database: Database }>
      >;
      getExecutorForDatabase(databaseName: string): PgExecutor;

      getNamespace(
        databaseName: string,
        id: string,
      ): Promise<PgNamespace | undefined>;
      getClass(databaseName: string, id: string): Promise<PgClass | undefined>;
      getConstraint(
        databaseName: string,
        id: string,
      ): Promise<PgConstraint | undefined>;
      getProc(databaseName: string, id: string): Promise<PgProc | undefined>;
      getRoles(databaseName: string, id: string): Promise<PgRoles | undefined>;
      getType(databaseName: string, id: string): Promise<PgType | undefined>;
      getEnum(databaseName: string, id: string): Promise<PgEnum | undefined>;
      getExtension(
        databaseName: string,
        id: string,
      ): Promise<PgExtension | undefined>;
      getIndex(databaseName: string, id: string): Promise<PgIndex | undefined>;
      getLanguage(
        databaseName: string,
        id: string,
      ): Promise<PgLanguage | undefined>;

      // getAttribute(
      //   databaseName: string,
      //   id: string,
      // ): Promise<PgAttribute | undefined>;
      // getAuthMembers(
      //   databaseName: string,
      //   id: string,
      // ): Promise<PgAuthMembers | undefined>;
      // getRange(databaseName: string, id: string): Promise<PgRange | undefined>;
      // getDepend(
      //   databaseName: string,
      //   id: string,
      // ): Promise<PgDepend | undefined>;
      // getDescription(
      //   databaseName: string,
      //   id: string,
      // ): Promise<PgDescription | undefined>;

      getAttributesForClass(
        databaseName: string,
        classId: string,
      ): Promise<PgAttribute[]>;
      getNamespaceByName(
        databaseName: string,
        namespaceName: string,
      ): Promise<PgNamespace | undefined>;
      getTypeByArray(
        databaseName: string,
        arrayId: string,
      ): Promise<PgType | undefined>;
      getEnumsForType(databaseName: string, typeId: string): Promise<PgEnum[]>;
      getRangeByType(
        databaseName: string,
        typeId: string,
      ): Promise<PgRange | null>;
    };
  }

  interface GatherHooks {
    "pgIntrospection:namespace": PluginHook<
      (event: {
        entity: PgNamespace;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:class": PluginHook<
      (event: {
        entity: PgClass;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:attribute": PluginHook<
      (event: {
        entity: PgAttribute;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:constraint": PluginHook<
      (event: {
        entity: PgConstraint;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:proc": PluginHook<
      (event: { entity: PgProc; databaseName: string }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:role": PluginHook<
      (event: {
        entity: PgRoles;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:auth_member": PluginHook<
      (event: {
        entity: PgAuthMembers;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:type": PluginHook<
      (event: { entity: PgType; databaseName: string }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:enum": PluginHook<
      (event: { entity: PgEnum; databaseName: string }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:extension": PluginHook<
      (event: {
        entity: PgExtension;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:index": PluginHook<
      (event: {
        entity: PgIndex;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:language": PluginHook<
      (event: {
        entity: PgLanguage;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:range": PluginHook<
      (event: {
        entity: PgRange;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:depend": PluginHook<
      (event: {
        entity: PgDepend;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
    "pgIntrospection:description": PluginHook<
      (event: {
        entity: PgDescription;
        databaseName: string;
      }) => PromiseOrDirect<void>
    >;
  }
}

interface Cache {
  introspectionResultsPromise: null | Promise<
    {
      database: Database;
      introspection: Introspection;
    }[]
  >;
}

interface State {
  executors: {
    [key: string]: PgExecutor;
  };
}

type PgExecutorContextPlans<TSettings = any> = {
  pgSettings: ExecutablePlan<TSettings>;
  withPgClient: ExecutablePlan<WithPgClient>;
};

async function getDb(
  info: GatherPluginContext<State, Cache>,
  databaseName: string,
) {
  const introspections = await info.helpers.pgIntrospection.getIntrospection();
  const relevant = introspections.find(
    (intro) => intro.database.name === databaseName,
  );
  if (!relevant) {
    throw new Error(`Could not find database '${databaseName}'`);
  }
  return relevant;
}

function makeGetEntity<
  TKey extends KeysOfType<Introspection, Array<PgEntityWithId>>,
>(loc: TKey) {
  return async (
    info: GatherPluginContext<State, Cache>,
    databaseName: string,
    id: string,
  ): Promise<Introspection[TKey][number] | undefined> => {
    const relevant = await getDb(info, databaseName);
    const list = relevant.introspection[loc];
    if (!list) {
      throw new Error(
        `Could not find database '${databaseName}''s introspection results for '${loc}'`,
      );
    }
    return (list as PgEntityWithId[]).find((entity: PgEntityWithId) =>
      "_id" in entity
        ? entity._id === id
        : "indexrelid" in entity
        ? entity.indexrelid
        : false,
    );
  };
}

export const PgIntrospectionPlugin: Plugin = {
  name: "PgIntrospectionPlugin",
  description:
    "Introspects PostgreSQL databases and makes the results available to other plugins",
  version: version,
  // TODO: refactor TypeScript so this isn't necessary; maybe via `makePluginGatherConfig`?
  gather: <PluginGatherConfig<"pgIntrospection", State, Cache>>{
    namespace: "pgIntrospection",
    initialCache: (): Cache => ({
      introspectionResultsPromise: null,
    }),
    initialState: (): State => ({
      executors: {},
    }),
    helpers: {
      getExecutorForDatabase(info, databaseName) {
        if (info.state.executors[databaseName]) {
          return info.state.executors[databaseName];
        }
        const database = info.options.pgDatabases.find(
          (db) => db.name === databaseName,
        );
        if (!database) {
          throw new Error(`Database '${databaseName}' not found`);
        }
        const { pgSettingsKey, withPgClientKey } = database;
        const executor = EXPORTABLE(
          (
            PgExecutor,
            context,
            databaseName,
            object,
            pgSettingsKey,
            withPgClientKey,
          ) =>
            new PgExecutor({
              name: databaseName,
              context: () => {
                const ctx = context<GraphileEngine.GraphileResolverContext>();
                return object({
                  pgSettings: ctx.get(pgSettingsKey),
                  withPgClient: ctx.get(withPgClientKey),
                } as PgExecutorContextPlans<any>);
              },
            }),
          [
            PgExecutor,
            context,
            databaseName,
            object,
            pgSettingsKey,
            withPgClientKey,
          ],
        );
        info.state.executors[databaseName] = executor;
        return executor;
      },

      getNamespace: makeGetEntity("namespaces"),
      getClass: makeGetEntity("classes"),
      getConstraint: makeGetEntity("constraints"),
      getProc: makeGetEntity("procs"),
      getRoles: makeGetEntity("roles"),
      getType: makeGetEntity("types"),
      getEnum: makeGetEntity("enums"),
      getExtension: makeGetEntity("extensions"),
      getIndex: makeGetEntity("indexes"),
      getLanguage: makeGetEntity("languages"),

      // TODO: we need getters for these
      // getAttribute: makeGetEntity("attributes"),
      // getAuthMembers: makeGetEntity("authMembers"),
      // getRange: makeGetEntity("ranges"),
      // getDepend: makeGetEntity("depends"),
      // getDescription: makeGetEntity("descriptions"),
      //
      async getAttributesForClass(info, databaseName, classId) {
        // const pgClass = this.getClass(info, databaseName, classId);
        const relevant = await getDb(info, databaseName);
        const list = relevant.introspection.attributes;
        // TODO: cache
        return list.filter((entity) => entity.attrelid === classId);
      },

      async getNamespaceByName(info, databaseName, name) {
        const relevant = await getDb(info, databaseName);
        const list = relevant.introspection.namespaces;
        return list.find((nsp) => nsp.nspname === name);
      },

      // TODO: we should maybe use pg_type.typelem and look up by ID directy
      // instead of having this function
      async getTypeByArray(info, databaseName, arrayId) {
        const relevant = await getDb(info, databaseName);
        const list = relevant.introspection.types;
        return list.find((type) => type.typarray === arrayId);
      },

      async getEnumsForType(info, databaseName, typeId) {
        const relevant = await getDb(info, databaseName);
        const list = relevant.introspection.enums;
        // TODO: cache
        return list
          .filter((entity) => entity.enumtypid === typeId)
          .sort((a, z) => a.enumsortorder - z.enumsortorder);
      },

      async getRangeByType(info, databaseName, typeId) {
        const relevant = await getDb(info, databaseName);
        const list = relevant.introspection.ranges;
        // TODO: cache
        return list.find((entity) => entity.rngtypid === typeId);
      },

      getIntrospection(info) {
        if (info.cache.introspectionResultsPromise) {
          return info.cache.introspectionResultsPromise;
        }
        // Resolve the promise ASAP so dependents can `getIntrospection()` and then `getClass` or whatever from the result.
        const introspectionPromise = Promise.all(
          info.options.pgDatabases.map(async (database) => {
            const introspectionQuery = makeIntrospectionQuery();
            const {
              rows: [row],
            } = await database.withPgClient(null, (client) =>
              client.query<{ introspection: string }>({
                text: introspectionQuery,
              }),
            );
            if (!row) {
              throw new Error("Introspection failed");
            }
            const introspection = JSON.parse(
              row.introspection,
            ) as Introspection;
            return { database, introspection };
          }),
        );
        info.cache.introspectionResultsPromise = introspectionPromise;

        return introspectionPromise;
      },
    },
    async main(_output, info) {
      const introspections =
        await info.helpers.pgIntrospection.getIntrospection();
      await Promise.all(
        introspections.map(async (result) => {
          const { introspection, database } = result;

          const {
            namespaces,
            classes,
            attributes,
            constraints,
            procs,
            roles,
            auth_members,
            types,
            enums,
            extensions,
            indexes,
            languages,
            ranges,
            depends,
            descriptions,
          } = introspection;

          function announce<TEvent extends keyof GatherHooks>(
            eventName: TEvent,
            entities: GatherHooks[TEvent] extends PluginHook<infer U>
              ? Parameters<U>[0] extends {
                  entity: infer V;
                  databaseName: string;
                }
                ? V[]
                : never
              : never,
          ) {
            const promises: Promise<any>[] = [];
            for (const entity of entities) {
              promises.push(
                (info.process as any)(eventName, {
                  entity: entity,
                  databaseName: database.name,
                }),
              );
            }
            return Promise.all(promises);
          }

          await announce("pgIntrospection:namespace", namespaces);
          await announce("pgIntrospection:class", classes);
          await announce("pgIntrospection:attribute", attributes);
          await announce("pgIntrospection:constraint", constraints);
          await announce("pgIntrospection:proc", procs);
          await announce("pgIntrospection:role", roles);
          await announce("pgIntrospection:auth_member", auth_members);
          await announce("pgIntrospection:type", types);
          await announce("pgIntrospection:enum", enums);
          await announce("pgIntrospection:extension", extensions);
          await announce("pgIntrospection:index", indexes);
          await announce("pgIntrospection:language", languages);
          await announce("pgIntrospection:range", ranges);
          await announce("pgIntrospection:depend", depends);
          await announce("pgIntrospection:description", descriptions);
        }),
      );
    },
  },
};
