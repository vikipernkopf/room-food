export const JWT_SECRET = process.env['JWT_SECRET'] ?? 'fallback_secret_change_me';

const isProduction = process.env['NODE_ENV'] === 'production';

export const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: isProduction,
	// Cross-site frontend/backend deployments require SameSite=None for XHR/fetch with credentials.
	sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
	maxAge: 7 * 24 * 60 * 60 * 1000
};
