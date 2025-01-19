import * as anchor from "@coral-xyz/anchor";
import { connection, program, poolCreationSigner } from "./constants";

const MINT = new anchor.web3.PublicKey(
  "8RuwbHWoh6A1KGbKJrsHDKmWXwHrQp4raAp639XXpkiN"
);

async function createPool() {
  let tx = await program.methods
    .createPool()
    .accounts({
      payer: poolCreationSigner.publicKey,
      poolCreationSigner: poolCreationSigner.publicKey,
      mint: MINT,
    })
    .signers([poolCreationSigner])
    .rpc();

  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx,
  });

  const [stakingPool] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), MINT.toBuffer()],
    program.programId
  );

  const stakingPoolAccount = await program.account.stakingPool.fetch(
    stakingPool
  );

  console.log(
    "stakingPoolAccount => ",
    stakingPoolAccount.accRewardPerToken.toString()
  );
}

createPool();
