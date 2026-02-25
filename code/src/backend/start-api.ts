// Lightweight wrapper to start the API when running TypeScript directly (e.g. with tsx)
import { startServer } from './api-server';

// Call startServer() to begin listening. This mirrors what the built server does
// and prevents starting the server on import.
startServer();

