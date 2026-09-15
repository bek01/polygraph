import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Polygraph — the onchain lie detector';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Link preview for the X post and anywhere else the URL gets shared.
 * Rendered with next/og so it needs no extra dependency and no checked-in
 * binary that can drift from the design.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#06080c',
          padding: '64px 72px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 28,
            }}
          >
            <svg width="54" height="54" viewBox="0 0 26 26">
              <path
                d="M1 15 L6 15 L8 8 L11 21 L14 4 L17 17 L19 15 L25 15"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ fontSize: 60, color: '#e8eef7', letterSpacing: '-2px' }}>
              Polygraph
            </div>
          </div>

          <div style={{ fontSize: 34, color: '#7f8da5', lineHeight: 1.4, maxWidth: 900 }}>
            The onchain lie detector. What the crowd says on Polymarket, plotted
            against what six classes of capital actually did.
          </div>
        </div>

        {/* two needles and the gap between them */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 210, fontSize: 19, color: '#7f8da5' }}>CROWD SAYS</div>
            <div style={{ display: 'flex', width: 620, height: 3, background: '#1a2231' }}>
              <div style={{ width: 430, height: 3, background: '#ffb020' }} />
            </div>
            <div style={{ fontSize: 19, color: '#ffb020' }}>BUYING</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 210, fontSize: 19, color: '#7f8da5' }}>MONEY DOES</div>
            <div style={{ display: 'flex', width: 620, height: 3, background: '#1a2231' }}>
              <div style={{ width: 150, height: 3, background: '#22d3ee' }} />
            </div>
            <div style={{ fontSize: 19, color: '#22d3ee' }}>SELLING</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#ff4d5e',
              border: '1px solid rgba(255,77,94,0.45)',
              borderRadius: 10,
              padding: '12px 20px',
              letterSpacing: '3px',
            }}
          >
            DECEPTION
          </div>
          <div style={{ fontSize: 22, color: '#55607a' }}>
            Built on the Nansen API · Meridian Buildathon
          </div>
        </div>
      </div>
    ),
    size,
  );
}
