import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("StudentNFT", function () {
  it("mints the token to the caller and stores its URI", async function () {
    const [, minter] = await ethers.getSigners();
    const nft = await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);
    const uri = "ipfs://test-metadata";

    const transaction = await nft.connect(minter).mint(uri);
    await transaction.wait();

    expect(await nft.ownerOf(0n)).to.equal(minter.address);
    expect(await nft.tokenURI(0n)).to.equal(uri);
  });
});
