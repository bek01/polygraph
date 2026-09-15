'use client';

import type { AssetVerdict, CohortReading } from '@/lib/types';

/**
 * The instrument itself.
 *
 * A real polygraph records several physiological channels side by side on one
 * moving strip; the operator reads the RELATIONSHIP between channels, not any
 * single line. Same idea here: one channel for what the crowd says, six for
 * what different classes of capital did. Each needle deflects from a shared
 * zero, and the gap between the crowd's needle and informed capital's needle
 * is shaded — that shaded band IS the product.
 *
 * Every deflection is a real number from the Nansen API. The pen jitter is
 * cosmetic; the amplitude is not.
 */

const ROW_H = 42;
const PAD_TOP = 34;
const PAD_BOTTOM = 26;
const LABEL_W = 132;
const VALUE_W = 152;

interface Channel {
  label: string;
  stance: number;
  color: string;
  detail: string;
  emphasis?: boolean;
}

function jitteredPath(
  cx: number,
  y: number,
  halfWidth: number,
  stance: number,
  seed: number,
): string {
  // Draw the pen trace from centre out to the deflection, with small
  // high-frequency wobble so it reads as ink on paper rather than a bar chart.
  const target = cx + stance * halfWidth;
  const steps = 26;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = cx + (target - cx) * t;
    const decay = Math.sin(Math.PI * t);
    const wobble =
      Math.sin(t * 15 + seed) * 1.5 * decay + Math.sin(t * 41 + seed * 2.3) * 0.7 * decay;
    pts.push(`${x.toFixed(2)},${(y + wobble).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
}

export function Polygraph({ asset }: { asset: AssetVerdict }) {
  const cohortOrder: CohortReading['key'][] = [
    'top_pnl',
    'smart_trader',
    'whale',
    'exchange',
    'public_figure',
    'fresh_wallets',
  ];
  const byKey = new Map(asset.cohorts.map((c) => [c.key, c]));

  const channels: Channel[] = [
    {
      label: 'CROWD SAYS',
      stance: asset.sayStance,
      color: 'var(--say)',
      detail: crowdDetail(asset),
      emphasis: true,
    },
    {
      label: 'MONEY DOES',
      stance: asset.doStance,
      color: 'var(--do)',
      detail: 'weighted',
      emphasis: true,
    },
  ];

  for (const key of cohortOrder) {
    const c = byKey.get(key);
    if (!c) continue;
    channels.push({
      label: c.label.toUpperCase(),
      stance: c.stance,
      color:
        key === 'fresh_wallets'
          ? 'var(--retail)'
          : c.informed
            ? 'var(--do)'
            : 'var(--dim)',
      detail: formatFlow(c.netFlowUsd) + (c.inverted ? ' inv' : ''),
    });
  }

  const width = 940;
  const height = PAD_TOP + channels.length * ROW_H + PAD_BOTTOM;
  const plotL = LABEL_W;
  const plotR = width - VALUE_W;
  const cx = (plotL + plotR) / 2;
  const half = (plotR - plotL) / 2 - 12;

  const sayY = PAD_TOP + ROW_H * 0 + ROW_H / 2;
  const doY = PAD_TOP + ROW_H * 1 + ROW_H / 2;
  const sayX = cx + asset.sayStance * half;
  const doX = cx + asset.doStance * half;

  const divergent = Math.abs(asset.gap) >= 0.25;

  return (
    <div>
      <svg
        className="strip"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Polygraph readout for ${asset.symbol}: crowd stance ${asset.sayStance.toFixed(2)}, informed capital stance ${asset.doStance.toFixed(2)}`}
      >
        <defs>
          <linearGradient id="divg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.06" />
          </linearGradient>
          <pattern id="graphpaper" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="var(--line-soft)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect
          x={plotL}
          y={PAD_TOP - 10}
          width={plotR - plotL}
          height={channels.length * ROW_H + 12}
          fill="url(#graphpaper)"
          opacity="0.55"
        />

        {/* scale ticks */}
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={cx + t * half}
              y1={PAD_TOP - 10}
              x2={cx + t * half}
              y2={PAD_TOP + channels.length * ROW_H + 2}
              stroke={t === 0 ? 'var(--line)' : 'var(--line-soft)'}
              strokeWidth={t === 0 ? 1.5 : 1}
            />
            <text
              x={cx + t * half}
              y={PAD_TOP - 18}
              fill="var(--dim)"
              fontSize="9.5"
              fontFamily="var(--mono)"
              textAnchor="middle"
              letterSpacing="0.08em"
            >
              {t === 0 ? 'FLAT' : t < 0 ? (t === -1 ? 'SELL' : '') : t === 1 ? 'BUY' : ''}
            </text>
          </g>
        ))}

        {/* the divergence band between the two headline needles */}
        {divergent && (
          <>
            <path
              d={`M ${sayX} ${sayY} L ${doX} ${doY} L ${cx} ${doY} L ${cx} ${sayY} Z`}
              fill="url(#divg)"
            />
            <line
              x1={sayX}
              y1={sayY}
              x2={doX}
              y2={doY}
              stroke="var(--danger)"
              strokeWidth="1.25"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            <text
              x={(sayX + doX) / 2 + 8}
              y={(sayY + doY) / 2 + 3}
              fill="var(--danger)"
              fontSize="10"
              fontFamily="var(--mono)"
              letterSpacing="0.08em"
            >
              GAP {asset.gapScore}
            </text>
          </>
        )}

        {channels.map((ch, i) => {
          const y = PAD_TOP + i * ROW_H + ROW_H / 2;
          const x = cx + ch.stance * half;
          return (
            <g key={ch.label}>
              <line
                x1={plotL}
                y1={y}
                x2={plotR}
                y2={y}
                stroke="var(--line-soft)"
                strokeWidth="1"
              />
              <text
                x={plotL - 14}
                y={y + 3.5}
                fill={ch.emphasis ? 'var(--text)' : 'var(--muted)'}
                fontSize={ch.emphasis ? '11' : '10'}
                fontFamily="var(--mono)"
                textAnchor="end"
                letterSpacing="0.1em"
              >
                {ch.label}
              </text>

              <path
                d={jitteredPath(cx, y, half, ch.stance, i * 2.7)}
                fill="none"
                stroke={ch.color}
                strokeWidth={ch.emphasis ? 2 : 1.4}
                strokeLinecap="round"
                opacity={ch.emphasis ? 1 : 0.85}
              />
              <circle
                cx={x}
                cy={y}
                r={ch.emphasis ? 4 : 2.8}
                fill={ch.color}
              />
              {ch.emphasis && (
                <circle cx={x} cy={y} r="8" fill="none" stroke={ch.color} strokeWidth="1" opacity="0.3" />
              )}

              <text
                x={plotR + 14}
                y={y + 3.5}
                fill="var(--muted)"
                fontSize="10"
                fontFamily="var(--mono)"
              >
                {ch.detail}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="legend">
        <span><i style={{ background: 'var(--say)' }} />Crowd belief (Polymarket)</span>
        <span><i style={{ background: 'var(--do)' }} />Informed capital (Nansen)</span>
        <span><i style={{ background: 'var(--retail)' }} />Fresh wallets</span>
        <span><i style={{ background: 'var(--danger)' }} />Divergence</span>
      </div>
    </div>
  );
}

function crowdDetail(asset: AssetVerdict): string {
  if (asset.impliedMovePct !== null) {
    return `${asset.impliedMovePct >= 0 ? '+' : ''}${(asset.impliedMovePct * 100).toFixed(1)}% implied`;
  }
  if (asset.say.asymmetryScore !== null) {
    const s = asset.say.asymmetryScore * 100;
    return `${s >= 0 ? '+' : ''}${s.toFixed(0)} pts skew`;
  }
  return 'no reading';
}

export function formatFlow(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '—';
  const sign = v > 0 ? '+' : '−';
  const a = Math.abs(v);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
}
