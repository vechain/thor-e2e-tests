import { Node1Client } from "../../src/thor-client";
import { expect } from "chai";

describe("GET /accounts/{address}", function () {
  it("should return the account", async function () {
    const account = await Node1Client.getAccount(
      "0x7567d83b7b8d80addcb281a71d54fc7b3364ffed",
    );

    expect(account.balance).to.equal("0x14adf4b7320334b9000000");
  });
});
