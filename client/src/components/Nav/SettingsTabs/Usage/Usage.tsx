import React from 'react';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks';
import UsageTransactions from './UsageTransactions';

function Usage() {
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-text-primary">
      <UsageTransactions enabled={!!isAuthenticated && !!startupConfig?.balance?.enabled} />
    </div>
  );
}

export default React.memo(Usage);
