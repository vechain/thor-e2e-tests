import {getConnex, getDriver} from "../helpers/connex"
import {Driver} from "@vechain/connex-driver"
import {expect} from "chai"

describe("Blocks", function () {

  let connex: Connex;
  let driver: Driver;

  before(async () => {
    connex = await getConnex("node1")
    driver = await getDriver("node1")
  })

  /**
   * Tests if the blockchain is mining blocks.
   * - Gets the latest block
   * - Waits for the next block
   * - Checks the next block is +1
   */
  it("should be mining", async function () {
    const firstBlock = await connex.thor.block().get()

    const nextBlock = await connex.thor.ticker().next()

    expect(nextBlock.number).to.equal(firstBlock!.number + 1)
  });


  /**
   * Tests that we can retrieve blocks given an array of valid revisions
   */
  const revisions = ["finalized", "best", 1, "0x00000000836c6431e2624d71e48907f602bc577693ac49ea364d9607f66b71fa"]

  revisions.forEach(function(revision) {
    it(`can fetch a valid revision: ${revision}`, async function() {
      const block = await driver.getBlock(revision)
      expect(block?.number).to.be.a("number")
    });
  });

  /**
   * Tests that the API returns a '200' with a null response for blocks that don't exist
   */
  it("should return null when block does not exist", async () => {
    const block = await driver.getBlock("0x00000000836c6431e2624d71e48907f602bc577693ac49ea364d9607f66b71fb")

    expect(block).to.equal(null)
  })
});
