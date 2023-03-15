// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

import { OwnableUpgradeable } from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import { IERC20 } from "forge-std/interfaces/IERC20.sol";

contract EmergencyReserve is OwnableUpgradeable {
	address public vst;

	function setUp(address _vst) external initializer {
		__Ownable_init();
		vst = _vst;
	}

	function withdraw(address _to) external onlyOwner {
		IERC20(vst).transfer(_to, IERC20(vst).balanceOf(address(this)));
	}
}

