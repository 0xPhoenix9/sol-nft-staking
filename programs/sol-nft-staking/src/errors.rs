use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("The provided reward mint doesn't have the correct minting authority")]
    RewarderNotMintAuthority,

    #[msg("The provided authority is not valid for the rewarder")]
    InvalidRewarderAuthority,

    #[msg("The provided rewarder does not match the stake account")]
    InvalidRewarder,

    #[msg("The provided owner does not own the stake account")]
    InvalidOwnerForStakeAccount,

    #[msg("The provided Mint is not valid for the provided Rewarder")]
    InvalidRewardMint,

    #[msg("NFT is not whitelist")]
    NFTWhitelisted,

    #[msg("The provided reward token account is not owned by the provided owner")]
    InvalidOwnerForRewardToken,

    #[msg("The provided reward token account is not for the reward token mint")]
    InvalidRewardTokenAccount,

    #[msg("The provided NFT Mint has a supply that isn't 1")]
    InvalidNFTMintSupply,

    #[msg("The provided NFT token account is not owned by the provided owner")]
    InvalidNFTOwner,

    #[msg("The provided NFT token account is not for the NFT mint")]
    InvalidNFTAccountMint,

    #[msg("The provided NFT token account does not have the token")]
    NFTAccountEmpty,

    #[msg("This NFT is locked")]
    NFTAUnlocked,

    #[msg("The provided NFT token account is not owned by the provided stake account")]
    InvalidStakedNFTOwner,

    #[msg("There was no Metaplex Metadata account supplied")]
    MetadataAccountNotFound,

    #[msg("The Metaplex Metadata account is not owned by the Metaplex Token Metadata program")]
    MetadataAccountNotOwnedByCorrectProgram,

    #[msg("The Metaplex Metadata account failed to deserialze")]
    InvalidMetadataAccountData,

    #[msg("The Metaplex Metadata account did not have the expected PDA seeds")]
    InvalidMetadataAccountAddress,

    #[msg("The Metaplex Metadata account did not have the expected update authority")]
    InvalidMetadataUpdateAuthority,

    #[msg("The Metaplex Metadata account did not have a name beginning with the collection")]
    InvalidMetadataCollectionPrefix,

    #[msg("The Metaplex Metadata account did not have the expected creators")]
    InvalidMetadataCreators,
}
