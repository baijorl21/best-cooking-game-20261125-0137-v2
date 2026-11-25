// Warung Kilat — the recipe book: every ingredient on the counters and every
// dish the customers can order. One job: names, pictures and prices, so the
// world and the renderer never hard-code a dish.

// Six bins along the bottom counter. `grill` ingredients must be cooked on the
// grill before they can go on a plate; the rest go straight onto the plate.
export const INGREDIENTS = [
  { id: 'bun', name: 'Roti', emoji: '🍞', key: '1', color: '#e8b25a', grill: false },
  { id: 'patty', name: 'Patty', emoji: '🥩', key: '2', color: '#a34d2d', grill: true, cookTime: 4 },
  { id: 'nasi', name: 'Nasi', emoji: '🍚', key: '3', color: '#f5f0e1', grill: false },
  { id: 'mie', name: 'Mie', emoji: '🍜', key: '4', color: '#f2c94c', grill: false },
  { id: 'ayam', name: 'Ayam', emoji: '🍗', key: '5', color: '#d98a3d', grill: true, cookTime: 5 },
  { id: 'saus', name: 'Saus', emoji: '🥫', key: '6', color: '#c0392b', grill: false },
];

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) ?? null;
}

// Four dishes, each three ingredients or fewer, so a plate is quick to build
// but the grill still forces a route through the kitchen.
export const DISHES = [
  { id: 'burger', name: 'Burger Kilat', emoji: '🍔', ingredients: ['bun', 'patty', 'saus'], coins: 12, color: '#e67e22' },
  { id: 'nasgor', name: 'Nasi Goreng Kilat', emoji: '🍛', ingredients: ['nasi', 'ayam', 'saus'], coins: 14, color: '#d35400' },
  { id: 'mieayam', name: 'Mie Ayam Kilat', emoji: '🍜', ingredients: ['mie', 'ayam'], coins: 11, color: '#b7950b' },
  { id: 'sandwich', name: 'Sandwich Kilat', emoji: '🥪', ingredients: ['bun', 'ayam', 'saus'], coins: 13, color: '#1e8449' },
];

export function dishById(id) {
  return DISHES.find((dish) => dish.id === id) ?? null;
}

// The dish whose ingredient multiset equals the plate, or null.
export function dishMatchingPlate(plate) {
  const sorted = [...plate].sort().join(',');
  return DISHES.find((dish) => [...dish.ingredients].sort().join(',') === sorted) ?? null;
}
