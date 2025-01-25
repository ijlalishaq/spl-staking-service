import * as anchor from "@coral-xyz/anchor";
import { airdrop, expectError } from "../helpers";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";
import { connection, program, mint, user } from "../constants";

describe("Claiming Rewards", () => {
  let userAta;

  before(async () => {
    await airdrop(connection, user);

    const userAtaInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint.publicKey,
      user.publicKey
    );
    userAta = userAtaInfo.address;
  });

  it("Should claim pending rewards", async () => {
    // Balance before
    const beforeClaim = await connection.getBalance(user.publicKey);

    await program.methods
      .claim(mint.publicKey)
      .accounts({
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    // Balance after
    const afterClaim = await connection.getBalance(user.publicKey);
    assert.isAbove(
      Number(afterClaim),
      Number(beforeClaim),
      "User balance did not increase after claiming rewards"
    );
  });

  // Claiming with nothing pending succeeds and pays out 0, so the failure case
  // to test is a wallet that never staked in this pool (no staker account).
  it("Should fail to claim for a user who never staked", async () => {
    const stranger = anchor.web3.Keypair.generate();
    await airdrop(connection, stranger);

    await expectError(
      program.methods
        .claim(mint.publicKey)
        .accounts({
          user: stranger.publicKey,
        })
        .signers([stranger])
        .rpc(),
      "AccountNotInitialized"
    );
  });
});
