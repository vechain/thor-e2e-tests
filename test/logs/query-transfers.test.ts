import { Node1Client } from "../../src/thor-client";
import { sendVetTransaction } from "../../src/transactions";
import assert from "node:assert"


describe("POST /logs/transfers", () => {
  it("should find an event log", async () => {
    const receipt = await sendVetTransaction(true);

    const eventLogs = await Node1Client.queryTransferLogs({
      range: {
        to: receipt.meta.blockNumber,
        from: receipt.meta.blockNumber,
        unit: "block",
      },
      options: {
        offset: 0,
        limit: 100,
      },
      criteriaSet: [
        {
          txOrigin: receipt.meta.txOrigin,
        },
      ],
    });

    assert(eventLogs.success, "eventLogs.success is false")

    const relevantLog = eventLogs.body.find((log) => {
      return log.meta?.txID === receipt.meta.txID;
    });

    expect(relevantLog).not.toBeUndefined()
    expect(relevantLog?.meta?.txOrigin).toEqual(receipt.meta.txOrigin);
  });
});
