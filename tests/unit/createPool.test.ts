import * as anchor from "@coral-xyz/anchor";
import { airdrop, expectError } from "../helpers";
import { assert } from "chai";
import { createMint } from "@solana/spl-token";
import {
  connection,
  program,
  stakingPool,
  mint,
  governance,
  poolCreationSigner,
  rewardUpdationSigner,
} from "../constants";

describe("Create Staking Pool", () => {
  before(async () => {
    await Promise.all([
      airdrop(connection, governance),
      airdrop(connection, poolCreationSigner),
      airdrop(connection, rewardUpdationSigner),
    ]);

    await createMint(
      connection,
      governance,
      governance.publicKey,
      null,
      6,
      mint
    );
  });

  it("Should create a staking pool successfully", async () => {
    try {
      await program.methods
        .createPool()
        .accounts({
          payer: poolCreationSigner.publicKey,
          poolCreationSigner: poolCreationSigner.publicKey,
          mint: mint.publicKey,
        })
        .signers([poolCreationSigner])
        .rpc();

      const stakingPoolAccount =
        await program.account.stakingPool.fetchNullable(stakingPool);

      assert.isNotNull(
        stakingPoolAccount,
        "Staking pool account should be created"
      );

      // Validate mint
      assert.isTrue(
        stakingPoolAccount.mint.equals(mint.publicKey),
        "Incorrect mint public key in staking pool"
      );
    } catch (error) {
      assert.fail("Pool creation should have succeeded but failed");
    }
  });

  it("Should fail to create staking pool with incorrect signer", async () => {
    // A fresh mint, so the only thing wrong is the signer (not an existing pool).
    const otherMint = anchor.web3.Keypair.generate();
    await createMint(
      connection,
      governance,
      governance.publicKey,
      null,
      6,
      otherMint
    );

    await expectError(
      program.methods
        .createPool()
        .accounts({
          payer: rewardUpdationSigner.publicKey,
          poolCreationSigner: rewardUpdationSigner.publicKey,
          mint: otherMint.publicKey,
        })
        .signers([rewardUpdationSigner])
        .rpc(),
      "IncorrectPoolCreationSigner"
    );
  });

  it("Should fail to create a duplicate staking pool", async () => {
    await expectError(
      program.methods
        .createPool()
        .accounts({
          payer: poolCreationSigner.publicKey,
          poolCreationSigner: poolCreationSigner.publicKey,
          mint: mint.publicKey,
        })
        .signers([poolCreationSigner])
        .rpc()
    );
  });
});
