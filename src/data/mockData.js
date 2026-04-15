/**
 * @file mockData.js
 * @description Capa de datos inicial de KitchenCalc (datos de muestra / seed).
 *
 * Arquitectura de datos:
 *   ingredientsCatalog  → catálogo global plano; stock y precio viven aquí.
 *   recipes             → cada ingrediente es una REFERENCIA { ingredientId, portionByGroup }.
 *
 * Al compartir ingredientes entre recetas, una actualización de stock o precio
 * en el catálogo se propaga automáticamente a todas las recetas que lo usan.
 *
 * Fórmulas del motor de cálculo:
 *   D       = Σ(Pi × Ci)        demanda total (porción × cantidad por grupo)
 *   D_safe  = D × 1.10          +10% margen de seguridad
 *   R       = ⌈D_safe / V⌉      packs a ordenar (redondear hacia arriba)
 *
 * @module mockData
 */

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
    {
        id: 4,
        name: 'Pasta Bolognese',
        category: 'Main Course',
        rating: 5,
        image: '🍝',
        isNew: false,
        isCustom: false,
        description: 'Rich meat-sauce pasta portioned from a large batch — yield mode demo',
        baseServings: 20,
        portionFactors: { A: 0.6, B: 1.0, C: 0.75 },
        ingredients: [
            // 2000g Fusilli Pasta for 20-serving batch → Adults: 100g, Kids: 60g, Seniors: 75g
            { ingredientId: 'ing-002', inputMode: 'yield', quantityForBase: 2000 },
            // 200ml Vegetable Oil for 20-serving batch → Adults: 10ml, Kids: 6ml, Seniors: 7.5ml
            { ingredientId: 'ing-007', inputMode: 'yield', quantityForBase: 200 },
        ],
    },
];

// ── SUPPLIERS ────────────────────────────────────────────────────────────────
export const suppliers = [
    { id: 'SISCO', name: 'SISCO', contact: 'sisco.com', email: 'orders@sisco.com', phone: '+1 800 747 2600', color: '#6b3fa0', notes: 'Primary food distributor' },
    { id: 'Driscoll', name: 'Driscoll', contact: 'driscoll.com', email: 'orders@driscoll.com', phone: '+1 800 871 3333', color: '#4ecdc4', notes: 'Fresh produce specialist' },
    { id: 'FreshFarm', name: 'FreshFarm', contact: 'freshfarm.com', email: 'orders@freshfarm.com', phone: '+1 888 374 2764', color: '#10b981', notes: 'Local farm delivery, Mon-Fri' },
];

// ── MENUS ────────────────────────────────────────────────────────────────────
// A menu groups multiple recipes. All diners eat every recipe in the menu.
// The requisition engine consolidates shared ingredients across recipes.
export const menus = [
    {
        id: 'menu-001',
        name: 'Executive Lunch',
        description: 'Complete lunch menu for corporate events',
        image: '🍱',
        recipeIds: [3, 1],  // Caesar Salad → Chicken Piccata
        createdAt: '2026-03-15',
    },
    {
        id: 'menu-002',
        name: 'Kids Party Pack',
        description: 'Fun meal combo for children\'s parties',
        image: '🎉',
        recipeIds: [2, 3],  // Nuggets → Caesar Salad
        createdAt: '2026-03-20',
    },
    {
        id: 'menu-003',
        name: 'Full Course Dinner',
        description: 'Three-course dinner with starter, main and sides',
        image: '🌟',
        recipeIds: [3, 1, 2],  // Caesar Salad → Chicken Piccata → Nuggets
        createdAt: '2026-03-25',
    },
];

// ── GROUPS ───────────────────────────────────────────────────────────────────
export const defaultGroups = [
    { id: 'A', label: 'Group A', sublabel: 'Kids', color: '#4ecdc4', count: 0 },
    { id: 'B', label: 'Group B', sublabel: 'Teens', color: '#6b3fa0', count: 0 },
    { id: 'C', label: 'Group C', sublabel: 'Adults', color: '#f59e0b', count: 0 },
];

// ── MATH ENGINE ──────────────────────────────────────────────────────────────
// resolvedIngredient = { ...catalogEntry, portionByGroup (recipe-specific) }
// D       = Σ(Pi × Ci)        total demand
// D_safe  = D × 1.10          +10% safety margin
// R       = ⌈D_safe / V⌉      packs to order
export function calcRequisition(resolvedIngredient, groups) {
    const portions = resolvedIngredient.portionByGroup;
    const D = groups.reduce((acc, g) => acc + g.count * (portions[g.id] ?? 0), 0);
    const wasteFactor = 1 + (resolvedIngredient.wastePct || 0) / 100;
    const D_safe = D * 1.1 * wasteFactor;
    const V = resolvedIngredient.packSize;
    const R = V > 0 ? Math.ceil(D_safe / V) : 0;
    return {
        D: Math.round(D * 10) / 10,
        D_safe: Math.round(D_safe * 10) / 10,
        R,
        packSize: V,
        unit: resolvedIngredient.unit,
        wastePct: resolvedIngredient.wastePct || 0,
    };
}

