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

async function initialize() {
  const tx = await program.methods
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

initialize();
