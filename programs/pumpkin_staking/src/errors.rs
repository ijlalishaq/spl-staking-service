use anchor_lang::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Incorrect initialization signer.")]
    IncorrectInitializationSigner,

    #[msg("Incorrect governance account.")]
    IncorrectGovernance,

    #[msg("Incorrect pool creation signer.")]
    IncorrectPoolCreationSigner,

    #[msg("Incorrect reward updation signer.")]
    IncorrectRewardUpdationSigner,

    #[msg("Amount is zero.")]
    ZeroAmount,

    #[msg("Reward is zero.")]
    ZeroReward,

    #[msg("Reward distribution duration is zero.")]
    ZeroRewardDuration,

    #[msg("Reward per sec is not set.")]
    RewardPerSecIsNotSet,

    #[msg("Reward distribution period has expired.")]
    RewardDistributionPeriodHasExpired,

    #[msg("Amount greater than staked amount.")]
    AmountGreaterThanStakedAmount,

    #[msg("Not enough sol in the vault.")]
    NotEnoughSolInVault,
}
