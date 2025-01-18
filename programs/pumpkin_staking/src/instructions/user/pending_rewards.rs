use anchor_lang::prelude::*;

use crate::states::{Staker, StakingPool};

#[derive(Accounts)]
#[instruction(user: Pubkey, mint: Pubkey)]
pub struct PendingRewards<'info> {
    /// The staking pool account storing pool's staking details and holding the staked tokens
    #[account(
        seeds = [StakingPool::SEED_PREFIX, mint.as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The staker's account storing user's staking details
    #[account(
        seeds = [Staker::SEED_PREFIX, mint.as_ref(), user.as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,
}

pub fn pending_rewards_handler(
    ctx: Context<PendingRewards>,
    _user: Pubkey,
    _mint: Pubkey,
) -> Result<u64> {
    // Works on an in-memory copy: the accounts aren't `mut`, so nothing is written back.
    // Call it with `.view()` (a simulated transaction) to read what `claim` would pay now.
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &ctx.accounts.staker;

    staking_pool.update_reward_per_token_and_last_update_time()?;

    let pending_rewards = staking_pool
        .calculate_pending_rewards(staker.staked_amount, staker.reward_debt)?
        .checked_add(staker.pending_rewards)
        .unwrap();

    Ok(pending_rewards)
}
