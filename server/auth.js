import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// -- CONFIG --
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const TRUECALLER_PARTNER_KEY = process.env.TRUECALLER_PARTNER_KEY; // Backend only

// -- GOOGLE AUTH --
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Missing credential' });

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        // Find or Create User
        let user = await prisma.user.findUnique({
            where: { googleId }
        });

        if (!user && email) {
            // Try matching by email if googleId not found (linking accounts)
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                // Link Google ID to existing email user
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId, authProvider: 'google', name: name || user.name }
                });
            }
        }

        if (!user) {
            user = await prisma.user.create({
                data: {
                    googleId,
                    email,
                    name,
                    authProvider: 'google'
                }
            });
        }

        res.json(user);
    } catch (e) {
        console.error('Google Auth Error:', e);
        // Return 500 if internal, 401 if auth failed? 
        // If verifyIdToken throws, it's usually 401/400.
        // If Prisma throws, it's 500.
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
});

// -- CREDENTIALS AUTH --

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username } // Allow login with email as username? For now strict username.
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                authProvider: 'credentials',
                name: username
            }
        });

        // Don't return password hash
        const { passwordHash: _, ...userSafe } = user;
        res.json(userSafe);

    } catch (e) {
        console.error('Register Error:', e);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const user = await prisma.user.findFirst({
            where: { username }
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { passwordHash: _, ...userSafe } = user;
        res.json(userSafe);

    } catch (e) {
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Login failed' });
    }
});

// -- TRUECALLER AUTH --
// In-memory store for pending auth requests (nonce -> user/status)
// In production, use Redis or DB
const pendingAuthRequests = new Map();

// Cleanup old requests periodically
setInterval(() => {
    const now = Date.now();
    for (const [nonce, data] of pendingAuthRequests.entries()) {
        if (now - data.timestamp > 5 * 60 * 1000) { // 5 mins expiration
            pendingAuthRequests.delete(nonce);
        }
    }
}, 60 * 1000);

router.post('/truecaller/callback', async (req, res) => {
    try {
        console.log('Truecaller Callback Received:', req.body);
        const { requestId, accessToken, endpoint } = req.body;

        // requestId is likely the nonce we sent? 
        // Truecaller docs say requestId is unique for the transaction.
        // If we used `requestNonce` in deep link, it should come back.

        if (!accessToken) {
            console.error("Missing accessToken in callback");
            return res.status(400).json({ error: 'Missing accessToken' });
        }

        // Verify with Truecaller API
        const tcUrl = 'https://profile4.truecaller.com/v1/default';
        const response = await fetch(tcUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error(`Truecaller API error: ${response.status}`);
            return res.status(401).json({ error: 'Invalid Truecaller token' });
        }

        const data = await response.json();
        const phoneNumber = data.phoneNumber;
        const name = data.name ? `${data.name.first} ${data.name.last}` : 'Truecaller User';

        if (!phoneNumber) {
            return res.status(400).json({ error: 'No phone number' });
        }

        // Find or Create User
        let user = await prisma.user.findUnique({
            where: { phoneNumber }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phoneNumber,
                    name,
                    authProvider: 'truecaller'
                }
            });
        }

        // Store success for polling
        // We use requestId from body as key. Frontend must know this requestId?
        // Wait, if we generated nonce on frontend, does Truecaller send it back as requestId?
        // Usually yes, or as `requestNonce`. Let's check body for both.
        const key = req.body.requestNonce || requestId;

        if (key) {
            pendingAuthRequests.set(key, {
                status: 'authenticated',
                user,
                timestamp: Date.now()
            });
        }

        res.status(200).json({ message: 'Callback processed' });

    } catch (e) {
        console.error('Truecaller Callback Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/truecaller/status', (req, res) => {
    const { nonce } = req.query;
    if (!nonce) return res.status(400).json({ error: 'Missing nonce' });

    const data = pendingAuthRequests.get(nonce);
    if (data && data.status === 'authenticated') {
        const { user } = data;
        pendingAuthRequests.delete(nonce); // Consume once
        return res.json({ status: 'authenticated', user });
    }

    res.json({ status: 'pending' });
});

// Direct token Verification (Keep for legacy/direct flow if applicable)
router.post('/truecaller', async (req, res) => {
    // ... existing implementation for direct token if frontend gets it ...
    // For now, let's keep it as is or redirect to use common logic?
    // User might still send accessToken directly if they get it.
    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

        // Verify with Truecaller API
        const tcUrl = 'https://profile4.truecaller.com/v1/default';
        const response = await fetch(tcUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error(`Truecaller API error: ${response.status}`);

        const data = await response.json();
        const phoneNumber = data.phoneNumber;
        const name = data.name ? `${data.name.first} ${data.name.last}` : 'Truecaller User';

        let user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) {
            user = await prisma.user.create({
                data: { phoneNumber, name, authProvider: 'truecaller' }
            });
        }
        res.json(user);
    } catch (e) {
        console.error('Truecaller Auth Error:', e);
        res.status(401).json({ error: 'Invalid Truecaller token' });
    }
});

// -- GUEST / STUB HANDLER (Optional, if we want backend to track them too) --
// But currently guest logic is purely local + eventual sync.

export default router;
