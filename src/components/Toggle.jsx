export default function Toggle({ on, onToggle, label }) {
    return (
        <div onClick={onToggle} className="toggle-wrap" title={label}>
            <div className={`toggle-track ${on ? 'on' : ''}`}>
                <div className="toggle-thumb" />
            </div>
            {label && (
                <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#4ecdc4' : '#9ca3af' }}>
                    {label}
                </span>
            )}
        </div>
    );
}
