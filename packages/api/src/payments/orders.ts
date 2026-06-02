type RechargePackage = {
  id: string;
  amountCny: string;
  credits: number;
};

type CustomRechargeConfig = {
  minCny: string;
  maxCny: string;
  creditsPerCny: number;
};

type ResolveRechargeInput = {
  packageId?: string;
  amountCny?: string;
  packages: RechargePackage[];
  custom: CustomRechargeConfig;
};

type PackageRecharge = {
  packageId: string;
  amountCny: number;
  credits: number;
};

type CustomRecharge = {
  customAmountCny: number;
  amountCny: number;
  credits: number;
};

export type ResolvedRecharge = PackageRecharge | CustomRecharge;

export function resolveRecharge(input: ResolveRechargeInput): ResolvedRecharge {
  if ((input.packageId && input.amountCny) || (!input.packageId && !input.amountCny)) {
    throw new Error('Provide exactly one of packageId or amountCny');
  }

  if (input.packageId) {
    const pkg = input.packages.find((item) => item.id === input.packageId);
    if (!pkg) {
      throw new Error('Invalid packageId');
    }
    return { packageId: pkg.id, amountCny: Number(pkg.amountCny), credits: pkg.credits };
  }

  const amountCny = Number(input.amountCny);
  const minCny = Number(input.custom.minCny);
  const maxCny = Number(input.custom.maxCny);
  if (!Number.isFinite(amountCny) || amountCny < minCny || amountCny > maxCny) {
    throw new Error('Invalid amountCny');
  }

  return {
    customAmountCny: amountCny,
    amountCny,
    credits: Math.round(amountCny * input.custom.creditsPerCny),
  };
}

export function createOutTradeNo(
  now = new Date(),
  createRandomSuffix = () => Math.random().toString(36).slice(2, 8).toUpperCase(),
): string {
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `LC${timestamp}${createRandomSuffix()}`;
}
