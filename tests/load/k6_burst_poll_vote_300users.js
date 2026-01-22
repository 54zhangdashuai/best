import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const pageOkRate = new Rate('page_ok');
const programsOkRate = new Rate('programs_ok');
const voteOkRate = new Rate('vote_ok');

const pageLatency = new Trend('page_latency_ms');
const programsLatency = new Trend('programs_latency_ms');
const voteLatency = new Trend('vote_latency_ms');

const voteAttempts = new Counter('vote_attempts');
const voteBlockedBusiness = new Counter('vote_blocked_business');

const programs200 = new Counter('programs_200');
const programs4xx = new Counter('programs_4xx');
const programs5xx = new Counter('programs_5xx');
const programs0 = new Counter('programs_0');

const vote200 = new Counter('vote_200');
const vote4xx = new Counter('vote_4xx');
const vote5xx = new Counter('vote_5xx');
const vote0 = new Counter('vote_0');

const stateByVu = {};

function normalizeOrigin(target) {
  const trimmed = (target || '').trim();
  if (!trimmed) return 'http://127.0.0.1';
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `http://${trimmed}`;
  const m = withScheme.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  return m ? m[1] : 'http://127.0.0.1';
}

function resolvePagePath(target, explicitPagePath, fallbackPath) {
  const fallback = (explicitPagePath || '').trim() || fallbackPath;
  const trimmed = (target || '').trim();
  if (!trimmed) return fallback;
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `http://${trimmed}`;
  const m = withScheme.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  const path = m && m[2] ? m[2] : '/';
  return path !== '/' ? path : fallback;
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

export const options = {
  scenarios: {
    pollers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP_UP || '10s', target: Number(__ENV.POLL_VUS || __ENV.VUS || 300) },
        { duration: __ENV.SOAK || '60s', target: Number(__ENV.POLL_VUS || __ENV.VUS || 300) },
        { duration: __ENV.RAMP_DOWN || '5s', target: 0 }
      ],
      gracefulRampDown: '0s',
      exec: 'poller'
    },
    vote_burst: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VOTE_VUS || __ENV.VUS || 300),
      iterations: 1,
      maxDuration: __ENV.VOTE_MAX_DURATION || '15s',
      startTime: __ENV.VOTE_START_TIME || '15s',
      exec: 'voter'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    programs_ok: ['rate>0.99'],
    vote_ok: ['rate>0.95'],
    programs_latency_ms: ['p(95)<600'],
    vote_latency_ms: ['p(95)<2000']
  }
};

export function setup() {
  const target = __ENV.TARGET || 'http://172.16.37.201/leaderboard';
  const origin = normalizeOrigin(target);
  const pagePath = resolvePagePath(target, __ENV.PAGE_PATH, '/leaderboard');

  const programsRes = http.get(`${origin}/api/programs`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /api/programs (setup)' }
  });

  const ok = check(programsRes, { 'setup programs 200': (r) => r.status === 200 });
  if (!ok) {
    throw new Error(`setup failed: GET ${origin}/api/programs => ${programsRes.status}`);
  }

  const body = programsRes.json();
  const programs = body?.data?.programs || [];
  const config = body?.data?.config || {};
  const voteLimit = Number(config.vote_count_limit || 1);
  const programIds = programs.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
  if (!programIds.length) throw new Error('setup failed: no program ids');

  return { origin, pagePath, voteLimit, programIds };
}

export function poller(data) {
  const origin = data.origin;
  const pagePath = data.pagePath || '/leaderboard';
  const pollIntervalSeconds = Number(__ENV.POLL_INTERVAL_SECONDS || 0.5);
  const vu = __VU;
  const now = Date.now();

  if (!stateByVu[vu]) {
    stateByVu[vu] = { startedAt: now, pageLoaded: false };
  }

  const s = stateByVu[vu];
  if (!s.pageLoaded) {
    const t0 = Date.now();
    const res = http.get(`${origin}${pagePath}`, { tags: { name: `GET ${pagePath}` } });
    pageLatency.add(Date.now() - t0);
    pageOkRate.add(res.status === 200);
    s.pageLoaded = true;
  }

  const t0 = Date.now();
  const res = http.get(`${origin}/api/programs`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /api/programs' }
  });
  programsLatency.add(Date.now() - t0);
  programsOkRate.add(res.status === 200);
  if (res.status === 200) programs200.add(1);
  else if (res.status === 0) programs0.add(1);
  else if (res.status >= 500) programs5xx.add(1);
  else programs4xx.add(1);

  sleep(pollIntervalSeconds);
}

export function voter(data) {
  const origin = data.origin;
  const voteLimit = data.voteLimit;
  const ids = pickUniqueIds(data.programIds, voteLimit);

  const clientId = `burst_${String(__VU).padStart(4, '0')}_${randomString(10)}_${String(Date.now())}`;
  const payload = JSON.stringify({ programIds: ids, clientId });

  voteAttempts.add(1);
  const t0 = Date.now();
  const res = http.post(`${origin}/api/vote`, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'POST /api/vote (burst)' }
  });
  voteLatency.add(Date.now() - t0);
  voteOkRate.add(res.status === 200);

  if (res.status === 200) vote200.add(1);
  else if (res.status === 0) vote0.add(1);
  else if (res.status >= 500) vote5xx.add(1);
  else vote4xx.add(1);

  if (res.status === 403 || res.status === 400) voteBlockedBusiness.add(1);
}

