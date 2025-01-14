use anchor_lang::prelude::*;

#[account]
pub struct ContractMetadata {
    pub governance: Pubkey, // The address of the governance authority
    pub pool_creation_signers: [Pubkey; 3], // Array of public keys authorized to create pools
    pub reward_updation_signers: [Pubkey; 3], // Array of public keys authorized to update rewards
}

impl ContractMetadata {
    pub const SEED_PREFIX: &'static [u8] = b"contract_metadata";
}
