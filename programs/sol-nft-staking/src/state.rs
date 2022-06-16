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
    /// The total number of NFTs staked with this rewarder.
    pub total_staked: u32,
    pub bump: u8,

}

impl NftStakeRewarder {
    pub fn calculate_len(num_creators: usize, collection: &str) -> usize {
        let mut size = size_of::<Pubkey>() * 3; //stored pubkeys
        size += 1; // authority bump
        size += 8; // reward rate
        size += 4; //total staked
        size += 1; //enforced metadata
        size += 1; //bump

        let creator_size = size_of::<CreatorStruct>() * num_creators;
        size += creator_size;
        // let collection_size = size_of::<String>() + collection.len();
        let collection_size = size_of::<String>() * collection.len();
        size += collection_size;


        size
    }
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
pub struct NftStakeAccount {
    pub owner: Pubkey,
    pub rewarder: Pubkey,
    pub nfts_staked: Vec<NftStaked>,
    pub nft_items_staked: Vec<NftItem>,
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
    pub locking_period: i64,
    pub start_staking: i64,
    pub nft_mint: Pubkey,
}