import { requireRewardCustomer } from "../../../../server/rewards/reward-auth.ts";
import { createRewardHandlers } from "../../../../server/rewards/reward-handlers.ts";
import { rewardEngine } from "../../../../server/rewards/reward-service.ts";

export const rewardHandlers = createRewardHandlers({ engine: rewardEngine, requireCustomer: requireRewardCustomer });
