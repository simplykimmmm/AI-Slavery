import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DeliveryAdapter,
  DeliveryPackageInput,
  DeliveryPackageResult,
  DeliveryResult,
  SendDeliveryInput,
} from "./deliveryAdapter.js";
import { createId } from "../utils/ids.js";

export class DryRunDeliveryAdapter implements DeliveryAdapter {
  private readonly outputDirectory = resolve(process.cwd(), ".runtime-artifacts", "deliveries");

  async createDeliveryPackage(input: DeliveryPackageInput): Promise<DeliveryPackageResult> {
    const packageId = createId("delivery");
    await mkdir(this.outputDirectory, { recursive: true });
    await writeFile(
      resolve(this.outputDirectory, `${packageId}.json`),
      JSON.stringify({ ...input, packageId, dryRun: true, createdAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    return { packageId, artifactUrl: `dry-run://delivery/${packageId}`, dryRun: true };
  }

  async sendDelivery(_input: SendDeliveryInput): Promise<DeliveryResult> {
    return {
      sent: false,
      dryRun: true,
      message: "Automatic client messaging is disabled. Export the package after manual approval.",
    };
  }
}
