export type StoreCategory = 'food' | 'clothes' | 'hardware' | 'market';

export interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

export interface Store {
  id: string;
  storeName: string;
  logo: string;
  rating: number;
  reviewCount?: number;
  address: string; // The actual store address from Firestore (e.g., "31 Turf Club St")
  location?: { lat: number; lng: number }; // Store GPS coordinates
  category: StoreCategory;
  openingHours?: OpeningHours;
  // Placeholders for future implementation
  distance_km?: number;
  delivery_time?: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  category?: string;
  categoryKey?: string;
  foodCategory?: string;
  imageUrls?: string[];
  availability?: boolean;
  unit?: string; // e.g. "15kg", "500ml" — shown next to the product
}

export const slugifyCategory = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const getProductImages = (product: Product): string[] => {
  const images = product.imageUrls?.filter(
    (image): image is string => typeof image === 'string' && image.trim().length > 0,
  ).map(image => image.trim()) ?? [];

  if (images.length > 0) return images;
  return typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0
    ? [product.imageUrl.trim()]
    : [];
};

export const getProductCategoryKey = (product: Product): string =>
  product.categoryKey || slugifyCategory(product.category || '') || 'other';

export const buildAvailableTabs = <TProduct, TTab extends { value: string }>(
  products: TProduct[],
  definitions: TTab[],
  getKey: (product: TProduct) => string,
): TTab[] => {
  const availableKeys = new Set(products.map(getKey));
  return definitions.filter(tab => availableKeys.has(tab.value));
};

