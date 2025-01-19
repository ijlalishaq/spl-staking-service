import * as anchor from "@coral-xyz/anchor";
import { airdrop } from "../helpers";
import { assert } from "chai";
import {
  createMint,
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

describe("Multi-User Staking & Claiming with Time Difference", () => {
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

  let user1Stake = new anchor.BN(1_000_000 * 1e6); // 1M tokens
  let user2Stake = new anchor.BN(1_000_000 * 1e6); // 1M tokens

  before(async () => {
    await airdrop(connection, governance);
    await airdrop(connection, poolCreationSigner);
    await airdrop(connection, rewardUpdationSigner);
    await airdrop(connection, user1);
    await airdrop(connection, user2);

    await createMint(
      connection,
      governance,
      governance.publicKey,
      null,
      6,
      mintKeypair
    );

    await program.methods
      .createPool()
      .accounts({
        payer: poolCreationSigner.publicKey,
        poolCreationSigner: poolCreationSigner.publicKey,
        mint: mint,
      })
      .signers([poolCreationSigner])
      .rpc();

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

  it("Should allow the first user to stake, wait 8 seconds before the second user stakes", async () => {
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

    // Wait 8 seconds for rewards to accumulate
    await new Promise((res) => setTimeout(res, 8_000));

    await program.methods
      .stake(user2Stake)
      .accounts({ user: user2.publicKey, mint })
      .signers([user2])
      .rpc();
  });

  it("Should distribute rewards proportionally to staking duration", async () => {
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

    const totalRewards = user1ReceivedRewards + user2ReceivedRewards;

    const user1Portion = (user1ReceivedRewards / totalRewards) * 100;
    const user2Portion = (user2ReceivedRewards / totalRewards) * 100;

    assert.isAtLeast(
      user1Portion,
      90,
      "User 1 should receive atleast 90% of the rewards."
    );

    assert.isAtMost(
      user2Portion,
      10,
      "User 2 should receive atmost 10% of the rewards."
    );
  });
});
