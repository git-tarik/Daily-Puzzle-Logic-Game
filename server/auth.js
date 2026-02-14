import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// -- CONFIG --
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const TRUECALLER_PROFILE_URL = process.env.TRUECALLER_PROFILE_URL || 'https://profile4.truecaller.com/v1/default';
const TRUECALLER_REQUEST_TTL_MS = 10 * 60 * 1000;

// -- GOOGLE AUTH --
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// -- TRUECALLER STATE --
const pendingTruecallerRequests = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [requestId, state] of pendingTruecallerRequests.entries()) {
        if (now - state.timestamp > TRUECALLER_REQUEST_TTL_MS) {
            pendingTruecallerRequests.delete(requestId);
        }
    }
}, 60 * 1000);

const extractPhoneNumber = (profile) => {
    if (!profile) return null;

    if (profile.phoneNumber) {
        return profile.phoneNumber;
    }

    if (Array.isArray(profile.phoneNumbers) && profile.phoneNumbers.length > 0) {
        const first = profile.phoneNumbers[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object') {
            return first.e164Format || first.nationalFormat || first.number || null;
        }
    }

    return null;
};

const extractName = (profile) => {
    if (!profile) return 'Truecaller User';

    if (typeof profile.name === 'string' && profile.name.trim()) {
        return profile.name.trim();
    }

    if (profile.name && typeof profile.name === 'object') {
        const first = profile.name.first || '';
        const last = profile.name.last || '';
        const full = `${first} ${last}`.trim();
        if (full) return full;
    }

    return 'Truecaller User';
};

const upsertTruecallerUser = async (profile) => {
    const phoneNumber = extractPhoneNumber(profile);
    if (!phoneNumber) {
        throw new Error('No phone number returned by Truecaller');
    }

    const name = extractName(profile);

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
    } else {
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: user.name || name,
                authProvider: 'truecaller'
            }
        });
    }

    return user;
};

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
        res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
});

// -- TRUECALLER AUTH --
router.post('/truecaller/callback', async (req, res) => {
    const requestId = req.body.requestId || req.body.requestNonce;
    const accessToken = req.body.accessToken;
    const status = String(req.body.status || '').toLowerCase();

    if (!requestId) {
        return res.status(400).json({ error: 'Missing requestId' });
    }

    if (!accessToken) {
        const rejected = status.includes('reject') || status.includes('deny') || status.includes('cancel');
        pendingTruecallerRequests.set(requestId, {
            status: rejected ? 'rejected' : 'error',
            message: rejected ? 'User cancelled Truecaller sign in.' : 'Missing access token from callback.',
            timestamp: Date.now(),
        });
        return res.json({ ok: true });
    }

    try {
        const profileResponse = await fetch(TRUECALLER_PROFILE_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!profileResponse.ok) {
            pendingTruecallerRequests.set(requestId, {
                status: 'error',
                message: `Truecaller profile API failed (${profileResponse.status})`,
                timestamp: Date.now(),
            });
            return res.json({ ok: true });
        }

        const profile = await profileResponse.json();
        const user = await upsertTruecallerUser(profile);

        pendingTruecallerRequests.set(requestId, {
            status: 'authenticated',
            user,
            timestamp: Date.now(),
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error('Truecaller Callback Error:', e);
        pendingTruecallerRequests.set(requestId, {
            status: 'error',
            message: e.message || 'Truecaller callback failed',
            timestamp: Date.now(),
        });
        return res.json({ ok: true });
    }
});

router.get('/truecaller/status', (req, res) => {
    const requestId = req.query.requestId || req.query.nonce;
    if (!requestId) {
        return res.status(400).json({ error: 'Missing requestId' });
    }

    const state = pendingTruecallerRequests.get(requestId);
    if (!state) {
        return res.json({ status: 'pending' });
    }

    if (state.status === 'authenticated') {
        pendingTruecallerRequests.delete(requestId);
        return res.json({ status: 'authenticated', user: state.user });
    }

    if (state.status === 'rejected') {
        pendingTruecallerRequests.delete(requestId);
        return res.json({ status: 'rejected', message: state.message || 'User cancelled sign in.' });
    }

    if (state.status === 'error') {
        pendingTruecallerRequests.delete(requestId);
        return res.json({ status: 'error', error: state.message || 'Truecaller authentication failed.' });
    }

    return res.json({ status: 'pending' });
});

router.post('/truecaller', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access token' });
        }

        const profileResponse = await fetch(TRUECALLER_PROFILE_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!profileResponse.ok) {
            return res.status(401).json({ error: 'Invalid Truecaller token' });
        }

        const profile = await profileResponse.json();
        const user = await upsertTruecallerUser(profile);
        return res.json(user);
    } catch (e) {
        console.error('Truecaller Auth Error:', e);
        return res.status(500).json({ error: e.message || 'Truecaller authentication failed' });
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
                    { email: username }
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

export default router;
