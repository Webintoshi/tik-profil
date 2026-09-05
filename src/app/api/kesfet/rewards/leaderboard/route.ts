import { rewardHandlers } from "../_handlers.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
    return rewardHandlers.getLeaderboard(request);
}
