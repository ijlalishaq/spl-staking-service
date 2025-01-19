import { program, contractMetadata, solVault } from "./constants";

async function update() {
  const contractMetadataAccount = await program.account.contractMetadata.fetch(
    contractMetadata
  );

  console.log("governance => ", contractMetadataAccount.governance.toString());
  console.log("solVault => ", solVault.toString());
  console.log(
    "pool creation signers => \n",
    contractMetadataAccount.poolCreationSigners
      .map((e) => e.toString())
      .join(", ")
  );
  console.log(
    "reward updation signers => \n",
    contractMetadataAccount.rewardUpdationSigners
      .map((e) => e.toString())
      .join(", ")
  );
}

update();
