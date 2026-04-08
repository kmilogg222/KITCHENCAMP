/**
 * @file components/GroupInput.jsx
 * @description Input para seleccionar la cantidad de comensales por grupo (A/B/C).
 *
 * Extraído de RecipesView y MenusView donde estaba duplicado.
 * Muestra badge de color, etiqueta, sub-etiqueta y un input numérico.
 *
 * @param {{ id: string, label: string, sublabel: string }} group - Grupo.
 * @param {number} value - Cantidad actual de comensales.
 * @param {(id: string, val: number) => void} onChange - Callback al cambiar.
 */
import { COLORS } from '../constants/theme';

const GROUP_COLORS = {
    A: COLORS.teal,
    B: COLORS.purpleMid,
    C: COLORS.warning,
};

export default function GroupInput({ group, value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="group-badge" style={{ background: GROUP_COLORS[group.id] ?? COLORS.purpleMid }}>{group.id}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.purpleMid }}>{group.label}</span>
            <span style={{ fontSize: 10, color: COLORS.purpleLight }}>{group.sublabel}</span>
            <input type="number" min={0} value={value}
                onChange={e => onChange(group.id, Math.max(0, parseInt(e.target.value) || 0))}
                className="qty-input" placeholder="0" />
        </div>
    );
}
