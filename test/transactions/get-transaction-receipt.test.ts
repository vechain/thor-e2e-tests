import { sendVetTransaction } from "../../src/transactions";
import { Node1Client } from "../../src/thor-client";
import { expect } from "chai";

describe("GET /transactions/{id}/receipt", function () {
  it("should get transaction receipt", async function () {
    const txReceipt = await sendVetTransaction(true);

    if (!txReceipt.meta.txID) {
      throw new Error("Failed to get txID");
    }

    const tx = await Node1Client.getTransactionReceipt(txReceipt.meta.txID);

    expect(tx?.meta.txID).to.equal(txReceipt.meta.txID);
  });
});
