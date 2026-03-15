/**
 * Generate a self-contained HTML report from an Artillery report.json
 * Usage: node generate-report.js [input.json] [output.html]
 */
import fs from 'fs';

const inputFile = process.argv[2] || 'report.json';
const outputFile = process.argv[3] || 'artillery-report.html';

const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const agg = raw.aggregate;
const inter = raw.intermediate || [];

// ── Aggregate metrics ────────────────────────────────────────────────────────
const counters = agg.counters || {};
const rt = agg.summaries?.['http.response_time'] || {};

const totalReqs = counters['http.requests'] || 0;
const codes200 = counters['http.codes.200'] || 0;
const codes201 = counters['http.codes.201'] || 0;
const codes4xx = Object.entries(counters).filter(([k]) => /http\.codes\.4/.test(k)).reduce((s, [, v]) => s + v, 0);
const codes5xx = Object.entries(counters).filter(([k]) => /http\.codes\.5/.test(k)).reduce((s, [, v]) => s + v, 0);
const totalVU = counters['vusers.created'] || 0;
const failedVU = counters['vusers.failed'] || 0;
const successRate = totalVU > 0 ? ((totalVU - failedVU) / totalVU * 100).toFixed(1) : 100;
const downloadedMB = ((counters['http.downloaded_bytes'] || 0) / 1024 / 1024).toFixed(2);

const scenarioRows = Object.entries(counters)
    .filter(([k]) => k.startsWith('vusers.created_by_name.'))
    .map(([k, v]) => [k.replace('vusers.created_by_name.', ''), v])
    .sort((a, b) => b[1] - a[1]);

// ── Time-series data for charts ──────────────────────────────────────────────
let idx = 0;
const labels = inter.map(() => `T+${(idx++ * 5)}s`);
const reqSeries = inter.map(p => p.counters?.['http.requests'] || 0);
const p95Series = inter.map(p => p.summaries?.['http.response_time']?.p95 || 0);
const p99Series = inter.map(p => p.summaries?.['http.response_time']?.p99 || 0);
const meanSeries = inter.map(p => p.summaries?.['http.response_time']?.mean || 0);
const vuSeries = inter.map(p => p.counters?.['vusers.created'] || 0);

// Status code health indicator
const healthColor = codes5xx > 0 ? '#ef4444' : (codes4xx > totalReqs * 0.05 ? '#f59e0b' : '#22c55e');
const healthLabel = codes5xx > 0 ? 'DEGRADED' : 'HEALTHY';

// Threshold check
const p95Pass = (rt.p95 || 0) <= 2000;
const p99Pass = (rt.p99 || 0) <= 5000;

const testDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

