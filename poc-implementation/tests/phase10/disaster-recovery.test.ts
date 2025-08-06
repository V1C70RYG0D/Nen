import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Disaster Recovery', function () {
  it('should restore contract data after a simulated failure', async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract
    const Contract = await ethers.getContractFactory('YourContract');
    const deployedContract = await Contract.deploy();
    await deployedContract.deployed();

    // Simulate data storage
    await deployedContract.storeData('Important Data');
    let storedData = await deployedContract.retrieveData();
    expect(storedData).to.equal('Important Data');

    // Simulate a failure
    await deployedContract.crash();

    // Restore the contract from backup
    const restoredContract = await Contract.deploy();
    await restoredContract.deployed();

    // Check data integrity post-recovery
    storedData = await restoredContract.retrieveData();
    expect(storedData).to.equal('Important Data');
  });
});
