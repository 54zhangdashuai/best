import http from 'http';
import https from 'https';

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

function requestJson(method, urlString, body) {
  const url = new URL(urlString);
  const mod = url.protocol === 'https:' ? https : http;
  const payload = body ? Buffer.from(JSON.stringify(body)) : null;

  const options = {
    method,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    headers: {
      Accept: 'application/json',
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch {}
        resolve({ status: res.statusCode || 0, json, raw });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function pickUnique(ids, count) {
  const copy = ids.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = copy[i];
    copy[i] = copy[j];
    copy[j] = t;
  }
  return copy.slice(0, Math.max(1, Math.min(count, copy.length)));
}

async function main() {
  const origin = normalizeOrigin(process.argv[2] || process.env.TARGET || 'http://172.16.37.201/vote');

  const programsRes = await requestJson('GET', `${origin}/api/programs`);
  if (programsRes.status !== 200) {
    console.error(`GET /api/programs failed: ${programsRes.status}`);
    process.exit(2);
  }

  const programs = programsRes.json?.data?.programs || [];
  const config = programsRes.json?.data?.config || {};
  const limit = Number(config.vote_count_limit || 1);
  const ids = programs.map((p) => Number(p.id)).filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    console.error('no program ids');
    process.exit(2);
  }

  const clientId = `race_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const programIds = pickUnique(ids, limit);
  const payload = { programIds, clientId };

  const [a, b] = await Promise.all([
    requestJson('POST', `${origin}/api/vote`, payload),
    requestJson('POST', `${origin}/api/vote`, payload)
  ]);

  const brief = (r) => ({ status: r.status, code: r.json?.code, message: r.json?.message });
  console.log(JSON.stringify({ origin, programIds, clientId, res1: brief(a), res2: brief(b) }, null, 2));

  const statuses = [a.status, b.status].sort();
  const codes = [a.json?.code, b.json?.code].sort();
  const ok = statuses[0] === 200 && statuses[1] === 403 && codes.includes(0) && codes.includes(1001);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

