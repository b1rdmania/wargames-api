/**
 * RADU Performance Dashboard
 * Showcase Verifiable Risk Timeline & RADU Metrics
 */

export const raduDashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // RADU PERFORMANCE TERMINAL</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      /* Map legacy RADU tokens → v2 brand tokens */
      --bg: var(--wg-bg);
      --surface: var(--wg-surface);
      --panel: var(--wg-panel);
      --grid: var(--wg-border);
      --accent: var(--wg-telemetry);
      --success: var(--wg-signal);
      --warning: var(--wg-warning);
      --error: var(--wg-fault);
      --text: var(--wg-text);
      --muted: var(--wg-text-muted);
    }

    body {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 0;
    }

    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      border: 2px solid var(--grid);
      background: var(--surface);
      padding: 30px;
      margin-bottom: 30px;
      text-align: center;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 8px;
      text-shadow: 0 0 20px var(--accent);
      margin-bottom: 10px;
    }

    .subtitle {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .panel {
      border: 2px solid var(--grid);
      background: var(--panel);
      overflow: hidden;
    }

    .panel-header {
      background: var(--surface);
      padding: 15px 20px;
      border-bottom: 1px solid var(--grid);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--accent);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-badge {
      font-size: 9px;
      padding: 4px 10px;
      background: var(--grid);
      color: var(--success);
      border-radius: 2px;
    }

    .panel-content {
      padding: 25px;
    }

    .big-number {
      text-align: center;
      padding: 20px 0;
    }

    .big-value {
      font-size: 64px;
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 0 30px currentColor;
    }

    .big-value.success { color: var(--success); }
    .big-value.warning { color: var(--warning); }
    .big-value.error { color: var(--error); }

    .big-label {
      margin-top: 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--muted);
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--grid);
      font-size: 11px;
    }

    .stat-row:last-child { border: none; }

    .stat-label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 9px;
    }

    .stat-value {
      font-weight: 700;
      color: var(--accent);
    }

    .insight {
      padding: 12px;
      margin: 8px 0;
      background: rgba(54, 212, 255, 0.05);
      border-left: 3px solid var(--accent);
      font-size: 10px;
      line-height: 1.6;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 2px;
    }

    .recommendation {
      background: rgba(2, 255, 129, 0.08);
      border: 1px solid var(--success);
      padding: 20px;
      margin-top: 20px;
      font-size: 10px;
      line-height: 1.8;
      border-radius: 2px;
    }

    .recommendation strong {
      color: var(--success);
      font-size: 12px;
      display: block;
      margin-bottom: 10px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .live-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • RADU</div>
        <div class="wg-title">WARGAMES // RADU PERFORMANCE</div>
        <div class="wg-subtitle">Risk-adjusted decision uplift • receipts • evaluation</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/dashboard/integrations">Integrations</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div class="title">WARGAMES // RADU PERFORMANCE</div>
      <div class="subtitle"><span class="live-indicator"></span>Risk-Adjusted Decision Uplift // Verifiable On-Chain Proof</div>
      <nav style="margin-top: 15px; font-size: 10px;">
        <a href="/pitch" style="color: #0f0; margin: 0 10px; text-decoration: none;">PITCH</a>
        <a href="/dashboard/v2" style="color: #0f0; margin: 0 10px; text-decoration: none;">DASHBOARD</a>
        <a href="/dashboard/analytics" style="color: #0f0; margin: 0 10px; text-decoration: none;">ANALYTICS</a>
        <a href="/dashboard/predictions" style="color: #0f0; margin: 0 10px; text-decoration: none;">PREDICTIONS</a>
        <a href="/integrations/proof" style="color: #0f0; margin: 0 10px; text-decoration: none;">PROOF</a>
        <a href="/" style="color: #0f0; margin: 0 10px; text-decoration: none;">API</a>
      </nav>
    </div>

    <div class="grid">
      <!-- RADU Score -->
      <div class="panel">
        <div class="panel-header">
          <span>RADU SCORE</span>
          <span class="panel-badge" id="confidence-badge">LOADING</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="radu-score">--</div>
            <div class="big-label">Risk-Adjusted Decision Uplift</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Sample Size</span>
            <span class="stat-value" id="sample-size">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Statistical Significance</span>
            <span class="stat-value" id="significance">--</span>
          </div>
        </div>
      </div>

      <!-- Return Improvement -->
      <div class="panel">
        <div class="panel-header">
          <span>RETURN IMPROVEMENT</span>
          <span class="panel-badge">ABSOLUTE</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="return-improvement">--</div>
            <div class="big-label">Percentage Points</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Baseline Return</span>
            <span class="stat-value" id="baseline-return">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">WARGAMES Return</span>
            <span class="stat-value" id="wargames-return">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Relative Improvement</span>
            <span class="stat-value" id="relative-improvement">--</span>
          </div>
        </div>
      </div>

      <!-- Risk Reduction -->
      <div class="panel">
        <div class="panel-header">
          <span>RISK REDUCTION</span>
          <span class="panel-badge">DRAWDOWN</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="drawdown-reduction">--</div>
            <div class="big-label">Max Drawdown Reduced</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Baseline Drawdown</span>
            <span class="stat-value" id="baseline-drawdown">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">WARGAMES Drawdown</span>
            <span class="stat-value" id="wargames-drawdown">--</span>
          </div>
        </div>
      </div>

      <!-- Sharpe Improvement -->
      <div class="panel">
        <div class="panel-header">
          <span>SHARPE RATIO</span>
          <span class="panel-badge">RISK-ADJUSTED</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="sharpe-improvement">--</div>
            <div class="big-label">Sharpe Improvement</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Baseline Sharpe</span>
            <span class="stat-value" id="baseline-sharpe">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">WARGAMES Sharpe</span>
            <span class="stat-value" id="wargames-sharpe">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Sortino Improvement</span>
            <span class="stat-value" id="sortino-improvement">--</span>
          </div>
        </div>
      </div>

      <!-- Win Rate -->
      <div class="panel">
        <div class="panel-header">
          <span>WIN RATE</span>
          <span class="panel-badge">CONSISTENCY</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="win-rate">--</div>
            <div class="big-label">WARGAMES Win Rate</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Baseline Win Rate</span>
            <span class="stat-value" id="baseline-winrate">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Improvement</span>
            <span class="stat-value" id="winrate-improvement">--</span>
          </div>
        </div>
      </div>

      <!-- On-Chain Receipts -->
      <div class="panel">
        <div class="panel-header">
          <span>VERIFIABLE RECEIPTS</span>
          <span class="panel-badge">ON-CHAIN</span>
        </div>
        <div class="panel-content">
          <div class="big-number">
            <div class="big-value success" id="receipt-verification">--</div>
            <div class="big-label">Verification Rate</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Total Receipts</span>
            <span class="stat-value" id="total-receipts">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Verified On-Chain</span>
            <span class="stat-value" id="verified-receipts">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Avg Lead Time</span>
            <span class="stat-value" id="lead-time">--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Solana Cost per Receipt</span>
            <span class="stat-value" id="receipt-cost">--</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Insights -->
    <div class="panel">
      <div class="panel-header">
        <span>KEY INSIGHTS</span>
        <span class="panel-badge">AI-GENERATED</span>
      </div>
      <div class="panel-content" id="insights-container">
        <div class="loading">LOADING INSIGHTS...</div>
      </div>
    </div>

    <!-- Recommendation -->
    <div class="panel">
      <div class="panel-header">
        <span>RECOMMENDATION</span>
        <span class="panel-badge">PRODUCTION</span>
      </div>
      <div class="panel-content">
        <div class="recommendation" id="recommendation-container">
          <strong>LOADING...</strong>
        </div>
      </div>
    </div>
  </div>

  <script>
    const API = '';

    async function loadData() {
      try {
        const [radu, onChainStats, onChainCost] = await Promise.all([
          fetch(API + '/evaluation/radu').then(r => r.json()),
          fetch(API + '/receipts/on-chain/stats').then(r => r.json()),
          fetch(API + '/receipts/on-chain/cost').then(r => r.json())
        ]);

        // RADU Score
        document.getElementById('radu-score').textContent = radu.radu_score;
        document.getElementById('confidence-badge').textContent = radu.confidence.statistical_significance.toUpperCase().replace('_', ' ');
        document.getElementById('sample-size').textContent = radu.confidence.sample_size_adequacy.toUpperCase();
        document.getElementById('significance').textContent = radu.confidence.statistical_significance.toUpperCase().replace('_', ' ');

        // Return Improvement
        document.getElementById('return-improvement').textContent = '+' + radu.performance_delta.return_improvement_pct.toFixed(1) + 'pp';
        document.getElementById('baseline-return').textContent = radu.baseline_strategy.total_return_pct.toFixed(1) + '%';
        document.getElementById('wargames-return').textContent = radu.wargames_strategy.total_return_pct.toFixed(1) + '%';
        document.getElementById('relative-improvement').textContent = '+' + radu.performance_delta.return_improvement_relative.toFixed(1) + '%';

        // Risk Reduction
        const ddReduction = Math.abs(radu.performance_delta.drawdown_reduction_pct);
        document.getElementById('drawdown-reduction').textContent = ddReduction.toFixed(1) + 'pp';
        document.getElementById('baseline-drawdown').textContent = radu.baseline_strategy.max_drawdown_pct.toFixed(1) + '%';
        document.getElementById('wargames-drawdown').textContent = radu.wargames_strategy.max_drawdown_pct.toFixed(1) + '%';

        // Sharpe
        document.getElementById('sharpe-improvement').textContent = '+' + radu.performance_delta.sharpe_improvement.toFixed(2);
        document.getElementById('baseline-sharpe').textContent = radu.baseline_strategy.sharpe_ratio.toFixed(2);
        document.getElementById('wargames-sharpe').textContent = radu.wargames_strategy.sharpe_ratio.toFixed(2);
        document.getElementById('sortino-improvement').textContent = '+' + radu.performance_delta.sortino_improvement.toFixed(2);

        // Win Rate
        document.getElementById('win-rate').textContent = radu.wargames_strategy.win_rate + '%';
        document.getElementById('baseline-winrate').textContent = radu.baseline_strategy.win_rate + '%';
        document.getElementById('winrate-improvement').textContent = '+' + radu.performance_delta.win_rate_improvement_pct + 'pp';

        // Receipts
        document.getElementById('receipt-verification').textContent = radu.wargames_strategy.receipt_verification_rate + '%';
        document.getElementById('total-receipts').textContent = radu.verifiable_evidence.total_receipts;
        document.getElementById('verified-receipts').textContent = radu.verifiable_evidence.verified_receipts;
        document.getElementById('lead-time').textContent = radu.verifiable_evidence.average_lead_time_hours.toFixed(1) + 'h';
        document.getElementById('receipt-cost').textContent = '$' + onChainCost.cost.usd.toFixed(4);

        // Insights
        const insightsHTML = radu.key_insights.map(insight => \`<div class="insight">\${insight}</div>\`).join('');
        document.getElementById('insights-container').innerHTML = insightsHTML;

        // Recommendation
        document.getElementById('recommendation-container').innerHTML = \`<strong>EVALUATION COMPLETE</strong>\${radu.recommendation}\`;

      } catch (error) {
        console.error('Failed to load data:', error);
        document.body.innerHTML += '<div style="color: var(--error); text-align: center; padding: 40px;">FAILED TO LOAD DATA</div>';
      }
    }

    loadData();
  </script>
</body>
</html>
`;
