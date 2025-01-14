import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PumpkinStaking } from "../target/types/pumpkin_staking";

import payerKey from "../keys/payer.json";
import governanceKey from "../keys/governance.json";
import poolCreationSignerKey from "../keys/poolCreationSigner.json";
import rewardUpdationSignerKey from "../keys/rewardUpdationSigner.json";

export const payer = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(payerKey)
);
export const governance = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(governanceKey)
);
export const poolCreationSigner = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(poolCreationSignerKey)
);
export const rewardUpdationSigner = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(rewardUpdationSignerKey)
);

anchor.setProvider(anchor.AnchorProvider.env());
export const connection = anchor.getProvider().connection;

export const program = anchor.workspace
  .PumpkinStaking as Program<PumpkinStaking>;

export const mint = anchor.web3.Keypair.generate();
export const user = anchor.web3.Keypair.generate();

export const [contractMetadata] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("contract_metadata")],
  program.programId
);

export const [stakingPool] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("staking_pool"), mint.publicKey.toBuffer()],
  program.programId
);

export const [staker] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("staker"), mint.publicKey.toBuffer(), user.publicKey.toBuffer()],
  program.programId
);

export const ZERO_ADDRESS = new anchor.web3.PublicKey(
  "11111111111111111111111111111111"
);

export const REWARD = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
export const REWARD_DURATION = new anchor.BN(10);
