use anchor_lang::prelude::*;

use crate::{
    errors::CustomError,
    events::RewardUpdated,
    states::{ContractMetadata, SolVault, StakingPool},
    utils::transfer_sol,
};

/// Accounts required for the `update_rewards` instruction
#[derive(Accounts)]
#[instruction(mint: Pubkey, reward: u64, duration: u64)]
pub struct UpdateRewards<'info> {
    /// The payer account, responsible for funding the rewards
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The signer authorized to update rewards
    #[account()]
    pub reward_updation_signer: Signer<'info>,

    /// The contract metadata account containing allowed signers
    #[account(
        seeds = [ContractMetadata::SEED_PREFIX],
        bump,
    )]
    pub contract_metadata: Account<'info, ContractMetadata>,

    /// The staking pool account associated with the given mint
    #[account(
        mut,
        seeds = [StakingPool::SEED_PREFIX, mint.as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The vault account holding SOL rewards
    #[account(
        mut,
        seeds = [SolVault::SEED_PREFIX],
        bump,
    )]
    pub sol_vault: Account<'info, SolVault>,

    /// The Solana system program, used for SOL transfer
    pub system_program: Program<'info, System>,
}

/// Handler function for updating staking pool rewards
pub fn update_rewards_handler(
    ctx: Context<UpdateRewards>,
    _mint: Pubkey,
    reward: u64,
    duration: u64,
) -> Result<()> {
    let contract_metadata = &ctx.accounts.contract_metadata;
    let reward_updation_signer = &ctx.accounts.reward_updation_signer;

    require!(
        contract_metadata
            .reward_updation_signers
            .contains(&reward_updation_signer.key()),
        CustomError::IncorrectRewardUpdationSigner
    );

    require!(reward > 0, CustomError::ZeroReward);
    require!(duration > 0, CustomError::ZeroRewardDuration);

    let staking_pool = &mut ctx.accounts.staking_pool;
    let current_time = Clock::get()?.unix_timestamp.try_into().unwrap();

    staking_pool.update_reward_per_token_and_last_update_time()?;

    if current_time >= staking_pool.period_end_time {
        // If the previous reward distribution period has ended,
        // set the new reward rate directly
        staking_pool.current_reward_per_sec = reward.checked_div(duration).unwrap();
    } else {
        // If the previous reward period is still active,
        // calculate remaining rewards
        let remaining_time = staking_pool
            .period_end_time
            .checked_sub(current_time)
            .unwrap();

        let remaining_reward = remaining_time
            .checked_mul(staking_pool.current_reward_per_sec)
            .unwrap();

        let total_reward = remaining_reward.checked_add(reward).unwrap();

        staking_pool.current_reward_per_sec = total_reward.checked_div(duration).unwrap();
    }

    // reward / duration is integer division, so a reward smaller than the duration (in lamports
    // vs seconds) gives a rate of 0 and the deposited SOL would sit in the vault forever
    require!(
        staking_pool.current_reward_per_sec > 0,
        CustomError::RewardTooSmallForDuration
    );

    transfer_sol(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.sol_vault.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        reward,
    )?;

    staking_pool.last_updated_time = current_time;

    staking_pool.period_end_time = current_time.checked_add(duration).unwrap();

    staking_pool.total_reward_allocated = staking_pool
        .total_reward_allocated
        .checked_add(reward)
        .unwrap();

    emit!(RewardUpdated {
        mint: staking_pool.mint,
        reward,
        duration,
        updated_reward_per_sec: staking_pool.current_reward_per_sec,
        updated_period_end_time: staking_pool.period_end_time
    });

    Ok(())
}
