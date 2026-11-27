import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();
const uri = "ipfs://test-metadata";

async function deployStudentNFT() {
  const [owner, minter, other] = await ethers.getSigners();
  const nft = await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);

  return { nft, owner, minter, other, price: await nft.mintPrice() };
}

describe("StudentNFT", function () {
  it("mints the token to the caller and stores its URI", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);

    const transaction = await nft.connect(minter).mint(uri, { value: price });
    await transaction.wait();

    expect(await nft.ownerOf(0n)).to.equal(minter.address);
    expect(await nft.tokenURI(0n)).to.equal(uri);
  });

  it("emits Minted with the caller, token ID, and URI", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);

    await expect(nft.connect(minter).mint(uri, { value: price }))
      .to.emit(nft, "Minted")
      .withArgs(minter.address, 0n, uri);
  });

  it("assigns sequential token IDs across different minters", async function () {
    const { nft, minter, other, price } = await networkHelpers.loadFixture(deployStudentNFT);

    const firstMint = await nft.connect(minter).mint(uri, { value: price });
    await firstMint.wait();
    const secondMint = await nft.connect(other).mint(uri, { value: price });
    await secondMint.wait();

    expect(await nft.ownerOf(0n)).to.equal(minter.address);
    expect(await nft.ownerOf(1n)).to.equal(other.address);
  });

  it("reverts when reading the URI of a nonexistent token", async function () {
    const { nft } = await networkHelpers.loadFixture(deployStudentNFT);

    await expect(nft.tokenURI(0n))
      .to.be.revertedWithCustomError(nft, "ERC721NonexistentToken")
      .withArgs(0n);
  });

  it("accepts the exact mint price and keeps the payment", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);

    expect(price).to.equal(ethers.parseEther("0.01"));
    await expect(nft.connect(minter).mint(uri, { value: price }))
      .to.changeEtherBalances(ethers, [minter, nft], [-price, price]);
  });

  it("reverts on underpayment and overpayment without minting", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);

    await expect(nft.connect(minter).mint(uri))
      .to.be.revertedWithCustomError(nft, "IncorrectMintPrice")
      .withArgs(price, 0n);
    await expect(nft.connect(minter).mint(uri, { value: price + 1n }))
      .to.be.revertedWithCustomError(nft, "IncorrectMintPrice")
      .withArgs(price, price + 1n);
    expect(await nft.totalMinted()).to.equal(0n);
  });

  it("mints up to maxSupply and then reverts", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);
    const maxSupply = await nft.maxSupply();
    const buyer = nft.connect(minter);

    expect(maxSupply).to.equal(100n);
    for (let tokenId = 0n; tokenId < maxSupply; tokenId++) {
      await (await buyer.mint(uri, { value: price })).wait();
    }

    expect(await nft.ownerOf(maxSupply - 1n)).to.equal(minter.address);
    await expect(buyer.mint(uri, { value: price }))
      .to.be.revertedWithCustomError(nft, "MaxSupplyReached");
    expect(await nft.totalMinted()).to.equal(maxSupply);
    expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(maxSupply * price);
  });

  it("lets the owner withdraw the mint proceeds", async function () {
    const { nft, owner, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);
    await (await nft.connect(minter).mint(uri, { value: price })).wait();

    expect(await nft.owner()).to.equal(owner.address);
    await expect(nft.connect(owner).withdraw())
      .to.changeEtherBalances(ethers, [nft, owner], [-price, price]);
  });

  it("reverts when a non-owner tries to withdraw", async function () {
    const { nft, minter, price } = await networkHelpers.loadFixture(deployStudentNFT);
    await (await nft.connect(minter).mint(uri, { value: price })).wait();

    await expect(nft.connect(minter).withdraw())
      .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
      .withArgs(minter.address);
    expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(price);
  });

  it("keeps an owner who can withdraw the proceeds", async function () {
    const { nft, owner } = await networkHelpers.loadFixture(deployStudentNFT);

    await expect(nft.connect(owner).renounceOwnership())
      .to.be.revertedWithCustomError(nft, "OwnershipRenunciationDisabled");
    expect(await nft.owner()).to.equal(owner.address);
  });
});
