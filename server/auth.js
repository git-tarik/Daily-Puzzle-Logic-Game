import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// -- CONFIG --
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
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

    const normalizePhone = (value) => {
        if (value === null || value === undefined) return null;
        const asText = String(value);
        if (!asText.trim()) return null;
        const cleaned = asText.replace(/[^\d+]/g, '');
        return cleaned || null;
    };

    const fromObject = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        const direct =
            obj.e164Format ||
            obj.internationalNumber ||
            obj.nationalFormat ||
            obj.number ||
            obj.value ||
            obj.id ||
            obj.phoneNumber ||
            obj.phone;

        const normalizedDirect = normalizePhone(direct);
        if (normalizedDirect) return normalizedDirect;

        // Some payloads provide country code + national number separately.
        const cc = String(obj.countryCode || obj.country_calling_code || '').replace(/[^\d]/g, '');
        const nn = String(obj.nationalNumber || obj.national_number || obj.localNumber || '').replace(/[^\d]/g, '');
        if (cc && nn) return `+${cc}${nn}`;

        return null;
    };

    if (profile.phoneNumber) {
        return normalizePhone(profile.phoneNumber);
    }

    if (Array.isArray(profile.phoneNumbers) && profile.phoneNumbers.length > 0) {
        for (const item of profile.phoneNumbers) {
            if (typeof item === 'string') {
                const normalized = normalizePhone(item);
                if (normalized) return normalized;
            }
            if (typeof item === 'number' || typeof item === 'bigint') {
                const normalized = normalizePhone(item);
                if (normalized) return normalized;
            }
            const parsed = fromObject(item);
            if (parsed) return parsed;
        }
    }

    if (profile.defaultNumber) {
        return normalizePhone(profile.defaultNumber);
    }

    if (Array.isArray(profile.phones) && profile.phones.length > 0) {
        for (const item of profile.phones) {
            if (typeof item === 'string') {
                const normalized = normalizePhone(item);
                if (normalized) return normalized;
            }
            if (typeof item === 'number' || typeof item === 'bigint') {
                const normalized = normalizePhone(item);
                if (normalized) return normalized;
            }
            const parsed = fromObject(item);
            if (parsed) return parsed;
        }
    }

    if (profile.mobile) {
        return normalizePhone(profile.mobile);
    }

    if (profile.primaryPhoneNumber) {
        return normalizePhone(profile.primaryPhoneNumber);
    }

    // Some payloads include phone identity inside onlineIdentities.
    if (Array.isArray(profile.onlineIdentities)) {
        for (const identity of profile.onlineIdentities) {
            if (!identity || typeof identity !== 'object') continue;
            const type = String(identity.type || identity.identityType || '').toLowerCase();
            if (!type.includes('phone') && !type.includes('mobile')) continue;
            const parsed = fromObject(identity);
            if (parsed) return parsed;
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

const extractAccessToken = (body) => {
    if (!body || typeof body !== 'object') return null;

    if (typeof body.accessToken === 'string' && body.accessToken.trim()) {
        return body.accessToken.trim();
    }

    if (typeof body.access_token === 'string' && body.access_token.trim()) {
        return body.access_token.trim();
    }

    if (typeof body.token === 'string' && body.token.trim()) {
        return body.token.trim();
    }

    if (body.accessToken && typeof body.accessToken === 'object') {
        const nested = body.accessToken;
        if (typeof nested.token === 'string' && nested.token.trim()) return nested.token.trim();
        if (typeof nested.accessToken === 'string' && nested.accessToken.trim()) return nested.accessToken.trim();
        if (typeof nested.value === 'string' && nested.value.trim()) return nested.value.trim();
    }

    return null;
};

const upsertTruecallerUser = async (profile) => {
    const phoneNumber = extractPhoneNumber(profile);
    if (!phoneNumber) {
        if (profile && typeof profile === 'object') {
            const phoneArrayShape = Array.isArray(profile.phoneNumbers)
                ? profile.phoneNumbers.map((entry) => (entry && typeof entry === 'object' ? Object.keys(entry) : typeof entry))
                : null;
            const onlineIdentitiesShape = Array.isArray(profile.onlineIdentities)
                ? profile.onlineIdentities.map((entry) => (entry && typeof entry === 'object' ? Object.keys(entry) : typeof entry))
                : null;
            console.warn('Truecaller phone parsing failed', {
                hasPhoneNumbers: Array.isArray(profile.phoneNumbers),
                phoneNumbersShape: phoneArrayShape,
                hasOnlineIdentities: Array.isArray(profile.onlineIdentities),
                onlineIdentitiesShape
            });
        }
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
    const accessToken = extractAccessToken(req.body);
    const status = String(req.body.status || '').toLowerCase();
    const callbackProfileEndpoint = req.body.endpoint;

    if (!requestId) {
        return res.status(400).json({ error: 'Missing requestId' });
    }

    if (!accessToken) {
        const rejected = status.includes('reject') || status.includes('deny') || status.includes('cancel');
        pendingTruecallerRequests.set(requestId, {
            status: rejected ? 'rejected' : 'pending',
            message: rejected ? 'User cancelled Truecaller sign in.' : 'Waiting for token from Truecaller callback.',
            timestamp: Date.now(),
        });
        console.warn('Truecaller callback without usable access token', {
            requestId,
            status,
            hasAccessTokenKey: Object.prototype.hasOwnProperty.call(req.body || {}, 'accessToken'),
            hasAccessTokenSnake: Object.prototype.hasOwnProperty.call(req.body || {}, 'access_token')
        });
        return res.json({ ok: true });
    }

    try {
        // Truecaller callback sends region-specific profile endpoint; prefer it over static default.
        const profileEndpoint =
            (typeof callbackProfileEndpoint === 'string' && callbackProfileEndpoint.startsWith('https://'))
                ? callbackProfileEndpoint
                : TRUECALLER_PROFILE_URL;

        const profileResponse = await fetch(profileEndpoint, {
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
        console.log('Truecaller profile keys:', Object.keys(profile || {}));
        const user = await upsertTruecallerUser(profile);

        pendingTruecallerRequests.set(requestId, {
            status: 'authenticated',
            user,
            timestamp: Date.now(),
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error('Truecaller Callback Error:', e);
        if (req.body && typeof req.body === 'object') {
            console.error('Truecaller Callback payload keys:', Object.keys(req.body));
        }
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
        const accessToken = extractAccessToken(req.body);
        const callbackProfileEndpoint = req.body.endpoint;
        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access token' });
        }

        const profileEndpoint =
            (typeof callbackProfileEndpoint === 'string' && callbackProfileEndpoint.startsWith('https://'))
                ? callbackProfileEndpoint
                : TRUECALLER_PROFILE_URL;

        const profileResponse = await fetch(profileEndpoint, {
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

// -- NEXTAUTH-COMPATIBLE BASELINE ENDPOINTS --
router.get('/providers', (_req, res) => {
    res.json({
        google: { id: 'google', name: 'Google', type: 'oauth' },
        truecaller: { id: 'truecaller', name: 'Truecaller', type: 'oauth' },
        credentials: { id: 'credentials', name: 'Credentials', type: 'credentials' }
    });
});

router.get('/session', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.json(null);
    }

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) return res.json(null);

    return res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber
        },
        expires: new Date(Date.now() + (1000 * 60 * 60 * 24)).toISOString()
    });
});

export default router;
