export type BillPayment = 'cash' | 'udhaar';

export type Bill = {
  id: string;
  number: string;
  itemsSummary: string;
  itemCount: number;
  total: number;
  payment: BillPayment;
  date: string;
  time: string;
  customerId?: string;
};

export const bills: Bill[] = [
  {
    id: '024',
    number: '024',
    itemsSummary: 'ata, cheeni, doodh',
    itemCount: 3,
    total: 640,
    payment: 'cash',
    date: '9 Nov 2026',
    time: '2:12 PM',
  },
  {
    id: '023',
    number: '023',
    itemsSummary: 'anday, ghee',
    itemCount: 2,
    total: 1180,
    payment: 'udhaar',
    date: '9 Nov 2026',
    time: '1:30 PM',
    customerId: 'ahmed-raza',
  },
  {
    id: '022',
    number: '022',
    itemsSummary: 'chawal, namak',
    itemCount: 2,
    total: 420,
    payment: 'cash',
    date: '9 Nov 2026',
    time: '11:05 AM',
  },
  {
    id: '021',
    number: '021',
    itemsSummary: 'cheeni, tel',
    itemCount: 2,
    total: 1050,
    payment: 'udhaar',
    date: '9 Nov 2026',
    time: '10:20 AM',
    customerId: 'usman-ghani',
  },
  {
    id: '020',
    number: '020',
    itemsSummary: 'doodh, anday, biscuit',
    itemCount: 3,
    total: 890,
    payment: 'cash',
    date: '8 Nov 2026',
    time: '6:45 PM',
  },
  {
    id: '019',
    number: '019',
    itemsSummary: 'namak, sabun',
    itemCount: 2,
    total: 320,
    payment: 'udhaar',
    date: '8 Nov 2026',
    time: '4:10 PM',
    customerId: 'usman-ghani',
  },
  {
    id: '018',
    number: '018',
    itemsSummary: 'chawal, cheeni, doodh',
    itemCount: 3,
    total: 1240,
    payment: 'cash',
    date: '8 Nov 2026',
    time: '1:15 PM',
  },
  {
    id: '017',
    number: '017',
    itemsSummary: 'pyaaz, tamatar',
    itemCount: 2,
    total: 260,
    payment: 'cash',
    date: '7 Nov 2026',
    time: '7:30 PM',
  },
  {
    id: '016',
    number: '016',
    itemsSummary: 'ghee, cheeni',
    itemCount: 2,
    total: 950,
    payment: 'udhaar',
    date: '7 Nov 2026',
    time: '5:50 PM',
    customerId: 'bilal-ahmed',
  },
  {
    id: '015',
    number: '015',
    itemsSummary: 'ata, namak',
    itemCount: 2,
    total: 480,
    payment: 'cash',
    date: '7 Nov 2026',
    time: '3:25 PM',
  },
];

export const todayStats = {
  saleTotal: 18450,
  billCount: 24,
  udhaarTotal: 3200,
};
