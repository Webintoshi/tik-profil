import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(scriptsDir, "sync-ordu-events.ts")],
  outfile: path.join(scriptsDir, "..", "dist", "jobs", "sync-ordu-events.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["pg-native"],
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
});
