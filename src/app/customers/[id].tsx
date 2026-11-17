import { useLocalSearchParams } from 'expo-router';

import CustomerDetailScreen from '@/features/customers/CustomerDetailScreen';

export default function CustomerDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CustomerDetailScreen customerId={id} />;
}
