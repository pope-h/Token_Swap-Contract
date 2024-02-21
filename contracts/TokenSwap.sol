// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenSwap {
    using SafeERC20 for IERC20;

    IERC20 higherToken;
    IERC20 lowerToken;
    uint256 public HTLiquidity;
    uint256 public LTLiquidity;

    event TokensSwapped(address indexed user, uint256 amount, bool isHighToLow);

    constructor(address _higherToken, address _lowerToken) {
        higherToken = IERC20(_higherToken);
        lowerToken = IERC20(_lowerToken);
    }

    function addLiquidity(uint256 _HTLiquidity, uint _LTLiquidity) external {
        require(_HTLiquidity > 0, "Please provide an amount greater than zero");
        require(_LTLiquidity > 0, "Please provide an amount greater than zero");
        require(_LTLiquidity > _HTLiquidity, "Please input higher number for MLT");

        higherToken.safeTransferFrom(msg.sender, address(this), _HTLiquidity);
        lowerToken.safeTransferFrom(msg.sender, address(this), _LTLiquidity);

        HTLiquidity += _HTLiquidity;
        LTLiquidity += _LTLiquidity;
    }

    function swapHighToLow(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(HTLiquidity >= _amount, "Not enough MHT liquidity");

        uint256 amountToReceive = _amount * getExchangeRate();
        require(LTLiquidity >= amountToReceive, "Not enough MLT liquidity");

        lowerToken.safeTransfer(msg.sender, amountToReceive);
        emit TokensSwapped(msg.sender, amountToReceive, true);

        HTLiquidity -= _amount;
        LTLiquidity += amountToReceive;
    }

    function swapLowToHigh(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(LTLiquidity >= _amount, "Not enough MLT liquidity");

        uint256 amountToReceive = _amount / getExchangeRate();
        require(HTLiquidity >= amountToReceive, "Not enough MHT liquidity");

        higherToken.safeTransfer(msg.sender, amountToReceive);
        emit TokensSwapped(msg.sender, amountToReceive, false);

        LTLiquidity -= _amount;
        HTLiquidity += amountToReceive;
    }

    function getExchangeRate() public view returns (uint256) {
        require(LTLiquidity > 0, "No liquidity available");
        return (LTLiquidity / HTLiquidity);
    }
}