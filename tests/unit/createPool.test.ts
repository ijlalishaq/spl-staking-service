import { airdrop } from "../helpers";
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
    try {
      await program.methods
        .createPool()
        .accounts({
          payer: poolCreationSigner.publicKey,
          poolCreationSigner: rewardUpdationSigner.publicKey,
          mint: mint.publicKey,
        })
        .signers([rewardUpdationSigner]) // Incorrect required signer
        .rpc();

      assert.fail(
        "Staking pool creation should have failed due to incorrect signer"
      );
    } catch {}
  });

  it("Should fail to create a duplicate staking pool", async () => {
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

      assert.fail("Duplicate staking pool creation should have failed");
    } catch {}
  });
});
