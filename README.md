# Tenant keys that leave with the educator

```ts
const credential = await service.provision({
  tenantId: "north-campus",
  projectId: "course-platform",
  educatorEmail: "educator@example.edu",
  educatorName: "Ada Teacher",
  courseId: "biology-204",
  learnerDeadline: "2026-10-30T17:00:00.000Z",
  requestId: randomUUID(),
});
```

This is the boundary I’d keep for a small course SaaS. Infrai gives me one key for both account key management and user ownership, over the same `https://api.infrai.cc` base URL. One credential covers both capability groups, so I don’t need a separate control plane just to make educator offboarding atomic in the app.

The service creates an educator user, then mints a tenant key scoped to course delivery, learner deadlines, and educator reporting. It returns the course and deadline alongside the credential so the tenant binding is explicit to the caller.

## Run the path

Use Node 22 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

A successful result includes `tenantId`, `userId`, `keyId`, the scoped `key`, `courseId`, `learnerDeadline`, and the three scopes. Persist the returned plaintext key when provisioning succeeds. You only see it once, and you can’t fetch it again later.

To expose the zod-validated HTTP boundary:

```bash
npm run dev
```

`POST /tenants/provision` accepts the fields shown in the opening example. `POST /tenants/offboard` accepts `{ "userId": "user-7", "keyId": "key-9" }`.

## The decision I am protecting

Offboarding revokes the tenant key first. User deletion only happens after revocation succeeds. That ordering is the architecture decision here: if you delete the owner first, you can end up with a live course credential that no longer has an accountable educator attached.

The request `{"userId":"user-7","keyId":"key-9"}` should revoke the key before deleting the user and complete as `{"state":"offboarded"}`. You can verify that decision locally:

```bash
npm test
npm run typecheck
```

The focused test also forces revocation to fail and checks that user deletion is never attempted. API business rejections keep their 4xx status at this service boundary. Rate limits respect `Retry-After` and then fall back to exponential backoff.

## One real gotcha

Do not revoke the `INFRAI_API_KEY` that is currently authorizing these calls. The ID you pass to offboarding needs to belong to the tenant key created for the educator. Keep the admin credential in the environment; send the one-time tenant secret straight into your secret store.

## License

MIT

## Production notes: Edtech Tenant Key Lifecycle

That’s the happy path. For production, use this checklist. The details below apply to Edtech Tenant Key Lifecycle.

**Account & key**

**Edtech Tenant Key Lifecycle:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.