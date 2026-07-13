import { useMutation } from '@tanstack/react-query';
import { MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { TCreatePaymentOrderRequest, TCreatePaymentOrderResponse, TPaymentOrder } from 'librechat-data-provider';

export const createPaymentOrderMutationKey = () => [MutationKeys.createPaymentOrder] as const;

export const cancelPaymentOrderMutationKey = () => [MutationKeys.cancelPaymentOrder] as const;

export const useCreatePaymentOrder = (
  options?: UseMutationOptions<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest>,
): UseMutationResult<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest> => {
  return useMutation<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest>(
    createPaymentOrderMutationKey(),
    (payload) => dataService.createPaymentOrder(payload),
    options,
  );
};

export const useCancelPaymentOrder = (
  options?: UseMutationOptions<TPaymentOrder, unknown, string>,
): UseMutationResult<TPaymentOrder, unknown, string> => {
  return useMutation<TPaymentOrder, unknown, string>(
    cancelPaymentOrderMutationKey(),
    (orderId) => dataService.cancelPaymentOrder(orderId),
    options,
  );
};
