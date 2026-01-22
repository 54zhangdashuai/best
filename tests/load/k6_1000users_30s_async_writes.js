import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Rate, Trend, Counter } from 'k6/metrics';

const pageOkRate = new Rate('page_ok');
const configOkRate = new Rate('config_ok');
const voteOkRate = new Rate('vote_ok');

const configLatency = new Trend('config_latency_ms');
const voteLatency = new Trend('vote_latency_ms');

const config200 = new Counter('config_200');
const config4xx = new Counter('config_4xx');
const config5xx = new Counter('config_5xx');
const config0 = new Counter('config_0');

const voteAttempts = new Counter('vote_attempts');
const vote200 = new Counter('vote_200');
const vote4xx = new Counter('vote_4xx');
const vote5xx = new Counter('vote_5xx');
const vote0 = new Counter('vote_0');

function normalizeOrigin(target) {
  const trimmed = (target || '').trim();
  if (!trimmed) return 'http://127.0.0.1';
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `http://${trimmed}`;
  const m = withScheme.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  return m ? m[1] : 'http://127.0.0.1';
}

function randomString(len) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function pickUniqueIds(ids, count) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (count <= 1) return [ids[Math.floor(Math.random() * ids.length)]];
  const copy = ids.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

const TOTAL_USERS = Number(__ENV.TOTAL_USERS || 1000);
const WINDOW_SECONDS = Number(__ENV.WINDOW_SECONDS || 30);
const CONFIG_POLL_INTERVAL_SECONDS = Number(__ENV.CONFIG_POLL_INTERVAL_SECONDS || 1);
const SCREEN_VUS = Number(__ENV.SCREEN_VUS || 1);
const SCREEN_POLL_INTERVAL_SECONDS = Number(__ENV.SCREEN_POLL_INTERVAL_SECONDS || 2);

export const options = {
  scenarios: {
    screen_leaderboard: {
      executor: 'constant-vus',
      vus: SCREEN_VUS,
      duration: `${WINDOW_SECONDS + 10}s`,
      exec: 'screen'
    },
    async_voters_1000_in_30s: {
      executor: 'per-vu-iterations',
      vus: TOTAL_USERS,
      iterations: 1,
      maxDuration: `${WINDOW_SECONDS + 15}s`,
      exec: 'voter'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    config_ok: ['rate>0.99'],
    vote_ok: ['rate>0.99'],
    config_latency_ms: ['p(95)<200'],
    vote_latency_ms: ['p(95)<2000']
  }
};

export function setup() {
  const target = __ENV.TARGET || 'http://127.0.0.1';
  const origin = normalizeOrigin(target);

  const res = http.get(`${origin}/api/programs`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /api/programs (setup)' }
  });
  const ok = check(res, { 'setup programs 200': (r) => r.status === 200 });
  if (!ok) throw new Error(`setup failed: GET ${origin}/api/programs => ${res.status}`);

  const body = res.json();
  const programs = body?.data?.programs || [];
  const config = body?.data?.config || {};
  const voteLimit = Number(config.vote_count_limit || 1);
  const programIds = programs.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
  if (!programIds.length) throw new Error('setup failed: no program ids');

  return { origin, voteLimit, programIds };
}

const screenStateByVu = {};
export function screen(data) {
  const origin = data.origin;
  const vu = __VU;

  if (!screenStateByVu[vu]) {
    screenStateByVu[vu] = { pageLoaded: false };
  }

  const s = screenStateByVu[vu];
  if (!s.pageLoaded) {
    const res = http.get(`${origin}/leaderboard`, { tags: { name: 'GET /leaderboard' } });
    pageOkRate.add(res.status === 200);
    s.pageLoaded = true;
  }

  http.get(`${origin}/api/programs`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /api/programs (screen)' }
  });

  sleep(SCREEN_POLL_INTERVAL_SECONDS);
}

export function voter(data) {
  const origin = data.origin;
  const ids = pickUniqueIds(data.programIds, data.voteLimit);

  const jitterSeconds = Math.random() * WINDOW_SECONDS;
  const firstPollAt = Date.now();

  const pageRes = http.get(`${origin}/vote`, { tags: { name: 'GET /vote' } });
  pageOkRate.add(pageRes.status === 200);

  while (Date.now() - firstPollAt < jitterSeconds * 1000) {
    const t0 = Date.now();
    const res = http.get(`${origin}/api/config`, {
      headers: { Accept: 'application/json' },
      tags: { name: 'GET /api/config' }
    });
    configLatency.add(Date.now() - t0);
    configOkRate.add(res.status === 200);
    if (res.status === 200) config200.add(1);
    else if (res.status === 0) config0.add(1);
    else if (res.status >= 500) config5xx.add(1);
    else config4xx.add(1);
    sleep(CONFIG_POLL_INTERVAL_SECONDS);
  }

  const clientId = `async_${String(__VU).padStart(4, '0')}_${randomString(10)}_${String(Date.now())}`;
  const payload = JSON.stringify({ programIds: ids, clientId });

  voteAttempts.add(1);
  const t0 = Date.now();
  const res = http.post(`${origin}/api/vote`, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'POST /api/vote (async)' }
  });
  voteLatency.add(Date.now() - t0);
  voteOkRate.add(res.status === 200);
  if (res.status === 200) vote200.add(1);
  else if (res.status === 0) vote0.add(1);
  else if (res.status >= 500) vote5xx.add(1);
  else vote4xx.add(1);
}
