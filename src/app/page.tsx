'use client';

import { useEffect, useMemo, useState } from 'react';
import { Polygraph, formatFlow } from './components/Polygraph';
import { Ladder } from './components/Ladder';
import { Calibration } from './components/Calibration';
import type { PolygraphSnapshot } from '@/lib/types';

export default function Home() {
  const [snap, setSnap] = useState<PolygraphSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/polygraph')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) {
          setError(j.error);
          return;
        }
        setSnap(j as PolygraphSnapshot);
        setActive((j as PolygraphSnapshot).assets[0]?.symbol ?? null);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const asset = useMemo(
    () => snap?.assets.find((a) => a.symbol === active) ?? snap?.assets[0] ?? null,
    [snap, active],
  );

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="brand">
          <div className="pulse-mark">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <path
                d="M1 15 L6 15 L8 8 L11 21 L14 4 L17 17 L19 15 L25 15"
                fill="none"
                stroke="var(--do)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1>Polygraph</h1>
            <p className="tag">
              The onchain lie detector. What the crowd <em>says</em> on Polymarket,
              wired up against what six classes of capital actually <em>did</em> onchain.
              The gap between the needles is the whole product.
            </p>
          </div>
        </div>

        <div className="status-rail">
          {snap ? (
            <>
              <span className="chip live">
                <span className="dot" />live
              </span>
              <span className="chip">
                nansen calls <b>{snap.meta.apiCallsThisRequest}</b>
              </span>
              <span className="chip">
                {new Date(snap.generatedAt).toUTCString().slice(17, 25)} utc
              </span>
              {snap.meta.degraded && (
                <span className="chip warnc" title={snap.meta.errors.join('\n')}>
                  partial data
                </span>
              )}
            </>
          ) : (
            <span className="chip">connecting…</span>
          )}
        </div>
      </header>

      {error && (
        <div className="err">
          <strong>Could not reach the Nansen API.</strong>
          <br />
          <code>{error}</code>
          <br />
          <br />
          Set <code>NANSEN_API_KEY</code> in your environment and confirm the key has
          credits remaining.
        </div>
      )}

      {!snap && !error && (
        <div className="panel">
          <div className="skeleton">
            CALIBRATING INSTRUMENT — PULLING POLYMARKET LADDERS AND NANSEN FLOWS
            <div className="scan" />
          </div>
        </div>
      )}

      {snap && asset && (
        <>
          <div className="switcher">
            {snap.assets.map((a) => (
              <button
                key={a.symbol}
                data-active={a.symbol === asset.symbol}
                onClick={() => setActive(a.symbol)}
              >
                {a.symbol}
                <span
                  className="gs"
                  style={{
                    color:
                      a.verdict === 'DECEPTION'
                        ? 'var(--danger)'
                        : a.verdict === 'TENSION'
                          ? 'var(--warn)'
                          : a.verdict === 'ALIGNED'
                            ? 'var(--ok)'
                            : 'var(--dim)',
                  }}
                >
                  {a.gapScore}
                </span>
              </button>
            ))}
          </div>

          <section className="panel">
            <div className="verdict">
              <div>
                <h3>{asset.headline}</h3>
                <p className="why">
                  Crowd conviction {fmtStance(asset.sayStance)} · informed capital{' '}
                  {fmtStance(asset.doStance)} · divergence {asset.gapScore}/100, read from{' '}
                  {asset.marketCount} live {asset.symbol} strike
                  {asset.marketCount === 1 ? '' : 's'} expiring {asset.say.horizonLabel} and{' '}
                  {asset.cohorts.filter((c) => c.netFlowUsd !== 0).length} reporting wallet
                  cohorts.
                </p>
              </div>
              <div>
                <div className="stamp" data-v={asset.verdict}>
                  {asset.verdict}
                </div>
                <div className="conf" data-band={asset.confidence.band}>
                  {asset.confidence.band} CONFIDENCE
                </div>
              </div>
            </div>
          </section>

          <div className="metrics">
            <Metric k="Spot" v={asset.spot !== null ? `$${fmtNum(asset.spot)}` : '—'} />
            {asset.say.method === 'terminal-median' ? (
              <>
                <Metric
                  k="Crowd implied"
                  v={asset.impliedMedian !== null ? `$${fmtNum(asset.impliedMedian)}` : '—'}
                />
                <Metric
                  k="Implied move"
                  v={
                    asset.impliedMovePct !== null
                      ? `${asset.impliedMovePct >= 0 ? '+' : ''}${(asset.impliedMovePct * 100).toFixed(1)}%`
                      : '—'
                  }
                  tone={
                    asset.impliedMovePct === null
                      ? undefined
                      : asset.impliedMovePct >= 0
                        ? 'pos'
                        : 'neg'
                  }
                />
              </>
            ) : (
              <>
                <Metric k="Read from" v="barriers" />
                <Metric
                  k="Up/down skew"
                  v={
                    asset.say.asymmetryScore !== null
                      ? `${asset.say.asymmetryScore >= 0 ? '+' : ''}${(asset.say.asymmetryScore * 100).toFixed(0)} pts`
                      : '—'
                  }
                  tone={
                    asset.say.asymmetryScore === null
                      ? undefined
                      : asset.say.asymmetryScore >= 0
                        ? 'pos'
                        : 'neg'
                  }
                />
              </>
            )}
            <Metric k="Open interest" v={`$${fmtNum(asset.totalOpenInterest)}`} />
            <Metric k="Traders 24h" v={fmtNum(asset.uniqueTraders24h)} />
            <Metric k="Gap score" v={String(asset.gapScore)} />
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Readout — {asset.symbol}</h2>
              <span className="sub">
                needle deflection = conviction, normalised against each cohort&apos;s own
                weekly pace
              </span>
            </div>
            <Polygraph asset={asset} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Channel detail</h2>
              <span className="sub">net USD flow, 24h, per Nansen entity label</span>
            </div>
            <table className="cohorts">
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th className="num">Net flow 24h</th>
                  <th className="num">Wallets</th>
                  <th className="num">Stance</th>
                </tr>
              </thead>
              <tbody>
                {asset.cohorts.map((c) => (
                  <tr key={c.key}>
                    <td>
                      <span className="name">{c.label}</span>
                      {c.informed && <span className="badge-i">INFORMED</span>}
                      <div className="blurb">{c.blurb}</div>
                    </td>
                    <td
                      className={`num ${c.netFlowUsd > 0 ? 'pos' : c.netFlowUsd < 0 ? 'neg' : ''}`}
                    >
                      {formatFlow(c.netFlowUsd)}
                    </td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {c.walletCount || '—'}
                    </td>
                    <td className={`num ${c.stance > 0 ? 'pos' : c.stance < 0 ? 'neg' : ''}`}>
                      {c.stance === 0 ? '—' : c.stance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>What the crowd believes</h2>
              <span className="sub">
                {asset.say.method === 'terminal-median'
                  ? `every close-settled ${asset.symbol} strike, as one survival curve`
                  : asset.say.method === 'barrier-asymmetry'
                    ? `${asset.symbol} barrier markets — upside and downside odds, facing away from spot`
                    : `no readable ${asset.symbol} structure`}
              </span>
            </div>
            <Ladder asset={asset} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Was the crowd ever right?</h2>
              <span className="sub">
                resolved {asset.symbol} markets scored against their own settlement
              </span>
            </div>
            <Calibration symbol={asset.symbol} />
          </section>

          {asset.caveats.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Known limits of this reading</h2>
              </div>
              <ul className="caveats">
                {asset.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <footer className="foot">
        <div>
          Built for the Nansen Meridian Buildathon. Data:{' '}
          <a href="https://docs.nansen.ai" target="_blank" rel="noreferrer">
            Nansen API
          </a>{' '}
          — prediction markets, flow intelligence, token OHLCV.
        </div>
        <div>
          Not financial advice. Divergence is a question, not a signal.
        </div>
      </footer>
    </div>
  );
}

function Metric({ k, v, tone }: { k: string; v: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v ${tone ?? ''}`}>{v}</div>
    </div>
  );
}

function fmtStance(s: number): string {
  const a = Math.abs(s);
  const dir = s > 0 ? 'long' : s < 0 ? 'short' : 'flat';
  if (a < 0.15) return 'flat';
  return `${dir} ${a.toFixed(2)}`;
}

function fmtNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`;
  return v.toFixed(v >= 100 ? 0 : 2);
}
