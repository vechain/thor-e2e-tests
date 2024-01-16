import { wallet } from "../../src/wallet";
import { Node1Client } from "../../src/thor-client";
import assert from "node:assert"

describe("POST /accounts/*", function () {
  it("should execute code", async function () {
    const from = wallet("account2");
    const to = wallet("account4");

    const res = await Node1Client.executeAccountBatch({
      clauses: [
        // VET Transfer
        {
          to: to.address,
          value: "0x100000",
          data: "0x",
        },
      ],
      caller: from.address,
    });

    assert(res.success, "Failed to execute code");

    expect(res.body[0].reverted).toEqual(false);
  });
});
