import { readFile } from "node:fs/promises";
import { PinataSDK } from "pinata";

const pinataJwt = process.env.PINATA_JWT?.trim();
const pinataGateway = process.env.PINATA_GATEWAYS?.trim() || process.env.PINATA_GATEWAY?.trim();

if (!pinataJwt || !pinataGateway) {
  throw new Error("Set PINATA_JWT and PINATA_GATEWAYS in .env.");
}

const pinata = new PinataSDK({ pinataJwt, pinataGateway });
const imageName = "Dog and Ethereum.png";
const imageBytes = await readFile(new URL(`../assets/${imageName}`, import.meta.url));
const image = new File([imageBytes], imageName, { type: "image/png" });
const imageUpload = await pinata.upload.public.file(image);

const metadata = {
  name: "Dog and Ethereum",
  description: "A dog and Ethereum.",
  image: `ipfs://${imageUpload.cid}`,
};
const metadataUpload = await pinata.upload.public.json(metadata);

const tokenURI = `ipfs://${metadataUpload.cid}`;
const gatewayUrl = await pinata.gateways.public.convert(tokenURI);

console.log("tokenURI =", tokenURI);
console.log("Gateway =", gatewayUrl);
