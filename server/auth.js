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
// Docs: https://docs.truecaller.com/truecaller-sdk/android/server-side-response-validation
// For Web SDK, we usually validate the payload signature or call their verify endpoint if available.
// However, standard flow for Web is often: Frontend gets `accessToken` -> Backend calls Profile Endpoint.

router.post('/truecaller', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

        // Verify with Truecaller API
        // Endpoint for fetching profile using accessToken
        const tcUrl = 'https://profile4.truecaller.com/v1/default';

        const response = await fetch(tcUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
                // Note: Some flows might require App Key in headers too?
                // Usually Bearer token is enough for implicit flow.
            }
        });

        if (!response.ok) {
            throw new Error(`Truecaller API error: ${response.status}`);
        }

        const data = await response.json();
        const phoneNumber = data.phoneNumber; // e.g. +919999999999
        const name = data.name ? `${data.name.first} ${data.name.last}` : 'Truecaller User';

        if (!phoneNumber) {
            return res.status(400).json({ error: 'No phone number in Truecaller profile' });
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

        res.json(user);

    } catch (e) {
        console.error('Truecaller Auth Error:', e);
        res.status(401).json({ error: 'Invalid Truecaller token' });
    }
});

// -- GUEST / STUB HANDLER (Optional, if we want backend to track them too) --
// But currently guest logic is purely local + eventual sync.

export default router;
