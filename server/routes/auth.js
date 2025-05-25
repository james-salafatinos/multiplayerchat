// server/routes/auth.js
// Authentication routes

import express from 'express';
import bcrypt from 'bcryptjs';
import { statements } from '../db/index.js';

const router = express.Router();

// Track active sessions: { userId: { sessionId, lastActivity } }
const activeSessions = new Map();

// Helper to check if user is already logged in elsewhere
function isUserLoggedIn(userId) {
    if (!activeSessions.has(userId)) return false;
    
    // Check if the session is still active (within last 2 minutes)
    const session = activeSessions.get(userId);
    const now = Date.now();
    const sessionAge = now - session.lastActivity;
    
    // If session is older than 2 minutes, consider it inactive
    if (sessionAge > 2 * 60 * 1000) {
        activeSessions.delete(userId);
        return false;
    }
    
    return true;
}

// Helper to end a user's session
function endUserSession(userId) {
    if (activeSessions.has(userId)) {
        const session = activeSessions.get(userId);
        activeSessions.delete(userId);
        return session.sessionId;
    }
    return null;
}

// Helper to update session activity
function updateSessionActivity(userId, sessionId) {
    if (activeSessions.has(userId)) {
        const session = activeSessions.get(userId);
        if (session.sessionId === sessionId) {
            session.lastActivity = Date.now();
            activeSessions.set(userId, session);
            return true;
        }
    }
    return false;
}

// Export for socket.io to use
export { isUserLoggedIn, endUserSession, updateSessionActivity, activeSessions };

// User signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    const existingUser = statements.getUserByUsername.get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const result = statements.createUser.run(username, hashedPassword);
    
    // Return success
    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if user exists
    const user = statements.getUserByUsername.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is already logged in elsewhere
    if (isUserLoggedIn(user.id)) {
      // Don't allow multiple logins - return error
      return res.status(403).json({
        error: 'Account already in use',
        message: 'This account is currently logged in on another device or browser. Please log out from there first.'
      });
    }
    
    // Track this session with timestamp
    activeSessions.set(user.id, {
      sessionId: req.sessionID,
      lastActivity: Date.now()
    });
    
    // Update last login time
    statements.updateLastLogin.run(user.id);
    
    // Set user in session
    req.session.user = {
      id: user.id,
      username: user.username
    };
    
    // Return success with user info
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session.user) {
    // Verify this session is still the active one for this user
    const userId = req.session.user.id;
    
    // First check if user has any active session
    if (!activeSessions.has(userId)) {
      // No active session found
      req.session.destroy();
      return res.json({
        authenticated: false,
        sessionEnded: true,
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    // Get the active session
    const session = activeSessions.get(userId);
    
    // Check if this is the active session
    if (session.sessionId !== req.sessionID) {
      // This session is not the active one
      req.session.destroy();
      return res.json({
        authenticated: false,
        sessionEnded: true,
        message: 'This session has been terminated because you logged in from another location.'
      });
    }
    
    // Update the session activity timestamp
    session.lastActivity = Date.now();
    activeSessions.set(userId, session);
    
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

// User logout
router.post('/logout', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;
    
    // Only remove the session if it's the active one
    if (activeSessions.has(userId)) {
      const session = activeSessions.get(userId);
      if (session.sessionId === req.sessionID) {
        activeSessions.delete(userId);
        console.log(`User ${userId} logged out and session removed`);
      }
    }
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ success: true });
  });
});

export default router;
