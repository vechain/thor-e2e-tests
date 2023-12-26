import {ethers} from "hardhat"
import {Storage__factory} from "../typechain-types"
import {getConnex} from "../helpers/connex"
import {expect} from "chai"

describe("Contracts", function () {

  let connex: Connex

  before(async() => {
    connex = await getConnex("node1")
  })

  /**
   * Tests that we can deploy a contract
   */
  it("should be able to deploy contract", async function () {
      const StorageFactory: Storage__factory = await ethers.getContractFactory("Storage");

      const storage = await StorageFactory.deploy();

      const address = await storage.getAddress()

      const code = await connex.thor.account(address).getCode()

      expect(code.code).not.to.equal("0x")
    })
})
