use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    pub mint: Pubkey,                // Token mint address
    pub total_token_staked: u64,     // Total staked tokens
    pub period_end_time: u64,        // When rewards stop accumulating
    pub current_reward_per_sec: u64, // Reward rate per second
    pub acc_reward_per_token: u128,  // Accumulated rewards per staked token
    pub last_updated_time: u64,      // Last time the rewards were updated
    pub total_reward_allocated: u64, // Total reward allocated
}

impl StakingPool {
    pub const SEED_PREFIX: &'static [u8] = b"staking_pool";
}
