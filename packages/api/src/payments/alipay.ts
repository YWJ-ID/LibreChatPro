import { AlipaySdk } from 'alipay-sdk';
import { readFileSync } from 'node:fs';
import type { AlipaySdkCommonResult, AlipaySdkConfig } from 'alipay-sdk';
import type { AppConfig } from '@librechat/data-schemas';
import type { PaymentProvider } from './providers';

type AlipayQueryResult = Partial<Pick<AlipaySdkCommonResult, 'code' | 'msg'>> & {
  trade_no?: string;
  total_amount?: string;
  trade_status?: string;
  tradeNo?: string;
  totalAmount?: string;
  tradeStatus?: string;
};

type AlipayNotifyPayload = Record<string, string>;

type AlipayClient = {
  pageExecute(method: string, httpMethod: 'POST', params: Record<string, unknown>): string | Promise<string>;
  checkNotifySign(payload: AlipayNotifyPayload): boolean;
  exec(method: string, params: Record<string, unknown>): Promise<AlipayQueryResult>;
};

type AlipayProviderConfig = {
  appId: string;
  gateway: string;
  privateKey: string;
  alipayPublicKey: string;
  notifyUrl: string;
  returnUrl: string;
  sellerId: string;
  signType: 'RSA2';
  client: AlipayClient;
};

type RequiredAlipayConfig = {
  appId: string;
  gateway: string;
  privateKeyPath: string;
  alipayPublicKey: string;
  notifyUrl: string;
  returnUrl: string;
  sellerId: string;
  signType?: 'RSA2';
};

type AlipayProviderFactoryDeps = {
  readFile?: (path: string, encoding: BufferEncoding) => string;
  createClient?: (config: AlipaySdkConfig) => AlipayClient;
};

function getConfiguredAlipay(appConfig?: AppConfig): RequiredAlipayConfig | null {
  const alipay = appConfig?.payments?.alipay;
  if (
    !alipay?.enabled ||
    !alipay.appId ||
    !alipay.gateway ||
    !alipay.privateKeyPath ||
    !alipay.alipayPublicKey ||
    !alipay.notifyUrl ||
    !alipay.returnUrl ||
    !alipay.sellerId
  ) {
    return null;
  }

  return {
    appId: alipay.appId,
    gateway: alipay.gateway,
    privateKeyPath: alipay.privateKeyPath,
    alipayPublicKey: alipay.alipayPublicKey,
    notifyUrl: alipay.notifyUrl,
    returnUrl: alipay.returnUrl,
    sellerId: alipay.sellerId,
    signType: alipay.signType,
  };
}

export function createAlipayProvider(config: AlipayProviderConfig): PaymentProvider {
  return {
    name: 'alipay',
    async createPaymentForm(input) {
      return config.client.pageExecute('alipay.trade.page.pay', 'POST', {
        notifyUrl: config.notifyUrl,
        returnUrl: config.returnUrl,
        bizContent: {
          out_trade_no: input.outTradeNo,
          total_amount: input.amountCny,
          subject: input.subject,
          product_code: 'FAST_INSTANT_TRADE_PAY',
        },
      });
    },
    async verifyNotify(payload) {
      if (!config.client.checkNotifySign(payload)) {
        return { isValid: false };
      }

      if (payload.app_id !== config.appId || payload.seller_id !== config.sellerId) {
        return { isValid: false };
      }

      return {
        isValid: true,
        outTradeNo: payload.out_trade_no,
        providerTradeNo: payload.trade_no,
        amountCny: payload.total_amount,
        tradeStatus: payload.trade_status,
        notifyId: payload.notify_id,
      };
    },
    async queryOrder(input) {
      const response = await config.client.exec('alipay.trade.query', {
        bizContent: { out_trade_no: input.outTradeNo },
      });

      return {
        isValid: true,
        outTradeNo: input.outTradeNo,
        providerTradeNo: response.trade_no ?? response.tradeNo,
        amountCny: response.total_amount ?? response.totalAmount,
        tradeStatus: response.trade_status ?? response.tradeStatus,
      };
    },
  };
}

export function createAlipayProviderFromConfig(
  appConfig?: AppConfig,
  deps: AlipayProviderFactoryDeps = {},
): PaymentProvider | null {
  const alipay = getConfiguredAlipay(appConfig);
  if (!alipay) {
    return null;
  }

  const readFile = deps.readFile ?? readFileSync;
  const createClient = deps.createClient ?? ((config: AlipaySdkConfig): AlipayClient => new AlipaySdk(config));
  const privateKey = readFile(alipay.privateKeyPath, 'utf8');

  return createAlipayProvider({
    appId: alipay.appId,
    gateway: alipay.gateway,
    privateKey,
    alipayPublicKey: alipay.alipayPublicKey,
    notifyUrl: alipay.notifyUrl,
    returnUrl: alipay.returnUrl,
    sellerId: alipay.sellerId,
    signType: alipay.signType ?? 'RSA2',
    client: createClient({
      appId: alipay.appId,
      gateway: alipay.gateway,
      privateKey,
      alipayPublicKey: alipay.alipayPublicKey,
      signType: alipay.signType ?? 'RSA2',
    }),
  });
}