// ── HELPER: resolve portionByGroup for a single ingredient ref ────────────────
/**
 * Resolves the effective portionByGroup for an ingredient reference.
 *
 * Two input modes:
 *  - 'per-person' (default, backward-compat): returns ref.portionByGroup as-is.
 *  - 'yield': derives per-group portions from quantityForBase + recipe portionFactors.
 *
 * @param {object} ingredientRef - { ingredientId, inputMode?, portionByGroup?, quantityForBase? }
 * @param {object} recipe        - { baseServings?, portionFactors? }
 * @returns {{ A: number, B: number, C: number }}
 */
export function resolvePortionByGroup(ingredientRef, recipe) {
    if (!ingredientRef.inputMode || ingredientRef.inputMode === 'per-person') {
        return ingredientRef.portionByGroup;
    }
    // yield mode — derive per-group portions from a batch quantity
    const { baseServings, portionFactors } = recipe;
    if (!ingredientRef.quantityForBase || ingredientRef.quantityForBase <= 0) {
        console.warn('[resolvePortionByGroup] yield ingredient has quantityForBase <= 0:', ingredientRef.ingredientId);
        return { A: 0, B: 0, C: 0 };
    }
    const perStandardPortion = ingredientRef.quantityForBase / Math.max(1, baseServings ?? 10);
    return {
        A: perStandardPortion * (portionFactors?.A ?? 0.6),
        B: perStandardPortion * (portionFactors?.B ?? 1.0),
        C: perStandardPortion * (portionFactors?.C ?? 0.75),
    };
}

// ── HELPER: resolve recipe ingredients against catalog ────────────────────────
// Returns array of fully merged objects ready for calcRequisition
export function resolveIngredients(recipe, catalog) {
    // Construir índice O(1) para lookups rápidos por id
    const catalogIndex = catalog instanceof Map
        ? catalog
        : new Map(catalog.map(i => [i.id, i]));

    return recipe.ingredients
        .map(ref => {
            const ing = catalogIndex.get(ref.ingredientId);
            if (!ing) return null;
            return { ...ing, portionByGroup: resolvePortionByGroup(ref, recipe), wastePct: ref.wastePct || 0 };
        })
        .filter(Boolean);
}

// ── MENU REQUISITION ENGINE ──────────────────────────────────────────────────
/**
 * Calculates a consolidated requisition for an entire menu.
 *
 * Algorithm:
 *  1. Resolve all ingredients from every recipe in the menu.
 *  2. Group by ingredientId → sum per-group portions across recipes.
 *  3. Run standard calcRequisition on each consolidated ingredient.
 *
 * This ensures shared ingredients (e.g. Chicken Breast used in two recipes)
 * produce a single, combined demand instead of separate entries.
 *
 * @param {object}   menu      - Menu object with recipeIds[].
 * @param {object[]} allRecipes - Full recipes array.
 * @param {object[]} catalog   - Ingredient catalog.
 * @param {object[]} groups    - Groups array with counts.
 * @returns {{ consolidated: object[], byRecipe: object[] }}
 */
export function calcMenuRequisition(menu, allRecipes, catalog, groups) {
    // Construir índices O(1) para lookups rápidos
    const catalogIndex = new Map(catalog.map(i => [i.id, i]));
    const recipeIndex = new Map(allRecipes.map(r => [r.id, r]));

    // Map of ingredientId → { catalogEntry, portionByGroup (accumulated), usedInRecipes[] }
    const ingredientMap = new Map();

    const menuRecipes = menu.recipeIds
        .map(rid => recipeIndex.get(rid))
        .filter(Boolean);

    // Per-recipe breakdown (for UI display)
    // Pasar el catalogIndex ya construido para reusar el Map
    const byRecipe = menuRecipes.map(recipe => {
        const resolved = resolveIngredients(recipe, catalogIndex);
        return {
            recipe,
            ingredients: resolved,
            results: resolved.map(ing => ({ ...ing, calc: calcRequisition(ing, groups) })),
        };
    });

    // Consolidate: group same ingredients, sum portions
    menuRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ref => {
            const cat = catalogIndex.get(ref.ingredientId);
            if (!cat) return;

            // Resolve to { A, B, C } before accumulating (supports yield mode refs)
            const resolved = resolvePortionByGroup(ref, recipe);

            if (ingredientMap.has(ref.ingredientId)) {
                const entry = ingredientMap.get(ref.ingredientId);
                // Sum portions per group
                Object.keys(resolved).forEach(gId => {
                    entry.portionByGroup[gId] = (entry.portionByGroup[gId] || 0) + (resolved[gId] || 0);
                });
                // Use highest wastePct when same ingredient appears in multiple recipes
                entry.wastePct = Math.max(entry.wastePct || 0, ref.wastePct || 0);
                entry.usedInRecipes.push(recipe.name);
            } else {
                ingredientMap.set(ref.ingredientId, {
                    ...cat,
                    portionByGroup: { ...resolved },
                    wastePct: ref.wastePct || 0,
                    usedInRecipes: [recipe.name],
                });
            }
        });
    });

    // Run calcRequisition on each consolidated ingredient
    const consolidated = Array.from(ingredientMap.values()).map(ing => ({
        ...ing,
        calc: calcRequisition(ing, groups),
        isShared: ing.usedInRecipes.length > 1,
    }));

    return { consolidated, byRecipe };
}
