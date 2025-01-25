# SPL Staking Service

An Anchor program for staking SPL tokens and earning SOL. It was built for tokens that graduate from the Pumpkin bonding curve: each graduated token gets its own staking pool, and every pool has its own reward schedule. All pools pay out of one shared SOL vault.

The reward accounting is the MasterChef model (accumulated reward per token plus a per-user reward debt), so staking, unstaking and claiming are all O(1) no matter how many stakers a pool has.

## How rewards work

A reward-updation signer funds a pool with `reward` lamports to be paid out over `duration` seconds:

```
reward_per_sec = reward / duration
```

If the previous period hasn't finished, whatever it hasn't paid out yet is rolled into the new one:

```
reward_per_sec = (remaining_seconds * old_reward_per_sec + reward) / duration
```

Every time a pool is touched (stake, unstake, claim, or a reward update), it brings its running total up to date:

```
acc_reward_per_token += elapsed_seconds * reward_per_sec * 1e18 / total_staked
```

Time stops counting at the end of the period, and nothing accrues while nobody is staked. Each staker stores a `reward_debt`, the part of `acc_reward_per_token` that was already accounted for when their stake last changed, so what they can claim is:

```
pending = staked * acc_reward_per_token / 1e18 - reward_debt + carried_over_pending
```

The 1e18 scale factor and the 256-bit intermediates keep precision when rewards are small and total stake is large.

For a front end, an APY estimate from the current numbers is:

```
APY = (monthly_rewards * 12) / (total_staked * token_price_in_sol) * 100
```

It's only an estimate: the rate changes with every reward update, and the APY changes with every stake and unstake.

## Instructions

| Instruction | Who can call it | What it does |
| --- | --- | --- |
| `initialize(governance, pool_creation_signers[3], reward_updation_signers[3])` | the hard-coded `INITIALIZATION_SIGNER` only, once | Creates the config account and the SOL vault |
| `update_contract_metadata(governance?, pool_creation_signers?, reward_updation_signers?)` | governance | Replaces any of the three roles |
| `create_pool()` | a pool creation signer | Creates the pool and its token account for a mint |
| `update_rewards(mint, reward, duration)` | a reward updation signer | Moves `reward` lamports into the vault and resets the pool's rate and end time |
| `stake(amount)` | anyone | Only while a reward period is running |
| `unstake(amount)` | the staker | Always allowed; earned rewards are kept for a later claim |
| `claim(mint)` | the staker | Pays out pending rewards from the vault (never below its rent-exempt minimum) |
| `pending_rewards(user, mint)` | anyone (view, call with `.view()` / simulate) | Returns what `claim` would pay right now |

Unused signer slots are set to the system program address (`1111…1111`), which nobody can sign for.

### Accounts (PDAs)

| Account | Seeds |
| --- | --- |
| `ContractMetadata` | `["contract_metadata"]` |
| `SolVault` | `["sol_vault"]` |
| `StakingPool` | `["staking_pool", mint]` |
| `Staker` | `["staker", mint, user]` |

Staked tokens sit in the pool PDA's associated token account.

## Things to know

- Rewards nobody earns stay in the vault. If a pool has a running period but nobody is staked, that stretch of rewards isn't carried forward. It's the usual MasterChef trade-off. The rounding dust from `reward / duration` stays in the vault too.
- One vault for all pools. The accounting is per pool, so a pool can't pay out more than it was funded, but the lamports themselves are shared.
- Classic SPL Token only. Pools use the original Token program, not Token-2022.
- `update_rewards` rejects a reward that's smaller than the duration (in lamports vs seconds), because the rate would round down to zero and the SOL would be stuck.

## Setup

Built with Anchor 0.30.1, Solana 2.0.23 and Rust 1.84.0 ([install guide](https://solana.com/docs/intro/installation)), plus Node.js and Yarn.

```sh
yarn install
```

Generate the four keypairs the tests and scripts use. They're gitignored.

```sh
solana-keygen new --outfile ./keys/payer.json
solana-keygen new --outfile ./keys/governance.json
solana-keygen new --outfile ./keys/poolCreationSigner.json
solana-keygen new --outfile ./keys/rewardUpdationSigner.json
```

Two things a fresh clone needs before the tests pass:

1. `initialize` only accepts the key in `INITIALIZATION_SIGNER` (`programs/pumpkin_staking/src/constants.rs`). Set it to the public key of your `keys/payer.json` (`solana-keygen pubkey keys/payer.json`).
2. `target/` isn't committed, so `anchor build` generates a new program keypair. Run `anchor keys sync` once so `declare_id!` and `Anchor.toml` match it.

```sh
anchor build
anchor test        # starts a local validator, deploys, runs tests/
```

The tests include a few real-time waits (rewards accrue per second), so a full run takes around half a minute.

## Deploying and running the admin scripts

Set `cluster = "devnet"` in `Anchor.toml`, then:

```sh
anchor deploy
anchor run initialize              # tasks/initialize.ts
anchor run createPool              # set MINT in tasks/createPool.ts first
anchor run topupReward             # set MINT, REWARD and REWARD_DURATION in tasks/topupReward.ts
anchor run updateContractMetadata
anchor run logContractMetadata
```

The scripts in `tasks/` talk to devnet and load the same keypairs from `keys/`.

## License

MIT
