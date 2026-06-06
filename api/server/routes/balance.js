const express = require('express');
const router = express.Router();
const controller = require('../controllers/Balance');
const { requireJwtAuth } = require('../middleware/');

router.get('/', requireJwtAuth, controller.getBalance);
router.get('/transactions', requireJwtAuth, controller.getTransactions);

module.exports = router;
