import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiControlPlane, InfraiError } from "./infrai_control_plane.js";
import {
  offboardTenantSchema,
  provisionTenantSchema,
  TenantAccessService,
} from "./tenant_access.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const service = new TenantAccessService(new InfraiControlPlane(apiKey));
const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/tenants/provision") {
      const input = provisionTenantSchema.parse(await readJson(request));
      send(response, 201, await service.provision(input));
      return;
    }
    if (request.method === "POST" && request.url === "/tenants/offboard") {
      const input = offboardTenantSchema.parse(await readJson(request));
      send(response, 200, await service.offboard(input));
      return;
    }
    send(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof ZodError) {
      send(response, 400, { error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 500, { error: "service_error" });
  }
}).listen(port, () => console.log(`Tenant key service listening on http://localhost:${port}`));

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
