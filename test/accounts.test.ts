import {contracts} from "../helpers/contracts"
import {expect} from "chai"

describe("Accounts", function () {
  /**
   * Gets the balance of the VTHO contract using the POST `/accounts/*`
   */
  it("should be able to get a fungible token balance", async function () {
      const balance = await contracts.VTHO.balanceOf("0x7567d83b7b8d80addcb281a71d54fc7b3364ffed")

      expect(balance).to.be.greaterThan(0)
    })
})
