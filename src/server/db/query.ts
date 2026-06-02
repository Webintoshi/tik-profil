import type { QueryResult, QueryResultRow } from "pg";
import { getPostgresPool } from "./postgres";

function toMutableValues(values?: readonly unknown[]): unknown[] | undefined {
    return values ? [...values] : undefined;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
): Promise<QueryResult<T>> {
    return getPostgresPool().query<T>(text, toMutableValues(values));
}
