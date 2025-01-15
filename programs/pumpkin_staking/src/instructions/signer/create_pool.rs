use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::mem::size_of;

use crate::{
    errors::CustomError,
    events::PoolCreated,
    states::{ContractMetadata, StakingPool},
};

/// Accounts required for the `create_pool` instruction
#[derive(Accounts)]
pub struct CreatePool<'info> {
    /// The account that will pay for the pool creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The signer authorized to create the pool
    #[account()]
    pub pool_creation_signer: Signer<'info>,

    /// The contract metadata account containing allowed signers
    #[account(
        seeds = [ContractMetadata::SEED_PREFIX],
        bump,
    )]
    pub contract_metadata: Account<'info, ContractMetadata>,

    /// The mint account associated with the staking pool
    #[account()]
    pub mint: Account<'info, Mint>,

    /// The staking pool account to be created
    #[account(
        init,
        payer = payer,
        space = 8 + size_of::<StakingPool>(), // Account discriminator (8 bytes) + struct size
        seeds = [StakingPool::SEED_PREFIX, mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The associated token account for the staking pool
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = staking_pool
    )]
    pub staking_pool_ata: Account<'info, TokenAccount>,

    /// The token program required for managing token accounts
    pub token_program: Program<'info, Token>,

    /// The associated token program required for ATA creation
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The system program required for account initialization
    pub system_program: Program<'info, System>,
}

/// Creates a new staking pool, ensuring the signer is authorized
pub fn create_pool_handler(ctx: Context<CreatePool>) -> Result<()> {
    let contract_metadata = &ctx.accounts.contract_metadata;
    let pool_creation_signer = &ctx.accounts.pool_creation_signer;

    require!(
        contract_metadata
            .pool_creation_signers
            .contains(&pool_creation_signer.key()),
        CustomError::IncorrectPoolCreationSigner
    );

    let staking_pool = &mut ctx.accounts.staking_pool;
    staking_pool.mint = ctx.accounts.mint.key();

    emit!(PoolCreated {
        mint: staking_pool.mint
    });

    Ok(())
}
