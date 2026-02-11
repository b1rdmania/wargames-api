/**
 * Trading Floor Feed Dashboard
 * Real-time market and geopolitical data visualization
 */

import { BRAND_CSS } from '../brand';

export function generateFeedsDashboard(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TRADING FLOOR FEEDS — WARGAMES</title>
  ${BRAND_CSS}
  <style>
    .feed-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .feed-card {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 16px;
      min-height: 280px;
    }

    .feed-card.armed {
      border-top: 2px solid #02ff81;
    }

    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #234055;
    }

    .feed-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #36d4ff;
    }

    .feed-status {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      padding: 3px 8px;
      border: 1px solid currentColor;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .feed-status.live {
      color: #02ff81;
    }

    .feed-status.cached {
      color: #7a9ab0;
    }

    .feed-status.error {
      color: #ff6b6b;
    }

    .feed-content {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    .ticker {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(35, 64, 85, 0.4);
    }

    .ticker:last-child {
      border-bottom: none;
    }

    .ticker-symbol {
      color: #b8d0e0;
      font-weight: 500;
    }

    .ticker-value {
      color: #f1f8ff;
    }

    .ticker-change {
      font-size: 10px;
      margin-left: 8px;
    }

    .ticker-change.positive {
      color: #02ff81;
    }

    .ticker-change.negative {
      color: #ff6b6b;
    }

    .summary-box {
      background: #101c28;
      border: 1px solid #234055;
      padding: 12px;
      margin-top: 16px;
    }

    .summary-label {
      font-size: 9px;
      color: #7a9ab0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 14px;
      color: #f1f8ff;
      font-weight: 500;
    }

    .regime-indicator {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .regime-risk-on {
      background: rgba(2, 255, 129, 0.15);
      color: #02ff81;
      border: 1px solid #02ff81;
    }

    .regime-neutral {
      background: rgba(184, 208, 224, 0.15);
      color: #b8d0e0;
      border: 1px solid #b8d0e0;
    }

    .regime-risk-off {
      background: rgba(255, 107, 107, 0.15);
      color: #ff6b6b;
      border: 1px solid #ff6b6b;
    }

    .event-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(35, 64, 85, 0.4);
    }

    .event-item:last-child {
      border-bottom: none;
    }

    .event-region {
      font-size: 9px;
      color: #7a9ab0;
      text-transform: uppercase;
    }

    .event-headline {
      font-size: 11px;
      color: #f1f8ff;
      margin-top: 4px;
      line-height: 1.4;
    }

    .intensity-bar {
      display: inline-block;
      width: 40px;
      height: 8px;
      background: #234055;
      border-radius: 2px;
      overflow: hidden;
      vertical-align: middle;
      margin-left: 8px;
    }

    .intensity-fill {
      height: 100%;
      background: linear-gradient(90deg, #02ff81, #f5a623, #ff6b6b);
    }

    .metadata {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #234055;
      font-size: 9px;
      color: #7a9ab0;
    }

    .warning {
      background: rgba(245, 166, 35, 0.1);
      border-left: 2px solid #f5a623;
      padding: 8px 12px;
      margin-top: 8px;
      font-size: 10px;
      color: #f5a623;
    }

    .tape-section {
      margin-bottom: 16px;
    }

    .tape-category {
      font-size: 9px;
      color: #cfbeff;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .loading {
      color: #7a9ab0;
      text-align: center;
      padding: 40px 0;
    }

    .error-message {
      color: #ff6b6b;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <div class="logo">WARGAMES</div>
        <div class="tagline">TRADING FLOOR FEEDS</div>
      </div>
      <div class="header-right">
        <div class="status-indicator">
          <div class="status-dot"></div>
          <span id="update-time">LOADING...</span>
        </div>
      </div>
    </div>

    <div class="feed-grid" id="feed-grid">
      <div class="loading">INITIALIZING FEED STACK...</div>
    </div>

    <div class="footer">
      <span>WARGAMES API v1.1.0</span>
      <span>Data: FRED + GDELT + Frankfurter</span>
      <span id="cache-info">Cache: Loading...</span>
    </div>
  </div>

  <script>
    const API_BASE = window.location.origin;

    function formatChange(value) {
      if (value === null || value === undefined) return '';
      const sign = value >= 0 ? '+' : '';
      return \`<span class="ticker-change \${value >= 0 ? 'positive' : 'negative'}">\${sign}\${value.toFixed(2)}</span>\`;
    }

    function formatTimestamp(ts) {
      return new Date(ts).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    function renderMarkets(data, metadata) {
      const tickers = data.tape.slice(0, 6);
      return \`
        <div class="feed-card armed">
          <div class="feed-header">
            <div class="feed-title">Markets</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            \${tickers.map(t => \`
              <div class="ticker">
                <span class="ticker-symbol">\${t.symbol}</span>
                <span>
                  <span class="ticker-value">\${t.value.toFixed(t.unit === '%' ? 2 : t.unit === 'ratio' ? 4 : 2)}\${t.unit === '%' ? '%' : ''}</span>
                  \${formatChange(t.change_24h)}
                </span>
              </div>
            \`).join('')}
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Freshness: \${metadata.freshness.toUpperCase()}
          </div>
        </div>
      \`;
    }

    function renderVol(data, metadata) {
      const vix = data.volatility.find(v => v.symbol === 'VIX');
      const spx = data.indices.find(i => i.symbol === 'SPX');
      return \`
        <div class="feed-card \${data.summary.vix_level === 'elevated' || data.summary.vix_level === 'extreme' ? 'armed' : ''}">
          <div class="feed-header">
            <div class="feed-title">Volatility</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            <div class="ticker">
              <span class="ticker-symbol">VIX</span>
              <span>
                <span class="ticker-value">\${vix ? vix.value.toFixed(2) : 'N/A'}</span>
                \${vix ? formatChange(vix.change_24h) : ''}
              </span>
            </div>
            <div class="ticker">
              <span class="ticker-symbol">SPX</span>
              <span>
                <span class="ticker-value">\${spx ? spx.value.toFixed(2) : 'N/A'}</span>
                \${spx ? formatChange(spx.change_24h) : ''}
              </span>
            </div>
            <div class="summary-box">
              <div class="summary-label">Market Regime</div>
              <div class="summary-value">
                <span class="regime-indicator regime-\${data.summary.regime.replace('_', '-')}">\${data.summary.regime.replace('_', ' ')}</span>
              </div>
            </div>
            <div class="summary-box" style="margin-top: 8px;">
              <div class="summary-label">VIX Level</div>
              <div class="summary-value">\${data.summary.vix_level.toUpperCase()}</div>
            </div>
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Freshness: \${metadata.freshness.toUpperCase()}
          </div>
        </div>
      \`;
    }

    function renderCommodities(data, metadata) {
      const wti = data.energy.find(e => e.symbol === 'WTI');
      const brent = data.energy.find(e => e.symbol === 'BRENT');
      return \`
        <div class="feed-card \${data.summary.energy_stress > 70 ? 'armed' : ''}">
          <div class="feed-header">
            <div class="feed-title">Commodities</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            <div class="ticker">
              <span class="ticker-symbol">WTI</span>
              <span>
                <span class="ticker-value">\$\${wti ? wti.value.toFixed(2) : 'N/A'}</span>
                \${wti ? formatChange(wti.change_24h) : ''}
              </span>
            </div>
            <div class="ticker">
              <span class="ticker-symbol">BRENT</span>
              <span>
                <span class="ticker-value">\$\${brent ? brent.value.toFixed(2) : 'N/A'}</span>
                \${brent ? formatChange(brent.change_24h) : ''}
              </span>
            </div>
            <div class="summary-box">
              <div class="summary-label">Energy Stress</div>
              <div class="summary-value">\${data.summary.energy_stress}/100</div>
            </div>
            <div class="summary-box" style="margin-top: 8px;">
              <div class="summary-label">Inflation Signal</div>
              <div class="summary-value">\${data.summary.inflation_signal.toUpperCase()}</div>
            </div>
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Freshness: \${metadata.freshness.toUpperCase()}
          </div>
        </div>
      \`;
    }

    function renderCredit(data, metadata) {
      const ig = data.spreads.find(s => s.type === 'IG');
      const hy = data.spreads.find(s => s.type === 'HY');
      return \`
        <div class="feed-card \${data.summary.systemic_stress > 50 ? 'armed' : ''}">
          <div class="feed-header">
            <div class="feed-title">Credit</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            <div class="ticker">
              <span class="ticker-symbol">IG OAS</span>
              <span>
                <span class="ticker-value">\${ig ? ig.oas.toFixed(2) : 'N/A'}%</span>
                \${ig ? formatChange(ig.change_24h) : ''}
              </span>
            </div>
            <div class="ticker">
              <span class="ticker-symbol">HY OAS</span>
              <span>
                <span class="ticker-value">\${hy ? hy.oas.toFixed(2) : 'N/A'}%</span>
                \${hy ? formatChange(hy.change_24h) : ''}
              </span>
            </div>
            <div class="summary-box">
              <div class="summary-label">Systemic Stress</div>
              <div class="summary-value">\${data.summary.systemic_stress}/100</div>
            </div>
            <div class="summary-box" style="margin-top: 8px;">
              <div class="summary-label">Regime</div>
              <div class="summary-value">\${data.summary.regime.replace('_', ' ').toUpperCase()}</div>
            </div>
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Freshness: \${metadata.freshness.toUpperCase()}
          </div>
        </div>
      \`;
    }

    function renderGeo(data, metadata) {
      const topEvents = data.events.slice(0, 4);
      return \`
        <div class="feed-card \${topEvents.some(e => e.intensity > 80) ? 'armed' : ''}">
          <div class="feed-header">
            <div class="feed-title">Geopolitics</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            \${topEvents.map(e => \`
              <div class="event-item">
                <div class="event-region">
                  \${e.region} \${e.country ? '· ' + e.country : ''}
                  <div class="intensity-bar">
                    <div class="intensity-fill" style="width: \${e.intensity}%"></div>
                  </div>
                </div>
                <div class="event-headline">\${e.headline.slice(0, 80)}\${e.headline.length > 80 ? '...' : ''}</div>
              </div>
            \`).join('')}
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Events: \${data.events.length}
          </div>
        </div>
      \`;
    }

    function renderNews(data, metadata) {
      const breaking = data.breaking.slice(0, 3);
      return \`
        <div class="feed-card \${breaking.some(n => n.importance > 80) ? 'armed' : ''}">
          <div class="feed-header">
            <div class="feed-title">Breaking News</div>
            <div class="feed-status live">LIVE</div>
          </div>
          <div class="feed-content">
            \${breaking.length > 0 ? breaking.map(n => \`
              <div class="event-item">
                <div class="event-region">
                  \${n.category.toUpperCase()} · IMPORTANCE: \${n.importance}/100
                </div>
                <div class="event-headline">\${n.headline.slice(0, 100)}\${n.headline.length > 100 ? '...' : ''}</div>
              </div>
            \`).join('') : '<div class="event-item"><div class="event-headline" style="color: #7a9ab0;">No breaking news</div></div>'}
          </div>
          <div class="metadata">
            Provider: \${metadata.provider} | Freshness: \${metadata.freshness.toUpperCase()}
          </div>
          \${metadata.warnings.length > 0 ? \`<div class="warning">\${metadata.warnings[0]}</div>\` : ''}
        </div>
      \`;
    }

    async function loadFeeds() {
      try {
        const [markets, vol, commodities, credit, geo, news] = await Promise.all([
          fetch(\`\${API_BASE}/live/markets\`).then(r => r.json()),
          fetch(\`\${API_BASE}/live/vol\`).then(r => r.json()),
          fetch(\`\${API_BASE}/live/commodities\`).then(r => r.json()),
          fetch(\`\${API_BASE}/live/credit\`).then(r => r.json()),
          fetch(\`\${API_BASE}/live/geo\`).then(r => r.json()),
          fetch(\`\${API_BASE}/live/news\`).then(r => r.json())
        ]);

        const grid = document.getElementById('feed-grid');
        grid.innerHTML = \`
          \${renderMarkets(markets.data, markets.metadata)}
          \${renderVol(vol.data, vol.metadata)}
          \${renderCommodities(commodities.data, commodities.metadata)}
          \${renderCredit(credit.data, credit.metadata)}
          \${renderGeo(geo.data, geo.metadata)}
          \${renderNews(news.data, news.metadata)}
        \`;

        document.getElementById('update-time').textContent = formatTimestamp(markets.metadata.fetchedAt);
        document.getElementById('cache-info').textContent = \`Cache: \${(markets.metadata.ttlMs / 1000 / 60).toFixed(0)}min\`;
      } catch (error) {
        document.getElementById('feed-grid').innerHTML = \`
          <div class="error-message">
            ERROR: Failed to load feeds<br>
            <span style="font-size: 10px; color: #7a9ab0;">\${error.message}</span>
          </div>
        \`;
      }
    }

    // Initial load
    loadFeeds();

    // Auto-refresh every 60 seconds
    setInterval(loadFeeds, 60000);
  </script>
</body>
</html>
  `;
}
