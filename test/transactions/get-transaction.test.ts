import { sendVetTransaction } from "../../src/transactions";
import { Node1Client } from "../../src/thor-client";
import { expect } from "chai";

describe("GET /transactions/{id}", function () {
  it("should get a transaction", async function () {
    const res = await sendVetTransaction(false);

    const tx = await Node1Client.getTransaction(res.id, { pending: true });

    expect(tx?.id).to.equal(res.id);
  });
});
