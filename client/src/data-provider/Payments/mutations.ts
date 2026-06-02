import { useMutation } from '@tanstack/react-query';
import { MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { TCreatePaymentOrderRequest, TCreatePaymentOrderResponse } from 'librechat-data-provider';

export const createPaymentOrderMutationKey = () => [MutationKeys.createPaymentOrder] as const;

export const useCreatePaymentOrder = (
  options?: UseMutationOptions<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest>,
): UseMutationResult<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest> => {
  return useMutation<TCreatePaymentOrderResponse, unknown, TCreatePaymentOrderRequest>(
    createPaymentOrderMutationKey(),
    (payload) => dataService.createPaymentOrder(payload),
    options,
  );
};