// ── HTML ─────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SpaceCMU — Artillery Load Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #232635;
    --border: #2e3148;
    --text: #e2e8f0;
    --text-muted: #8892a4;
    --accent: #6366f1;
    --accent2: #8b5cf6;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #f59e0b;
    --blue: #38bdf8;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    padding: 24px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .header-left h1 {
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 4px;
  }
  .header-left p { color: var(--text-muted); font-size: 0.875rem; }
  .badge {
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
  }
  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent-color, var(--accent));
  }
  .kpi-card .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .kpi-card .value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
  }
  .kpi-card .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Charts */
  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 32px;
  }
  @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
  }
  .chart-card h3 {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 16px;
  }
  .chart-card canvas { max-height: 240px; }

  /* Tables */
  .section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 32px;
  }
  @media (max-width: 900px) { .section { grid-template-columns: 1fr; } }

  .table-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
  }
  .table-card h3 {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 16px;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 10px 8px;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td { border-bottom: none; }
  .mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  .pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
  }
  .pill-pass { background: #15803d20; color: var(--green); }
  .pill-fail { background: #dc262620; color: var(--red); }
  .pill-warn { background: #d9770620; color: var(--yellow); }

  /* Progress bars */
  .bar-wrap { display: flex; align-items: center; gap: 8px; }
  .bar { flex: 1; height: 6px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }

  /* Footer */
  footer {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }
</style>
</head>
<body>

<!-- ─── Header ─────────────────────────────────────────────────────────────── -->
<div class="header">
  <div class="header-left">
    <h1>⚡ SpaceCMU Load Test Report</h1>
    <p>Full E2E — ${testDate}</p>
  </div>
  <span class="badge" style="background:${healthColor}22; color:${healthColor};">${healthLabel}</span>
</div>

<!-- ─── KPI Grid ───────────────────────────────────────────────────────────── -->
<div class="kpi-grid">
  <div class="kpi-card" style="--accent-color: #6366f1">
    <div class="label">Total Requests</div>
    <div class="value" style="color:#6366f1">${totalReqs.toLocaleString()}</div>
    <div class="sub">${downloadedMB} MB downloaded</div>
  </div>
  <div class="kpi-card" style="--accent-color: #22c55e">
    <div class="label">Success Rate</div>
    <div class="value" style="color:#22c55e">${successRate}%</div>
    <div class="sub">${totalVU.toLocaleString()} virtual users</div>
  </div>
  <div class="kpi-card" style="--accent-color: #38bdf8">
    <div class="label">Avg Response Time</div>
    <div class="value" style="color:#38bdf8">${rt.mean?.toFixed(1) || 0}<span style="font-size:1rem">ms</span></div>
    <div class="sub">Median: ${rt.median || 0}ms</div>
  </div>
  <div class="kpi-card" style="--accent-color: #a78bfa">
    <div class="label">p95 Response Time</div>
    <div class="value" style="color:#a78bfa">${rt.p95 || 0}<span style="font-size:1rem">ms</span></div>
    <div class="sub">p99: ${rt.p99 || 0}ms</div>
  </div>
  <div class="kpi-card" style="--accent-color: #f59e0b">
    <div class="label">HTTP 2xx Responses</div>
    <div class="value" style="color:#f59e0b">${(codes200 + codes201).toLocaleString()}</div>
    <div class="sub">200: ${codes200.toLocaleString()} · 201: ${codes201.toLocaleString()}</div>
  </div>
  <div class="kpi-card" style="--accent-color: ${codes5xx > 0 ? '#ef4444' : '#22c55e'}">
    <div class="label">Errors</div>
    <div class="value" style="color:${codes5xx > 0 ? '#ef4444' : '#22c55e'}">${codes5xx + codes4xx}</div>
    <div class="sub">4xx: ${codes4xx} · 5xx: ${codes5xx}</div>
  </div>
</div>

<!-- ─── Charts ─────────────────────────────────────────────────────────────── -->
<div class="charts-grid">
  <div class="chart-card">
    <h3>📈 Requests per 5s Interval</h3>
    <canvas id="reqChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>⏱ Response Time (ms)</h3>
    <canvas id="rtChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>👥 Virtual Users Created</h3>
    <canvas id="vuChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>🎯 Response Distribution</h3>
    <canvas id="distChart"></canvas>
  </div>
</div>

<!-- ─── Tables ─────────────────────────────────────────────────────────────── -->
<div class="section">
  <div class="table-card">
    <h3>📋 Scenario Breakdown</h3>
    <table>
      <thead><tr><th>Scenario</th><th>VUs</th><th>Share</th></tr></thead>
      <tbody>
        ${scenarioRows.map(([name, count]) => `
        <tr>
          <td>${name}</td>
          <td class="mono" style="color:#a78bfa">${count}</td>
          <td style="width:40%">
            <div class="bar-wrap">
              <div class="bar"><div class="bar-fill" style="width:${Math.round(count / totalVU * 100)}%"></div></div>
              <span style="font-size:0.75rem; color:var(--text-muted); min-width:32px">${Math.round(count / totalVU * 100)}%</span>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="table-card">
    <h3>✅ Performance Thresholds</h3>
    <table>
      <thead><tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr></thead>
      <tbody>
        <tr>
          <td>p95 response time</td>
          <td class="mono" style="color:#38bdf8">${rt.p95 || 0}ms</td>
          <td class="mono" style="color:var(--text-muted)">≤ 2000ms</td>
          <td><span class="pill ${p95Pass ? 'pill-pass' : 'pill-fail'}">${p95Pass ? 'PASS ✓' : 'FAIL ✗'}</span></td>
        </tr>
        <tr>
          <td>p99 response time</td>
          <td class="mono" style="color:#38bdf8">${rt.p99 || 0}ms</td>
          <td class="mono" style="color:var(--text-muted)">≤ 5000ms</td>
          <td><span class="pill ${p99Pass ? 'pill-pass' : 'pill-fail'}">${p99Pass ? 'PASS ✓' : 'FAIL ✗'}</span></td>
        </tr>
        <tr>
          <td>5xx error rate</td>
          <td class="mono" style="color:${codes5xx > 0 ? '#ef4444' : '#22c55e'}">${codes5xx}</td>
          <td class="mono" style="color:var(--text-muted)">0</td>
          <td><span class="pill ${codes5xx === 0 ? 'pill-pass' : 'pill-fail'}">${codes5xx === 0 ? 'PASS ✓' : 'FAIL ✗'}</span></td>
        </tr>
        <tr>
          <td>Failed VUsers</td>
          <td class="mono" style="color:${failedVU > 0 ? '#ef4444' : '#22c55e'}">${failedVU}</td>
          <td class="mono" style="color:var(--text-muted)">0</td>
          <td><span class="pill ${failedVU === 0 ? 'pill-pass' : 'pill-fail'}">${failedVU === 0 ? 'PASS ✓' : 'FAIL ✗'}</span></td>
        </tr>
      </tbody>
    </table>

    <br>
    <h3>📊 Response Time Percentiles</h3>
    <table>
      <thead><tr><th>Percentile</th><th>Time (ms)</th></tr></thead>
      <tbody>
        <tr><td>Min</td><td class="mono" style="color:#22c55e">${rt.min || 0}ms</td></tr>
        <tr><td>Median (p50)</td><td class="mono" style="color:#38bdf8">${rt.median || 0}ms</td></tr>
        <tr><td>Mean</td><td class="mono" style="color:#38bdf8">${rt.mean?.toFixed(1) || 0}ms</td></tr>
        <tr><td>p95</td><td class="mono" style="color:#a78bfa">${rt.p95 || 0}ms</td></tr>
        <tr><td>p99</td><td class="mono" style="color:#f59e0b">${rt.p99 || 0}ms</td></tr>
        <tr><td>Max</td><td class="mono" style="color:#ef4444">${rt.max || 0}ms</td></tr>
      </tbody>
    </table>
  </div>
</div>

<footer>
  Generated by SpaceCMU Artillery Reporter · ${testDate} · Artillery v2.0.30
</footer>

<script>
const labels  = ${JSON.stringify(labels)};
const req     = ${JSON.stringify(reqSeries)};
const p95     = ${JSON.stringify(p95Series)};
const p99     = ${JSON.stringify(p99Series)};
const mean    = ${JSON.stringify(meanSeries)};
const vu      = ${JSON.stringify(vuSeries)};

const chartDefaults = {
  responsive: true,
  animation: false,
  plugins: { legend: { labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8892a4', maxTicksLimit: 10, font: { size: 10 } }, grid: { color: '#2e3148' } },
    y: { ticks: { color: '#8892a4', font: { size: 10 } }, grid: { color: '#2e3148' } }
  }
};

// Requests chart
new Chart(document.getElementById('reqChart'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{ label: 'Requests/5s', data: req, backgroundColor: '#6366f180', borderColor: '#6366f1', borderWidth: 1, borderRadius: 3 }]
  },
  options: chartDefaults
});

// Response time chart
new Chart(document.getElementById('rtChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      { label: 'Mean', data: mean, borderColor: '#38bdf8', backgroundColor: '#38bdf810', tension: 0.3, pointRadius: 0, fill: true },
      { label: 'p95',  data: p95,  borderColor: '#a78bfa', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderDash: [4,2] },
      { label: 'p99',  data: p99,  borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderDash: [2,2] },
    ]
  },
  options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, title: { display: true, text: 'ms', color: '#8892a4' } } } }
});

// VU chart
new Chart(document.getElementById('vuChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [{ label: 'VUsers/5s', data: vu, borderColor: '#22c55e', backgroundColor: '#22c55e20', tension: 0.3, pointRadius: 0, fill: true }]
  },
  options: chartDefaults
});

// Distribution pie
new Chart(document.getElementById('distChart'), {
  type: 'doughnut',
  data: {
    labels: ['200 OK', '201 Created', '4xx Errors', '5xx Errors'],
    datasets: [{ data: [${codes200}, ${codes201}, ${codes4xx}, ${codes5xx}], backgroundColor: ['#22c55e','#38bdf8','#f59e0b','#ef4444'], borderWidth: 0 }]
  },
  options: {
    responsive: true,
    animation: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } }
    },
    cutout: '65%'
  }
});
</script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);
console.log(`✅ Report generated: ${outputFile}`);
