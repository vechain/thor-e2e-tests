import { sendVetTransaction } from "../../src/transactions";


describe("POST /transactions", function () {
  it("should send a transaction", async function () {
    const txReceipt = await sendVetTransaction(true);

    expect(txReceipt.reverted).toEqual(false);
  });
});
