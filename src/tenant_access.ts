import { z } from "zod";
import { InfraiControlPlane } from "./infrai_control_plane.js";

export const provisionTenantSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  educatorEmail: z.string().email(),
  educatorName: z.string().min(1),
  courseId: z.string().min(1),
  learnerDeadline: z.string().datetime(),
  requestId: z.string().uuid(),
});

export const offboardTenantSchema = z.object({
  userId: z.string().min(1),
  keyId: z.string().min(1),
});

export type ProvisionTenant = z.infer<typeof provisionTenantSchema>;
export type OffboardTenant = z.infer<typeof offboardTenantSchema>;

type CreatedUser = { id: string };
type CreatedKey = { id: string; key: string };

export type TenantCredential = {
  tenantId: string;
  userId: string;
  keyId: string;
  key: string;
  courseId: string;
  learnerDeadline: string;
  scopes: readonly string[];
};

const COURSE_SCOPES = [
  "course:delivery",
  "learner:deadlines",
  "educator:reports",
] as const;

export class TenantAccessService {
  private readonly infrai: InfraiControlPlane;

  constructor(infrai: InfraiControlPlane) {
    this.infrai = infrai;
  }

  async provision(input: ProvisionTenant): Promise<TenantCredential> {
    const user = await this.infrai.request<CreatedUser>("/v1/auth/user/create", {
      method: "POST",
      body: {
        email: input.educatorEmail,
        name: input.educatorName,
        metadata: {
          tenant_id: input.tenantId,
          course_id: input.courseId,
          learner_deadline: input.learnerDeadline,
        },
        mode: "tenant_educator",
        idempotency_key: `${input.requestId}:user`,
      },
    });

    const credential = await this.infrai.request<CreatedKey>("/v1/account/keys/create", {
      method: "POST",
      body: {
        project_id: input.projectId,
        name: `tenant:${input.tenantId}:educator:${user.id}`,
        scopes: [...COURSE_SCOPES],
        idempotency_key: `${input.requestId}:key`,
      },
    });

    return {
      tenantId: input.tenantId,
      userId: user.id,
      keyId: credential.id,
      key: credential.key,
      courseId: input.courseId,
      learnerDeadline: input.learnerDeadline,
      scopes: COURSE_SCOPES,
    };
  }

  async offboard(input: OffboardTenant): Promise<{ state: "offboarded" }> {
    await this.infrai.request<unknown>(`/v1/account/keys/revoke/${encodeURIComponent(input.keyId)}`, {
      method: "DELETE",
    });
    await this.infrai.request<unknown>(`/v1/auth/user/delete/${encodeURIComponent(input.userId)}`, {
      method: "DELETE",
    });
    return { state: "offboarded" };
  }
}
