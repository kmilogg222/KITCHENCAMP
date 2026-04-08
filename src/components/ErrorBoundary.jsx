/**
 * @file components/ErrorBoundary.jsx
 * @description Componente ErrorBoundary global que captura errores de renderizado.
 *
 * Evita la "pantalla blanca de la muerte" cuando un componente hijo lanza
 * un error durante el render. Muestra una UI de recuperación con opción
 * de reintentar.
 */
import { Component } from 'react';
import { COLORS } from '../constants/theme';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100vh', padding: 40,
                    background: `linear-gradient(135deg, ${COLORS.purpleBg} 0%, #e0d4f5 100%)`,
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.85)', borderRadius: 20,
                        padding: '48px 40px', maxWidth: 480, width: '100%',
                        textAlign: 'center', boxShadow: '0 8px 32px rgba(61,26,120,0.12)',
                        border: '1px solid rgba(155,109,202,0.15)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ color: COLORS.purpleDeep, fontSize: 22, marginBottom: 8 }}>
                            Something went wrong
                        </h2>
                        <p style={{ color: COLORS.purpleLight, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                            An unexpected error occurred. Your data is safe — try refreshing the page.
                        </p>
                        {this.state.error && (
                            <pre style={{
                                background: COLORS.purpleBg, borderRadius: 10,
                                padding: 12, fontSize: 11, color: COLORS.danger,
                                textAlign: 'left', overflow: 'auto', maxHeight: 120,
                                marginBottom: 20, border: `1px solid ${COLORS.purplePale}`,
                            }}>
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleRetry}
                            style={{
                                background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
                                color: '#fff', border: 'none', borderRadius: 12,
                                padding: '12px 32px', fontSize: 14, fontWeight: 600,
                                cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            className="hover-lift"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
