import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { network } from "hardhat";

const { ethers, networkName, networkConfig } = await network.create();
const defaults = networkName === "polygon" && existsSync(".env")
  ? (parseEnv(readFileSync(".env", "utf8")) as NodeJS.ProcessEnv)
  : undefined;
const tokenURI = (process.env.NFT_TOKEN_URI ?? defaults?.NFT_TOKEN_URI)?.trim();
const contractAddress = (process.env.NFT_CONTRACT_ADDRESS ?? defaults?.NFT_CONTRACT_ADDRESS)?.trim();

if (!tokenURI || !/^ipfs:\/\/\S+$/.test(tokenURI)) {
  throw new Error("Set NFT_TOKEN_URI to an ipfs:// URI for the metadata JSON.");
}

if (!contractAddress && networkName !== "localhost" && networkConfig.type !== "edr-simulated") {
  throw new Error("Set NFT_CONTRACT_ADDRESS to the deployed StudentNFT address on this network.");
}

const nft = contractAddress
  ? await ethers.getContractAt("StudentNFT", contractAddress)
  : await ethers.deployContract("StudentNFT", ["Student NFT", "SNFT"]);

if (!contractAddress) await nft.waitForDeployment();
const deployedCode = await nft.getDeployedCode();
if (deployedCode === null) {
  throw new Error("No contract is deployed at NFT_CONTRACT_ADDRESS on this network.");
}

const address = await nft.getAddress();
const legacyArtifact = JSON.parse(readFileSync(new URL(
  "../ignition/deployments/chain-137/artifacts/StudentNFT%23StudentNFT.json",
  import.meta.url,
), "utf8")) as { deployedBytecode: string };
const price = deployedCode === legacyArtifact.deployedBytecode ? 0n : await nft.mintPrice();
console.log("Contract:", address);

const tx = await nft.mint(tokenURI, { value: price });
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
