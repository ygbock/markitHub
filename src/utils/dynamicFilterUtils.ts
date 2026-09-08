import { Product } from '../types';

export interface CategoryFacets {
  isPhones: boolean;
  isShoes: boolean;
  brands: string[];
  storage: string[];
  ram: string[];
  sizes: string[];
  colors: string[];
  genders: string[];
  dynamicAttrs: Record<string, string[]>;
}

export function isPhoneCategory(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c === 'phones' || c === 'samsung phones' || c === 'smartphones' || c === 'mobile phones';
}

export function isShoeCategory(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c === 'shoes' || c === 'footwear' || c === 'footwear & athletic' || c === 'sneakers';
}

export function extractCategoryFacets(category?: string | null, products: Product[] = []): CategoryFacets {
  const cat = category || 'All';
  const catLower = cat.toLowerCase();
  const isPhones = isPhoneCategory(cat);
  const isShoes = isShoeCategory(cat);

  // Filter products relevant to current category context
  const targetProducts = (products || []).filter(p => {
    if (!p) return false;
    if (cat === 'All') return true;
    const pCat = p.category || '';
    const pName = p.name || '';
    if (isPhones) return isPhoneCategory(pCat) || (pCat === 'Electronics' && (pName.toLowerCase().includes('galaxy') || pName.toLowerCase().includes('phone') || pName.toLowerCase().includes('iphone')));
    if (isShoes) return isShoeCategory(pCat) || pName.toLowerCase().includes('shoe') || pName.toLowerCase().includes('sneaker') || pName.toLowerCase().includes('pegasus');
    return pCat.toLowerCase() === catLower;
  });

  const brandsSet = new Set<string>();
  const storageSet = new Set<string>();
  const ramSet = new Set<string>();
  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();
  const gendersSet = new Set<string>();
  const dynamicMap: Record<string, Set<string>> = {};

  // Standard phone storage/ram candidates to guarantee full options for user testing
  if (isPhones) {
    ['64GB', '128GB', '256GB', '512GB'].forEach(s => storageSet.add(s));
    ['4GB', '8GB', '12GB'].forEach(r => ramSet.add(r));
  }

  // Standard shoe sizes/colors/genders candidates to guarantee full options for testing
  if (isShoes) {
    ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'].forEach(s => sizesSet.add(s));
    ['Black', 'White', 'Red', 'Blue'].forEach(c => colorsSet.add(c));
    ['Men', 'Women', 'Unisex'].forEach(g => gendersSet.add(g));
  }

  targetProducts.forEach(p => {
    if (p.brand) brandsSet.add(p.brand);

    // Extract from variants
    if (p.variants) {
      p.variants.forEach(v => {
        if (v.size) {
          if (v.size.includes('GB')) storageSet.add(v.size);
          else if (v.size.includes('US') || !isNaN(Number(v.size))) sizesSet.add(v.size.startsWith('US') ? v.size : `US ${v.size}`);
        }
        if (v.color) colorsSet.add(v.color.split(' ')[0]);

        if (v.options) {
          Object.entries(v.options).forEach(([k, val]) => {
            const kLower = (k || '').toLowerCase();
            const valStr = String(val ?? '');
            if (kLower === 'storage') storageSet.add(valStr);
            else if (kLower === 'ram') ramSet.add(valStr);
            else if (kLower === 'size') sizesSet.add(valStr);
            else if (kLower === 'color') colorsSet.add(valStr);
            else if (kLower === 'gender') gendersSet.add(valStr);
          });
        }
      });
    }

    // Extract from specifications
    if (p.specifications) {
      Object.entries(p.specifications).forEach(([k, val]) => {
        const kLower = (k || '').toLowerCase();
        const valStr = String(val ?? '');
        if (kLower === 'storage') {
          if (valStr.includes('64GB')) storageSet.add('64GB');
          if (valStr.includes('128GB')) storageSet.add('128GB');
          if (valStr.includes('256GB')) storageSet.add('256GB');
          if (valStr.includes('512GB')) storageSet.add('512GB');
        } else if (kLower === 'ram') {
          if (valStr.includes('4GB')) ramSet.add('4GB');
          if (valStr.includes('8GB')) ramSet.add('8GB');
          if (valStr.includes('12GB')) ramSet.add('12GB');
        } else if (kLower === 'size') {
          valStr.split(',').forEach(s => sizesSet.add(s.trim()));
        } else if (kLower === 'color') {
          valStr.split(',').forEach(c => colorsSet.add(c.trim()));
        } else if (kLower === 'gender') {
          valStr.split(',').forEach(g => gendersSet.add(g.trim()));
        } else {
          // Dynamic general specification
          if (!dynamicMap[k]) dynamicMap[k] = new Set<string>();
          dynamicMap[k].add(valStr);
        }
      });
    }
  });

  const dynamicAttrsResult: Record<string, string[]> = {};
  Object.entries(dynamicMap).forEach(([k, vSet]) => {
    if (vSet.size > 0 && vSet.size <= 10) {
      dynamicAttrsResult[k] = Array.from(vSet);
    }
  });

  return {
    isPhones,
    isShoes,
    brands: Array.from(brandsSet).sort(),
    storage: Array.from(storageSet),
    ram: Array.from(ramSet),
    sizes: Array.from(sizesSet),
    colors: Array.from(colorsSet),
    genders: Array.from(gendersSet),
    dynamicAttrs: dynamicAttrsResult
  };
}
