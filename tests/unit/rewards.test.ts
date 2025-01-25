import * as anchor from "@coral-xyz/anchor";
import { createMint } from "@solana/spl-token";
import { assert } from "chai";
import { airdrop, expectError } from "../helpers";
import {
  connection,
  program,
  stakingPool,
  rewardUpdationSigner,
  REWARD_DURATION,
  REWARD,
  mint,
  poolCreationSigner,
} from "../constants";

describe("Reward Updation", () => {
  before(async () => {
    await airdrop(connection, rewardUpdationSigner);
  });

  it("Should update rewards successfully", async () => {
    await program.methods
      .updateRewards(mint.publicKey, REWARD, REWARD_DURATION)
      .accounts({
        payer: rewardUpdationSigner.publicKey,
        rewardUpdationSigner: rewardUpdationSigner.publicKey,
      })
      .signers([rewardUpdationSigner])
      .rpc();

    const stakingPoolAccount = await program.account.stakingPool.fetch(
      stakingPool
    );

    const expectedRewardPerSec = REWARD.div(REWARD_DURATION).toNumber();

    assert.equal(
      stakingPoolAccount.currentRewardPerSec.toNumber(),
      expectedRewardPerSec,
      "Reward per second is incorrect"
    );

    assert.equal(
      stakingPoolAccount.totalRewardAllocated.toNumber(),
      REWARD.toNumber(),
      "Pool total allocated reward is incorrect"
    );
  });

  it("Should fail to update rewards with incorrect signer", async () => {
    await expectError(
      program.methods
        .updateRewards(mint.publicKey, REWARD, REWARD_DURATION)
        .accounts({
          payer: poolCreationSigner.publicKey,
          rewardUpdationSigner: poolCreationSigner.publicKey,
        })
        .signers([poolCreationSigner])
        .rpc(),
      "IncorrectRewardUpdationSigner"
    );
  });

  it("Should fail to update rewards with an invalid reward amount", async () => {
    await expectError(
      program.methods
        .updateRewards(mint.publicKey, new anchor.BN(0), REWARD_DURATION)
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc(),
      "ZeroReward"
    );
  });

  it("Should fail to update rewards with an invalid reward duration", async () => {
    await expectError(
      program.methods
        .updateRewards(mint.publicKey, REWARD, new anchor.BN(0))
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc(),
      "ZeroRewardDuration"
    );
  });

  it("Should fail when the reward rounds down to zero per second", async () => {
    // 5 lamports over 10 seconds is 0 lamports per second after integer division.
    // Use a fresh pool so the reward left in the pool above isn't carried over.
    const otherMint = anchor.web3.Keypair.generate();
    await airdrop(connection, poolCreationSigner);
    await createMint(
      connection,
      poolCreationSigner,
      poolCreationSigner.publicKey,
      null,
      6,
      otherMint
    );
    await program.methods
      .createPool()
      .accounts({
        payer: poolCreationSigner.publicKey,
        poolCreationSigner: poolCreationSigner.publicKey,
        mint: otherMint.publicKey,
      })
      .signers([poolCreationSigner])
      .rpc();

    await expectError(
      program.methods
        .updateRewards(otherMint.publicKey, new anchor.BN(5), new anchor.BN(10))
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc(),
      "RewardTooSmallForDuration"
    );
  });
});
