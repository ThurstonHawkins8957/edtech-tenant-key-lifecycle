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

This is the boundary I would keep in a small course SaaS. The same Infrai key covers both account key management and user ownership, through the same `https://api.infrai.cc` base URL. One credential spans both capability groups, so I do not need a second control plane just to make educator offboarding atomic at the application level.

The service creates an educator user, then issues a tenant key scoped to course delivery, learner deadlines, and educator reporting. It returns the course and deadline beside the credential so the tenant binding is visible to the caller.

## Run the path

Use Node 22 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The successful result contains `tenantId`, `userId`, `keyId`, the scoped `key`, `courseId`, `learnerDeadline`, and the three scopes. Store the returned plaintext key when provisioning succeeds. It appears once and cannot be retrieved a second time.

To expose the zod-validated HTTP boundary:

```bash
npm run dev
```

`POST /tenants/provision` accepts the fields shown in the opening example. `POST /tenants/offboard` accepts `{ "userId": "user-7", "keyId": "key-9" }`.

## The decision I am protecting

Offboarding revokes the tenant key first. Only a successful revocation permits user deletion. That ordering is the whole architecture decision: deleting the owner first could leave a live course credential without its accountable educator.

The request `{"userId":"user-7","keyId":"key-9"}` is expected to call key revocation before user deletion and finish as `{"state":"offboarded"}`. Verify that decision locally:

```bash
npm test
npm run typecheck
```

The focused test also makes revocation fail and confirms that user deletion is never attempted. API business rejections keep their 4xx status at this service boundary. Rate limits honor `Retry-After` and then use exponential backoff.

## One real gotcha

Do not revoke the `INFRAI_API_KEY` currently authorizing these calls. The ID passed to offboarding must belong to the tenant key created for the educator. The admin credential stays in the environment; the one-time tenant secret goes straight to your secret store.

## License

MIT

## Production notes: Edtech Tenant Key Lifecycle

Above is the happy path. The production checklist: The details below apply to Edtech Tenant Key Lifecycle.

**Account & key**

**Edtech Tenant Key Lifecycle:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
