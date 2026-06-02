const express = require('express');
const request = require('supertest');

const mockCreatePaymentHandlers = jest.fn(() => ({
  getPackages: (_req, res) =>
    res.json({
      packages: [],
      custom: { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 },
      defaultProvider: 'alipay',
      providers: { alipay: { enabled: true } },
    }),
  createOrder: (_req, res) =>
    res.json({ orderId: 'order1', outTradeNo: 'LC202605260004', paymentForm: '<form></form>' }),
  getOrder: (_req, res) => res.json({ _id: 'order1', status: 'pending' }),
  handleAlipayNotify: (_req, res) => res.type('text/plain').send('success'),
}));
const mockCreateAlipayProviderFromConfig = jest.fn();

jest.mock('@librechat/api', () => ({
  createAlipayProviderFromConfig: mockCreateAlipayProviderFromConfig,
  createPaymentHandlers: mockCreatePaymentHandlers,
}));

jest.mock('~/models', () => ({
  createPaymentOrder: jest.fn(),
  createTransaction: jest.fn(),
  findPaymentOrderById: jest.fn(),
  findPaymentOrderByOutTradeNo: jest.fn(),
  updatePaymentOrder: jest.fn(),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, _res, next) => {
    req.user = { id: 'user1' };
    next();
  },
}));

describe('payment routes', () => {
  let app;

  beforeEach(() => {
    const paymentsRouter = require('./payments');
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/payments', paymentsRouter);
  });

  it('wires payment handlers with runtime dependencies', () => {
    expect(mockCreatePaymentHandlers).toHaveBeenCalledWith({
      getAppConfig: expect.any(Function),
      getProvider: mockCreateAlipayProviderFromConfig,
      methods: expect.objectContaining({
        createPaymentOrder: expect.any(Function),
        createTransaction: expect.any(Function),
        findPaymentOrderById: expect.any(Function),
        findPaymentOrderByOutTradeNo: expect.any(Function),
        updatePaymentOrder: expect.any(Function),
      }),
    });
  });

  it('registers payment package route', async () => {
    const res = await request(app).get('/api/payments/packages');

    expect(res.status).toBe(200);
    expect(res.body.packages).toEqual([]);
    expect(res.body.defaultProvider).toBe('alipay');
  });

  it('registers authenticated order routes', async () => {
    const createRes = await request(app).post('/api/payments/orders').send({ packageId: 'cny_10' });
    const getRes = await request(app).get('/api/payments/orders/order1');

    expect(createRes.status).toBe(200);
    expect(createRes.body.outTradeNo).toBe('LC202605260004');
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('pending');
  });

  it('registers unauthenticated Alipay notify route', async () => {
    const res = await request(app).post('/api/payments/alipay/notify').send('trade_status=TRADE_SUCCESS');

    expect(res.status).toBe(200);
    expect(res.text).toBe('success');
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
