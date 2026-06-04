import type { QueryResultRow } from "pg";
import { query } from "@/server/db/query";

interface BusinessModuleRow extends QueryResultRow {
    business_id: string;
    module_key: string;
}

function normalizeModuleKey(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    return normalized ? normalized : null;
}

function pushModuleKey(target: Map<string, string[]>, businessId: string, moduleKey: string) {
    const normalized = normalizeModuleKey(moduleKey);

    if (!normalized) {
        return;
    }

    const existing = target.get(businessId);
    if (!existing) {
        target.set(businessId, [normalized]);
        return;
    }

    if (!existing.includes(normalized)) {
        existing.push(normalized);
    }
}

export async function getBusinessModulesMap(businessIds: readonly string[]): Promise<Map<string, string[]>> {
    if (businessIds.length === 0) {
        return new Map();
    }

    const result = await query<BusinessModuleRow>(
        `
            SELECT business_id, module_key
            FROM business_modules
            WHERE is_enabled = true
              AND business_id = ANY($1::text[])
            ORDER BY business_id ASC, module_key ASC
        `,
        [businessIds],
    );

    const modules = new Map<string, string[]>();

    for (const row of result.rows) {
        pushModuleKey(modules, row.business_id, row.module_key);
    }

    return modules;
}

export async function getBusinessModules(businessId: string): Promise<string[]> {
    const modules = await getBusinessModulesMap([businessId]);
    return modules.get(businessId) ?? [];
}
