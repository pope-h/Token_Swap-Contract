import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TokenSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAddLiquidityFixture() {
    const MHTLiquidity = ethers.parseEther("7");
    const MLTLiquidity = ethers.parseEther("70");
    const exchangeRate = MLTLiquidity / MHTLiquidity;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const HigherToken = await ethers.getContractFactory("HigherToken");
    const higherToken = await HigherToken.deploy();

    const LowerToken = await ethers.getContractFactory("LowerToken");
    const lowerToken = await LowerToken.deploy();

    const TokenSwap = await ethers.getContractFactory("TokenSwap");
    const tokenSwap = await TokenSwap.deploy(higherToken.target, lowerToken.target);

    return { MHTLiquidity, MLTLiquidity, exchangeRate, higherToken, lowerToken, tokenSwap, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should add liquidity to the TokenSwap contract", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);
      expect(await tokenSwap.HTLiquidity()).to.equal(MHTLiquidity);
      expect(await tokenSwap.LTLiquidity()).to.equal(MLTLiquidity);
    });

    it("Should get the exchange rate", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);
      expect(await tokenSwap.getExchangeRate()).to.equal(exchangeRate);
    });

    it("Should not allow swapping more than the available liquidity", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("100");

      await expect(tokenSwap.swapHighToLow(swapAmount)).to.be.revertedWith("Not enough MHT liquidity");
    });

    it("Should not allow swapping when no liquidity is provided", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      const swapAmount = ethers.parseEther("100");

      await expect(tokenSwap.swapHighToLow(swapAmount)).to.be.revertedWith("Not enough MHT liquidity");
    });

    it("Should not allow swapping when the amount is 0", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("0");

      await expect(tokenSwap.swapHighToLow(swapAmount)).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should emit a TokensSwapped event", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("4");
      const swappedAmount = swapAmount * exchangeRate;

      await expect(tokenSwap.swapHighToLow(swapAmount))
        .to.emit(tokenSwap, "TokensSwapped")
        .withArgs(owner.address, swappedAmount, true);
    });
  });

  describe("Swap", function () {
    it("Should swap MHT to MLT successfully", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);
      const prevLTLiquidity = await tokenSwap.LTLiquidity();

      const swapAmount = ethers.parseEther("4");
      const swappedAmount = swapAmount * exchangeRate;

      await tokenSwap.swapHighToLow(swapAmount);

      // Verify that the new MLT liquidity matches the expected value
      const newMLTLiquidity = await tokenSwap.LTLiquidity();
      expect(newMLTLiquidity).to.equal(prevLTLiquidity + swappedAmount);
    });

    it("Should swap MLT to MHT successfully", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);
      const prevHTLiquidity = await tokenSwap.HTLiquidity();

      const swapAmount = ethers.parseEther("40");
      const swappedAmount = swapAmount / exchangeRate;

      await tokenSwap.swapLowToHigh(swapAmount);

      // Verify that the new MHT liquidity matches the expected value
      const newMHTLiquidity = await tokenSwap.HTLiquidity();
      expect(newMHTLiquidity).to.equal(prevHTLiquidity + swappedAmount);
    });
    
    it("Should not allow swapping more than the available liquidity", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("100");

      await expect(tokenSwap.swapLowToHigh(swapAmount)).to.be.revertedWith("Not enough MLT liquidity");
    });

    it("Should not allow swapping when no liquidity is provided", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      const swapAmount = ethers.parseEther("100");

      await expect(tokenSwap.swapLowToHigh(swapAmount)).to.be.revertedWith("Not enough MLT liquidity");
    });

    it("Should not allow swapping when the amount is 0", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("0");

      await expect(tokenSwap.swapLowToHigh(swapAmount)).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should emit a TokensSwapped event", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, MHTLiquidity, MLTLiquidity, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity);

      const swapAmount = ethers.parseEther("4");
      const swappedAmount = swapAmount / exchangeRate;

      await expect(tokenSwap.swapLowToHigh(swapAmount))
        .to.emit(tokenSwap, "TokensSwapped")
        .withArgs(owner.address, swappedAmount, false);
    });
  });

  describe("Other tests", function () {
    it("Should revert if LTLiquidity is lesser than HTLiquidity", async function () {
      const { higherToken, lowerToken, tokenSwap, owner, exchangeRate } = await loadFixture(deployAddLiquidityFixture);

      const MHTLiquidity = ethers.parseEther("7");
      const MLTLiquidity = ethers.parseEther("6");

      await higherToken.approve(tokenSwap.target, MHTLiquidity);
      await lowerToken.approve(tokenSwap.target, MLTLiquidity);

      await higherToken.transfer(owner, MHTLiquidity);
      await lowerToken.transfer(owner, MLTLiquidity);

      await expect(tokenSwap.addLiquidity(MHTLiquidity, MLTLiquidity)).to.be.revertedWith("Please input higher number for MLT");
    });
  });
});
