import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolNftStaking } from "../target/types/sol_nft_staking";
import * as splToken from "@solana/spl-token";
import { expect } from "chai";
import { programs, actions } from "@metaplex/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";

describe("sol-nft-staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  console.log(provider.wallet.pubkey);

  const solNftStakingProgram = anchor.workspace
    .SolNftStaking as Program<SolNftStaking>;
  const systemProgram = anchor.web3.SystemProgram.programId;
  const rentSysvar = anchor.web3.SYSVAR_RENT_PUBKEY;
  const clockSysvar = anchor.web3.SYSVAR_CLOCK_PUBKEY;

  const mintNFT = async (
    connection: anchor.web3.Connection,
    owner: anchor.web3.Keypair,
    creator: anchor.web3.Keypair
  ): Promise<[splToken.Token, anchor.web3.PublicKey]> => {
    console.log("creating NFT mint");

    const mintkeypair = anchor.web3.Keypair.generate();
    const mintBalance = await splToken.Token.getMinBalanceRentForExemptMint(
      connection
    );

    const tx = new anchor.web3.Transaction();
    //add create account instruction
    tx.add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: owner.publicKey,
        newAccountPubkey: mintkeypair.publicKey,
        lamports: mintBalance,
        space: splToken.MintLayout.span,
        programId: splToken.TOKEN_PROGRAM_ID,
      })
    );
    //add init mint instruction
    tx.add(
      splToken.Token.createInitMintInstruction(
        splToken.TOKEN_PROGRAM_ID,
        mintkeypair.publicKey,
        0,
        owner.publicKey,
        null
      )
    );

    //add create token account instruction
    const nftTokenAccount = await splToken.Token.getAssociatedTokenAddress(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      mintkeypair.publicKey,
      owner.publicKey,
      false
    );
    tx.add(
      splToken.Token.createAssociatedTokenAccountInstruction(
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        splToken.TOKEN_PROGRAM_ID,
        mintkeypair.publicKey,
        nftTokenAccount,
        owner.publicKey,
        owner.publicKey
      )
    );

    //add mint to instruction
    tx.add(
      splToken.Token.createMintToInstruction(
        splToken.TOKEN_PROGRAM_ID,
        mintkeypair.publicKey,
        nftTokenAccount,
        owner.publicKey,
        [],
        1
      )
    );

    const txSig = await connection.sendTransaction(tx, [owner, mintkeypair]);
    await connection.confirmTransaction(txSig, "confirmed");

    //create metadata
    const metadataTx = await actions.createMetadata({
      connection,
      wallet: new anchor.Wallet(owner),
      editionMint: mintkeypair.publicKey,
      updateAuthority: creator.publicKey,
      metadataData: new programs.metadata.MetadataDataData({
        name: "testy #420",
        symbol: "",
        uri: "testing",
        sellerFeeBasisPoints: 0,
        creators: [
          new programs.metadata.Creator({
            address: creator.publicKey.toBase58(),
            verified: false,
            share: 100,
          }),
        ],
      }),
    });
    await connection.confirmTransaction(metadataTx, "confirmed");

    const signTx = await actions.signMetadata({
      connection,
      editionMint: mintkeypair.publicKey,
      wallet: new anchor.Wallet(owner),
      signer: creator,
    });
    await connection.confirmTransaction(signTx, "confirmed");

    const nftMint = new splToken.Token(
      connection,
      mintkeypair.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      owner
    );

    //remove minting authority
    nftMint.setAuthority(mintkeypair.publicKey, null, "MintTokens", owner, []);

    return [nftMint, nftTokenAccount];
  };

  describe("end to end test", async () => {
    const owner = anchor.web3.Keypair.generate();
    const creator = anchor.web3.Keypair.generate();
    const collectionName = "testy";
    
    let [rewarder, rewarderBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(collectionName),
          solNftStakingProgram.programId.toBuffer(),
          Buffer.from("rewarder"),
        ],
        solNftStakingProgram.programId
      );
    let [rewardAuthority, rewardAuthorityBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(collectionName),
          solNftStakingProgram.programId.toBuffer(),
          Buffer.from("rewarder"),
          rewarder.toBuffer(),
        ],
        solNftStakingProgram.programId
      );
    let [stakeAccount, stakeAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(collectionName),
          solNftStakingProgram.programId.toBuffer(),
          Buffer.from("stake_account"),
          rewarder.toBuffer(),
          owner.publicKey.toBuffer(),
        ],
        solNftStakingProgram.programId
      );

    let [vaultAccount, vaultAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          solNftStakingProgram.programId.toBuffer(),
          Buffer.from("vault_account"),
          owner.publicKey.toBuffer(),
        ],
        solNftStakingProgram.programId
      );

    const rewardRate = 3600 * 24;
    const lockingPeriod = 0;
    let rewardMint = null;
    let rewardTokenAccount = null;
    let nftMint = null;
    let nftTokenAccount = null;

    before(async () => {
      console.log("airdropping 1 sol to owner");
      //airdrop tokens
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(owner.publicKey, 1000000000),
        "confirmed"
      );
      console.log("owner address : ",owner.publicKey.toString())
    
      console.log("creating reward mint");
      rewardMint = await splToken.Token.createMint(
        provider.connection,
        owner, //payer
        rewardAuthority, //mint authority
        null, //freeze authority
        3, //deicmals
        splToken.TOKEN_PROGRAM_ID
      );

      console.log("creating reward token account");
      rewardTokenAccount = await rewardMint.createAssociatedTokenAccount(
        owner.publicKey
      );

      console.log("minting NFT");
      [nftMint, nftTokenAccount] = await mintNFT(
        provider.connection,
        owner,
        creator
      );

    });

    it("initializes a rewarder", async () => {
      const creators = [
        { address: creator.publicKey, verified: true, share: 100 },
      ];

      await solNftStakingProgram.rpc.initializeRewarder(
        rewarderBump,
        rewardAuthorityBump,
        new anchor.BN(rewardRate),
        Buffer.from(collectionName),
        creators,
        creator.publicKey,
        true,
        {
          accounts: {
            rewarder: rewarder,
            authority: owner.publicKey,
            rewardAuthority: rewardAuthority,
            rewardMint: rewardMint.publicKey,
            systemProgram,
            rent: rentSysvar,
          },
          signers: [owner],
        }
      );
    });

    it("initializes a valut", async () => {
      await solNftStakingProgram.rpc.initializeValut(
        vaultAccountBump,
        {
        accounts: {
          owner: owner.publicKey,
          vaultAccount,
          rewardMint: rewardMint.publicKey,
          systemProgram,
          rent: rentSysvar,
        },
        signers: [owner],
      });
    });

    it("initialized a stake account", async () => {
      await solNftStakingProgram.rpc.initializeStakeAccount(stakeAccountBump, {
        accounts: {
          owner: owner.publicKey,
          stakeAccount,
          rewarder,
          systemProgram,
          rent: rentSysvar,
        },
        signers: [owner],
      });
    });

    it("stakes an NFT", async () => {
      await solNftStakingProgram.rpc.updateRewardRate(
        new anchor.BN(rewardRate),
        [nftMint.publicKey],
        {
         accounts: {
          rewarder:rewarder,
          authority: owner.publicKey,
         },
         signers: [owner],
        }
      );
      console.log("nft whitelist address success");

      const nftMetadata = await Metadata.getPDA(nftMint.publicKey);
      console.log("nftMetadata->", nftMetadata);
      await solNftStakingProgram.rpc.stakeNft(
        new anchor.BN(lockingPeriod),
        {
          accounts: {
            owner: owner.publicKey,
            rewarder,
            rewardAuthority,
            stakeAccount,
            rewardMint: rewardMint.publicKey,
            rewardTokenAccount,
            vaultAccount: vaultAccount,
            nftMint: nftMint.publicKey,
            nftTokenAccount,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            systemProgram,
            rent: rentSysvar,
            clock: clockSysvar,
          },
          remainingAccounts: [
            { pubkey: nftMetadata, isSigner: false, isWritable: false },
          ],
          signers: [owner],
        }
      );
 
      let nftAccount = await nftMint.getAccountInfo(nftTokenAccount);
      expect(nftAccount.owner.toBase58()).to.equal(stakeAccount.toBase58());

    });

    it("claims pending rewards", async () => {
      console.log(
        "confirming 2 seconds on clock sysvar to let rewards accumulate"
      );
      const seconds = 2;
      //wait to allow rewards to accumulate
      await sleep(provider.connection, seconds);

      await solNftStakingProgram.rpc.claim({
        accounts: {
          owner: owner.publicKey,
          rewarder,
          rewardAuthority,
          stakeAccount,
          rewardMint: rewardMint.publicKey,
          rewardAccount: rewardTokenAccount,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          clock: clockSysvar,
        },
        signers: [owner],
      });

      const rewardTokenAccountData = await rewardMint.getAccountInfo(
        rewardTokenAccount
      );
      console.log("reward amount:",rewardTokenAccountData.amount.toNumber());
      // expect(rewardTokenAccountData.amount.toNumber()).to.equal(
      //   seconds * rewardRate /3600 /24 * 125 /100 
      // );
    });

    it("unstakes an NFT", async () => {
      //sleep one more second to check that we claim pending rewards on unstake
      await sleep(provider.connection, 2);

      await solNftStakingProgram.rpc.unstakeNft(new anchor.BN(lockingPeriod),{
        accounts: {
          owner: owner.publicKey,
          rewarder,
          rewardAuthority,
          stakeAccount,
          rewardMint: rewardMint.publicKey,
          rewardTokenAccount,
          nftMint: nftMint.publicKey,
          nftTokenAccount,
          vaultAccount: vaultAccount,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          clock: clockSysvar,
        },
        signers: [owner],
      });
      let nftAccount = await nftMint.getAccountInfo(nftTokenAccount);
      expect(nftAccount.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    });
  });
});

// Polls the network and returns once the block time has increased by seconds.
const sleep = async (
  connection: anchor.web3.Connection,
  seconds: number,
  startTime: number | null = null
) => {
  let time = startTime;
  if (time == null) {
    let slot = await connection.getSlot();
    time = await connection.getBlockTime(slot);
  }
  let elapsed = 0;
  console.log("current time:",time);
  while (elapsed < seconds) {
    let slot = await connection.getSlot();
    let newTime = await connection.getBlockTime(slot);
    elapsed += newTime - time;
    time = newTime;
  }
};