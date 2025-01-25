import * as anchor from "@coral-xyz/anchor";
import { airdrop, expectError } from "../helpers";
import { assert } from "chai";
import {
  connection,
  program,
  contractMetadata,
  governance,
  ZERO_ADDRESS,
  poolCreationSigner,
  rewardUpdationSigner,
} from "../constants";

describe("Governance Updation", () => {
  const newGovernance = anchor.web3.Keypair.generate();
  const newPoolCreationSigner = anchor.web3.Keypair.generate();
  const newRewardUpdationSigner = anchor.web3.Keypair.generate();

  before(async () => {
    await airdrop(connection, governance);
  });

  it("Should update contract metadata", async () => {
    await program.methods
      .updateContractMetadata(
        newGovernance.publicKey,
        [newPoolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
        [newRewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
      )
      .accounts({
        governance: governance.publicKey,
      })
      .signers([governance])
      .rpc();

    const contractMetadataAccount =
      await program.account.contractMetadata.fetch(contractMetadata);

    assert.equal(
      contractMetadataAccount.governance.toString(),
      newGovernance.publicKey.toString(),
      "Governance was not updated correctly"
    );

    assert.equal(
      contractMetadataAccount.poolCreationSigners[0].toString(),
      newPoolCreationSigner.publicKey.toString(),
      "Pool creation signer was not updated correctly"
    );

    assert.equal(
      contractMetadataAccount.rewardUpdationSigners[0].toString(),
      newRewardUpdationSigner.publicKey.toString(),
      "Reward updation signer was not updated correctly"
    );

    await program.methods
      .updateContractMetadata(
        governance.publicKey,
        [poolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
        [rewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
      )
      .accounts({
        governance: newGovernance.publicKey,
      })
      .signers([newGovernance])
      .rpc();
  });

  it("Should fail to update contract metadata with incorrect governance", async () => {
    const unauthorizedUser = anchor.web3.Keypair.generate();

    await expectError(
      program.methods
        .updateContractMetadata(
          newGovernance.publicKey,
          [newPoolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
          [newRewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
        )
        .accounts({
          governance: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc(),
      "IncorrectGovernance"
    );
  });
});
