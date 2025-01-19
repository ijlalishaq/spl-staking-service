import * as anchor from "@coral-xyz/anchor";
import * as IDL from "../target/idl/pumpkin_staking.json";
import { PumpkinStaking } from "../target/types/pumpkin_staking";

import payerKey from "../keys/payer.json";
import governanceKey from "../keys/governance.json";
import poolCreationSignerKey from "../keys/poolCreationSigner.json";
import rewardUpdationSignerKey from "../keys/rewardUpdationSigner.json";

const network = anchor.web3.clusterApiUrl("devnet");
export const connection = new anchor.web3.Connection(network);

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

export const program = new anchor.Program<PumpkinStaking>(
  IDL as PumpkinStaking,
  new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: "confirmed",
  })
);

export const [contractMetadata] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("contract_metadata")],
  program.programId
);

export const [solVault] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("sol_vault")],
  program.programId
);

export const ZERO_ADDRESS = new anchor.web3.PublicKey(
  "11111111111111111111111111111111"
);
