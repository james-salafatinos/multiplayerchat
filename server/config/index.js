// server/config/index.js
// Server configuration settings

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  // Server settings
  port: process.env.PORT || 3000,
  
  // Session settings
  session: {
    secret: process.env.SESSION_SECRET || 'vibecode-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000 // 1 day
    },
    dbPath: join(__dirname, '../sessions.db')
  },
  
  // Paths
  paths: {
    public: join(__dirname, '../../public'),
    database: join(__dirname, '../../chat.db')
  }
};

export default config;
