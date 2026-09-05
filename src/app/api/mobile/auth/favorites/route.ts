import { requireNativeCustomerPrincipal } from "../../../../../server/auth/native-auth/account.ts";
import { createFavoriteHandlers } from "../../../../../server/rewards/favorite-handlers.ts";
import { favoriteRepository } from "../../../../../server/rewards/favorite.repository.ts";
import { rewardEngine } from "../../../../../server/rewards/reward-service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";

const handlers = createFavoriteHandlers({
    engine: rewardEngine,
    repository: favoriteRepository,
    requireCustomer: requireNativeCustomerPrincipal,
    respond: authJson,
    errorResponse: nativeAuthErrorResponse,
});

export async function GET(request: Request) {
    return handlers.getFavorites(request);
}

export async function POST(request: Request) {
    return handlers.postFavorite(request);
}

export async function DELETE(request: Request) {
    return handlers.deleteFavorite(request);
}
