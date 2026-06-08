import Logger from "../../loaders/logger";

const ALCHEMY_NOTIFY_URL = "https://dashboard.alchemy.com/api";

export class AlchemyNotifyClient {
  constructor(
    private readonly authToken: string,
    private readonly webhookId: string,
  ) {}

  async addAddress(address: string): Promise<void> {
    const res = await fetch(`${ALCHEMY_NOTIFY_URL}/update-webhook-addresses`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Alchemy-Token": this.authToken,
      },
      body: JSON.stringify({
        webhook_id: this.webhookId,
        addresses_to_add: [address],
        addresses_to_remove: [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      Logger.error({ status: res.status, err, address }, "Failed to add address to Alchemy webhook");
      throw new Error(`Alchemy addAddress failed: ${res.status}`);
    }

    Logger.info({ address, webhookId: this.webhookId }, "Address added to Alchemy webhook");
  }
}
