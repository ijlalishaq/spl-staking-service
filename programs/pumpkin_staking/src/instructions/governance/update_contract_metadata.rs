use anchor_lang::prelude::*;

use crate::{errors::CustomError, events::ContractMetadataUpdated, states::ContractMetadata};

/// Accounts required for the `update_contract_metadata` instruction
#[derive(Accounts)]
pub struct UpdateContractMetadata<'info> {
    /// Ensures that only the correct governance account can perform the update
    #[account(address = contract_metadata.governance @ CustomError::IncorrectGovernance)]
    pub governance: Signer<'info>,

    /// The contract metadata account to be updated
    #[account(
        mut,
        seeds = [ContractMetadata::SEED_PREFIX],
        bump,
    )]
    pub contract_metadata: Account<'info, ContractMetadata>,
}

/// Updates the contract metadata with optional values for governance and signers
pub fn update_contract_metadata_handler(
    context: Context<UpdateContractMetadata>,
    governance: Option<Pubkey>,
    pool_creation_signers: Option<[Pubkey; 3]>,
    reward_updation_signers: Option<[Pubkey; 3]>,
) -> Result<()> {
    let contract_metadata = &mut context.accounts.contract_metadata;

    if let Some(governance) = governance {
        contract_metadata.governance = governance;
    }

    if let Some(pool_creation_signers) = pool_creation_signers {
        contract_metadata.pool_creation_signers = pool_creation_signers;
    }

    if let Some(reward_updation_signers) = reward_updation_signers {
        contract_metadata.reward_updation_signers = reward_updation_signers;
    }

    emit!(ContractMetadataUpdated {
        updated_governance: contract_metadata.governance,
        updated_pool_creation_signers: contract_metadata.pool_creation_signers,
        updated_reward_updation_signers: contract_metadata.reward_updation_signers,
    });

    Ok(())
}
