import { performance } from 'node:perf_hooks';

function normalizeOrigin(target) {
  const trimmed = String(target || '').trim();
  if (!trimmed) return 'http://127.0.0.1:3000';
  try {
    const u = new URL(trimmed);
    return u.origin;
  } catch {
    const hasScheme = /^https?:\/\//i.test(trimmed);
    const withScheme = hasScheme ? trimmed : `http://${trimmed}`;
    const u = new URL(withScheme);
    return u.origin;
  }
}

function resolvePagePath(target, explicitPagePath) {
  const fallback = String(explicitPagePath || '').trim() || '/vote';
  const trimmed = String(target || '').trim();
  if (!trimmed) return fallback;
  try {
    const u = new URL(trimmed);
    return u.pathname && u.pathname !== '/' ? u.pathname : fallback;
  } catch {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomString(len) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function pickUniqueIds(ids, count) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const need = Math.max(1, Math.min(count, ids.length));
  const copy = ids.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = copy[i];
    copy[i] = copy[j];
    copy[j] = t;
  }
  return copy.slice(0, need);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function createMetrics() {
  return {
    count: 0,
    ok: 0,
    statuses: new Map(),
    latenciesMs: []
  };
}

function record(metrics, status, latencyMs) {
  metrics.count += 1;
  if (status >= 200 && status < 300) metrics.ok += 1;
  metrics.statuses.set(status, (metrics.statuses.get(status) || 0) + 1);
  metrics.latenciesMs.push(latencyMs);
}

async function timedFetch(url, init) {
  const t0 = performance.now();
  const res = await fetch(url, init);
  const t1 = performance.now();
  return { res, latencyMs: t1 - t0 };
}

async function main() {
  const target = process.argv[2] || process.env.TARGET || 'http://172.16.37.201/vote';
  const origin = normalizeOrigin(target);
  const pagePath = resolvePagePath(target, process.env.PAGE_PATH);
  const skipVote = String(process.env.SKIP_VOTE || '').toLowerCase() === '1' || String(process.env.SKIP_VOTE || '').toLowerCase() === 'true';
  const users = Number(process.env.USERS || 300);
  const durationSec = Number(process.env.DURATION_SECONDS || 90);
  const pollIntervalSec = Number(process.env.POLL_INTERVAL_SECONDS || 2);
  const voteWindowSec = Number(process.env.VOTE_WINDOW_SECONDS || 30);

  const setupRes = await fetch(`${origin}/api/programs`, { headers: { Accept: 'application/json' } });
  if (!setupRes.ok) {
    console.error(`setup failed: GET ${origin}/api/programs => ${setupRes.status}`);
    process.exit(2);
  }
  const setupJson = await setupRes.json();
  const programs = setupJson?.data?.programs || [];
  const config = setupJson?.data?.config || {};
  const voteLimit = Number(config.vote_count_limit || 1);
  const programIds = programs.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
  if (!programIds.length) {
    console.error('setup failed: no program ids');
    process.exit(2);
  }

  const mVote = createMetrics();
  const mPrograms = createMetrics();
  const mPage = createMetrics();

  const startedAt = Date.now();
  const endAt = startedAt + durationSec * 1000;

  const workers = Array.from({ length: users }, (_, idx) => {
    const vu = idx + 1;
    const clientId = `node_vu_${String(vu).padStart(4, '0')}_${randomString(8)}_${startedAt}`;
    const voteAt = startedAt + Math.random() * voteWindowSec * 1000;
    let pageLoaded = false;
    let voted = false;

    return (async () => {
      while (Date.now() < endAt) {
        if (!pageLoaded) {
          try {
            const { res, latencyMs } = await timedFetch(`${origin}${pagePath}`, { method: 'GET' });
            record(mPage, res.status, latencyMs);
          } catch {
            record(mPage, 0, 0);
          }
          pageLoaded = true;
        }

        try {
          const { res, latencyMs } = await timedFetch(`${origin}/api/programs`, {
            method: 'GET',
            headers: { Accept: 'application/json' }
          });
          record(mPrograms, res.status, latencyMs);
        } catch {
          record(mPrograms, 0, 0);
        }

        if (!skipVote && !voted && Date.now() >= voteAt) {
          const ids = pickUniqueIds(programIds, voteLimit);
          const body = JSON.stringify({ programIds: ids, clientId });
          try {
            const { res, latencyMs } = await timedFetch(`${origin}/api/vote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body
            });
            record(mVote, res.status, latencyMs);
          } catch {
            record(mVote, 0, 0);
          }
          voted = true;
        }

        await sleep(pollIntervalSec * 1000);
      }
    })();
  });

  await Promise.allSettled(workers);

  const summarize = (name, m) => {
    const lats = m.latenciesMs.slice().sort((a, b) => a - b);
    const okRate = m.count ? (m.ok / m.count) * 100 : 0;
    const p50 = percentile(lats, 50);
    const p95 = percentile(lats, 95);
    const p99 = percentile(lats, 99);
    const statuses = Array.from(m.statuses.entries()).sort((a, b) => b[1] - a[1]);
    const topStatuses = statuses.slice(0, 8).map(([s, c]) => `${s}:${c}`).join(' ');
    return { name, requests: m.count, okRate: okRate.toFixed(2) + '%', p50ms: p50.toFixed(1), p95ms: p95.toFixed(1), p99ms: p99.toFixed(1), statuses: topStatuses };
  };

  const report = [
    summarize(`GET ${pagePath}`, mPage),
    summarize('GET /api/programs', mPrograms),
    summarize('POST /api/vote', mVote)
  ];

  console.log(JSON.stringify({ origin, pagePath, users, durationSec, pollIntervalSec, voteWindowSec, voteLimit, report }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
