import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';

/**
 * Utility function to fetch text from a URL with http/https support
 */
function fetchText(urlStr: string): Promise<{ status: number; headers: Record<string, string>; text: string }> {
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
          'User-Agent': 'fetch-all-users/1.0',
          'Accept': 'application/json'
        }
      };

      const req = reqFn(opts, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            headers[key] = Array.isArray(value) ? value.join(',') : (value ?? '');
          }
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

/**
 * Main function to fetch all users from the admin endpoint
 */
async function main() {
  // Default to localhost, but allow override via environment variable
  const apiBaseUrl = process.env['API_URL'] || 'http://localhost:4200/api';
  const endpoint = '/admin/users';
  const fullUrl = `${apiBaseUrl.replace(/\/$/, '')}${endpoint}`;

  console.log('='.repeat(60));
  console.log('Fetching all users from database');
  console.log('='.repeat(60));
  console.log(`API URL: ${fullUrl}`);
  console.log('');

  try {
    const response = await fetchText(fullUrl);

    // Check HTTP status
    if (response.status < 200 || response.status >= 300) {
      console.error(`❌ Request failed with status ${response.status}`);
      console.error('Response body preview:', response.text.slice(0, 500));
      process.exit(1);
    }

    // Parse JSON response
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(response.text);
    } catch (e) {
      console.error('❌ Failed to parse JSON response');
      console.error('Response body preview:', response.text.slice(0, 500));
      process.exit(1);
    }

    // Validate response structure
    if (!Array.isArray(parsedData)) {
      console.error('❌ Unexpected response: expected an array');
      console.error('Received:', JSON.stringify(parsedData).slice(0, 500));
      process.exit(1);
    }

    const users = parsedData as Array<{ username: string }>;

    // Display results
    if (users.length === 0) {
      console.log('ℹ️  No users found in the database');
    } else {
      console.log(`✅ Successfully fetched ${users.length} user(s):`);
      console.log('');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username}`);
      });
    }

    console.log('');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Request failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();
