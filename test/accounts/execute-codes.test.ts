import wallet from "../../src/wallet";
import { Node1Client } from "../../src/thor-client";
import assert from "node:assert"

describe("POST /accounts/*", function () {
  it("should execute code", async function () {
    const from = wallet["0x0f872421dc479f3c11edd89512731814d0598db5"];
    const to = wallet["0x99602e4bbc0503b8ff4432bb1857f916c3653b85"];

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
