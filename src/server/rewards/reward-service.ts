import { createRewardEngine } from "./reward-engine.ts";
import { rewardRepository } from "./reward.repository.ts";

export const rewardEngine = createRewardEngine({ repository: rewardRepository });
