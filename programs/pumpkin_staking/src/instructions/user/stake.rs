use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    errors::CustomError,
    events::Staked,
    states::{Staker, StakingPool},
    utils::transfer_tokens,
};

#[derive(Accounts)]
pub struct Stake<'info> {
    /// The user staking tokens
    #[account(mut)]
    pub user: Signer<'info>,

    /// The staking pool account storing pool's staking details and holding the staked tokens
    #[account(
        mut,
        seeds = [StakingPool::SEED_PREFIX, mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The staker's account storing user's staking details
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<Staker>(),
        seeds = [Staker::SEED_PREFIX, mint.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    /// The mint (token) being staked
    #[account()]
    pub mint: Account<'info, Mint>,

    /// The associated token account for the staking pool
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = staking_pool
    )]
    pub staking_pool_ata: Account<'info, TokenAccount>,

    /// The user's associated token account
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_ata: Account<'info, TokenAccount>,

    /// The token program required for token transfers
    pub token_program: Program<'info, Token>,

    /// The system program required for creating accounts
    pub system_program: Program<'info, System>,
}

pub fn stake_handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let current_time = Clock::get()?.unix_timestamp.try_into().unwrap();

    require!(amount > 0, CustomError::ZeroAmount);

    require!(
        staking_pool.current_reward_per_sec > 0,
        CustomError::RewardPerSecIsNotSet
    );

    require!(
        staking_pool.period_end_time > current_time,
        CustomError::RewardDistributionPeriodHasExpired
    );

    staker.init_if_needed(ctx.accounts.user.key(), ctx.accounts.mint.key());

    staking_pool.update_reward_per_token_and_last_update_time()?;

    let mut pending_rewards = 0;

    if staker.staked_amount > 0 {
        pending_rewards =
            staking_pool.calculate_pending_rewards(staker.staked_amount, staker.reward_debt)?;
    }

    if pending_rewards > 0 {
        staker.pending_rewards = staker.pending_rewards.checked_add(pending_rewards).unwrap();
    }

    transfer_tokens(
        ctx.accounts.user_ata.to_account_info(),
        ctx.accounts.staking_pool_ata.to_account_info(),
        ctx.accounts.user.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
    )?;

    staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();

    staking_pool.total_token_staked = staking_pool.total_token_staked.checked_add(amount).unwrap();

    staker.update_reward_debt(staking_pool.acc_reward_per_token)?;

    emit!(Staked {
        user: staker.user.key(),
        mint: staker.mint.key(),
        amount,
    });

    Ok(())
}
