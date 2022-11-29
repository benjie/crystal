import "graphile-config";
import "graphile-build-pg";

declare global {
  namespace GraphileConfig {
    interface GatherHelpers {
      pgV4SmartTags: Record<string, never>;
    }
  }
}

export const PgV4InflectionPlugin: GraphileConfig.Plugin = {
  name: "PgV4InflectionPlugin",
  description:
    "For compatibility with PostGraphile v4 schemas, this plugin emulates the default version 4 inflectors",
  version: "0.0.0",

  inflection: {
    ignoreReplaceIfNotExists: ["deletedNodeId"],
    replace: {
      _schemaPrefix() {
        return ``;
      },
      enumValue(previous, options, value, codec) {
        const oldValue = previous!.call(this, value, codec);
        return this.coerceToGraphQLName(this.constantCase(oldValue));
      },
      _columnName(previous, options, details) {
        const { codec, columnName } = details;
        const column = codec.columns[columnName];
        if (!column) {
          throw new Error(
            `Attempted to access column '${columnName}' of codec '${
              codec.name
            }', but it doesn't have that column (known columns: ${Object.keys(
              codec.columns,
            ).join(", ")})`,
          );
        }
        if (column.extensions?.argIndex != null && !column.extensions.argName) {
          return `arg${column.extensions.argIndex + 1}`;
        }
        return previous!.call(this, details);
      },
      functionMutationResultFieldName(previous, options, details) {
        const { source, returnGraphQLTypeName } = details;
        if (source.extensions?.tags?.resultFieldName) {
          return source.extensions.tags.resultFieldName;
        }
        let name;
        if (source.extensions?.singleOutputParameterName) {
          name = this.camelCase(source.extensions.singleOutputParameterName);
        } else if (returnGraphQLTypeName === "Int") {
          name = "integer";
        } else if (returnGraphQLTypeName === "Float") {
          name = "float";
        } else if (returnGraphQLTypeName === "Boolean") {
          name = "boolean";
        } else if (returnGraphQLTypeName === "String") {
          name = "string";
        } else if (source.codec.isAnonymous) {
          // returns a record type
          name = "result";
        } else {
          name = this.camelCase(returnGraphQLTypeName);
        }
        const plural = !source.isUnique || !!source.codec.arrayOfCodec;
        return plural ? this.pluralize(name) : name;
      },
      deletedNodeId(previous, options, { source }) {
        // Silly V4 behavior
        return this.camelCase(
          `deleted-${this.singularize(
            source.extensions?.tags?.originalName ?? this._sourceName(source),
          )}-id`,
        );
      },
      orderByType(previous, options, typeName) {
        return this.upperCamelCase(`${this.pluralize(typeName)}-order-by`);
      },
      tableConnectionType(previous, options, codec) {
        if (codec.isAnonymous) {
          return this.connectionType(this.tableType(codec));
        } else {
          return this.connectionType(this.pluralize(this.tableType(codec)));
        }
      },
      tableEdgeField(previous, options, codec) {
        return this.camelCase(`${this.tableType(codec)}-edge`);
      },
      tableEdgeType(previous, options, codec) {
        if (codec.isAnonymous) {
          return this.edgeType(this.tableType(codec));
        } else {
          return this.edgeType(this.pluralize(this.tableType(codec)));
        }
      },
    },
  },
};
