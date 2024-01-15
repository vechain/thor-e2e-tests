import { Node1Client } from "../../src/thor-client";
import { contractAddresses } from "../../src/contracts/addresses";

describe("GET /accounts/{address}/storage", function () {
  it("should return the storage value", async function () {
    const res = await Node1Client.getAccountStorage(
      contractAddresses.energy,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );

    expect(res.success).toEqual(true);
    expect(res.body?.value).toEqual(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  });
});
