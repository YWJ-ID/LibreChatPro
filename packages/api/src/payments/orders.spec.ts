import { createOutTradeNo, resolveRecharge } from './orders';

describe('payment recharge orders', () => {
  const packages = [
    { id: 'cny_10', amountCny: '10.00', credits: 1000000 },
    { id: 'cny_50', amountCny: '50.00', credits: 5500000 },
  ];
  const custom = { minCny: '1.00', maxCny: '5000.00', creditsPerCny: 100000 };

  it('resolves fixed package recharge amounts', () => {
    const recharge = resolveRecharge({ packageId: 'cny_50', packages, custom });

    expect(recharge).toEqual({ packageId: 'cny_50', amountCny: 50, credits: 5500000 });
  });

  it('resolves custom recharge amounts', () => {
    const recharge = resolveRecharge({ amountCny: '12.34', packages, custom });

    expect(recharge).toEqual({ customAmountCny: 12.34, amountCny: 12.34, credits: 1234000 });
  });

  it('rejects invalid recharge requests', () => {
    expect(() => resolveRecharge({ packages, custom })).toThrow('Provide exactly one');
    expect(() =>
      resolveRecharge({ packageId: 'missing', amountCny: '10.00', packages, custom }),
    ).toThrow('Provide exactly one');
    expect(() => resolveRecharge({ packageId: 'missing', packages, custom })).toThrow(
      'Invalid packageId',
    );
    expect(() => resolveRecharge({ amountCny: '0.99', packages, custom })).toThrow(
      'Invalid amountCny',
    );
    expect(() => resolveRecharge({ amountCny: '5000.01', packages, custom })).toThrow(
      'Invalid amountCny',
    );
  });

  it('creates LibreChat payment order numbers with timestamp prefix', () => {
    const outTradeNo = createOutTradeNo(new Date('2026-05-26T01:02:03.000Z'), () => 'ABC123');

    expect(outTradeNo).toBe('LC20260526010203ABC123');
  });
});
