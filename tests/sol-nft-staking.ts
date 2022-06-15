import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolNftStaking } from "../target/types/sol_nft_staking";

describe("sol-nft-staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolNftStaking as Program<SolNftStaking>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
