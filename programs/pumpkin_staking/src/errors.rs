use anchor_lang::error_code;

#[error_code]
pub enum CustomError {
    #[msg("Incorrect initialization signer.")]
    IncorrectInitializationSigner,

    #[msg("Incorrect governance account.")]
    IncorrectGovernance,
}
