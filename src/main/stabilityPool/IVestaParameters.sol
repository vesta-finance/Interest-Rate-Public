pragma solidity ^0.8.10;

import "./IActivePool.sol";
import "./IPriceFeed.sol";

interface IVestaParameters {
	function MCR(address _collateral) external view returns (uint256);

	function activePool() external view returns (IActivePool);

	function priceFeed() external view returns (IPriceFeed);
}

