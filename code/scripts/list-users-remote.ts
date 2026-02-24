import fetch from 'node-fetch';

async function main() {
  const api = process.env['REMOTE_API_URL'] || 'https://roomfood-backend.black2.cf/api';
  const token = process.env['ADMIN_TOKEN'] || '';
  const url = `${api.replace(/\/$/, '')}/admin/users`;
  try {
    console.log('Requesting:', url);
    const res = await fetch(url, {
      headers: token ? { 'x-admin-token': token } : undefined,
    });
    if (!res.ok) {
      console.error(`Remote API returned ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.error('Body:', body.slice(0, 2000));
      process.exit(2);
    }

    const parsed = await res.json();
    if (!Array.isArray(parsed)) {
      console.error('Unexpected response shape: expected an array of users. Received:', typeof parsed);
      console.error('Full response (first 2000 chars):', JSON.stringify(parsed).slice(0, 2000));
      process.exit(2);
    }

    const users = parsed as Array<{ username: string }>;
    if (users.length === 0) {
      console.log('No users found on remote');
      return;
    }
    console.log(`Found ${users.length} user(s) on remote:`);
    users.forEach((u) => console.log(`- ${u.username}`));
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(2);
  }
}

main();
