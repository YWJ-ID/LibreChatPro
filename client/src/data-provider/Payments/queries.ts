import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type { TPaymentOrder, TPaymentPackagesResponse } from 'librechat-data-provider';

export const paymentPackagesQueryKey = () => [QueryKeys.paymentPackages] as const;

export const paymentOrderQueryKey = (orderId: string) => [QueryKeys.paymentOrder, orderId] as const;

export const useGetPaymentPackages = <TData = TPaymentPackagesResponse>(
  config?: UseQueryOptions<TPaymentPackagesResponse, unknown, TData>,
): QueryObserverResult<TData, unknown> => {
  return useQuery<TPaymentPackagesResponse, unknown, TData>(
    paymentPackagesQueryKey(),
    () => dataService.getPaymentPackages(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useGetPaymentOrder = <TData = TPaymentOrder>(
  orderId: string,
  config?: UseQueryOptions<TPaymentOrder, unknown, TData>,
): QueryObserverResult<TData, unknown> => {
  return useQuery<TPaymentOrder, unknown, TData>(
    paymentOrderQueryKey(orderId),
    () => dataService.getPaymentOrder(orderId),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
      enabled: (config?.enabled ?? true) && Boolean(orderId),
    },
  );
};
