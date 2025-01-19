import * as anchor from "@coral-xyz/anchor";
import { connection, program, rewardUpdationSigner } from "./constants";

export const MINT = new anchor.web3.PublicKey(
  "8RuwbHWoh6A1KGbKJrsHDKmWXwHrQp4raAp639XXpkiN"
);
const REWARD = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
const REWARD_DURATION = new anchor.BN(86400 * 30);

async function topupReward() {
  let tx = await program.methods
    .updateRewards(MINT, REWARD, REWARD_DURATION)
    .accounts({
      payer: rewardUpdationSigner.publicKey,
      rewardUpdationSigner: rewardUpdationSigner.publicKey,
    })
    .signers([rewardUpdationSigner])
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

topupReward();
