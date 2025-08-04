import { deployContract, expect } from "chai";
import * as hre from "hardhat";

// Environment configuration - externalized values
const TEST_NETWORKS = process.env.TEST_NETWORKS?.split(',') || ['development', 'testnet', 'mainnet'];

describe("Deployment Validation", function () {
  it("should deploy contracts correctly on all networks", async function () {
    const networks = TEST_NETWORKS;
    for (const network of networks) {
      await hre.changeNetwork(network);
      const ContractFactory = await hre.ethers.getContractFactory("YourContract");
      const contract = await ContractFactory.deploy(/* constructor arguments */);
      await contract.deployed();

      expect(contract.address).to.properAddress;
    }
  });
});

