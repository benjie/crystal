import "graphile-build";
import "./PgTablesPlugin.js";
import "../interfaces.js";
import "graphile-config";

import type { PgTypeCodec } from "@dataplan/pg";
import type { GraphQLType } from "graphql";
import sql from "pg-sql2";

import { version } from "../index.js";
import type { PgTypeCodecMetaLookup } from "../inputUtils.js";
import {
  getCodecMetaLookupFromInput,
  makePgTypeCodecMeta,
} from "../inputUtils.js";

declare global {
  namespace GraphileBuild {
    type HasGraphQLTypeForPgCodec = (
      codec: PgTypeCodec<any, any, any>,
      situation?: string,
    ) => boolean;
    type GetGraphQLTypeByPgCodec = (
      codec: PgTypeCodec<any, any, any>,
      situation: string,
    ) => GraphQLType | null;
    type GetGraphQLTypeNameByPgCodec = (
      codec: PgTypeCodec<any, any, any>,
      situation: string,
    ) => string | null;
    type SetGraphQLTypeForPgCodec = (
      codec: PgTypeCodec<any, any, any>,
      situations: string | string[],
      typeName: string,
    ) => void;

    interface Build {
      /**
       * A store of metadata for given codecs. Currently internal as this API
       * may change.
       *
       * @internal
       */
      pgCodecMetaLookup: PgTypeCodecMetaLookup;

      /**
       * Do we already have a GraphQL type to use for the given codec in the
       * given situation?
       */
      hasGraphQLTypeForPgCodec: HasGraphQLTypeForPgCodec;
      /**
       * Get the GraphQL type for the given codec in the given situation.
       */
      getGraphQLTypeByPgCodec: GetGraphQLTypeByPgCodec;
      /**
       * Get the GraphQL type name (string) for the given codec in the given
       * situation.
       */
      getGraphQLTypeNameByPgCodec: GetGraphQLTypeNameByPgCodec;
      /**
       * Set the GraphQL type to use for the given codec in the given
       * situation. If this has already been set, will throw an error.
       */
      setGraphQLTypeForPgCodec: SetGraphQLTypeForPgCodec;

      /**
       * pg-sql2 access on Build to avoid duplicate module issues.
       */
      sql: typeof sql;
    }
  }
}

export const PgBasicsPlugin: GraphileConfig.Plugin = {
  name: "PgBasicsPlugin",
  description:
    "Basic utilities required by many other graphile-build-pg plugins.",
  version: version,

  schema: {
    hooks: {
      build(build) {
        const pgCodecMetaLookup = getCodecMetaLookupFromInput(build.input);

        const getGraphQLTypeNameByPgCodec: GraphileBuild.GetGraphQLTypeNameByPgCodec =
          (codec, situation) => {
            if (codec.arrayOfCodec) {
              throw new Error(
                "Do not use getGraphQLTypeNameByPgCodec with an array type, find the underlying type instead",
              );
            }
            const meta = pgCodecMetaLookup.get(codec);
            if (!meta) {
              throw new Error(
                `Codec '${codec.name}' does not have an entry in pgCodecMetaLookup, someone needs to call setGraphQLTypeForPgCodec passing this codec.`,
              );
            }
            const typeName = meta.typeNameBySituation[situation] ?? null;
            return typeName ?? null;
          };

        const getGraphQLTypeByPgCodec: GraphileBuild.GetGraphQLTypeByPgCodec = (
          codec,
          situation,
        ) => {
          if (codec.arrayOfCodec) {
            const type = getGraphQLTypeByPgCodec(codec.arrayOfCodec, situation);
            return type ? new build.graphql.GraphQLList(type) : null;
          }
          const typeName = getGraphQLTypeNameByPgCodec(codec, situation);
          return typeName ? build.getTypeByName(typeName) ?? null : null;
        };

        const hasGraphQLTypeForPgCodec: GraphileBuild.HasGraphQLTypeForPgCodec =
          (codec, situation) => {
            const meta = pgCodecMetaLookup.get(codec);
            if (!meta) {
              return false;
            }
            if (situation != null) {
              const typeName = meta.typeNameBySituation[situation] ?? null;
              return typeName != null;
            } else {
              return Object.keys(meta.typeNameBySituation).length > 0;
            }
          };

        const setGraphQLTypeForPgCodec: GraphileBuild.SetGraphQLTypeForPgCodec =
          (codec, variants, typeName) => {
            build.assertTypeName(typeName);

            let meta = pgCodecMetaLookup.get(codec);
            if (!meta) {
              meta = makePgTypeCodecMeta(codec);
              pgCodecMetaLookup.set(codec, meta);
            }

            const situations_ = Array.isArray(variants) ? variants : [variants];
            for (const situation of situations_) {
              if (meta.typeNameBySituation[situation] != null) {
                // TODO: allow this?
                throw new Error("Type already set");
              }
              meta.typeNameBySituation[situation] = typeName;
            }
          };

        return build.extend(
          build,
          {
            pgCodecMetaLookup,
            getGraphQLTypeNameByPgCodec,
            getGraphQLTypeByPgCodec,
            hasGraphQLTypeForPgCodec,
            setGraphQLTypeForPgCodec,
            sql,
            // For slightly better backwards compatibility with v4.
            pgSql: sql,
          },
          "Adding helpers from PgBasicsPlugin",
        );
      },
    },
  },
};
