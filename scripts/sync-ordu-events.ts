import { parseSyncArguments, syncCityEvents } from "../src/server/city-events/sync.ts";
import { parsePublishedSources } from "../src/server/city-events/contracts.ts";

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node --import tsx scripts/sync-ordu-events.ts [--source=biletinial|biletiva] [--apply]\nDefaults to read-only dry-run. --apply requires source permission and CITY_EVENTS_PUBLISHED_SOURCES.");
    return;
  }
  const options = parseSyncArguments(process.argv.slice(2));
  const result = await syncCityEvents({ ...options, publishedSources: parsePublishedSources(process.env.CITY_EVENTS_PUBLISHED_SOURCES) });
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry-run", ...result }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "City event sync failed");
  process.exitCode = 1;
}).finally(async () => {
  // Standalone command: release only the pool this process created, if any.
  await globalThis.__tikProfilPostgresPool?.end();
});
