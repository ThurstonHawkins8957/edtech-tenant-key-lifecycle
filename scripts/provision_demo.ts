import { randomUUID } from "node:crypto";
import { InfraiControlPlane } from "../src/infrai_control_plane.js";
import { TenantAccessService } from "../src/tenant_access.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the demo");

const service = new TenantAccessService(new InfraiControlPlane(apiKey));
const result = await service.provision({
  tenantId: "north-campus",
  projectId: "course-platform",
  educatorEmail: "educator@example.edu",
  educatorName: "Ada Teacher",
  courseId: "biology-204",
  learnerDeadline: "2026-10-30T17:00:00.000Z",
  requestId: randomUUID(),
});

console.log(JSON.stringify(result, null, 2));
