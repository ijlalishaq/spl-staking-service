use anchor_lang::prelude::*;
use spl_math::uint::U256;

use crate::constants::SCALE_FACTOR;

#[account]
pub struct Staker {
    pub user: Pubkey,              // User's address.
    pub mint: Pubkey,              // Token mint address
    pub staked_amount: u64,        // Amount of tokens the user has staked
    pub reward_debt: u64,          // User's reward debt
    pub pending_rewards: u64,      // Rewards that are pending
    pub total_claimed_reward: u64, // Total rewards the user has claimed so far
}

impl Staker {
    pub const SEED_PREFIX: &'static [u8] = b"staker";

    // Initializes the Staker struct if it's not already set
    pub fn init_if_needed(&mut self, user: Pubkey, mint: Pubkey) {
        if self.user == Pubkey::default() {
            self.user = user;
            self.mint = mint;
        }
    }

    // Adjust the user's reward debt based on the staked amount and accumulated reward per token
    pub fn update_reward_debt(&mut self, acc_reward_per_token: u128) -> Result<()> {
        self.reward_debt = U256::from(self.staked_amount)
            .checked_mul(U256::from(acc_reward_per_token))
            .unwrap()
            .checked_div(U256::from(SCALE_FACTOR))
            .unwrap()
            .low_u64();

        Ok(())
    }
}
