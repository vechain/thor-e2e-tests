import { Node1Client } from "../../../src/thor-client";
import { contractAddresses } from "../../../src/contracts/addresses";
import assert from "node:assert"

describe("GET /accounts/{address}/code", function () {
  it("should return the code", async function () {
    const res = await Node1Client.getAccountCode(contractAddresses.energy);

    assert(res.success, "Failed to get account code")

    expect(res.httpCode).toEqual(200)
    expect(res.body.code.length).toBeGreaterThan(2);
  });
});
