import { Xendit } from "xendit-node";

export class XenditService {
  private xendit: Xendit;

  constructor() {
    this.xendit = new Xendit({
      secretKey: process.env.XENDIT_SECRET_KEY as string,
    });
  }

  async createInvoice(params: {
    externalId: string;
    amount: number;
    payerEmail: string;
    description: string;
  }) {
    try {
      const response = await this.xendit.Invoice.createInvoice({
        data: {
          externalId: params.externalId,
          amount: params.amount,
          payerEmail: params.payerEmail,
          description: params.description,
          currency: "IDR",
          invoiceDuration: 3600,
          successRedirectUrl: `${process.env.BASE_FRONTEND_URL || "http://localhost:5173"}/user/order-detail/${params.externalId}`,
          failureRedirectUrl: `${process.env.BASE_FRONTEND_URL || "http://localhost:5173"}/user/order-detail/${params.externalId}`,
        },
      });
      console.log(
        "Xendit Invoice Created Successfully for ID:",
        params.externalId,
      );
      console.log(
        "Invoice URL:",
        (response as any).invoiceUrl || (response as any).invoice_url,
      );
      return response;
    } catch (error: any) {
      console.error("Failed to create Xendit invoice", error);
      throw new Error(`Xendit error: ${error.message || "Unknown error"}`);
    }
  }

  verifyWebhookToken(token: string) {
    if (!process.env.XENDIT_WEBHOOK_TOKEN) return false;
    return token === process.env.XENDIT_WEBHOOK_TOKEN;
  }
}
