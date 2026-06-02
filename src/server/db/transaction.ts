import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { getPostgresPool } from "./postgres";

function toMutableValues(values?: readonly unknown[]): unknown[] | undefined {
    return values ? [...values] : undefined;
}

export type TransactionQuery = <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResult<T>>;

export interface TransactionContext {
    client: PoolClient;
    query: TransactionQuery;
}

export async function withTransaction<T>(
    callback: (context: TransactionContext) => Promise<T>,
): Promise<T> {
    const client = await getPostgresPool().connect();
    const transactionQuery: TransactionQuery = <TResult extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: readonly unknown[],
    ) => client.query<TResult>(text, toMutableValues(values));

    try {
        await client.query("BEGIN");
        const result = await callback({
            client,
            query: transactionQuery,
        });
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
