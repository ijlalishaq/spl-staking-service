import * as anchor from "@coral-xyz/anchor";

export async function airdrop(
  connection: anchor.web3.Connection,
  keypair: anchor.web3.Keypair
) {
  const amount = anchor.web3.LAMPORTS_PER_SOL * 100;
  const tx = await connection.requestAirdrop(keypair.publicKey, amount);
  await connection.confirmTransaction(tx);
}
