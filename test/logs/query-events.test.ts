import { Node1Client } from "../../src/thor-client";
import { sendVthoTransaction } from "../../src/transactions";
import { contractAddresses } from "../../src/contracts/addresses";
import { interfaces } from "../../src/contracts/hardhat";
import { expect } from "chai";

describe("POST /logs/event", () => {
  it("should find an event log", async () => {
    const receipt = await sendVthoTransaction(true);

    const eventLogs = await Node1Client.queryEventLogs({
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
          address: contractAddresses.VTHO,
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
