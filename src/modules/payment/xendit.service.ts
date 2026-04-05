import { Xendit } from "xendit-node";

export class XenditService {
  private xendit: Xendit;

  constructor() {
    this.xendit = new Xendit({
      secretKey: process.env.XENDIT_SECRET_KEY || "dummy_key",
    });
  }

  async createInvoice(params: {
    externalId: string;
    amount: number;
    payerEmail: string;
    description: string;
  }) {
    if (!process.env.XENDIT_SECRET_KEY) {
      console.warn(
        "XENDIT_SECRET_KEY is not set. Generating mock invoice URL.",
      );
      return { invoiceUrl: "https://checkout.xendit.co/v2/mock-invoice-url" };
    }

    try {
      const response = await this.xendit.Invoice.createInvoice({
        data: {
          externalId: params.externalId,
          amount: params.amount,
          payerEmail: params.payerEmail,
          description: params.description,
          currency: "IDR",
        },
      });
      return response;
    } catch (error: any) {
      console.error("Failed to create Xendit invoice", error);
      throw new Error(`Xendit error: ${error.message || "Unknown error"}`);
    }
  }

  verifyWebhookToken(token: string) {
    if (!process.env.XENDIT_WEBHOOK_TOKEN) return true; // mock mode
    return token === process.env.XENDIT_WEBHOOK_TOKEN;
  }
}
