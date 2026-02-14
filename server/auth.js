import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// -- CONFIG --
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

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
