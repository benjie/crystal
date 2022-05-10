import "./interfaces";

import { access } from "fs/promises";
import type { Extension } from "interpret";
import { jsVariants } from "interpret";
import { resolve } from "path";

const extensions = Object.keys(jsVariants);

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (e) {
    // TODO: check the error code
    return false;
  }
}

async function registerLoader(loader: Extension | null): Promise<void> {
  if (loader === null) {
    // noop
  } else if (Array.isArray(loader)) {
    let firstError;
    for (const entry of loader) {
      try {
        await registerLoader(entry);
        return;
      } catch (e) {
        if (!firstError) {
          firstError = e;
        }
      }
    }
    throw firstError ?? new Error(`Empty array handler`);
  } else if (typeof loader === "string") {
    require(loader);
  } else if (typeof loader === "object" && loader != null) {
    const loaderModule = require(loader.module);
    loader.register(loaderModule);
  } else {
    throw new Error("Unsupported loader");
  }
}

export async function loadConfig(
  configPath?: string | null,
): Promise<GraphileConfig.Preset | null> {
  if (configPath != null) {
    // Explicitly load the file the user has indicated

    const resolvedPath = resolve(process.cwd(), configPath);

    // First try one of the supported loaders
    for (const extension of extensions) {
      if (resolvedPath.endsWith(extension)) {
        registerLoader(jsVariants[extension]);
        try {
          return require(resolvedPath);
        } catch {
          /* continue to the next one */
        }
      }
    }

    // Fallback to direct import
    return (await import(resolvedPath)).default;
  } else {
    // There's no config path; look for a `graphile.config.*`

    const basePath = resolve(process.cwd(), "graphile.config");
    for (const extension of extensions) {
      const resolvedPath = basePath + extension;
      if (await exists(resolvedPath)) {
        registerLoader(jsVariants[extension]);
        return require(resolvedPath);
      }
    }
  }

  // No config found
  return null;
}
