export type ProductUnit = 'kg' | 'gram' | 'litre' | 'dozen' | 'piece' | 'packet' | 'pao';

export type Product = {
  id: string;
  name: string;
  aliases: string[];
  price: number;
  unit: ProductUnit;
};

export const UNITS: ProductUnit[] = ['kg', 'gram', 'litre', 'dozen', 'piece', 'packet', 'pao'];

export const products: Product[] = [
  { id: 'ata', name: 'Ata', aliases: ['aata', 'atta'], price: 40, unit: 'kg' },
  { id: 'cheeni', name: 'Cheeni', aliases: ['khand', 'chini'], price: 150, unit: 'kg' },
  { id: 'doodh', name: 'Doodh', aliases: ['dudh', 'dhudh'], price: 200, unit: 'litre' },
  { id: 'anday', name: 'Anday', aliases: ['ande', 'auday'], price: 360, unit: 'dozen' },
  { id: 'ghee', name: 'Ghee', aliases: ['ghiu', 'desi ghee'], price: 560, unit: 'kg' },
  { id: 'ilachi', name: 'Ilachi', aliases: ['elaichi', 'ilaychi'], price: 9, unit: 'gram' },
  { id: 'laung', name: 'Laung', aliases: ['loung'], price: 900, unit: 'kg' },
  { id: 'zeera', name: 'Zeera', aliases: ['jeera'], price: 800, unit: 'kg' },
  { id: 'chawal', name: 'Chawal', aliases: ['sella'], price: 90, unit: 'kg' },
  { id: 'namak', name: 'Namak', aliases: ['sendha namak'], price: 40, unit: 'kg' },
  { id: 'chai-patti', name: 'Chai patti', aliases: ['chai', 'chaipatti'], price: 600, unit: 'kg' },
  { id: 'tel', name: 'Tel', aliases: ['banaspati'], price: 520, unit: 'litre' },
  { id: 'maida', name: 'Maida', aliases: ['menda'], price: 120, unit: 'kg' },
  { id: 'suji', name: 'Suji', aliases: ['sooji'], price: 130, unit: 'kg' },
  { id: 'besan', name: 'Besan', aliases: ['basan'], price: 160, unit: 'kg' },
  { id: 'daal-masoor', name: 'Daal masoor', aliases: ['masoor'], price: 240, unit: 'kg' },
  { id: 'daal-moong', name: 'Daal moong', aliases: ['moong'], price: 280, unit: 'kg' },
  { id: 'daal-chana', name: 'Daal chana', aliases: ['chana daal'], price: 220, unit: 'kg' },
  { id: 'makki-ka-ata', name: 'Makki ka ata', aliases: ['makki'], price: 90, unit: 'kg' },
  { id: 'basmati-chawal', name: 'Basmati chawal', aliases: ['basmati'], price: 320, unit: 'kg' },
  { id: 'aloo', name: 'Aloo', aliases: ['potato'], price: 60, unit: 'kg' },
  { id: 'pyaaz', name: 'Pyaaz', aliases: ['pyaz'], price: 80, unit: 'kg' },
  { id: 'tamatar', name: 'Tamatar', aliases: ['timatar'], price: 90, unit: 'kg' },
  { id: 'adrak', name: 'Adrak', aliases: ['adraka'], price: 350, unit: 'kg' },
  { id: 'lehsan', name: 'Lehsan', aliases: ['lehsun'], price: 400, unit: 'kg' },
  { id: 'shimla-mirch', name: 'Shimla mirch', aliases: ['shimla'], price: 120, unit: 'kg' },
  { id: 'hari-mirch', name: 'Hari mirch', aliases: ['mirch'], price: 160, unit: 'kg' },
  { id: 'bhindi', name: 'Bhindi', aliases: ['bhindi'], price: 100, unit: 'kg' },
  { id: 'baingan', name: 'Baingan', aliases: ['bengan'], price: 90, unit: 'kg' },
  { id: 'kheera', name: 'Kheera', aliases: ['kakdi'], price: 60, unit: 'kg' },
  { id: 'dahi', name: 'Dahi', aliases: ['yogurt'], price: 150, unit: 'kg' },
  { id: 'sabun', name: 'Sabun', aliases: ['soap'], price: 80, unit: 'piece' },
  { id: 'shampoo', name: 'Shampoo', aliases: ['shampoo'], price: 450, unit: 'piece' },
  { id: 'toothpaste', name: 'Toothpaste', aliases: ['colgate'], price: 250, unit: 'piece' },
  { id: 'toothbrush', name: 'Toothbrush', aliases: ['brush'], price: 120, unit: 'piece' },
  { id: 'biscuit', name: 'Biscuit', aliases: ['parle g'], price: 60, unit: 'packet' },
  { id: 'rusk', name: 'Rusk', aliases: ['toast'], price: 80, unit: 'packet' },
];
