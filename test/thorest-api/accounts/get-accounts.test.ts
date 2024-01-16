import { Node1Client } from "../../../src/thor-client";
import {AxiosError} from "axios"
import assert from "node:assert"
import { wallet } from "../../../src/wallet";
import { contractAddresses } from "../../../src/contracts/addresses";

describe("GET /accounts/{address}", function () {

  const invalidAddresses = [
    "0x00000000",
    "zzzzzzz"
  ]

  const validRevisions = [
    "best",
    "1"
  ]
  
  it("correct balance", async function () {
    const acc = wallet("account0");
    const res = await Node1Client.getAccount(acc.address,);
    assert(res.success, "Failed to get account")
    expect(res.httpCode).toEqual(200);
    expect(res.body.balance.toUpperCase()).toEqual(acc.balance?.toUpperCase());
    expect(res.body.hasCode).toEqual(true);
  });

  it("contract account hasCode", async function () {
    const addr = contractAddresses.energy;
    const res = await Node1Client.getAccount(addr,);
    assert(res.success, "Failed to get account")
    expect(res.httpCode).toEqual(200);
    expect(res.body.hasCode).toEqual(true);
  });

  it.each(validRevisions)("valid revision %s", async function (revision) {
    const acc = wallet("account0");
    const res = await Node1Client.getAccount(acc.address,revision);
    assert(res.success, "Failed to get account")
    expect(res.httpCode).toEqual(200);
  });

  it.each(invalidAddresses)('invalid address: %s', async (a) => {
    const res = await Node1Client.getAccount(a as string);
    assert(!res.success, "Should not be successful")
    expect(res.httpCode).toEqual(400);
    },
  );

});
