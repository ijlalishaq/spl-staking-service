import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

export async function airdrop(
  connection: anchor.web3.Connection,
  keypair: anchor.web3.Keypair
) {
  const amount = anchor.web3.LAMPORTS_PER_SOL * 100;
  const tx = await connection.requestAirdrop(keypair.publicKey, amount);
  await connection.confirmTransaction(tx);
}

// Asserts that `tx` is rejected, optionally with a specific Anchor error code.
// Don't use `try { ...; assert.fail() } catch {}` for this: the empty catch also
// swallows the assert.fail, so the test can never fail.
export async function expectError(tx: Promise<unknown>, code?: string) {
  let error: unknown;
  try {
    await tx;
  } catch (e) {
    error = e;
  }
  assert.isDefined(error, "Expected the transaction to fail, but it succeeded");
  if (code) {
    const actual =
      error instanceof anchor.AnchorError
        ? error.error.errorCode.code
        : String(error);
    assert.include(
      actual,
      code,
      `Failed with the wrong error: ${String(error)}`
    );
  }
}
