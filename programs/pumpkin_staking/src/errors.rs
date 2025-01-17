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

    #[msg("Reward is zero.")]
    ZeroReward,

    #[msg("Reward distribution duration is zero.")]
    ZeroRewardDuration,
}
