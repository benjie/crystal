#!/usr/bin/env -S node -r "ts-node/register"

import { exportSchema } from "graphile-export";

import { makeExampleSchema } from "../src/examples/exampleSchema.js";

exportSchema(makeExampleSchema(), `${__dirname}/exampleSchemaExport.mjs`);
