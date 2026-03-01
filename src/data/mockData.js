// ─── MOCK DATA: KitchenCalc ─────────────────────────────────────────────────

export const recipes = [
    {
        id: 1,
        name: "Chicken Piccata",
        category: "Main Course",
        rating: 4,
        image: "🍗",
        isNew: false,
        description: "Classic Italian chicken in lemon-caper sauce",
        ingredients: [
            {
                id: "cp-1",
                name: "Chicken Breast",
                unit: "g",
                // portion per person by group [A=kids, B=adults, C=seniors]
                portionByGroup: { A: 120, B: 200, C: 150 },
                packSize: 2000,  // grams per supplier pack
                currentStock: 4, // packs in stock
                minOrder: 2,
                supplier: "SISCO",
                pricePerPack: 28,
                substitutable: true,
                substitute: "Turkey Breast",
            },
            {
                id: "cp-2",
                name: "Fusilli Pasta",
                unit: "g",
                portionByGroup: { A: 80, B: 130, C: 100 },
                packSize: 1000,
                currentStock: 3,
                minOrder: 1,
                supplier: "Driscoll",
                pricePerPack: 12,
                substitutable: true,
                substitute: "Penne Pasta",
            },
            {
                id: "cp-3",
                name: "Capers",
                unit: "g",
                portionByGroup: { A: 10, B: 20, C: 15 },
                packSize: 500,
                currentStock: 2,
                minOrder: 1,
                supplier: "SISCO",
                pricePerPack: 9,
                substitutable: false,
                substitute: null,
            },
            {
                id: "cp-4",
                name: "Lemon Juice",
                unit: "ml",
                portionByGroup: { A: 15, B: 30, C: 20 },
                packSize: 1000,
                currentStock: 1,
                minOrder: 1,
                supplier: "FreshFarm",
                pricePerPack: 7,
                substitutable: true,
                substitute: "Lime Juice",
            },
            {
                id: "cp-5",
                name: "Chicken Sub (alt.)",
                unit: "g",
                portionByGroup: { A: 120, B: 200, C: 150 },
                packSize: 2000,
                currentStock: 2,
                minOrder: 1,
                supplier: "SISCO",
                pricePerPack: 24,
                substitutable: false,
                substitute: null,
            },
        ],
    },
    {
        id: 2,
        name: "Nuggets",
        category: "Kids Favorite",
        rating: 5,
        image: "🍟",
        isNew: true,
        description: "Crispy golden chicken nuggets, crowd-pleaser",
        ingredients: [
            {
                id: "ng-1",
                name: "Chicken Breast",
                unit: "g",
                portionByGroup: { A: 150, B: 250, C: 200 },
                packSize: 2000,
                currentStock: 6,
                minOrder: 2,
                supplier: "SISCO",
                pricePerPack: 28,
                substitutable: true,
                substitute: "Tofu (vegan)",
            },
            {
                id: "ng-2",
                name: "Breadcrumbs",
                unit: "g",
                portionByGroup: { A: 40, B: 60, C: 50 },
                packSize: 1000,
                currentStock: 3,
                minOrder: 1,
                supplier: "Driscoll",
                pricePerPack: 6,
                substitutable: false,
                substitute: null,
            },
            {
                id: "ng-3",
                name: "Eggs",
                unit: "units",
                portionByGroup: { A: 0.3, B: 0.5, C: 0.4 },
                packSize: 30, // 30-egg tray
                currentStock: 2,
                minOrder: 1,
                supplier: "FreshFarm",
                pricePerPack: 8,
                substitutable: true,
                substitute: "Flax Egg (vegan)",
            },
            {
                id: "ng-4",
                name: "Vegetable Oil",
                unit: "ml",
                portionByGroup: { A: 30, B: 50, C: 40 },
                packSize: 3000,
                currentStock: 2,
                minOrder: 1,
                supplier: "SISCO",
                pricePerPack: 15,
                substitutable: false,
                substitute: null,
            },
        ],
    },
    {
        id: 3,
        name: "Caesar Salad",
        category: "Starter",
        rating: 4,
        image: "🥗",
        isNew: false,
        description: "Fresh romaine with caesar dressing and croutons",
        ingredients: [
            {
                id: "cs-1",
                name: "Romaine Lettuce",
                unit: "g",
                portionByGroup: { A: 80, B: 150, C: 100 },
                packSize: 1000,
                currentStock: 4,
                minOrder: 2,
                supplier: "FreshFarm",
                pricePerPack: 5,
                substitutable: false,
                substitute: null,
            },
            {
                id: "cs-2",
                name: "Caesar Dressing",
                unit: "ml",
                portionByGroup: { A: 20, B: 40, C: 30 },
                packSize: 500,
                currentStock: 3,
                minOrder: 1,
                supplier: "Driscoll",
                pricePerPack: 10,
                substitutable: true,
                substitute: "Ranch Dressing",
            },
            {
                id: "cs-3",
                name: "Parmesan Cheese",
                unit: "g",
                portionByGroup: { A: 15, B: 25, C: 20 },
                packSize: 500,
                currentStock: 2,
                minOrder: 1,
                supplier: "Driscoll",
                pricePerPack: 14,
                substitutable: false,
                substitute: null,
            },
            {
                id: "cs-4",
                name: "Croutons",
                unit: "g",
                portionByGroup: { A: 20, B: 35, C: 25 },
                packSize: 500,
                currentStock: 2,
                minOrder: 1,
                supplier: "SISCO",
                pricePerPack: 6,
                substitutable: false,
                substitute: null,
            },
        ],
    },
];

export const suppliers = [
    {
        id: "SISCO",
        name: "SISCO",
        contact: "sisco.com",
        email: "orders@sisco.com",
        color: "#6b3fa0",
    },
    {
        id: "Driscoll",
        name: "Driscoll",
        contact: "driscoll.com",
        email: "orders@driscoll.com",
        color: "#4ecdc4",
    },
    {
        id: "FreshFarm",
        name: "FreshFarm",
        contact: "freshfarm.com",
        email: "orders@freshfarm.com",
        color: "#10b981",
    },
];

// Groups (demographic segments)
export const defaultGroups = [
    { id: "A", label: "Group A", sublabel: "Kids", color: "#4ecdc4", count: 0 },
    { id: "B", label: "Group B", sublabel: "Adults", color: "#6b3fa0", count: 0 },
    { id: "C", label: "Group C", sublabel: "Seniors", color: "#f59e0b", count: 0 },
];

// ─── MATH ENGINE ─────────────────────────────────────────────────────────────
// D = Σ(Pi * Ci)          — total demand
// D_safe = D * 1.10       — with 10% waste margin
// R = Math.ceil(D_safe/V) — packs to order
export function calcRequisition(ingredient, groups, useSubstitute = false) {
    const portions = ingredient.portionByGroup;
    // Total demand
    const D = groups.reduce((acc, g) => acc + g.count * (portions[g.id] ?? 0), 0);
    // Safe demand
    const D_safe = D * 1.1;
    // Pack size
    const V = ingredient.packSize;
    const R = V > 0 ? Math.ceil(D_safe / V) : 0;
    return {
        D: Math.round(D * 10) / 10,
        D_safe: Math.round(D_safe * 10) / 10,
        R,
        packSize: V,
        unit: ingredient.unit,
    };
}
