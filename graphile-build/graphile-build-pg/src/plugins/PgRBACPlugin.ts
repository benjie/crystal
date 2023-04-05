import "graphile-config";

import { resolvePermissions } from "pg-introspection";

import { addBehaviorToTags } from "../utils.js";
import { version } from "../version.js";

declare global {
  namespace GraphileConfig {
    interface GatherHelpers {
      pgRBAC: Record<string, never>;
    }
  }
}

export const PgRBACPlugin: GraphileConfig.Plugin = {
  name: "PgRBACPlugin",
  description:
    "Converts the database GRANT/REVOKE privileges to behaviors. Experimental.",
  experimental: true,
  version,
  gather: {
    namespace: "pgRBAC",
    helpers: {},
    hooks: {
      async pgCodecs_column(info, event) {
        const { pgAttribute, databaseName, column } = event;
        const pgClass = pgAttribute.getClass();
        if (!pgClass || !["r", "v", "m", "f", "p"].includes(pgClass.relkind)) {
          return;
        }
        const db = await info.helpers.pgIntrospection.getDatabase(databaseName);
        const { introspection } = db;

        const introspectionRole = introspection.getCurrentUser();
        if (!introspectionRole) {
          // https://youtu.be/3kx7tgkJbjo?t=11
          throw new Error("WHO AM I?");
        }
        const columnPermissions = resolvePermissions(
          introspection,
          pgAttribute.getACL(),
          introspectionRole,
          true,
        );
        const tablePermissions = resolvePermissions(
          introspection,
          pgClass.getACL(),
          introspectionRole,
          true,
        );
        const canSelect = columnPermissions.select || tablePermissions.select;
        const canInsert = columnPermissions.insert || tablePermissions.insert;
        const canUpdate = columnPermissions.update || tablePermissions.update;
        const parts: string[] = [];
        if (!canSelect) {
          // Only remove `select` privileges if at least one sibling column has
          // a grant - otherwise assume that this is behind a function or
          // similar and all columns are allowed you just can't select
          // directly.
          const hasSiblingWithSelect = pgClass
            .getAttributes()
            .some(
              (att) =>
                att.attnum > 0 &&
                resolvePermissions(
                  introspection,
                  att.getACL(),
                  introspectionRole,
                  true,
                ).select,
            );
          if (hasSiblingWithSelect) {
            parts.push("-select -filterBy -orderBy");
          }
        }
        if (!canInsert) {
          parts.push("-insert");
        }
        if (!canUpdate) {
          if (pgAttribute.attname === "site") {
            console.log(`Site update not allowed`);
          }
          parts.push("-update");
        }
        if (pgAttribute.attname === "site") {
          console.log(`Site tags: ${parts}`);
        }
        if (parts.length > 0) {
          column.extensions = column.extensions || Object.create(null);
          column.extensions!.tags =
            column.extensions!.tags || Object.create(null);
          addBehaviorToTags(column.extensions!.tags!, parts.join(" "));
        }
      },
      async pgProcedures_PgResourceOptions(info, event) {
        const { pgProc, databaseName, resourceOptions } = event;
        const db = await info.helpers.pgIntrospection.getDatabase(databaseName);
        const { introspection } = db;

        const introspectionRole = introspection.getCurrentUser();
        if (!introspectionRole) {
          // https://youtu.be/3kx7tgkJbjo?t=11
          throw new Error("WHO AM I?");
        }
        const permissions = resolvePermissions(
          introspection,
          pgProc.getACL(),
          introspectionRole,
          true,
        );
        if (!permissions.execute) {
          resourceOptions.extensions =
            resourceOptions.extensions || Object.create(null);
          resourceOptions.extensions!.tags =
            resourceOptions.extensions!.tags || Object.create(null);
          addBehaviorToTags(
            resourceOptions.extensions!.tags!,
            "-queryField -mutationField -typeField -orderBy -filterBy",
          );
        }
      },
      async pgTables_PgResourceOptions(info, event) {
        const { pgClass, resourceOptions, databaseName } = event;
        if (!["r", "v", "m", "f", "p"].includes(pgClass.relkind)) {
          return;
        }
        const db = await info.helpers.pgIntrospection.getDatabase(databaseName);
        const { introspection } = db;
        resourceOptions.extensions =
          resourceOptions.extensions || Object.create(null);
        resourceOptions.extensions!.tags =
          resourceOptions.extensions!.tags || Object.create(null);

        const introspectionRole = introspection.getCurrentUser();
        if (!introspectionRole) {
          // https://youtu.be/3kx7tgkJbjo?t=11
          throw new Error("WHO AM I?");
        }
        const tablePermissions = resolvePermissions(
          introspection,
          pgClass.getACL(),
          introspectionRole,
          true,
        );

        let canSelect = tablePermissions.select;
        let canInsert = tablePermissions.insert;
        let canUpdate = tablePermissions.update;
        const canDelete = tablePermissions.delete;
        if (!canInsert || !canUpdate || !canSelect) {
          // TODO: this is computationally expensive; we should really make this more efficient.
          // Need to check the attributes
          const attributePermissions = pgClass
            .getAttributes()
            .filter((att) => att.attnum > 0)
            .map((att) =>
              resolvePermissions(
                introspection,
                att.getACL(),
                introspectionRole,
                true,
              ),
            );
          for (const attributePermission of attributePermissions) {
            canSelect = canSelect || attributePermission.select;
            canInsert = canInsert || attributePermission.insert;
            canUpdate = canUpdate || attributePermission.update;
          }
        }

        const parts: string[] = [];
        if (!canSelect) {
          // TODO: just `-select` should be sufficient, but it's not because we
          // don't check it in enough places. Maybe certain behaviors should
          // require others?
          parts.push("-select -single -list -connection");
        }
        if (!canInsert) {
          parts.push("-insert");
        }
        if (!canUpdate) {
          parts.push("-update");
        }
        if (!canDelete) {
          parts.push("-delete");
        }
        if (parts.length > 0) {
          addBehaviorToTags(resourceOptions.extensions!.tags!, parts.join(" "));
        }
      },
    },
  },
};
