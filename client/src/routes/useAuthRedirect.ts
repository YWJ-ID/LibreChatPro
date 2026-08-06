import { useAuthContext } from '~/hooks';

export default function useAuthRedirect() {
  return useAuthContext();
}
