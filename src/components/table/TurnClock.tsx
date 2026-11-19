'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
export function TurnClock({ deadline, serverNow }: { deadline: number; serverNow?: number }) {
  const [remaining, setRemaining] = useState(60);
  const { t } = useI18n();
  useEffect(() => {
    const received = performance.now(), baseTime = serverNow ?? Date.now();
    const update = () => setRemaining(Math.max(0, Math.min(60, Math.ceil((deadline - baseTime - (performance.now() - received)) / 1000))));
    update(); const timer = setInterval(update, 200); return () => clearInterval(timer);
  }, [deadline, serverNow]);
  return <div className={`turn-clock ${remaining <= 10 ? 'urgent' : ''}`}><span>{t.clock.label}</span><b role="timer" aria-label={t.clock.aria}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</b><small>{t.clock.note}</small></div>;
}
