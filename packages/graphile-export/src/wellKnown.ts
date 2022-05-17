import crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import * as _crypto from "crypto";
import * as crystalStar from "dataplanner";
import * as graphqlStar from "graphql";
import util, * as utilStar from "util";

import type { ExportOptions } from "./interfaces.js";

interface $$Export {
  moduleName: string;
  exportName: string | "default" | "*" | string[];
}

function makeWellKnownFromOptions(options: ExportOptions) {
  const wellKnownMap = new Map<unknown, $$Export>();

  function exportAll(
    obj: object,
    moduleName: string,
    preferViaDefault = false,
  ) {
    for (const exportName of Object.keys(obj)) {
      if (exportName !== "default" && !wellKnownMap.has(obj[exportName])) {
        /**
         * ESM is still a bit flaky, so though `import { foo } from 'bar';` may
         * work in some contexts, in raw Node it's often required to do
         * `import bar from 'bar'; const foo = bar.foo;`. This code determines
         * if this latter approach is desired.
         */
        const viaDefault =
          preferViaDefault && obj[exportName] === obj["default"]?.[exportName];
        wellKnownMap.set(obj[exportName], {
          moduleName,
          exportName: viaDefault ? ["default", exportName] : exportName,
        });
      }
    }
  }

  // TODO: fill this out a bit...
  wellKnownMap.set(crypto, { moduleName: "crypto", exportName: "default" });
  wellKnownMap.set(util, { moduleName: "util", exportName: "default" });
  exportAll(crystalStar, "dataplanner");
  exportAll(graphqlStar, "graphql");
  exportAll(utilStar, "util");

  // When defining custom scalars it's often useful to copy the implementation from builtins
  for (const builtinScalarName of [
    "GraphQLBoolean",
    "GraphQLInt",
    "GraphQLFloat",
    "GraphQLString",
    "GraphQLID",
  ]) {
    for (const method of ["serialize", "parseValue", "parseLiteral"]) {
      wellKnownMap.set(graphqlStar[builtinScalarName][method], {
        moduleName: "graphql",
        exportName: [builtinScalarName, method],
      });
    }
  }

  const namespaces = Object.assign(Object.create(null), { crypto: _crypto });

  // Now process options
  if (options.modules) {
    for (const [moduleName, moduleStar] of Object.entries(options.modules)) {
      exportAll(moduleStar, moduleName, true);
      namespaces[moduleName] = moduleStar;
    }
  }

  return { namespaces, wellKnownMap };
}

const $$wellKnown = Symbol("wellKnown");
function getWellKnownFromOptions(
  options: ExportOptions,
): ReturnType<typeof makeWellKnownFromOptions> {
  if (!options[$$wellKnown]) {
    options[$$wellKnown] = makeWellKnownFromOptions(options);
  }
  return options[$$wellKnown];
}

/**
 * Determines if the thing is something well known (like a Node.js builtin); if
 * so, returns the export description of it.
 *
 * @internal
 */
export function wellKnown(
  options: ExportOptions,
  thing: unknown,
): $$Export | undefined {
  const { wellKnownMap, namespaces } = getWellKnownFromOptions(options);

  // Straight imports are relatively easy:
  const simple = wellKnownMap.get(thing);
  if (simple) {
    return simple;
  }

  // Checking for namespace matches is a bit tougher
  for (const moduleName in namespaces) {
    if (isSameNamespace(thing, namespaces[moduleName])) {
      return { moduleName, exportName: "*" };
    }
  }

  return undefined;
}

function isSameNamespace<TNamespace extends object>(
  thing: unknown,
  namespace: TNamespace,
): thing is TNamespace {
  if (typeof thing !== "object" || thing == null) {
    return false;
  }
  const thingKeys = Object.keys(thing);
  const nspKeys = Object.keys(namespace);
  if (thingKeys.length !== nspKeys.length) {
    return false;
  }
  for (const key of nspKeys) {
    if (thing[key] !== namespace[key]) {
      return false;
    }
  }
  return true;
}
