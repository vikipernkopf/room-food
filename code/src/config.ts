export const JWT_SECRET = process.env['JWT_SECRET'] ?? 'fallback_secret';

const isProduction = process.env['NODE_ENV'] === 'production';

export const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: isProduction,
	sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
	partitioned: isProduction, // Add this line to bypass third-party cookie blocking
	maxAge: 7 * 24 * 60 * 60 * 1000
};
