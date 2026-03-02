// ─── KitchenCalc — Data Layer ────────────────────────────────────────────────
//
// Architecture:
//   ingredientsCatalog  → global flat list; stock/price live here
//   recipes             → each ingredient is a REFERENCE { ingredientId, portionByGroup }
//
// This allows shared ingredients across recipes. Stock update in one place
// propagates automatically to every recipe that uses it.

// ── INGREDIENT CATALOG ───────────────────────────────────────────────────────
export const ingredientsCatalog = [
    {
        id: 'ing-001',
        name: 'Chicken Breast',
        unit: 'g',
        packSize: 2000,
        currentStock: 6,
        minOrder: 2,
        supplier: 'SISCO',
        pricePerPack: 28,
        substitutable: true,
        substitute: 'Turkey Breast',
    },
    {
        id: 'ing-002',
        name: 'Fusilli Pasta',
        unit: 'g',
        packSize: 1000,
        currentStock: 3,
        minOrder: 1,
        supplier: 'Driscoll',
        pricePerPack: 12,
        substitutable: true,
        substitute: 'Penne Pasta',
    },
    {
        id: 'ing-003',
        name: 'Capers',
        unit: 'g',
        packSize: 500,
        currentStock: 2,
        minOrder: 1,
        supplier: 'SISCO',
        pricePerPack: 9,
        substitutable: false,
        substitute: null,
    },
    {
        id: 'ing-004',
        name: 'Lemon Juice',
        unit: 'ml',
        packSize: 1000,
        currentStock: 1,
        minOrder: 1,
        supplier: 'FreshFarm',
        pricePerPack: 7,
        substitutable: true,
        substitute: 'Lime Juice',
    },
    {
        id: 'ing-005',
        name: 'Breadcrumbs',
        unit: 'g',
        packSize: 1000,
        currentStock: 3,
        minOrder: 1,
        supplier: 'Driscoll',
        pricePerPack: 6,
        substitutable: false,
        substitute: null,
    },
    {
        id: 'ing-006',
        name: 'Eggs',
        unit: 'units',
        packSize: 30,
        currentStock: 2,
        minOrder: 1,
        supplier: 'FreshFarm',
        pricePerPack: 8,
        substitutable: true,
        substitute: 'Flax Egg (vegan)',
    },
    {
        id: 'ing-007',
        name: 'Vegetable Oil',
        unit: 'ml',
        packSize: 3000,
        currentStock: 2,
        minOrder: 1,
        supplier: 'SISCO',
        pricePerPack: 15,
        substitutable: false,
        substitute: null,
    },
    {
        id: 'ing-008',
        name: 'Romaine Lettuce',
        unit: 'g',
        packSize: 1000,
        currentStock: 4,
        minOrder: 2,
        supplier: 'FreshFarm',
        pricePerPack: 5,
        substitutable: false,
        substitute: null,
    },
    {
        id: 'ing-009',
        name: 'Caesar Dressing',
        unit: 'ml',
        packSize: 500,
        currentStock: 3,
        minOrder: 1,
        supplier: 'Driscoll',
        pricePerPack: 10,
        substitutable: true,
        substitute: 'Ranch Dressing',
    },
    {
        id: 'ing-010',
        name: 'Parmesan Cheese',
        unit: 'g',
        packSize: 500,
        currentStock: 2,
        minOrder: 1,
        supplier: 'Driscoll',
        pricePerPack: 14,
        substitutable: false,
        substitute: null,
    },
    {
        id: 'ing-011',
        name: 'Croutons',
        unit: 'g',
        packSize: 500,
        currentStock: 2,
        minOrder: 1,
        supplier: 'SISCO',
        pricePerPack: 6,
        substitutable: false,
        substitute: null,
    },
];

