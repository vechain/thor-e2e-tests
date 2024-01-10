import { Node1Client } from "../../src/thor-client";
import { contractAddresses } from "../../src/contracts/addresses";
import { expect } from "chai";

describe("GET /accounts/{address}/storage", function () {
  it("should return the storage value", async function () {
    const res = await Node1Client.getAccountStorage(
      contractAddresses.VTHO,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );

    expect(res.value).to.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  });
});
