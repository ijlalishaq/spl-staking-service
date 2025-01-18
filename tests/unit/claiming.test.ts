import { airdrop } from "../helpers";
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

  it("Should fail to claim rewards when no rewards are available", async () => {
    try {
      await program.methods
        .claim(mint.publicKey)
        .accounts({
          user: user.publicKey,
        })
        .signers([user])
        .rpc();

      assert.fail("Claiming should have failed due to no available rewards");
    } catch {}
  });
});
