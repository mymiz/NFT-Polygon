import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { PinataSDK } from "pinata";

const pinataJwt = process.env.PINATA_JWT?.trim();
const pinataGateway = process.env.PINATA_GATEWAYS?.trim() || process.env.PINATA_GATEWAY?.trim();

if (!pinataJwt || !pinataGateway) {
  throw new Error("Set PINATA_JWT and PINATA_GATEWAYS in .env.");
}

const pinata = new PinataSDK({ pinataJwt, pinataGateway });
const imagePath = process.argv[2] ?? join(import.meta.dirname, "..", "assets", "my-nft.png");
const imageBytes = await readFile(imagePath);
const image = new File([imageBytes], basename(imagePath), { type: "image/png" });
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