// ── RECIPES ──────────────────────────────────────────────────────────────────
// ingredients[] = array of { ingredientId, portionByGroup }
// portionByGroup is per-recipe (g/units per person per group)
// Stock, packSize, supplier, price come from the catalog.
export const recipes = [
    {
        id: 1,
        name: 'Chicken Piccata',
        category: 'Main Course',
        rating: 4,
        image: '🍗',
        isNew: false,
        description: 'Classic Italian chicken in lemon-caper sauce',
        ingredients: [
            { ingredientId: 'ing-001', portionByGroup: { A: 120, B: 200, C: 150 } }, // Chicken Breast
            { ingredientId: 'ing-002', portionByGroup: { A: 80, B: 130, C: 100 } },  // Fusilli Pasta
            { ingredientId: 'ing-003', portionByGroup: { A: 10, B: 20, C: 15 } },    // Capers
            { ingredientId: 'ing-004', portionByGroup: { A: 15, B: 30, C: 20 } },    // Lemon Juice
        ],
    },
    {
        id: 2,
        name: 'Nuggets',
        category: 'Kids Favorite',
        rating: 5,
        image: '🍟',
        isNew: true,
        description: 'Crispy golden chicken nuggets, crowd-pleaser',
        ingredients: [
            { ingredientId: 'ing-001', portionByGroup: { A: 150, B: 250, C: 200 } }, // Chicken Breast (shared!)
            { ingredientId: 'ing-005', portionByGroup: { A: 40, B: 60, C: 50 } },   // Breadcrumbs
            { ingredientId: 'ing-006', portionByGroup: { A: 0.3, B: 0.5, C: 0.4 } },// Eggs
            { ingredientId: 'ing-007', portionByGroup: { A: 30, B: 50, C: 40 } },   // Vegetable Oil
        ],
    },
    {
        id: 3,
        name: 'Caesar Salad',
        category: 'Starter',
        rating: 4,
        image: '🥗',
        isNew: false,
        description: 'Fresh romaine with caesar dressing and croutons',
        ingredients: [
            { ingredientId: 'ing-008', portionByGroup: { A: 80, B: 150, C: 100 } },  // Romaine Lettuce
            { ingredientId: 'ing-009', portionByGroup: { A: 20, B: 40, C: 30 } },    // Caesar Dressing
            { ingredientId: 'ing-010', portionByGroup: { A: 15, B: 25, C: 20 } },    // Parmesan Cheese
            { ingredientId: 'ing-011', portionByGroup: { A: 20, B: 35, C: 25 } },    // Croutons
        ],
    },
];

// ── SUPPLIERS ────────────────────────────────────────────────────────────────
export const suppliers = [
    { id: 'SISCO', name: 'SISCO', contact: 'sisco.com', email: 'orders@sisco.com', phone: '+1 800 747 2600', color: '#6b3fa0', notes: 'Primary food distributor' },
    { id: 'Driscoll', name: 'Driscoll', contact: 'driscoll.com', email: 'orders@driscoll.com', phone: '+1 800 871 3333', color: '#4ecdc4', notes: 'Fresh produce specialist' },
    { id: 'FreshFarm', name: 'FreshFarm', contact: 'freshfarm.com', email: 'orders@freshfarm.com', phone: '+1 888 374 2764', color: '#10b981', notes: 'Local farm delivery, Mon-Fri' },
];

// ── GROUPS ───────────────────────────────────────────────────────────────────
export const defaultGroups = [
    { id: 'A', label: 'Group A', sublabel: 'Kids', color: '#4ecdc4', count: 0 },
    { id: 'B', label: 'Group B', sublabel: 'Adults', color: '#6b3fa0', count: 0 },
    { id: 'C', label: 'Group C', sublabel: 'Seniors', color: '#f59e0b', count: 0 },
];

// ── MATH ENGINE ──────────────────────────────────────────────────────────────
// resolvedIngredient = { ...catalogEntry, portionByGroup (recipe-specific) }
// D       = Σ(Pi × Ci)        total demand
// D_safe  = D × 1.10          +10% safety margin
// R       = ⌈D_safe / V⌉      packs to order
export function calcRequisition(resolvedIngredient, groups) {
    const portions = resolvedIngredient.portionByGroup;
    const D = groups.reduce((acc, g) => acc + g.count * (portions[g.id] ?? 0), 0);
    const D_safe = D * 1.1;
    const V = resolvedIngredient.packSize;
    const R = V > 0 ? Math.ceil(D_safe / V) : 0;
    return {
        D: Math.round(D * 10) / 10,
        D_safe: Math.round(D_safe * 10) / 10,
        R,
        packSize: V,
        unit: resolvedIngredient.unit,
    };
}

// ── HELPER: resolve recipe ingredients against catalog ────────────────────────
// Returns array of fully merged objects ready for calcRequisition
export function resolveIngredients(recipe, catalog) {
    return recipe.ingredients
        .map(ref => {
            const ing = catalog.find(i => i.id === ref.ingredientId);
            if (!ing) return null;
            return { ...ing, portionByGroup: ref.portionByGroup };
        })
        .filter(Boolean);
}
