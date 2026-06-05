import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    // Load env variables
    const env = loadEnv(mode, process.cwd(), '');
    
    // Set for node process (dev API server uses this)
    process.env.FIREBASE_SERVICE_ACCOUNT = env.FIREBASE_SERVICE_ACCOUNT;

    return {
        plugins: [
            react(),
            {
                name: 'api-server',
                configureServer(server) {
                    server.middlewares.use(async (req, res, next) => {
                        if (req.url && req.url.startsWith('/api/change-password')) {
                            let body = '';
                            req.on('data', chunk => { body += chunk; });
                            req.on('end', async () => {
                                try {
                                    const parsedBody = body ? JSON.parse(body) : {};
                                    req.body = parsedBody;
                                    
                                    const { default: handler } = await import('./api/change-password.js');
                                    
                                    res.status = (code) => {
                                        res.statusCode = code;
                                        return res;
                                    };
                                    res.json = (data) => {
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify(data));
                                        return res;
                                    };
                                    
                                    await handler(req, res);
                                } catch (error) {
                                    console.error('Error in dev server API:', error);
                                    res.statusCode = 500;
                                    res.end(JSON.stringify({ error: error.message }));
                                }
                            });
                            return;
                        }
                        next();
                    });
                }
            }
        ],
    };
});

