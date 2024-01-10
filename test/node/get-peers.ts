import { Node1Client } from "../../src/thor-client";
import { expect } from "chai";

describe("GET /node/network/peers", () => {
  it("should get peers", async () => {
    const peers = (await Node1Client.getPeers()) as any[];
    expect(peers.length).to.equal(2);
  });
});
