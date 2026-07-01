import type { AppConfig } from '@librechat/data-schemas';
import { createAlipayProvider, createAlipayProviderFromConfig } from './alipay';

describe('createAlipayProvider', () => {
  it('creates page pay form with required Alipay fields', async () => {
    const pageExecute = jest.fn(async (_method, _returnType, params) => {
      const bizContent = params.bizContent as { product_code: string };
      return `<form>${bizContent.product_code}</form>`;
    });
    const provider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'public-key',
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute,
        checkNotifySign: jest.fn(() => true),
        exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
      },
    });

    const form = await provider.createPaymentForm({
      outTradeNo: 'LC202605260003',
      amountCny: '10.00',
      subject: 'LibreChat Credits 1000000',
    });

    expect(form).toContain('FAST_INSTANT_TRADE_PAY');
    expect(pageExecute).toHaveBeenCalledWith('alipay.trade.page.pay', 'POST', {
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      bizContent: {
        out_trade_no: 'LC202605260003',
        total_amount: '10.00',
        subject: 'LibreChat Credits 1000000',
        product_code: 'FAST_INSTANT_TRADE_PAY',
        timeout_express: '10m',
      },
    });
  });

  it('sets a ten minute timeout when creating page payment forms', async () => {
    const pageExecute = jest.fn(async () => '<form></form>');
    const provider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'alipay-public-key',
      notifyUrl: 'https://example.com/notify',
      returnUrl: 'https://example.com/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute,
        checkNotifySign: jest.fn(() => true),
        exec: jest.fn(),
      },
    });

    await provider.createPaymentForm({
      outTradeNo: 'LC202607010001',
      amountCny: '10.00',
      subject: 'LibreChat Credits 1000000',
    });

    expect(pageExecute).toHaveBeenCalledWith('alipay.trade.page.pay', 'POST', {
      notifyUrl: 'https://example.com/notify',
      returnUrl: 'https://example.com/return',
      bizContent: {
        out_trade_no: 'LC202607010001',
        total_amount: '10.00',
        subject: 'LibreChat Credits 1000000',
        product_code: 'FAST_INSTANT_TRADE_PAY',
        timeout_express: '10m',
      },
    });
  });

  it('verifies and normalizes async notifications', async () => {
    const provider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'public-key',
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute: jest.fn(async () => '<form></form>'),
        checkNotifySign: jest.fn(() => true),
        exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
      },
    });

    const result = await provider.verifyNotify({
      app_id: 'app-id',
      seller_id: 'seller-id',
      out_trade_no: 'LC202605260004',
      trade_no: 'ALI123',
      total_amount: '10.00',
      trade_status: 'TRADE_SUCCESS',
      notify_id: 'notify-1',
      sign: 'signature',
    });

    expect(result).toEqual({
      isValid: true,
      outTradeNo: 'LC202605260004',
      providerTradeNo: 'ALI123',
      amountCny: '10.00',
      tradeStatus: 'TRADE_SUCCESS',
      notifyId: 'notify-1',
    });
  });

  it('rejects notifications with invalid signatures or merchant identity', async () => {
    const provider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'public-key',
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute: jest.fn(async () => '<form></form>'),
        checkNotifySign: jest.fn(() => false),
        exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
      },
    });

    await expect(provider.verifyNotify({ app_id: 'app-id', seller_id: 'seller-id' })).resolves.toEqual({
      isValid: false,
    });

    const validSignatureProvider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'public-key',
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute: jest.fn(async () => '<form></form>'),
        checkNotifySign: jest.fn(() => true),
        exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
      },
    });

    await expect(
      validSignatureProvider.verifyNotify({ app_id: 'other-app', seller_id: 'seller-id' }),
    ).resolves.toEqual({ isValid: false });
    await expect(
      validSignatureProvider.verifyNotify({ app_id: 'app-id', seller_id: 'other-seller' }),
    ).resolves.toEqual({ isValid: false });
  });

  it('queries orders through alipay.trade.query', async () => {
    const exec = jest.fn(async () => ({
      trade_no: 'ALI123',
      total_amount: '10.00',
      trade_status: 'TRADE_SUCCESS',
    }));
    const provider = createAlipayProvider({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key',
      alipayPublicKey: 'public-key',
      notifyUrl: 'https://example.com/api/payments/alipay/notify',
      returnUrl: 'https://example.com/payment/return',
      sellerId: 'seller-id',
      signType: 'RSA2',
      client: {
        pageExecute: jest.fn(async () => '<form></form>'),
        checkNotifySign: jest.fn(() => true),
        exec,
      },
    });

    const result = await provider.queryOrder?.({ outTradeNo: 'LC202605260004' });

    expect(exec).toHaveBeenCalledWith('alipay.trade.query', {
      bizContent: { out_trade_no: 'LC202605260004' },
    });
    expect(result).toEqual({
      isValid: true,
      outTradeNo: 'LC202605260004',
      providerTradeNo: 'ALI123',
      amountCny: '10.00',
      tradeStatus: 'TRADE_SUCCESS',
    });
  });

  it('creates provider from app config and server-side private key file', async () => {
    const readFile = jest.fn((path: string) => `${path}-contents`);
    const sdk = {
      pageExecute: jest.fn(() => '<form>sdk</form>'),
      checkNotifySign: jest.fn(() => true),
      exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
    };
    const createClient = jest.fn(() => sdk);
    const appConfig = {
      payments: {
        alipay: {
          enabled: true,
          appId: 'app-id',
          gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
          privateKeyPath: 'private-key.pem',
          alipayPublicKey: 'public-key',
          notifyUrl: 'https://example.com/api/payments/alipay/notify',
          returnUrl: 'https://example.com/payment/return',
          sellerId: 'seller-id',
          signType: 'RSA2',
        },
      },
    } as AppConfig;

    const provider = createAlipayProviderFromConfig(appConfig, { createClient, readFile });
    await provider?.createPaymentForm({
      outTradeNo: 'LC202605260006',
      amountCny: '10.00',
      subject: 'LibreChat Credits 1000000',
    });

    expect(readFile).toHaveBeenCalledWith('private-key.pem', 'utf8');
    expect(createClient).toHaveBeenCalledWith({
      appId: 'app-id',
      gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      privateKey: 'private-key.pem-contents',
      alipayPublicKey: 'public-key',
      signType: 'RSA2',
    });
    expect(sdk.pageExecute).toHaveBeenCalledWith('alipay.trade.page.pay', 'POST', expect.any(Object));
  });

  it('resolves Alipay runtime config from environment placeholders', async () => {
    const originalEnv = { ...process.env };
    process.env.ALIPAY_APP_ID = 'env-app-id';
    process.env.ALIPAY_GATEWAY = 'https://env-gateway.test/gateway.do';
    process.env.ALIPAY_PRIVATE_KEY_PATH = 'env-private-key.pem';
    process.env.ALIPAY_PUBLIC_KEY = 'env-public-key';
    process.env.ALIPAY_NOTIFY_URL = 'https://env.example.com/api/payments/alipay/notify';
    process.env.ALIPAY_RETURN_URL = 'https://env.example.com/payment/return';
    process.env.ALIPAY_SELLER_ID = 'env-seller-id';

    const readFile = jest.fn((path: string) => `${path}-contents`);
    const sdk = {
      pageExecute: jest.fn(() => '<form>sdk</form>'),
      checkNotifySign: jest.fn(() => true),
      exec: jest.fn(async () => ({ trade_status: 'TRADE_SUCCESS' })),
    };
    const createClient = jest.fn(() => sdk);
    const appConfig = {
      payments: {
        alipay: {
          enabled: true,
          appId: '${ALIPAY_APP_ID}',
          gateway: '${ALIPAY_GATEWAY}',
          privateKeyPath: '${ALIPAY_PRIVATE_KEY_PATH}',
          alipayPublicKey: '${ALIPAY_PUBLIC_KEY}',
          notifyUrl: '${ALIPAY_NOTIFY_URL}',
          returnUrl: '${ALIPAY_RETURN_URL}',
          sellerId: '${ALIPAY_SELLER_ID}',
          signType: 'RSA2',
        },
      },
    } as AppConfig;

    try {
      const provider = createAlipayProviderFromConfig(appConfig, { createClient, readFile });
      await provider?.createPaymentForm({
        outTradeNo: 'LC202605260007',
        amountCny: '10.00',
        subject: 'LibreChat Credits 1000000',
      });

      expect(readFile).toHaveBeenCalledWith('env-private-key.pem', 'utf8');
      expect(createClient).toHaveBeenCalledWith({
        appId: 'env-app-id',
        gateway: 'https://env-gateway.test/gateway.do',
        privateKey: 'env-private-key.pem-contents',
        alipayPublicKey: 'env-public-key',
        signType: 'RSA2',
      });
      expect(sdk.pageExecute).toHaveBeenCalledWith('alipay.trade.page.pay', 'POST', {
        notifyUrl: 'https://env.example.com/api/payments/alipay/notify',
        returnUrl: 'https://env.example.com/payment/return',
        bizContent: {
          out_trade_no: 'LC202605260007',
          total_amount: '10.00',
          subject: 'LibreChat Credits 1000000',
          product_code: 'FAST_INSTANT_TRADE_PAY',
          timeout_express: '10m',
        },
      });
    } finally {
      process.env = originalEnv;
    }
  });

  it('returns null when Alipay runtime config is incomplete', () => {
    const readFile = jest.fn();
    const createClient = jest.fn();

    expect(
      createAlipayProviderFromConfig({ payments: { alipay: { appId: 'app-id' } } } as AppConfig, {
        createClient,
        readFile,
      }),
    ).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });
});
