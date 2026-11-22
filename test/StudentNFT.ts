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

  it("emits Minted with the caller, token ID, and URI", async function () {
    const [, minter] = await ethers.getSigners();
    const nft = await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);
    const uri = "ipfs://test-metadata";

    await expect(nft.connect(minter).mint(uri))
      .to.emit(nft, "Minted")
      .withArgs(minter.address, 0n, uri);
  });

  it("assigns sequential token IDs across different minters", async function () {
    const [, minter, other] = await ethers.getSigners();
    const nft = await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);
    const uri = "ipfs://test-metadata";

    const firstMint = await nft.connect(minter).mint(uri);
    await firstMint.wait();
    const secondMint = await nft.connect(other).mint(uri);
    await secondMint.wait();

    expect(await nft.ownerOf(0n)).to.equal(minter.address);
    expect(await nft.ownerOf(1n)).to.equal(other.address);
  });
});
