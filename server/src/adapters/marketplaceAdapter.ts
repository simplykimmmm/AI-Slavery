export interface ListingDraftInput {
  taskId: string;
  title: string;
  description: string;
  tags: string[];
  price?: number;
}

export interface PublishListingInput {
  draftId: string;
  approvedBy?: string;
}

export interface DraftListingResult {
  draftId: string;
  draftUrl: string;
  dryRun: true;
}

export interface PublishResult {
  published: false;
  dryRun: true;
  message: string;
}

export interface MarketplaceAdapter {
  createDraftListing(input: ListingDraftInput): Promise<DraftListingResult>;
  publishListing(input: PublishListingInput): Promise<PublishResult>;
}
