'use client';

import type { AssetVerdict, LadderRung } from '@/lib/types';

/**
 * The crowd's belief, drawn honestly.
 *
 * Two different pictures, because there are two different kinds of market:
 *
 *  - close-settled ladders give a real distribution, so we draw the survival
 *    curve and mark where it crosses 50% (the implied median);
 *  - barrier ladders describe the running maximum and running minimum, so we
 *    draw them as two curves facing away from spot and mark the distances
 *    where the crowd's upside and downside odds are compared.
 *
 * Drawing barriers as a single survival curve would look tidier and be wrong.
 */

const W = 940;
const H = 320;
const M = { top: 30, right: 26, bottom: 52, left: 52 };

export function Ladder({ asset }: { asset: AssetVerdict }) {
  const rungs = asset.ladder;

  if (rungs.length < 3 || asset.spot === null) {
    return <p className="ladder-note">{asset.say.explanation}</p>;
  }

  const spot = asset.spot;
  const strikes = rungs.map((r) => r.strike);
  const xs = [...strikes, spot, asset.impliedMedian ?? spot].filter(
    (v): v is number => Number.isFinite(v) && v > 0,
  );
  const minX = Math.min(...xs) * 0.94;
  const maxX = Math.max(...xs) * 1.06;

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const sx = (v: number) =>
    M.left + ((Math.log(v) - Math.log(minX)) / (Math.log(maxX) - Math.log(minX))) * plotW;
  const sy = (p: number) => M.top + (1 - p) * plotH;

  const maxOi = Math.max(...rungs.map((r) => r.openInterest), 1);
  const barrier = asset.say.method === 'barrier-asymmetry';

  const groups: { key: string; rungs: LadderRung[]; color: string; label: string }[] = barrier
    ? [
        {
          key: 'touch_down',
          rungs: rungs.filter((r) => r.claim === 'touch_down').sort((a, b) => a.strike - b.strike),
          color: 'var(--danger)',
          label: 'chance of falling to here',
        },
        {
          key: 'touch_up',
          rungs: rungs.filter((r) => r.claim === 'touch_up').sort((a, b) => a.strike - b.strike),
          color: 'var(--ok)',
          label: 'chance of rising to here',
        },
      ]
    : [
        {
          key: 'terminal_above',
          rungs: rungs.slice().sort((a, b) => a.strike - b.strike),
          color: 'var(--say)',
          label: 'chance of closing at or above',
        },
      ];

  return (
    <div>
      <svg className="strip" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Polymarket crowd belief curve for ${asset.symbol}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={M.left} y1={sy(p)} x2={W - M.right} y2={sy(p)}
              stroke={p === 0.5 ? 'var(--line)' : 'var(--line-soft)'} strokeWidth="1"
              strokeDasharray={p === 0.5 ? '4 4' : undefined} />
            <text x={M.left - 10} y={sy(p) + 3.5} fill="var(--dim)" fontSize="10"
              fontFamily="var(--mono)" textAnchor="end">{Math.round(p * 100)}%</text>
          </g>
        ))}

        {groups.map((g) =>
          g.rungs.length < 2 ? null : (
            <path key={g.key}
              d={g.rungs.map((r, i) => `${i === 0 ? 'M' : 'L'} ${sx(r.strike).toFixed(1)} ${sy(r.probability).toFixed(1)}`).join(' ')}
              fill="none" stroke={g.color} strokeWidth="2" strokeLinejoin="round" />
          ),
        )}

        {groups.map((g) =>
          g.rungs.map((r) => (
            <circle key={r.marketId}
              cx={sx(r.strike)} cy={sy(r.probability)}
              r={3 + 4 * Math.sqrt(r.openInterest / maxOi)}
              fill={g.color} fillOpacity="0.25" stroke={g.color} strokeWidth="1.2">
              <title>
                {r.question}
                {'\n'}{g.label} ${r.strike.toLocaleString()}: {(r.probability * 100).toFixed(1)}%
                {'\n'}Open interest ${Math.round(r.openInterest).toLocaleString()}
              </title>
            </circle>
          )),
        )}

        {/* spot */}
        <line x1={sx(spot)} y1={M.top - 8} x2={sx(spot)} y2={H - M.bottom}
          stroke="var(--do)" strokeWidth="1.5" />
        <text x={sx(spot)} y={M.top - 14} fill="var(--do)" fontSize="10"
          fontFamily="var(--mono)" textAnchor="middle" letterSpacing="0.06em">
          SPOT ${compact(spot)}
        </text>

        {asset.impliedMedian !== null && (
          <>
            <line x1={sx(asset.impliedMedian)} y1={M.top - 8} x2={sx(asset.impliedMedian)}
              y2={H - M.bottom} stroke="var(--say)" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={sx(asset.impliedMedian)} y={H - M.bottom + 32} fill="var(--say)"
              fontSize="10" fontFamily="var(--mono)" textAnchor="middle" letterSpacing="0.06em">
              IMPLIED ${compact(asset.impliedMedian)}
            </text>
          </>
        )}

        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom}
          stroke="var(--line)" strokeWidth="1" />
        {rungs
          .filter((_, i) => i % Math.max(1, Math.ceil(rungs.length / 9)) === 0)
          .map((r) => (
            <text key={`t${r.marketId}`} x={sx(r.strike)} y={H - M.bottom + 16}
              fill="var(--dim)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">
              ${compact(r.strike)}
            </text>
          ))}
      </svg>

      {barrier && (
        <div className="legend" style={{ marginBottom: 10 }}>
          <span><i style={{ background: 'var(--ok)' }} />P(rises to strike)</span>
          <span><i style={{ background: 'var(--danger)' }} />P(falls to strike)</span>
        </div>
      )}

      {asset.say.asymmetry.length > 0 && (
        <table className="cohorts" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Move from spot</th>
              <th className="num">Crowd says up</th>
              <th className="num">Crowd says down</th>
              <th className="num">Skew</th>
            </tr>
          </thead>
          <tbody>
            {asset.say.asymmetry.map((s) => {
              const skew = s.pUp - s.pDown;
              return (
                <tr key={s.distancePct}>
                  <td className="name">±{(s.distancePct * 100).toFixed(0)}%</td>
                  <td className="num pos">{(s.pUp * 100).toFixed(0)}%</td>
                  <td className="num neg">{(s.pDown * 100).toFixed(0)}%</td>
                  <td className={`num ${skew > 0 ? 'pos' : skew < 0 ? 'neg' : ''}`}>
                    {skew >= 0 ? '+' : ''}{(skew * 100).toFixed(0)} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="ladder-note">{asset.say.explanation}</p>
    </div>
  );
}

function compact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return v.toFixed(v >= 100 ? 0 : 2);
}
