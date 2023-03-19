import "graphile-config";

import type { PgSmartTagsDict } from "graphile-build-pg";
import { addBehaviorToTags } from "graphile-build-pg";
import { inspect } from "util";

declare global {
  namespace GraphileConfig {
    interface GatherHelpers {
      pgV4SmartTags: Record<string, never>;
    }
  }
}

export const PgV4SmartTagsPlugin: GraphileConfig.Plugin = {
  name: "PgV4SmartTagsPlugin",
  description:
    "For compatibility with PostGraphile v4 schemas, this plugin attempts to convert various V4 smart tags (`@omit`, etc) and convert them to V5 behaviors",
  version: "0.0.0",
  before: ["PgFakeConstraintsPlugin", "PgEnumTablesPlugin"],
  provides: ["smart-tags"],

  gather: {
    namespace: "pgV4SmartTags",
    helpers: {},
    hooks: {
      // Run in the 'introspection' phase before anything uses the tags
      pgIntrospection_introspection(info, event) {
        const { introspection } = event;
        // Note the code here relies on the fact that `getTagsAndDescription`
        // memoizes because it mutates the return result; if this changes then
        // the code will no longer achieve its goal.
        for (const pgClass of introspection.classes) {
          processTags(pgClass.getTags());
        }
        for (const pgAttr of introspection.attributes) {
          processTags(pgAttr.getTags());
        }
        for (const pgConstraint of introspection.constraints) {
          processTags(pgConstraint.getTags());
        }
        for (const pgProc of introspection.procs) {
          processTags(pgProc.getTags());
        }
        for (const pgType of introspection.types) {
          processTags(pgType.getTags());
        }
      },
      pgFakeConstraints_constraint(info, event) {
        const { entity } = event;
        processTags(entity.getTags());
      },
    },
  },
};

export default PgV4SmartTagsPlugin;

function processTags(tags: Partial<PgSmartTagsDict> | undefined): void {
  processUniqueKey(tags);
  processOmit(tags);
  convertBoolean(tags, "sortable", "orderBy order");
  convertBoolean(tags, "filterable", "filter filterBy");
  convertBoolean(tags, "enum", "enum");
  processSimpleCollections(tags);
}

function processSimpleCollections(tags: Partial<PgSmartTagsDict> | undefined) {
  if (tags?.simpleCollections) {
    switch (tags.simpleCollections) {
      case "omit": {
        addBehaviorToTags(tags, "-list +connection", true);
        break;
      }
      case "both": {
        addBehaviorToTags(tags, "+list +connection", true);
        break;
      }
      case "only": {
        addBehaviorToTags(tags, "+list -connection", true);
        break;
      }
      default: {
        console.warn(
          `Did not understand @simpleCollections argument '${tags.simpleCollections}'`,
        );
      }
    }
  }
}

function convertBoolean(
  tags: Partial<PgSmartTagsDict> | undefined,
  key: string,
  behavior: string,
): void {
  if (tags && tags[key]) {
    addBehaviorToTags(tags, behavior, true);
  }
}

function processUniqueKey(tags: Partial<PgSmartTagsDict> | undefined) {
  if (tags && typeof tags.uniqueKey === "string") {
    const newUnique = `${tags.uniqueKey}|@behavior -single -update -delete`;
    if (Array.isArray(tags.unique)) {
      tags.unique.push(newUnique);
    } else if (typeof tags.unique === "string") {
      tags.unique = [tags.unique, newUnique];
    } else {
      tags.unique = newUnique;
    }
  }
}

function processOmit(tags: Partial<PgSmartTagsDict> | undefined): void {
  const omit = tags?.omit;
  if (!omit) {
    return;
  }
  const behavior: string[] = [];
  const processOmit = (omit: true | string): void => {
    if (omit === true || omit === "*") {
      behavior.push("-*");
      return;
    }
    if (typeof omit !== "string") {
      throw new Error(
        `Issue in smart tags; expected omit to be true/string/string[], but found something unexpected: ${inspect(
          tags.omit,
        )}`,
      );
    }
    if (omit[0] === ":") {
      // Convert ':' string into longhand
      const letters = omit.slice(1).split("");
      const string = letters
        .map((l) => {
          switch (l) {
            case "C":
              return "create";
            case "R":
              return "read";
            case "U":
              return "update";
            case "D":
              return "delete";
            case "X":
              return "execute";
            case "F":
              return "filter";
            case "O":
              return "order";
            case "A":
              return "all";
            case "M":
              return "many";
            default:
              console.warn(
                `Abbreviation '${l}' in '@omit' string '${omit}' not recognized.`,
              );
              return l;
          }
        })
        .join(",");
      return processOmit(string);
    }
    const parts = omit.split(",");
    for (const part of parts) {
      switch (part) {
        case "create": {
          behavior.push("-insert");
          break;
        }
        case "read": {
          behavior.push("-select -node");
          break;
        }
        case "update": {
          behavior.push("-update");
          break;
        }
        case "delete": {
          behavior.push("-delete");
          break;
        }
        case "execute": {
          behavior.push("-queryField -mutationField -typeField");
          break;
        }
        case "filter": {
          // TODO: we should figure out which of these to use depending on the circumstance
          behavior.push("-filter -filterBy");
          break;
        }
        case "order": {
          // TODO: we should figure out which of these to use depending on the circumstance
          behavior.push("-order -orderBy");
          break;
        }
        case "all": {
          behavior.push("-query:source:list -query:source:connection");
          break;
        }
        case "many": {
          behavior.push(
            "-singularRelation:source:list -singularRelation:source:connection -manyRelation:source:list -manyRelation:source:connection",
          );
          break;
        }
        case "manyToMany": {
          behavior.push("-manyToMany");
          break;
        }
        case "": {
          // ignore
          break;
        }
        default: {
          // TODO: we should give plugin authors the option of adding other
          // omits here, e.g. `@omit manyToMany`
          console.warn(
            `Option '${part}' in '@omit' string '${omit}' not recognized; assuming -${part} behavior`,
          );
          behavior.push(`-${part}`);
          break;
        }
      }
    }
  };
  if (Array.isArray(omit)) {
    omit.forEach(processOmit);
  } else {
    processOmit(omit);
  }

  addBehaviorToTags(tags, behavior.join(" "), true);
}
