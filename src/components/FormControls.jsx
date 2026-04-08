/**
 * @file components/FormControls.jsx
 * @description Controles de formulario reutilizables para toda la aplicación.
 *
 * Extraídos de CreateRecipeView y CreateMenuView donde estaban duplicados.
 * Utilizan INPUT_STYLE de theme.js como base.
 *
 * Componentes exportados:
 *  - Label  : Etiqueta de campo de formulario (uppercase, bold, purple).
 *  - TInput : Input de texto/número con estilo KitchenCalc.
 *  - SInput : Select con estilo KitchenCalc.
 */
import { COLORS, INPUT_STYLE } from '../constants/theme';

/**
 * Etiqueta estilizada para campos de formulario.
 * @param {{ children: React.ReactNode }} props
 */
export function Label({ children }) {
    return (
        <label style={{
            fontSize: 11, fontWeight: 700, color: COLORS.purpleMid,
            textTransform: 'uppercase', letterSpacing: 0.5,
            display: 'block', marginBottom: 4,
        }}>
            {children}
        </label>
    );
}

/**
 * Input de texto/número estilizado.
 * @param {object} props
 * @param {string} [props.type='text'] - Tipo de input.
 * @param {*} props.value - Valor del input.
 * @param {Function} props.onChange - Callback onChange.
 * @param {string} [props.placeholder] - Placeholder.
 * @param {number} [props.min] - Mínimo (para type=number).
 * @param {boolean} [props.disabled] - Deshabilitado.
 * @param {object} [props.style] - Estilos adicionales.
 */
export function TInput({ value, onChange, placeholder, type = 'text', min, disabled, style = {} }) {
    return (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} disabled={disabled}
            style={{
                ...INPUT_STYLE,
                background: disabled ? 'rgba(243,234,252,0.5)' : 'rgba(255,255,255,0.85)',
                color: disabled ? COLORS.purpleLight : COLORS.gray800,
                transition: 'border-color 0.2s', ...style,
            }}
            onFocus={e => { if (!disabled) e.target.style.borderColor = COLORS.purpleMid; }}
            onBlur={e => e.target.style.borderColor = 'rgba(155,109,202,0.3)'}
        />
    );
}

/**
 * Select estilizado.
 * @param {object} props
 * @param {*} props.value - Valor seleccionado.
 * @param {Function} props.onChange - Callback onChange.
 * @param {(string|{value:string,label:string})[]} props.options - Opciones.
 * @param {boolean} [props.disabled] - Deshabilitado.
 */
export function SInput({ value, onChange, options, disabled }) {
    return (
        <select value={value} onChange={onChange} disabled={disabled}
            style={{
                ...INPUT_STYLE,
                background: disabled ? 'rgba(243,234,252,0.5)' : 'rgba(255,255,255,0.85)',
                color: disabled ? COLORS.purpleLight : COLORS.gray800,
                cursor: disabled ? 'default' : 'pointer',
            }}>
            {options.map(o => (
                <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                    {typeof o === 'string' ? o : o.label}
                </option>
            ))}
        </select>
    );
}
