import {
  connection,
  program,
  contractMetadata,
  solVault,
  payer,
  governance,
  poolCreationSigner,
  rewardUpdationSigner,
  ZERO_ADDRESS,
} from "./constants";

async function update() {
  // set fields to update
  const newGovernance = governance;
  const newPoolCreationSigner = poolCreationSigner;
  const newRewardUpdationSigner = rewardUpdationSigner;

  const tx = await program.methods
    .updateContractMetadata(
      newGovernance.publicKey,
      [newPoolCreationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS],
      [newRewardUpdationSigner.publicKey, ZERO_ADDRESS, ZERO_ADDRESS]
    )
    .accounts({})
    .signers([payer])
    .rpc();

  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx,
  });

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
