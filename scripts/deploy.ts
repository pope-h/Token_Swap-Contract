import { ethers } from "hardhat";

async function main() {
  const HigherToken = await ethers.deployContract("HigherToken");
  await HigherToken.waitForDeployment();

  const LowerToken = await ethers.deployContract("LowerToken");
  await LowerToken.waitForDeployment();

  const TokenSwap = await ethers.deployContract("TokenSwap", [HigherToken.target, LowerToken.target]);
  await TokenSwap.waitForDeployment();

  console.log(`HigherToken deployed to ${HigherToken.target}`);
  console.log(`LowerToken deployed to ${LowerToken.target}`);
  console.log(`TokenSwap deployed to ${TokenSwap.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
