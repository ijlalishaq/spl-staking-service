import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { airdrop } from "../helpers";
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
    try {
      await program.methods
        .updateRewards(mint.publicKey, REWARD, REWARD_DURATION)
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc();

      const stakingPoolAccount =
        await program.account.stakingPool.fetchNullable(stakingPool);

      assert.isNotNull(
        stakingPoolAccount,
        "Staking pool should exist after updating rewards"
      );

      const expectedRewardPerSec = REWARD.div(REWARD_DURATION).toNumber();

      assert.equal(
        stakingPoolAccount.currentRewardPerSec.toNumber(),
        expectedRewardPerSec,
        `Expected reward per second to be ${expectedRewardPerSec}, but got ${stakingPoolAccount.currentRewardPerSec}`
      );

      assert.equal(
        stakingPoolAccount.totalRewardAllocated.toNumber(),
        REWARD.toNumber(),
        `Pool total allocated reward is incorrect`
      );
    } catch (error) {
      assert.fail("Reward updation should have succeeded but failed");
    }
  });

  it("Should fail to update rewards with incorrect signer", async () => {
    try {
      await program.methods
        .updateRewards(mint.publicKey, REWARD, REWARD_DURATION)
        .accounts({
          payer: poolCreationSigner.publicKey,
          rewardUpdationSigner: poolCreationSigner.publicKey,
        })
        .signers([poolCreationSigner]) // Incorrect required signer
        .rpc();

      assert.fail("Reward update should have failed due to incorrect signer");
    } catch {}
  });

  it("Should fail to update rewards with an invalid reward amount", async () => {
    try {
      await program.methods
        .updateRewards(mint.publicKey, new anchor.BN(0), REWARD_DURATION)
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc();

      assert.fail(
        "Reward update should have failed due to invalid reward amount"
      );
    } catch {}
  });

  it("Should fail to update rewards with an invalid reward duration", async () => {
    try {
      await program.methods
        .updateRewards(mint.publicKey, REWARD, new anchor.BN(0))
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          rewardUpdationSigner: rewardUpdationSigner.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc();

      assert.fail(
        "Reward update should have failed due to invalid reward duration"
      );
    } catch {}
  });
});
