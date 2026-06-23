import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DraftListingResult,
  ListingDraftInput,
  MarketplaceAdapter,
  PublishListingInput,
  PublishResult,
} from "./marketplaceAdapter.js";
import { createId } from "../utils/ids.js";

export class DryRunMarketplaceAdapter implements MarketplaceAdapter {
  private readonly outputDirectory = resolve(process.cwd(), ".runtime-artifacts", "marketplace");

  async createDraftListing(input: ListingDraftInput): Promise<DraftListingResult> {
    const draftId = createId("draft");
    await mkdir(this.outputDirectory, { recursive: true });
    await writeFile(
      resolve(this.outputDirectory, `${draftId}.json`),
      JSON.stringify({ ...input, draftId, dryRun: true, createdAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    return { draftId, draftUrl: `dry-run://marketplace/${draftId}`, dryRun: true };
  }

  async publishListing(_input: PublishListingInput): Promise<PublishResult> {
    return {
      published: false,
      dryRun: true,
      message: "Publishing is disabled. The draft package is ready for manual review.",
    };
  }
}
