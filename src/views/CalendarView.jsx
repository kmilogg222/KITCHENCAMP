import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mockEvents = {
    5: { label: 'Chicken Piccata', color: '#6b3fa0' },
    12: { label: 'Nuggets Day', color: '#4ecdc4' },
    18: { label: 'Caesar Salad', color: '#10b981' },
    25: { label: 'Event Catering', color: '#f59e0b' },
};

export default function CalendarView() {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const cells = Array.from({ length: firstDay }).fill(null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="fade-in-up">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', marginBottom: 24 }}>
                📅 Production Calendar
            </h1>
            <div className="glass-card" style={{ padding: 24 }}>
                {/* Nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <button onClick={prev} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={18} color="#6b3fa0" />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#3d1a78' }}>
                        {MONTH_NAMES[month]} {year}
                    </div>
                    <button onClick={next} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={18} color="#6b3fa0" />
                    </button>
                </div>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
                    {DAY_NAMES.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
                    ))}
                </div>
                {/* Cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                    {cells.map((d, idx) => {
                        const event = d ? mockEvents[d] : null;
                        const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        return (
                            <div key={idx} style={{
                                minHeight: 68, borderRadius: 10, padding: 8,
                                background: isToday ? 'linear-gradient(135deg,rgba(107,63,160,0.15),rgba(78,205,196,0.15))' : d ? 'rgba(255,255,255,0.5)' : 'transparent',
                                border: isToday ? '1.5px solid rgba(107,63,160,0.4)' : '1px solid transparent',
                                position: 'relative',
                            }}>
                                {d && (
                                    <>
                                        <div style={{
                                            fontWeight: isToday ? 800 : 500, fontSize: 13,
                                            color: isToday ? '#6b3fa0' : '#374151',
                                            marginBottom: 4,
                                        }}>{d}</div>
                                        {event && (
                                            <div style={{
                                                fontSize: 10, fontWeight: 600, color: 'white',
                                                background: event.color, borderRadius: 6, padding: '2px 6px',
                                                lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {event.label}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
