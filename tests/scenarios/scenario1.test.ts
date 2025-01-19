import * as anchor from "@coral-xyz/anchor";
import { airdrop } from "../helpers";
import { assert } from "chai";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  connection,
  program,
  governance,
  poolCreationSigner,
  REWARD_DURATION,
  REWARD,
  rewardUpdationSigner,
} from "../constants";

describe("Multi-User Staking & Claiming with Share Difference", () => {
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const mintKeypair = anchor.web3.Keypair.generate();
  const mint = mintKeypair.publicKey;

  let user1Ata, user2Ata;

  const [stakingPool] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), mint.toBuffer()],
    program.programId
  );

  const [staker1] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staker"), mint.toBuffer(), user1.publicKey.toBuffer()],
    program.programId
  );

  const [staker2] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staker"), mint.toBuffer(), user2.publicKey.toBuffer()],
    program.programId
  );

  let totalStake = new anchor.BN(1_000_000_000 * 1e6); // Total staked: 1B tokens
  let user1Stake = new anchor.BN(800_000_000 * 1e6); // Total staked: 800M tokens
  let user2Stake = new anchor.BN(200_000_000 * 1e6); // Total staked: 200M tokens

  before(async () => {
    await airdrop(connection, governance);
    await airdrop(connection, poolCreationSigner);
    await airdrop(connection, rewardUpdationSigner);
    await airdrop(connection, user1);
    await airdrop(connection, user2);

    // Create a fresh mint for this test
    await createMint(
      connection,
      governance,
      governance.publicKey,
      null,
      6,
      mintKeypair
    );

    // Create a new staking pool for the mint
    await program.methods
      .createPool()
      .accounts({
        payer: poolCreationSigner.publicKey,
        poolCreationSigner: poolCreationSigner.publicKey,
        mint: mint,
      })
      .signers([poolCreationSigner])
      .rpc();

    // Create user token accounts for this mint
    user1Ata = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        user1,
        mint,
        user1.publicKey
      )
    ).address;
    user2Ata = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        user2,
        mint,
        user2.publicKey
      )
    ).address;

    // Mint tokens to users
    await mintTo(
      connection,
      governance,
      mint,
      user1Ata,
      governance,
      user1Stake.toNumber()
    );
    await mintTo(
      connection,
      governance,
      mint,
      user2Ata,
      governance,
      user2Stake.toNumber()
    );
  });

  it("Should allow multiple users to stake", async () => {
    await program.methods
      .updateRewards(mint, REWARD, REWARD_DURATION)
      .accounts({
        payer: rewardUpdationSigner.publicKey,
        rewardUpdationSigner: rewardUpdationSigner.publicKey,
      })
      .signers([rewardUpdationSigner])
      .rpc();

    await program.methods
      .stake(user1Stake)
      .accounts({ user: user1.publicKey, mint })
      .signers([user1])
      .rpc();

    await program.methods
      .stake(user2Stake)
      .accounts({ user: user2.publicKey, mint })
      .signers([user2])
      .rpc();
  });

  it("Should distribute rewards proportionally over time", async () => {
    // Waiting 10 seconds for rewards to accumulate
    await new Promise((res) => setTimeout(res, 10_000));

    const expectedUser1Share =
      user1Stake.divn(1e6).toNumber() / totalStake.divn(1e6).toNumber();
    const expectedUser2Share =
      user2Stake.divn(1e6).toNumber() / totalStake.divn(1e6).toNumber();

    const beforeUser1 = await connection.getBalance(user1.publicKey);
    const beforeUser2 = await connection.getBalance(user2.publicKey);

    await program.methods
      .claim(mint)
      .accounts({ user: user1.publicKey })
      .signers([user1])
      .rpc();
    await program.methods
      .claim(mint)
      .accounts({ user: user2.publicKey })
      .signers([user2])
      .rpc();

    const afterUser1 = await connection.getBalance(user1.publicKey);
    const afterUser2 = await connection.getBalance(user2.publicKey);

    const user1ReceivedRewards = new anchor.BN(afterUser1)
      .sub(new anchor.BN(beforeUser1))
      .toNumber();
    const user2ReceivedRewards = new anchor.BN(afterUser2)
      .sub(new anchor.BN(beforeUser2))
      .toNumber();

    assert.isAbove(
      user1ReceivedRewards,
      user2ReceivedRewards,
      "Incorrect rewards, user1 reward should be greater than user2"
    );

    const totalDistributedReward = user1ReceivedRewards + user2ReceivedRewards;

    assert.isAtLeast(
      user1ReceivedRewards / totalDistributedReward,
      expectedUser1Share,
      "Incorrect rewards for User 1"
    );

    assert.isAtMost(
      user2ReceivedRewards / totalDistributedReward,
      expectedUser2Share,
      "Incorrect rewards for User 2"
    );
  });

  it("Should allow users to unstake and verify balances", async () => {
    await program.methods
      .unstake(user1Stake)
      .accounts({
        user: user1.publicKey,
        mint,
      })
      .signers([user1])
      .rpc();

    await program.methods
      .unstake(user2Stake)
      .accounts({
        user: user2.publicKey,
        mint,
      })
      .signers([user2])
      .rpc();

    const user1StakeAccount = await program.account.staker.fetch(staker1);
    const user2StakeAccount = await program.account.staker.fetch(staker2);

    const user1Balance = await getAccount(connection, user1Ata);
    const user2Balance = await getAccount(connection, user2Ata);

    assert.equal(
      user1StakeAccount.stakedAmount.toNumber(),
      0,
      "User 1 unstake incorrect token balance."
    );

    assert.equal(
      Number(user1Balance.amount),
      user1Stake.toNumber(),
      "User 1 unstake incorrect token balance."
    );

    assert.equal(
      user2StakeAccount.stakedAmount.toNumber(),
      0,
      "User 2 unstake incorrect token balance."
    );

    assert.equal(
      Number(user2Balance.amount),
      user2Stake.toNumber(),
      "User 2 unstake incorrect token balance."
    );
  });
});
