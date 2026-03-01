import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function InventoryView({ recipes = [] }) {
    // Flatten all unique ingredients from all recipes (by name)
    const allIngredients = [];
    const seenNames = new Set();
    for (const r of recipes) {
        for (const ing of r.ingredients) {
            if (!seenNames.has(ing.name)) {
                seenNames.add(ing.name);
                allIngredients.push({ ...ing, recipe: r.name });
            }
        }
    }

    return (
        <div className="fade-in-up">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', marginBottom: 24 }}>
                📦 Inventory Overview
                <span style={{ fontSize: 14, fontWeight: 400, color: '#9b6dca', marginLeft: 10 }}>
                    {allIngredients.length} unique ingredients
                </span>
            </h1>

            {allIngredients.length === 0 ? (
                <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 600, color: '#9b6dca' }}>No inventory items yet</div>
                    <div style={{ fontSize: 13, color: '#9b6dca', marginTop: 8 }}>Create recipes to see ingredients here</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {allIngredients.map(ing => {
                        const pct = Math.min((ing.currentStock / Math.max(ing.minOrder * 3, 1)) * 100, 100);
                        const status = ing.currentStock <= ing.minOrder ? 'low' : 'ok';
                        return (
                            <div key={ing.id ?? ing.name} className="glass-card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: status === 'low' ? '#fef2f2' : '#f0fdf4',
                                    }}>
                                        {status === 'low'
                                            ? <AlertTriangle size={20} color="#ef4444" />
                                            : <CheckCircle2 size={20} color="#10b981" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#3d1a78' }}>{ing.name}</span>
                                            <span className={`chip ${status === 'low' ? 'chip-amber' : 'chip-teal'}`}>
                                                {status === 'low' ? 'Low Stock' : 'In Stock'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 8 }}>
                                            Used in: <b>{ing.recipe}</b> · Supplier: {ing.supplier} · Pack: {ing.packSize}{ing.unit}
                                        </div>
                                        {/* Progress bar */}
                                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99 }}>
                                            <div style={{
                                                height: '100%', borderRadius: 99, width: `${pct}%`,
                                                background: status === 'low'
                                                    ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
                                                    : 'linear-gradient(135deg,#4ecdc4,#10b981)',
                                                transition: 'width 0.6s ease',
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#9b6dca' }}>
                                            <span>Current: <b style={{ color: '#3d1a78' }}>{ing.currentStock} packs</b></span>
                                            <span>Min Order: <b style={{ color: '#6b3fa0' }}>{ing.minOrder} packs</b></span>
                                            <span>${ing.pricePerPack}/pack</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
