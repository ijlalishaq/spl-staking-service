use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod states;

use crate::instructions::*;

declare_id!("D4PNe8WcsdBbqbxCuV4jgeNfcpLivkoAPttDRpomnQoE");

#[program]
pub mod pumpkin_staking {
    use super::*;

    /// Initializes the staking contract with governance and signer details
    pub fn initialize(
        context: Context<Initialize>,
        governance: Pubkey,
        pool_creation_signers: [Pubkey; 3],
        reward_updation_signers: [Pubkey; 3],
    ) -> Result<()> {
        initialize_handler(
            context,
            governance,
            pool_creation_signers,
            reward_updation_signers,
        )
    }

    /// Updates contract metadata such as governance and signer details
    pub fn update_contract_metadata(
        context: Context<UpdateContractMetadata>,
        governance: Option<Pubkey>,
        pool_creation_signers: Option<[Pubkey; 3]>,
        reward_updation_signers: Option<[Pubkey; 3]>,
    ) -> Result<()> {
        update_contract_metadata_handler(
            context,
            governance,
            pool_creation_signers,
            reward_updation_signers,
        )
    }
}
