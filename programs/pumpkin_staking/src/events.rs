use anchor_lang::prelude::*;

#[event]
pub struct ContractMetadataUpdated {
    pub updated_governance: Pubkey,
    pub updated_pool_creation_signers: [Pubkey; 3],
    pub updated_reward_updation_signers: [Pubkey; 3],
}

#[event]
pub struct PoolCreated {
    pub mint: Pubkey,
}

#[event]
pub struct RewardUpdated {
    pub mint: Pubkey,
    pub reward: u64,
    pub duration: u64,
    pub updated_reward_per_sec: u64,
    pub updated_period_end_time: u64,
}
