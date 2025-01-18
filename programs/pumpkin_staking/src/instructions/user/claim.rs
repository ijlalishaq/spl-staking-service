use anchor_lang::prelude::*;

use crate::{
    events::Claimed,
    states::{SolVault, Staker, StakingPool},
};

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct Claim<'info> {
    /// The user claiming the reward
    #[account(mut)]
    pub user: Signer<'info>,

    /// The staking pool account storing staking details and holding the staked tokens
    #[account(
        mut,
        seeds = [StakingPool::SEED_PREFIX, mint.as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The staker's account storing the user's staking details
    #[account(
        mut,
        seeds = [Staker::SEED_PREFIX, mint.as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    /// The vault account holding SOL rewards
    #[account(
        mut,
        seeds = [SolVault::SEED_PREFIX],
        bump,
    )]
    pub sol_vault: Account<'info, SolVault>,

    /// The system program required for transferring SOL
    pub system_program: Program<'info, System>,
}

pub fn claim_handler(ctx: Context<Claim>, _mint: Pubkey) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;

    staking_pool.update_reward_per_token_and_last_update_time()?;

    // What accrued since the last stake/unstake, plus what was carried over then
    let pending_rewards = staking_pool
        .calculate_pending_rewards(staker.staked_amount, staker.reward_debt)?
        .checked_add(staker.pending_rewards)
        .unwrap();

    if pending_rewards > 0 {
        **ctx
            .accounts
            .sol_vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= pending_rewards;

        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += pending_rewards;
    }

    staker.total_claimed_reward = staker
        .total_claimed_reward
        .checked_add(pending_rewards)
        .unwrap();

    staker.pending_rewards = 0;

    staker.update_reward_debt(staking_pool.acc_reward_per_token)?;

    emit!(Claimed {
        user: staker.user.key(),
        mint: staker.mint.key(),
        amount: pending_rewards,
    });

    Ok(())
}
