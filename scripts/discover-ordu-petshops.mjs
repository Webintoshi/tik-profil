import { pathToFileURL } from "node:url";

export const ORDU_DISTRICTS = [
    "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
    "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
    "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
];

const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const SENSITIVE_PATTERN = /(GOOGLE_MAPS_API_KEY|LOGTO_MANAGEMENT_APP_SECRET|password|recoveryToken|Cookie)(\s*[:=]\s*)([^\s,;]+)/gi;

export function redactSensitiveText(value) {
    return String(value).replace(SENSITIVE_PATTERN, "$1$2[REDACTED]");
}

function requireValue(argv, index, option) {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
    return value;
}

export function parseOperatorArgs(argv, env = process.env) {
    const parsed = { dryRun: true, districts: [], baseUrl: "", cookieEnv: "", idempotencyKey: "" };

    for (let index = 0; index < argv.length; index += 1) {
        const option = argv[index];
        if (option === "--publish") throw new Error("Publishing is not supported by this command. Use the reviewed admin UI.");
        if (option === "--dry-run") continue;
        if (option === "--base-url") {
            parsed.baseUrl = requireValue(argv, index, option);
            index += 1;
            continue;
        }
        if (option === "--cookie-env") {
            parsed.cookieEnv = requireValue(argv, index, option);
            index += 1;
            continue;
        }
        if (option === "--district") {
            parsed.districts.push(requireValue(argv, index, option));
            index += 1;
            continue;
        }
        if (option === "--idempotency-key") {
            parsed.idempotencyKey = requireValue(argv, index, option);
            index += 1;
            continue;
        }
        throw new Error(`Unknown option: ${option}`);
    }

    if (!parsed.baseUrl) throw new Error("--base-url is required.");
    let baseUrl;
    try {
        baseUrl = new URL(parsed.baseUrl);
    } catch {
        throw new Error("--base-url must be a valid URL.");
    }
    if (baseUrl.username || baseUrl.password) throw new Error("--base-url must not contain credentials.");
    const loopbackHost = baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "[::1]";
    if (baseUrl.protocol !== "https:" && !(baseUrl.protocol === "http:" && loopbackHost)) {
        throw new Error("--base-url must use https; http is allowed only for loopback development.");
    }
    if (!parsed.cookieEnv) throw new Error("--cookie-env is required; pass the name of an environment variable containing the admin session cookie.");
    const cookie = env[parsed.cookieEnv]?.trim();
    if (!cookie) throw new Error(`${parsed.cookieEnv} does not contain an operator session.`);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+=[^;\r\n]+$/.test(cookie)) {
        throw new Error(`${parsed.cookieEnv} must contain exactly one session cookie name/value pair.`);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.idempotencyKey)) {
        throw new Error("--idempotency-key is required and must be a UUID so retries can reuse the same batch.");
    }

    const districts = parsed.districts.length > 0 ? [...new Set(parsed.districts)] : [...ORDU_DISTRICTS];
    for (const district of districts) {
        if (!ORDU_DISTRICTS.includes(district)) throw new Error(`Unknown Ordu district: ${district}`);
    }

    baseUrl.pathname = "/";
    baseUrl.search = "";
    baseUrl.hash = "";
    return { dryRun: true, baseUrl: baseUrl.toString().replace(/\/$/, ""), cookie, districts, idempotencyKey: parsed.idempotencyKey };
}

async function readJson(response) {
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        // Provider responses are deliberately not echoed to the terminal.
    }
    if (!response.ok) {
        const code = typeof payload?.error === "string" ? payload.error : `http_${response.status}`;
        throw new Error(`Import API request failed: ${code}`);
    }
    return payload;
}

export async function runDryRun(options, dependencies = {}) {
    if (!options.dryRun) throw new Error("Only dry-run mode is supported.");
    const fetchImpl = dependencies.fetch ?? globalThis.fetch;
    const log = dependencies.log ?? console.log;
    const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const pollIntervalMs = options.pollIntervalMs ?? 1_500;
    const maxPolls = options.maxPolls ?? 120;
    const headers = {
        "Content-Type": "application/json",
        Cookie: options.cookie,
    };

    const startResponse = await fetchImpl(`${options.baseUrl}/api/admin/business-imports/places/petshops`, {
        method: "POST",
        headers,
        body: JSON.stringify({ city: "Ordu", districts: options.districts, idempotencyKey: options.idempotencyKey }),
        redirect: "error",
    });
    const started = await readJson(startResponse);
    if (typeof started?.batchId !== "string") throw new Error("Import API did not return a batch identifier.");

    let batch = null;
    for (let poll = 0; poll < maxPolls; poll += 1) {
        if (poll > 0 && pollIntervalMs > 0) await sleep(pollIntervalMs);
        const response = await fetchImpl(`${options.baseUrl}/api/admin/business-imports/${encodeURIComponent(started.batchId)}`, {
            method: "GET",
            headers: { Cookie: options.cookie },
            redirect: "error",
        });
        batch = await readJson(response);
        if (TERMINAL_STATUSES.has(batch.status)) break;
    }
    if (!batch || !TERMINAL_STATUSES.has(batch.status)) throw new Error("Import dry-run timed out before reaching a terminal state.");

    log(`Durum: ${batch.status}`);
    log(`Yeni aday: ${Number(batch.importedCount ?? 0)}`);
    log(`Eşleşen: ${Number(batch.matchedCount ?? 0)}`);
    log(`Atlanan: ${Number(batch.skippedCount ?? 0)}`);
    log(`Başarısız: ${Number(batch.failedCount ?? 0)}`);
    if (batch.status === "failed") throw new Error("Import dry-run finished with a failed batch.");
    return batch;
}

async function main() {
    try {
        const options = parseOperatorArgs(process.argv.slice(2));
        await runDryRun(options);
    } catch (error) {
        console.error(redactSensitiveText(error instanceof Error ? error.message : "Import command failed."));
        process.exitCode = 1;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
