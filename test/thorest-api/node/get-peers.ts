import { Node1Client } from "../../../src/thor-client";


describe("GET /node/network/peers", () => {
  it("should get peers", async () => {
    const peers = (await Node1Client.getPeers()) as any[];
    expect(peers.length).toBeGreaterThan(0);
  });
});
