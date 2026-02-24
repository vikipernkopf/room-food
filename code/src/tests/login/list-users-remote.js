const { request: httpRequest } = require('http');
const { request: httpsRequest } = require('https');
const { URL } = require('url');

function fetchText(urlStr) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const reqFn = isHttps ? httpsRequest : httpRequest;
      const opts = {
        method: 'GET',
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          'User-Agent': 'list-users-remote/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      };

      const req = reqFn(opts, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const headers = {};
          Object.entries(res.headers).forEach(([k, v]) => { headers[k] = Array.isArray(v) ? v.join(',') : (v || ''); });
          resolve({ status: res.statusCode || 0, headers, text });
        });
      });
      req.on('error', (err) => reject(err));
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const api = process.env['REMOTE_API_URL'] || 'https://roomfood-backend.black2.cf/api';
  const url = `${api.replace(/\/$/, '')}/admin/users`;
  console.log('Requesting:', url);
  try {
    const res = await fetchText(url);
    if (res.status < 200 || res.status >= 300) {
      console.error(`Remote API returned ${res.status}`);
      const bodyPreview = res.text.slice(0, 2000);
      console.error('Body preview:', bodyPreview);
      process.exit(2);
    }

    let parsed;
    try {
      parsed = JSON.parse(res.text);
    } catch (e) {
      console.error('Failed parsing JSON. Response body preview (first 2000 chars):');
      console.error(res.text.slice(0, 2000));
      process.exit(2);
    }

    if (!Array.isArray(parsed)) {
      console.error('Unexpected response shape: expected an array of users.');
      console.error('Response JSON preview:', JSON.stringify(parsed).slice(0, 2000));
      process.exit(2);
    }

    const users = parsed;
    if (users.length === 0) {
      console.log('No users found on remote');
      return;
    }
    console.log(`Found ${users.length} user(s) on remote:`);
    users.forEach((u) => console.log(`- ${u.username}`));
  } catch (e) {
    console.error('Request failed:', e && e.message ? e.message : String(e));
    process.exit(2);
  }
}

main();

