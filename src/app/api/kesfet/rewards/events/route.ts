import { rewardHandlers } from "../_handlers.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
    return rewardHandlers.postEvent(request);
}
