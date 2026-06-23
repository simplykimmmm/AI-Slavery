export interface DeliveryPackageInput {
  taskId: string;
  title: string;
  files?: string[];
  metadata: Record<string, unknown>;
}

export interface SendDeliveryInput {
  packageId: string;
  recipientReference?: string;
}

export interface DeliveryPackageResult {
  packageId: string;
  artifactUrl: string;
  dryRun: true;
}

export interface DeliveryResult {
  sent: false;
  dryRun: true;
  message: string;
}

export interface DeliveryAdapter {
  createDeliveryPackage(input: DeliveryPackageInput): Promise<DeliveryPackageResult>;
  sendDelivery(input: SendDeliveryInput): Promise<DeliveryResult>;
}
