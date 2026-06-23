import { env } from "../env.js";
import { DryRunDeliveryAdapter } from "./dryRunDeliveryAdapter.js";
import { DryRunMarketplaceAdapter } from "./dryRunMarketplaceAdapter.js";

if (!env.DRY_RUN_EXTERNAL_ACTIONS) {
  throw new Error("Runtime v1 only supports DRY_RUN_EXTERNAL_ACTIONS=true.");
}

export const marketplaceAdapter = new DryRunMarketplaceAdapter();
export const deliveryAdapter = new DryRunDeliveryAdapter();
export * from "./marketplaceAdapter.js";
export * from "./deliveryAdapter.js";
