import assert from "node:assert/strict";
import { network } from "hardhat";

const tokenURI = process.env.NFT_TOKEN_URI?.trim();
const contractAddress = process.env.NFT_CONTRACT_ADDRESS?.trim();

if (!tokenURI || !/^ipfs:\/\/\S+$/.test(tokenURI)) {
  throw new Error("Set NFT_TOKEN_URI to an ipfs:// URI for the metadata JSON.");
}

const { ethers, networkName, networkConfig } = await network.create();

if (!contractAddress && networkName !== "localhost" && networkConfig.type !== "edr-simulated") {
  throw new Error("Set NFT_CONTRACT_ADDRESS to the deployed StudentNFT address on this network.");
}

const nft = contractAddress
  ? await ethers.getContractAt("StudentNFT", contractAddress)
  : await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);

if (contractAddress && (await nft.getDeployedCode()) === null) {
  throw new Error("No contract is deployed at NFT_CONTRACT_ADDRESS on this network.");
}

await nft.waitForDeployment();
const address = await nft.getAddress();
console.log("Contract:", address);

const tx = await nft.mint(tokenURI);
const receipt = await tx.wait();
const minted = receipt?.logs
  .filter((log) => log.address === address)
  .map((log) => nft.interface.parseLog(log))
  .find((event) => event?.name === "Minted");

assert.ok(minted, `Missing Minted event in transaction ${tx.hash}`);
const [owner, tokenId] = minted.args;
assert.equal(await nft.ownerOf(tokenId), owner);
assert.equal(await nft.tokenURI(tokenId), tokenURI);

console.log("Token ID:", tokenId.toString());
console.log("Owner:", owner);
console.log("tokenURI:", tokenURI);
console.log("Transaction:", tx.hash);
