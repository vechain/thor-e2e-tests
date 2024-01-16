import { sendVetTransaction } from "../../../src/transactions";
import { Node1Client } from "../../../src/thor-client";
import assert from "node:assert"


describe("GET /transactions/{id}", function () {
  it("should get a transaction", async function () {
    const res = await sendVetTransaction(false);

    const tx = await Node1Client.getTransaction(res.id, { pending: true });

    assert(tx.success, "Failed to get transaction");

    expect(tx?.body?.id).toEqual(res.id);
  });
});
