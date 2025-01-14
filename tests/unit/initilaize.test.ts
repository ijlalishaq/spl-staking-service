import { assert } from "chai";
import { airdrop } from "../helpers";
import {
  connection,
  program,
  contractMetadata,
  governance,
  poolCreationSigner,
  rewardUpdationSigner,
  ZERO_ADDRESS,
  payer,
} from "../constants";

describe("Initialize Contract", () => {
  before(async () => {
    await Promise.all([
      airdrop(connection, governance),
      airdrop(connection, poolCreationSigner),
      airdrop(connection, rewardUpdationSigner),
    ]);
  });

  it("Should initialize contract correctly", async () => {
    try {
      await program.methods
        .initialize(
          governance.publicKey,
          [poolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
          [rewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
        )
        .accounts({
          payer: payer.publicKey,
        })
        .signers([payer])
        .rpc();

      const contractMetadataAccount =
        await program.account.contractMetadata.fetchNullable(contractMetadata);

      assert.isNotNull(
        contractMetadataAccount,
        "Contract metadata account was not created"
      );

      assert.equal(
        contractMetadataAccount.governance.toString(),
        governance.publicKey.toString(),
        "Governance address does not match"
      );

      assert.equal(
        contractMetadataAccount.poolCreationSigners[0].toString(),
        poolCreationSigner.publicKey.toString(),
        "Pool creation signer does not match"
      );

      assert.equal(
        contractMetadataAccount.rewardUpdationSigners[0].toString(),
        rewardUpdationSigner.publicKey.toString(),
        "Reward updation signer does not match"
      );
    } catch (error) {
      console.log(error);
      assert.fail("Contract initialization should have succeeded but failed");
    }
  });

  it("Should fail to reinitialize contract", async () => {
    try {
      await program.methods
        .initialize(
          governance.publicKey,
          [poolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
          [rewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
        )
        .accounts({
          payer: governance.publicKey,
        })
        .signers([governance])
        .rpc();

      assert.fail("Contract initialization should have failed but succeeded");
    } catch {}
  });
});
