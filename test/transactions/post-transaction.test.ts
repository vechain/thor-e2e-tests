import { sendVetTransaction } from "../../src/transactions";
import { expect } from "chai";

describe("POST /transactions", function () {
  it("should send a transaction", async function () {
    const txReceipt = await sendVetTransaction(true);

    expect(txReceipt.reverted).to.equal(false);
  });
});
