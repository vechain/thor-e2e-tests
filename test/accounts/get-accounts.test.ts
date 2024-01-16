import { Node1Client } from "../../src/thor-client";
import {AxiosError} from "axios"
import assert from "node:assert"
import { wallet } from "../../src/wallet";

describe("GET /accounts/{address}", function () {
  it("should return the account", async function () {
    const acc = wallet("account0");
    const res = await Node1Client.getAccount(acc.address,);

    assert(res.success, "Failed to get account")

    expect(res.httpCode).toEqual(200);
    expect(res.body.balance.toUpperCase).toEqual(acc.balance?.toUpperCase);
  });


  describe("should throw a 403", () => {
    test.each([
      'zzzzz',
      12341234,
    ])(
      'should be an invalid address: %s',
      async (a) => {
          const res = await Node1Client.getAccount(a as string);
          assert(!res.success, "Should not be successful")
          expect(res.httpCode).toEqual(400);
      },
    );
  })
});
