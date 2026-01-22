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

const stateByVu = {};

function normalizeOrigin(target) {
  const trimmed = (target || '').trim();
  if (!trimmed) return 'http://127.0.0.1';

  const hasScheme = /^https?:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `http://${trimmed}`;
  const m = withScheme.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  return m ? m[1] : 'http://127.0.0.1';
}

function resolvePagePath(target, explicitPagePath) {
  const fallback = (explicitPagePath || '').trim() || '/vote';
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
    users_300: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 300),
      duration: __ENV.DURATION || '90s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    page_ok: ['rate>0.99'],
    programs_ok: ['rate>0.99'],
    vote_ok: ['rate>0.97'],
    page_latency_ms: ['p(95)<1000'],
    programs_latency_ms: ['p(95)<600'],
    vote_latency_ms: ['p(95)<2000']
  }
};

export function setup() {
  const target = __ENV.TARGET || 'http://172.16.37.201/vote';
  const origin = normalizeOrigin(target);
  const pagePath = resolvePagePath(target, __ENV.PAGE_PATH);

  const programsRes = http.get(`${origin}/api/programs`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'GET /api/programs (setup)' }
  });

  const ok = check(programsRes, {
    'setup programs 200': (r) => r.status === 200
  });

  if (!ok) {
    throw new Error(`setup failed: GET ${origin}/api/programs => ${programsRes.status}`);
  }

  const body = programsRes.json();
  const programs = body?.data?.programs || [];
  const config = body?.data?.config || {};
  const voteLimit = Number(config.vote_count_limit || 1);
  const programIds = programs.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));

  if (programIds.length === 0) {
    throw new Error('setup failed: no program ids');
  }

  return {
    origin,
    pagePath,
    voteLimit,
    programIds
  };
}

export default function (data) {
  const origin = data.origin;
  const pagePath = data.pagePath || '/vote';
  const skipVote = String(__ENV.SKIP_VOTE || '').toLowerCase() === '1' || String(__ENV.SKIP_VOTE || '').toLowerCase() === 'true';
  const vu = __VU;
  const now = Date.now();

  if (!stateByVu[vu]) {
    stateByVu[vu] = {
      startedAt: now,
      pageLoaded: false,
      voteAtSeconds: Math.random() * Number(__ENV.VOTE_WINDOW_SECONDS || 30),
      voted: false,
      clientId: `vu_${String(vu).padStart(4, '0')}_${randomString(8)}_${String(now)}`
    };
  }

  const s = stateByVu[vu];
  const elapsedSeconds = (now - s.startedAt) / 1000;

  if (!s.pageLoaded) {
    const t0 = Date.now();
    const res = http.get(`${origin}${pagePath}`, { tags: { name: `GET ${pagePath}` } });
    pageLatency.add(Date.now() - t0);
    pageOkRate.add(res.status === 200);
    s.pageLoaded = true;
  }

  {
    const t0 = Date.now();
    const res = http.get(`${origin}/api/programs`, {
      headers: { Accept: 'application/json' },
      tags: { name: 'GET /api/programs' }
    });
    programsLatency.add(Date.now() - t0);
    const ok = res.status === 200;
    programsOkRate.add(ok);
  }

  if (!skipVote && !s.voted && elapsedSeconds >= s.voteAtSeconds) {
    voteAttempts.add(1);
    const ids = pickUniqueIds(data.programIds, data.voteLimit);
    const payload = JSON.stringify({ programIds: ids, clientId: s.clientId });
    const t0 = Date.now();
    const res = http.post(`${origin}/api/vote`, payload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      tags: { name: 'POST /api/vote' }
    });
    voteLatency.add(Date.now() - t0);
    const ok = res.status === 200;
    voteOkRate.add(ok);

    if (!ok && (res.status === 403 || res.status === 400)) {
      voteBlockedBusiness.add(1);
    }

    s.voted = true;
  }

  sleep(Number(__ENV.POLL_INTERVAL_SECONDS || 2));
}
