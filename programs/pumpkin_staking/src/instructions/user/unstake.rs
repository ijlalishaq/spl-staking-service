use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    errors::CustomError,
    events::Unstaked,
    states::{Staker, StakingPool},
    utils::transfer_tokens_with_signer,
};

#[derive(Accounts)]
pub struct UnStake<'info> {
    /// The user unstaking tokens
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
        mut,
        seeds = [Staker::SEED_PREFIX, mint.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    /// The mint (token) being unstaked
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
}

pub fn unstake_handler(ctx: Context<UnStake>, amount: u64) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;

    require!(amount > 0, CustomError::ZeroAmount);

    require!(
        amount <= staker.staked_amount,
        CustomError::AmountGreaterThanStakedAmount
    );

    staking_pool.update_reward_per_token_and_last_update_time()?;

    let pending_rewards =
        staking_pool.calculate_pending_rewards(staker.staked_amount, staker.reward_debt)?;

    if pending_rewards > 0 {
        staker.pending_rewards = staker.pending_rewards.checked_add(pending_rewards).unwrap();
    }

    let mint = ctx.accounts.mint.key();
    let seeds: &[&[u8]; 3] = &[
        StakingPool::SEED_PREFIX.as_ref(),
        mint.as_ref(),
        &[ctx.bumps.staking_pool],
    ];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    transfer_tokens_with_signer(
        ctx.accounts.staking_pool_ata.to_account_info(),
        ctx.accounts.user_ata.to_account_info(),
        staking_pool.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
        signer_seeds,
    )?;

    staker.staked_amount = staker.staked_amount.checked_sub(amount).unwrap();

    staking_pool.total_token_staked = staking_pool.total_token_staked.checked_sub(amount).unwrap();

    staker.update_reward_debt(staking_pool.acc_reward_per_token)?;

    emit!(Unstaked {
        user: staker.user.key(),
        mint: staker.mint.key(),
        amount,
    });

    Ok(())
}
