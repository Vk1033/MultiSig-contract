const { expect } = require("chai");
describe("MultiSig", function () {
  let contract;
  let accounts;
  let signers; // Save signers for later use

  beforeEach(async () => {
    signers = await ethers.getSigners();
    accounts = signers.map((signer) => signer.address);

    const MultiSig = await ethers.getContractFactory("MultiSig");
    contract = await MultiSig.deploy(accounts.slice(0, 3), 1);
    await contract.waitForDeployment(); // Replaces `await contract.deployed();`
  });

  describe("storing ERC20 tokens", function () {
    const initialBalance = 10000;
    let token;

    beforeEach(async () => {
      const EIP20 = await ethers.getContractFactory("EIP20");
      token = await EIP20.deploy(initialBalance, "My Token", 1, "MT");
      await token.waitForDeployment(); // Replaces `await token.deployed();`
      await token.transfer(contract.target, initialBalance); // `contract.target` is used instead of `contract.address`
    });

    it("should store the balance", async () => {
      const balance = await token.balanceOf(contract.target); // `contract.target` is used instead of `contract.address`
      expect(balance).to.equal(initialBalance); // Use `expect` instead of `assert`
    });

    describe("executing an ERC20 transaction", function () {
      beforeEach(async () => {
        const data = token.interface.encodeFunctionData("transfer", [accounts[2], initialBalance]);
        await contract.submitTransaction(token.target, 0, data); // `token.target` is used instead of `token.address`
      });

      it("should have removed the contract balance", async () => {
        const balance = await token.balanceOf(contract.target); // `contract.target` is used instead of `contract.address`
        expect(balance).to.equal(0);
      });

      it("should have moved the balance to the destination", async () => {
        const balance = await token.balanceOf(accounts[2]);
        expect(balance).to.equal(initialBalance);
      });
    });
  });

  describe("storing ether", function () {
    const oneEther = ethers.parseEther("1"); // `ethers.parseEther` is the updated method

    beforeEach(async () => {
      const signer = signers[0]; // Access the first signer directly
      await signer.sendTransaction({ to: contract.target, value: oneEther }); // `contract.target` is used instead of `contract.address`
    });

    it("should store the balance", async () => {
      const balance = await ethers.provider.getBalance(contract.target); // `contract.target` is used instead of `contract.address`
      expect(balance.toString()).to.equal(oneEther.toString());
    });

    describe("executing the ether transaction", function () {
      let balanceBefore;

      beforeEach(async () => {
        balanceBefore = await ethers.provider.getBalance(accounts[1]);
        await contract.submitTransaction(accounts[1], oneEther, "0x");
      });

      it("should have removed the contract balance", async () => {
        const balance = await ethers.provider.getBalance(contract.target); // `contract.target` is used instead of `contract.address`
        expect(balance).to.equal(0n); // Use BigInt (0n) for comparison
      });

      it("should have moved the balance to the destination", async () => {
        const balance = await ethers.provider.getBalance(accounts[1]);
        expect(balance - balanceBefore).to.equal(oneEther); // Subtract BigInt values directly
      });
    });
  });
});
