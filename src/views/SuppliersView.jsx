import { ExternalLink, Mail, Phone } from 'lucide-react';
import { suppliers, recipes } from '../data/mockData';

export default function SuppliersView() {
    const getProducts = (supId) => {
        const names = new Set();
        for (const r of recipes) {
            for (const ing of r.ingredients) {
                if (ing.supplier === supId) names.add(ing.name);
            }
        }
        return [...names];
    };

    const colors = { SISCO: '#6b3fa0', Driscoll: '#4ecdc4', FreshFarm: '#10b981' };

    return (
        <div className="fade-in-up">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', marginBottom: 24 }}>
                🚚 Suppliers
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
                {suppliers.map(sup => {
                    const products = getProducts(sup.id);
                    const color = colors[sup.id] ?? '#6b3fa0';
                    return (
                        <div key={sup.id} className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                            {/* Accent strip */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(135deg,${color},${color}88)` }} />
                            {/* Avatar */}
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${color}18`, fontSize: 24, marginBottom: 14, border: `2px solid ${color}33`,
                            }}>
                                🏭
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#3d1a78', marginBottom: 6 }}>{sup.name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                <a href={`https://${sup.contact}`} target="_blank" rel="noreferrer"
                                    style={{ fontSize: 12, color, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                                    <ExternalLink size={12} />{sup.contact}
                                </a>
                                <span style={{ fontSize: 12, color: '#9b6dca', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Mail size={12} />{sup.email}
                                </span>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                Products ({products.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {products.map(p => (
                                    <span key={p} className="chip" style={{ background: `${color}18`, color }}>
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
