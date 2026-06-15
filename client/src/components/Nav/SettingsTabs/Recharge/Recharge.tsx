import React from 'react';
import RechargeForm from './RechargeForm';
import { useLocalize } from '~/hooks';

function Recharge() {
  const localize = useLocalize();

  return (
    <section className="space-y-3">
      <h3 className="text-base font-medium">{localize('com_nav_balance_recharge')}</h3>
      <RechargeForm />
    </section>
  );
}

export default React.memo(Recharge);
