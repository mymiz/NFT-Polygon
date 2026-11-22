import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StudentNFT", (m) => {
  const studentNFT = m.contract("StudentNFT", ["Student NFT", "SNFT"]);

  return { studentNFT };
});
