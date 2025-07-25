// Authentication routes - migrated from spotify-custom-recommendations/src/index.js
// Contains /auth/login, /auth/callback, /logout routes

import authRouter, { clearTokens } from '../auth.js';
import { Request, Response } from 'express';

// Add logout route to the auth router
authRouter.get('/logout', async (req: Request, res: Response) => {
  try {
    await clearTokens(req, res);
    res.send(`
      <html>
        <head>
          <title>Logged Out</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
            .action-btn { 
              display: inline-block; 
              background: #1db954; 
              color: white; 
              text-decoration: none; 
              padding: 12px 24px; 
              margin: 10px; 
              border-radius: 25px; 
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>🔓 Logged out successfully!</h1>
            <p>Your session has been cleared.</p>
            <a href="/" class="action-btn">🏠 Go back to home</a>
          </div>
          <script>
            // Auto redirect after 3 seconds
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error during logout:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error during logout</h2>
          <p>${error.message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to Homepage</a>
        </body>
      </html>
    `);
  }
});

export default authRouter;