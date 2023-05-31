// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface ITroveManager {
	function getEntireSystemDebt(address _asset)
		external
		view
		returns (uint256 entireSystemDebt);
}

