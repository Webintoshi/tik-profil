import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  }
});

await import(new URL("../../../src/server/auth/customer-session.test.ts", import.meta.url));
await import(new URL("../../../src/app/api/kesfet/customer-handlers.test.ts", import.meta.url));
