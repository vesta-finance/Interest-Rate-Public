import {
	ContractConfig,
	IDeployConfig,
	ModuleConfig,
} from "../../config/DeployConfig";
import { DeploymentHelper } from "../../utils/DeploymentHelper";
import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { Contract } from "ethers";

export class Deployer {
	config: IDeployConfig;
	helper: DeploymentHelper;
	ethers: HardhatEthersHelpers;
	hre: HardhatRuntimeEnvironment;
	savingModule?: Contract;
	interestManager?: Contract;
	ZERO_ADDRESS: string = "0x0000000000000000000000000000000000000000";

	constructor(config: IDeployConfig, hre: HardhatRuntimeEnvironment) {
		this.hre = hre;
		this.ethers = hre.ethers;
		this.config = config;
		this.helper = new DeploymentHelper(config, hre);
	}

	async run() {
		const contractsConfig = this.config.configs!;

		if (contractsConfig == undefined) throw "Config Not found";

		const emergencyReserve =
			await this.helper.deployUpgradeableContractWithName(
				"EmergencyReserve",
				"EmergencyReserve",
				"setUp",
				contractsConfig.vst
			);

		await this.transferOwnership(emergencyReserve, contractsConfig.admin);

		const stabilityPool =
			await this.helper.deployUpgradeableContractWithName(
				"SavingModuleStabilityPool",
				"SavingModuleStabilityPool"
			);

		this.savingModule =
			await this.helper.deployUpgradeableContractWithName(
				"SavingModule",
				"SavingModule"
			);

		this.interestManager =
			await this.helper.deployUpgradeableContractWithName(
				"VestaInterestManager",
				"VestaInterestManager",
				"setUp",
				contractsConfig.vst,
				contractsConfig.troveManager,
				contractsConfig.priceFeed,
				contractsConfig.borrowerOperator,
				this.savingModule!.address
			);

		await this.savingModule.setUp(
			contractsConfig.vst,
			this.interestManager.address,
			stabilityPool.address,
			7000,
			700
		);

		await stabilityPool.setUp(
			"0x3eEDF348919D130954929d4ff62D626f26ADBFa2", //borrower
			"0x100EC08129e0FD59959df93a8b914944A3BbD5df", //troveManager
			contractsConfig.vst,
			"0x62842ceDFe0F7D203FC4cFD086a6649412d904B5", //sortedTrove
			this.savingModule.address,
			"0x5F51B0A5E940A3a20502B5F59511B13788Ec6DDB" //vestaParam
		);

		await this.transferOwnership(this.savingModule, contractsConfig.admin);
		await this.transferOwnership(stabilityPool, contractsConfig.admin);

		await this.deployModule(contractsConfig);

		await this.transferOwnership(
			this.interestManager,
			contractsConfig.admin
		);

		if (
			(await this.hre.upgrades.admin.getInstance()).address !=
			contractsConfig.admin
		) {
			await this.helper.sendAndWaitForTransaction(
				this.hre.upgrades.admin.transferProxyAdminOwnership(
					contractsConfig.admin
				)
			);
		}
	}

	async deployModule(contractConfig: ContractConfig) {
		const modules: ModuleConfig[] = contractConfig.modules!;

		if (modules == undefined) throw "No module found";
		if (this.savingModule == undefined) throw "SafetyVault undefined";
		if (this.interestManager == undefined) {
			throw "InterestManager undefined";
		}

		for (const module of modules) {
			const contract = await this.helper.deployUpgradeableContractWithName(
				"VestaEIR",
				module.name,
				"setUp",
				this.interestManager!.address,
				module.name,
				module.risk
			);

			if (
				(await this.interestManager!.getInterestModule(
					module.linkedToken
				)) == this.ZERO_ADDRESS
			) {
				await this.helper.sendAndWaitForTransaction(
					this.interestManager!.setModuleFor(
						module.linkedToken,
						contract.address
					)
				);
			}

			await this.transferOwnership(contract, contractConfig.admin);
		}
	}

	async transferOwnership(contract: Contract, admin: string) {
		if ((await contract.owner()) != contract.admin && admin != undefined) {
			await this.helper.sendAndWaitForTransaction(
				contract.transferOwnership(admin)
			);
		}
	}
}

