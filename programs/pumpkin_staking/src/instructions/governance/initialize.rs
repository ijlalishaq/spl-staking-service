use anchor_lang::prelude::*;

use std::mem::size_of;
use std::str::FromStr;

use crate::{
    constants::INITIALIZATION_SIGNER,
    errors::CustomError,
    events::ContractMetadataUpdated,
    states::{ContractMetadata, SolVault},
};

/// Accounts required for the `initialize` instruction
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The account that will pay for the initialization process
    #[account(
        mut,
        address = Pubkey::from_str(INITIALIZATION_SIGNER).unwrap() @ CustomError::IncorrectInitializationSigner
    )]
    pub payer: Signer<'info>,

    /// The account that stores metadata for the contract
    #[account(
        init,
        payer = payer,
        space = 8 + size_of::<ContractMetadata>(),
        seeds = [ContractMetadata::SEED_PREFIX],
        bump
    )]
    pub contract_metadata: Account<'info, ContractMetadata>,

    /// The vault account holding SOL rewards
    #[account(
        init,
        payer = payer,
        space = 8 + size_of::<SolVault>(),
        seeds = [SolVault::SEED_PREFIX],
        bump
    )]
    pub sol_vault: Account<'info, SolVault>,

    /// The system program required for account initialization
    pub system_program: Program<'info, System>,
}

/// Initializes the contract metadata with governance and signer details
pub fn initialize_handler(
    ctx: Context<Initialize>,
    governance: Pubkey,
    pool_creation_signers: [Pubkey; 3],
    reward_updation_signers: [Pubkey; 3],
) -> Result<()> {
    let contract_metadata = &mut ctx.accounts.contract_metadata;

    contract_metadata.governance = governance;

    contract_metadata.pool_creation_signers = pool_creation_signers;

    contract_metadata.reward_updation_signers = reward_updation_signers;

    emit!(ContractMetadataUpdated {
        updated_governance: governance,
        updated_pool_creation_signers: pool_creation_signers,
        updated_reward_updation_signers: reward_updation_signers,
    });

    Ok(())
}
