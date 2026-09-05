import { parseCityEventSnapshot, type CityEventSnapshot, type EventSource } from "./contracts.ts";
import { fetchBiletinialSnapshot, fetchBiletivaSnapshot } from "./providers.ts";

const SOURCES: EventSource[] = ["biletinial", "biletiva"];
interface SyncOptions { apply: boolean; sources: EventSource[]; publishedSources: EventSource[] }
interface SyncDependencies {
  fetchSnapshot: (source: EventSource) => Promise<CityEventSnapshot>;
  saveSnapshot: (snapshot: CityEventSnapshot) => Promise<unknown>;
}
interface SourceResult {
  source: EventSource;
  status: "dry-run" | "saved" | "failed";
  events?: number;
  sessions?: number;
  fetchedAt?: string;
}

export function parseSyncArguments(args: string[]): { apply: boolean; sources: EventSource[] } {
  let apply = false;
  const sources: EventSource[] = [];
  for (const arg of args) {
    if (arg === "--apply") { apply = true; continue; }
    if (arg.startsWith("--source=")) {
      const source = arg.slice("--source=".length) as EventSource;
      if (!SOURCES.includes(source)) throw new Error("Unknown event source");
      if (!sources.includes(source)) sources.push(source);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return { apply, sources: sources.length ? sources : [...SOURCES] };
}

export async function syncCityEvents(options: SyncOptions, dependencies?: SyncDependencies) {
  if (!options.sources.length || options.sources.some(source => !SOURCES.includes(source))) throw new Error("Unknown event source");
  if (options.apply && options.sources.some(source => !options.publishedSources.includes(source))) {
    throw new Error("Publication permission required: source must be in CITY_EVENTS_PUBLISHED_SOURCES before --apply");
  }
  const deps = dependencies ?? {
    fetchSnapshot: (source: EventSource) => source === "biletinial" ? fetchBiletinialSnapshot() : fetchBiletivaSnapshot(),
    saveSnapshot: async (snapshot: CityEventSnapshot) => {
      const { createCityEventsRepository } = await import("./repository.ts");
      return createCityEventsRepository().saveSnapshot(snapshot);
    },
  };
  const sources: SourceResult[] = [];
  // Sequential bounded sources avoid bursts against provider sites.
  for (const source of [...new Set(options.sources)]) {
    try {
      const snapshot = parseCityEventSnapshot(await deps.fetchSnapshot(source));
      if (snapshot.source !== source || snapshot.city !== "ordu") throw new Error("Adapter scope mismatch");
      if (options.apply) await deps.saveSnapshot(snapshot);
      sources.push({ source, status: options.apply ? "saved" : "dry-run", events: snapshot.events.length,
        sessions: snapshot.events.reduce((count, event) => count + event.sessions.length, 0), fetchedAt: snapshot.fetchedAt });
    } catch {
      // Do not log SQL, connection strings, provider bodies or environment values.
      sources.push({ source, status: "failed" });
    }
  }
  return { ok: sources.every(source => source.status !== "failed"), sources };
}
