import { Node1Client } from "../../src/thor-client";
import {AxiosError} from "axios"
import assert from "node:assert"

describe("GET /accounts/{address}", function () {
  it("should return the account", async function () {
    const res = await Node1Client.getAccount(
      "0x7567d83b7b8d80addcb281a71d54fc7b3364ffed",
    );

    assert(res.success, "Failed to get account")

    expect(res.httpCode).toEqual(200);
    expect(res.body.balance).toEqual("0x14adf4b7320334b9000000");
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
