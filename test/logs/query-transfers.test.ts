import { Node1Client } from "../../src/thor-client";
import { sendVetTransaction } from "../../src/transactions";
import { expect } from "chai";

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

    const relevantLog = eventLogs.find((log) => {
      return log.meta?.txID === receipt.meta.txID;
    });

    expect(relevantLog).not.to.be.undefined;
    expect(relevantLog?.meta?.txOrigin).to.equal(receipt.meta.txOrigin);
  });
});
