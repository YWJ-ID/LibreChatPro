import type { TPaymentProvider } from 'librechat-data-provider';

export type PaymentProviderName = TPaymentProvider;

export type PaymentFormInput = {
  outTradeNo: string;
  amountCny: string;
  subject: string;
};

export type VerifiedPaymentNotification = {
  isValid: boolean;
  outTradeNo?: string;
  providerTradeNo?: string;
  amountCny?: string;
  tradeStatus?: string;
  notifyId?: string;
};

export interface PaymentProvider {
  name: PaymentProviderName;
  createQRCodePayment(input: PaymentFormInput): Promise<{ qrCode: string }>;
  verifyNotify(input: Record<string, string>): Promise<VerifiedPaymentNotification>;
  queryOrder?(input: { outTradeNo: string }): Promise<VerifiedPaymentNotification>;
}
