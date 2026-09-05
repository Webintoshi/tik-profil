import { parseCityEventSnapshot, type CityEventSnapshot, type EventSource } from "./contracts.ts";
import { fetchBiletinialSnapshot, fetchBiletivaSnapshot } from "./providers.ts";
import { cacheEventPosters, normalizeBiletinialPosterUrl, type ProviderSnapshot } from "./posters.ts";

const SOURCES: EventSource[] = ["biletinial", "biletiva"];
interface SyncOptions { apply: boolean; sources: EventSource[]; publishedSources: EventSource[] }
interface SyncDependencies {
  fetchSnapshot: (source: EventSource) => Promise<ProviderSnapshot>;
  saveSnapshot: (snapshot: CityEventSnapshot) => Promise<unknown>;
  cachePosters?: (snapshot: ProviderSnapshot) => Promise<CityEventSnapshot>;
}
interface SourceResult {
  source: EventSource;
  status: "dry-run" | "saved" | "failed";
  events?: number;
  sessions?: number;
  fetchedAt?: string;
  posters?: number;
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
  const deps: SyncDependencies = dependencies ?? {
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
      const raw = await deps.fetchSnapshot(source);
      let snapshot = parseCityEventSnapshot(raw);
      if (snapshot.source !== source || snapshot.city !== "ordu") throw new Error("Adapter scope mismatch");
      const validated: ProviderSnapshot = { ...snapshot, events: snapshot.events.map((event, index) => ({
        ...event, posterSourceUrl: normalizeBiletinialPosterUrl(raw.events[index].posterSourceUrl),
      })) };
      if (options.apply) {
        snapshot = parseCityEventSnapshot(await (deps.cachePosters ?? cacheEventPosters)(validated));
        if (snapshot.source !== source || snapshot.city !== "ordu") throw new Error("Cached snapshot scope mismatch");
        await deps.saveSnapshot(snapshot);
      }
      sources.push({ source, status: options.apply ? "saved" : "dry-run", events: snapshot.events.length,
        sessions: snapshot.events.reduce((count, event) => count + event.sessions.length, 0), fetchedAt: snapshot.fetchedAt,
        posters: snapshot.events.filter(event => event.imageUrl !== null).length });
    } catch {
      // Do not log SQL, connection strings, provider bodies or environment values.
      sources.push({ source, status: "failed" });
    }
  }
  return { ok: sources.every(source => source.status !== "failed"), sources };
}
