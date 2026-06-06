import React from 'react';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks';
import OrdersTable from './OrdersTable';

function Orders() {
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-text-primary">
      <OrdersTable enabled={!!isAuthenticated && !!startupConfig?.payments?.enabled} />
    </div>
  );
}

export default React.memo(Orders);
