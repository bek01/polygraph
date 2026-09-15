'use client';

import { useEffect, useState } from 'react';
import type { BacktestResult } from '@/lib/types';

/**
 * Is the crowd worth listening to at all?
 *
 * Every resolved Polymarket binary settles at $1 or $0, so its terminal price
 * is ground truth. We take the price halfway through each market's life as the
 * forecast and plot forecast against realised frequency. Points below the
 * diagonal mean the crowd was overconfident.
 *
 * A divergence signal is only interesting if one side is measurably worse.
 * This panel is where Polygraph can be proven wrong.
 */

const W = 620;
const H = 300;
const M = { top: 20, right: 22, bottom: 42, left: 50 };

export function Calibration({ symbol }: { symbol: string }) {
  const [data, setData] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setErr(null);
    setLoading(true);
    fetch(`/api/backtest?symbol=${encodeURIComponent(symbol)}&max=40`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setErr(j.error);
        else setData(j as BacktestResult);
      })
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="skeleton">
        SCORING RESOLVED {symbol} MARKETS…
        <div className="scan" />
      </div>
    );
  }
  if (err) return <p className="ladder-note">Calibration unavailable: {err}</p>;
  if (!data || data.observations === 0) {
    return (
      <p className="ladder-note">
        {data?.notes?.[0] ?? 'No resolved markets with usable history for this asset yet.'}
      </p>
    );
  }

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const sx = (p: number) => M.left + p * plotW;
  const sy = (p: number) => M.top + (1 - p) * plotH;

  const points = data.buckets.filter((b) => b.samples > 0);
  const maxSamples = Math.max(...points.map((b) => b.samples), 1);

  return (
    <div>
      <svg className="strip" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Calibration of Polymarket ${symbol} forecasts against realised outcomes`}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={M.left} y1={sy(p)} x2={W - M.right} y2={sy(p)}
              stroke="var(--line-soft)" strokeWidth="1" />
            <text x={M.left - 9} y={sy(p) + 3.5} fill="var(--dim)" fontSize="9.5"
              fontFamily="var(--mono)" textAnchor="end">{Math.round(p * 100)}%</text>
            <text x={sx(p)} y={H - M.bottom + 15} fill="var(--dim)" fontSize="9.5"
              fontFamily="var(--mono)" textAnchor="middle">{Math.round(p * 100)}%</text>
          </g>
        ))}

        {/* perfect calibration */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)}
          stroke="var(--ok)" strokeWidth="1.25" strokeDasharray="5 4" opacity="0.7" />
        <text x={sx(0.72)} y={sy(0.78)} fill="var(--ok)" fontSize="9.5"
          fontFamily="var(--mono)" opacity="0.8">PERFECTLY CALIBRATED</text>

        <path
          d={points
            .map((b, i) => `${i === 0 ? 'M' : 'L'} ${sx((b.lower + b.upper) / 2)} ${sy(b.realised)}`)
            .join(' ')}
          fill="none" stroke="var(--say)" strokeWidth="2" strokeLinejoin="round"
        />

        {points.map((b) => (
          <circle key={b.lower}
            cx={sx((b.lower + b.upper) / 2)} cy={sy(b.realised)}
            r={3.5 + 5 * Math.sqrt(b.samples / maxSamples)}
            fill="var(--say)" fillOpacity="0.3" stroke="var(--say)" strokeWidth="1.3">
            <title>
              Priced {Math.round(b.lower * 100)}–{Math.round(b.upper * 100)}%
              {'\n'}Resolved true {(b.realised * 100).toFixed(0)}% of the time
              {'\n'}{b.samples} market{b.samples === 1 ? '' : 's'}
            </title>
          </circle>
        ))}

        <text x={M.left} y={H - 6} fill="var(--dim)" fontSize="9.5" fontFamily="var(--mono)">
          PRICED PROBABILITY →
        </text>
      </svg>

      <ul className="notes" style={{ marginTop: 12 }}>
        {data.notes.map((n) => <li key={n}>{n}</li>)}
        <li>
          {data.observations.toLocaleString()} observation
          {data.observations === 1 ? '' : 's'} drawn from{' '}
          {data.marketsAnalysed.toLocaleString()} resolved {symbol} market
          {data.marketsAnalysed === 1 ? '' : 's'}.
        </li>
      </ul>
    </div>
  );
}
