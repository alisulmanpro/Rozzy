import { bills } from './bills';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  udhaarTotal: number;
};

export const customers: Customer[] = [
  {
    id: 'ahmed-raza',
    name: 'Ahmed Raza',
    phone: '0300 1234567',
    udhaarTotal: 1200,
  },
  {
    id: 'usman-ghani',
    name: 'Usman Ghani',
    phone: '0321 7654321',
    udhaarTotal: 1050,
  },
  {
    id: 'bilal-ahmed',
    name: 'Bilal Ahmed',
    phone: '0345 1122334',
    udhaarTotal: 950,
  },
];

export function getCustomer(customerId: string): Customer | undefined {
  return customers.find((customer) => customer.id === customerId);
}

export function getCustomerBills(customerId: string) {
  return bills.filter((bill) => bill.customerId === customerId);
}
