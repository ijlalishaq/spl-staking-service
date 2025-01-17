use anchor_lang::prelude::*;
use spl_math::uint::U256;

use crate::constants::SCALE_FACTOR;

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

    /// Returns the last applicable reward timestamp
    #[inline]
    pub fn get_last_reward_time(&self, current_time: u64) -> u64 {
        current_time.min(self.period_end_time)
    }

    /// Updates accumulated rewards per token and last updated time
    pub fn update_reward_per_token_and_last_update_time(&mut self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp.try_into().unwrap();

        // If no tokens are staked, simply update the last updated time
        if self.total_token_staked == 0 {
            self.last_updated_time = current_time;
            return Ok(());
        }

        // Calculate elapsed time since the last update
        let last_reward_time = self.get_last_reward_time(current_time);
        let elapsed_time = last_reward_time
            .checked_sub(self.last_updated_time)
            .unwrap();

        // Calculate total reward distributed during this period
        let reward_distributed = U256::from(elapsed_time)
            .checked_mul(U256::from(self.current_reward_per_sec))
            .unwrap()
            .checked_mul(U256::from(SCALE_FACTOR))
            .unwrap();

        // Calculate the per-token reward rate
        let reward_per_token = reward_distributed
            .checked_div(U256::from(self.total_token_staked))
            .unwrap()
            .low_u128();

        // Update accumulated rewards per token
        self.acc_reward_per_token = self
            .acc_reward_per_token
            .checked_add(reward_per_token)
            .unwrap();

        self.last_updated_time = last_reward_time;

        Ok(())
    }
}
