import { Node1Client } from "../../src/thor-client";
import { contractAddresses } from "../../src/contracts/addresses";
import { expect } from "chai";

describe("GET /accounts/{address}/code", function () {
  it("should return the code", async function () {
    const res = await Node1Client.getAccountCode(contractAddresses.VTHO);

    expect(res.code.length).to.be.greaterThan(2);
  });
});
