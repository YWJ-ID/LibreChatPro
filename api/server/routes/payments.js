const express = require('express');
const { createAlipayProviderFromConfig, createPaymentHandlers } = require('@librechat/api');
const db = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');
const { getAppConfig } = require('~/server/services/Config');

const router = express.Router();
const handlers = createPaymentHandlers({
  getAppConfig,
  getProvider: createAlipayProviderFromConfig,
  methods: db,
});

router.get('/packages', handlers.getPackages);
router.post('/orders', requireJwtAuth, handlers.createOrder);
router.get('/orders', requireJwtAuth, handlers.listOrders);
router.get('/orders/:orderId', requireJwtAuth, handlers.getOrder);
router.post('/orders/:orderId/cancel', requireJwtAuth, handlers.cancelOrder);
router.post('/alipay/notify', handlers.handleAlipayNotify);

module.exports = router;
