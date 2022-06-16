use std::mem::size_of;

use anchor_lang::prelude::*;
use metaplex_token_metadata::state::Creator;

pub trait Len {
    const LEN: usize;
}

impl<T> Len for T
where
    T: AnchorDeserialize + AnchorSerialize,
{
    const LEN: usize = 8 + size_of::<T>();
}



#[account]
pub struct NftStakeRewarder {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_authority_bump: u8,
    /// tokens rewarded per staked NFT per second
    pub reward_rate: u64,
    /// the update authority required in NFTs being staked
    pub allowed_update_authority: Pubkey,
    /// the creators required for the NFTs being staked
    pub creators: Vec<CreatorStruct>,
    /// the collection name required for the NFTs being staked
    pub collection: String,
    /// flag to verify metadata of NFT against rewarder settings
    /// useful to have set to false during testing
    pub enforce_metadata: bool,
    pub bump: u8,
    /// the list of whitelist addresses
    pub whitelist_addresses: Vec<Pubkey>,
    /// the total number of whitelist addresses
    pub total_whitelist_address: u64,
}


#[derive(Debug, AnchorDeserialize, AnchorSerialize, Default, Clone)]
pub struct CreatorStruct {
    address: Pubkey,
    verified: bool,
    share: u8,
}

impl PartialEq<Creator> for &CreatorStruct {
    fn eq(&self, other: &Creator) -> bool {
        self.address == other.address
            && self.verified == other.verified
            && self.share == other.share
    }
}

#[account]
pub struct VaultAccount {
    pub total_staked: u32,
    pub reward_mint: Pubkey,
    pub nft_items_staked: Vec<NftItem>,
}

#[account]
pub struct NftStakeAccount {
    pub owner: Pubkey,
    pub rewarder: Pubkey,
    pub nfts_staked: Vec<NftStaked>,
    pub bump: u8,
    pub last_claimed: i64,
    pub claimed_reward: u64,
}

#[derive(Debug, AnchorDeserialize, AnchorSerialize, Default, Clone)]
pub struct NftStaked {
    pub locking_period: i64,
    pub num_staked: u16,
}

#[derive(Debug, AnchorDeserialize, AnchorSerialize, Default, Clone)]
pub struct NftItem {
    pub owner: Pubkey,
    pub locking_period: i64,
    pub start_staking: i64,
    pub nft_mint: Pubkey,
    pub flag: bool,
}