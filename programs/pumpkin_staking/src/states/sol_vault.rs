use anchor_lang::prelude::*;

#[account]
pub struct SolVault {}

impl SolVault {
    pub const SEED_PREFIX: &'static [u8] = b"sol_vault";
}
