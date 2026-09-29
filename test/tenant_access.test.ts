import assert from "node:assert/strict";
import test from "node:test";
import { TenantAccessService } from "../src/tenant_access.js";

test("offboarding keeps the user when key revocation is rejected", async () => {
  const calls: string[] = [];
  const controlPlane = {
    async request(path: string): Promise<unknown> {
      calls.push(path);
      throw new Error("revocation rejected");
    },
  };
  const service = new TenantAccessService(controlPlane as never);

  await assert.rejects(service.offboard({ userId: "user-7", keyId: "key-9" }));
  assert.deepEqual(calls, ["/v1/account/keys/revoke/key-9"]);
});

test("offboarding revokes the scoped key before deleting its user", async () => {
  const calls: string[] = [];
  const controlPlane = {
    async request(path: string): Promise<unknown> {
      calls.push(path);
      return {};
    },
  };
  const service = new TenantAccessService(controlPlane as never);

  const result = await service.offboard({ userId: "user-7", keyId: "key-9" });

  assert.deepEqual(calls, [
    "/v1/account/keys/revoke/key-9",
    "/v1/auth/user/delete/user-7",
  ]);
  assert.deepEqual(result, { state: "offboarded" });
});
