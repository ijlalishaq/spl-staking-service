import * as anchor from "@coral-xyz/anchor";
import { airdrop } from "../helpers";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import {
  connection,
  program,
  governance,
  mint,
  user,
  staker,
  stakingPool,
} from "../constants";

describe("Staking and Unstaking", () => {
  let userAta;
  let initialBalance = new anchor.BN(1000000000 * 1e6); // 1 billion tokens
  let stakeAmount = new anchor.BN(500000000 * 1e6); // 500 million tokens
  let unstakeAmount = new anchor.BN(250000000 * 1e6); // 250 million tokens

  before(async () => {
    await Promise.all([
      airdrop(connection, governance),
      airdrop(connection, user),
    ]);

    const userAtaInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint.publicKey,
      user.publicKey
    );
    userAta = userAtaInfo.address;

    await mintTo(
      connection,
      governance,
      mint.publicKey,
      userAta,
      governance,
      initialBalance.toNumber()
    );
  });

  it("Should allow user to stake tokens", async () => {
    await program.methods
      .stake(stakeAmount)
      .accounts({
        user: user.publicKey,
        mint: mint.publicKey,
      })
      .signers([user])
      .rpc();

    const afterStake = await getAccount(connection, userAta);

    assert.equal(
      Number(afterStake.amount),
      initialBalance.sub(stakeAmount).toNumber(),
      "User balance after staking is incorrect"
    );

    const stakerAccount = await program.account.staker.fetch(staker);

    assert.equal(
      Number(afterStake.amount),
      stakerAccount.stakedAmount.toNumber(),
      "User staked balance is incorrect"
    );

    const poolAmountAfter = await program.account.stakingPool.fetch(
      stakingPool
    );

    assert.equal(
      Number(afterStake.amount),
      poolAmountAfter.totalTokenStaked.toNumber(),
      "Pool staked balance is incorrect"
    );
  });

  it("Should allow user to unstake tokens", async () => {
    await new Promise((res) => setTimeout(res, 5000)); // Simulate staking duration

    const beforeUnstake = await getAccount(connection, userAta);

    const stakedAmountBefore = (await program.account.staker.fetch(staker))
      .stakedAmount;

    const poolAmountBefore = (
      await program.account.stakingPool.fetch(stakingPool)
    ).totalTokenStaked;

    await program.methods
      .unstake(unstakeAmount)
      .accounts({
        user: user.publicKey,
        mint: mint.publicKey,
      })
      .signers([user])
      .rpc();

    const afterUnstake = await getAccount(connection, userAta);

    assert.equal(
      Number(afterUnstake.amount),
      Number(beforeUnstake.amount) + unstakeAmount.toNumber(),
      "User balance after unstaking is incorrect"
    );

    const stakedAmountAfter = (await program.account.staker.fetch(staker))
      .stakedAmount;

    assert.equal(
      unstakeAmount.toNumber(),
      stakedAmountBefore.sub(stakedAmountAfter).toNumber(),
      "User staked balance after unstaking is incorrect"
    );

    const poolAmountAfter = (
      await program.account.stakingPool.fetch(stakingPool)
    ).totalTokenStaked;

    assert.equal(
      unstakeAmount.toNumber(),
      poolAmountBefore.sub(poolAmountAfter).toNumber(),
      "Pool staked balance after unstaking is incorrect"
    );
  });

  it("Should fail to stake more tokens than user has", async () => {
    try {
      await program.methods
        .stake(new anchor.BN(2000000000 * 1e6)) // 2 billion tokens (more than user balance)
        .accounts({
          user: user.publicKey,
          mint: mint.publicKey,
        })
        .signers([user])
        .rpc();

      assert.fail("Staking should have failed due to insufficient balance");
    } catch {}
  });

  it("Should fail to stake zero tokens", async () => {
    try {
      await program.methods
        .stake(new anchor.BN(0))
        .accounts({
          user: user.publicKey,
          mint: mint.publicKey,
        })
        .signers([user])
        .rpc();

      assert.fail("Staking should have failed due to zero amount");
    } catch {}
  });

  it("Should fail to unstake more tokens than staked", async () => {
    try {
      await program.methods
        .unstake(new anchor.BN(1000000000 * 1e6)) // 1 billion tokens (more than staked)
        .accounts({
          user: user.publicKey,
          mint: mint.publicKey,
        })
        .signers([user])
        .rpc();

      assert.fail(
        "Unstaking should have failed due to exceeding staked amount"
      );
    } catch {}
  });
});
