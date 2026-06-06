const { getBalanceTransactions } = require('@librechat/api');
const db = require('~/models');

async function getBalance(req, res) {
  const balanceData = await db.findBalanceByUser(req.user.id);

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  const { _id: _, ...result } = balanceData;

  if (!result.autoRefillEnabled) {
    delete result.refillIntervalValue;
    delete result.refillIntervalUnit;
    delete result.lastRefill;
    delete result.refillAmount;
  }

  res.status(200).json(result);
}

async function getTransactions(req, res) {
  const result = await getBalanceTransactions(
    { user: req.user.id, query: req.query },
    { getTransactions: db.getTransactions },
  );

  res.status(200).json(result);
}

module.exports = { getBalance, getTransactions };
