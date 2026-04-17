export const JWT_SECRET = process.env['JWT_SECRET'] ?? 'fallback_secret_change_me';
export const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env['NODE_ENV'] === 'production',
	sameSite: 'lax' as const,
	maxAge: 7 * 24 * 60 * 60 * 1000
};
