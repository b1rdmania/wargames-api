export const BRAND_CSS = `
/* =============================================================================
   WARGAMES Brand CSS (v2 dashboard as source of truth)
   Keep this file small + stable. Pages can add local styles as needed.
   ============================================================================= */

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  /* Core surfaces */
  --wg-bg: #070d14;          /* v2: --norad-bg */
  --wg-surface: #0e1822;     /* v2: --norad-surface */
  --wg-panel: #101c28;       /* v2: --norad-panel */
  --wg-border: #234055;      /* v2: --norad-grid */

  /* Accents */
  --wg-telemetry: #36d4ff;   /* v2: --norad-telemetry */
  --wg-signal: #02ff81;      /* v2: --norad-signal */
  --wg-intel: #cfbeff;       /* v2: --norad-intel */
  --wg-warning: #f9c262;     /* v2: --norad-warning */
  --wg-fault: #ff8f9a;       /* v2: --norad-fault */

  /* Text */
  --wg-text: #f0eef5;        /* v2: --text-primary */
  --wg-text-muted: #6b6879;  /* v2: --text-muted */
}

/* Base */
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  background: var(--wg-bg);
  color: var(--wg-text);
  line-height: 1.6;
  overflow-x: hidden;
}

a { color: var(--wg-telemetry); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Layout primitives */
.wg-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

.wg-panel {
  background: var(--wg-surface);
  border: 1px solid var(--wg-border);
  padding: 16px 18px;
}

.wg-title {
  margin: 0;
  font-size: 22px;
  letter-spacing: 4px;
  color: var(--wg-telemetry);
  text-shadow: 0 0 18px rgba(54, 212, 255, 0.35);
}

.wg-subtitle {
  margin: 8px 0 0 0;
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--wg-text-muted);
}

/* Universal topbar */
.wg-topbar {
  background: var(--wg-surface);
  border-bottom: 2px solid var(--wg-border);
  padding: 14px 18px;
}

.wg-topbar-inner {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.wg-topbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 260px;
}

.wg-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.wg-nav a {
  color: var(--wg-telemetry);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: 1px solid rgba(35, 64, 85, 0.9);
  padding: 7px 10px;
  background: rgba(16, 28, 40, 0.55);
  border-radius: 2px;
  text-decoration: none;
}

.wg-nav a:hover {
  border-color: var(--wg-telemetry);
  box-shadow: 0 0 0 1px rgba(54, 212, 255, 0.25), 0 0 22px rgba(54, 212, 255, 0.12);
  text-decoration: none;
}

/* Badges / pills */
.wg-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--wg-text);
}

.wg-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--wg-signal);
  box-shadow: 0 0 12px rgba(2, 255, 129, 0.6);
}

/* Tables */
.wg-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--wg-surface);
  border: 1px solid var(--wg-border);
}
.wg-table th, .wg-table td {
  padding: 12px 12px;
  border-bottom: 1px solid rgba(35, 64, 85, 0.55);
  font-size: 12px;
}
.wg-table th {
  text-align: left;
  color: var(--wg-text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 10px;
}
.wg-table tr:hover {
  background: rgba(16, 28, 40, 0.6);
}

/* Code blocks */
.wg-code {
  background: rgba(7, 13, 20, 0.75);
  border: 1px solid rgba(35, 64, 85, 0.8);
  padding: 12px 14px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--wg-text);
}

/* Responsive tweaks */
@media (max-width: 900px) {
  .wg-topbar-inner { flex-direction: column; align-items: stretch; }
  .wg-nav { justify-content: flex-start; }
  .wg-topbar-left { min-width: unset; }
}
`;

