/**
 * Authentication Routes
 * Handles login, register, license validation
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/firebase-admin');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register new tenant
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, companyName, phone } = req.body;

        // Validate input
        if (!email || !password || !companyName) {
            return res.status(400).json({ error: 'Email, password, and company name required' });
        }

        // Check if tenant exists
        const existingTenant = await db.collection('tenants')
            .where('email', '==', email.toLowerCase())
            .get();

        if (!existingTenant.empty) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create tenant ID
        const tenantId = 'tenant_' + crypto.randomBytes(8).toString('hex');

        // Create tenant document
        const tenantData = {
            tenantId,
            email: email.toLowerCase(),
            password: hashedPassword,
            companyName,
            phone: phone || '',
            plan: 'trial',
            trialStartDate: new Date().toISOString(),
            trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            licenseKey: null,
            licenseExpiry: null,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.collection('tenants').doc(tenantId).set(tenantData);

        // Generate JWT token
        const token = jwt.sign(
            {
                tenantId,
                email: tenantData.email,
                companyName,
                isAdmin: false
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Remove password from response
        delete tenantData.password;

        res.status(201).json({
            message: 'Registration successful',
            token,
            tenant: tenantData
        });

    } catch (error) {
        console.error('[Auth/Register]', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login existing tenant
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find tenant
        const snapshot = await db.collection('tenants')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tenantDoc = snapshot.docs[0];
        const tenant = tenantDoc.data();

        // Check password
        const isValidPassword = await bcrypt.compare(password, tenant.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check status
        if (tenant.status !== 'active') {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Check trial/license expiry
        const now = new Date();
        let accessStatus = 'active';

        if (tenant.plan === 'trial') {
            const trialEnd = new Date(tenant.trialEndDate);
            if (now > trialEnd) {
                accessStatus = 'trial_expired';
            }
        } else if (tenant.licenseExpiry) {
            const licenseEnd = new Date(tenant.licenseExpiry);
            if (now > licenseEnd) {
                accessStatus = 'license_expired';
            }
        }

        // Generate token
        const token = jwt.sign(
            {
                tenantId: tenant.tenantId,
                email: tenant.email,
                companyName: tenant.companyName,
                isAdmin: false,
                accessStatus
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Remove password from response
        delete tenant.password;

        res.json({
            message: 'Login successful',
            token,
            tenant: {
                ...tenant,
                accessStatus
            }
        });

    } catch (error) {
        console.error('[Auth/Login]', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/validate-license
 * Validate and activate license key
 */
router.post('/validate-license', verifyToken, async (req, res) => {
    try {
        const { licenseKey } = req.body;
        const { tenantId } = req;

        if (!licenseKey) {
            return res.status(400).json({ error: 'License key required' });
        }

        // Find license in licenses collection
        const licenseSnapshot = await db.collection('licenses')
            .where('key', '==', licenseKey.toUpperCase())
            .limit(1)
            .get();

        if (licenseSnapshot.empty) {
            return res.status(400).json({ error: 'Invalid license key' });
        }

        const license = licenseSnapshot.docs[0].data();

        // Check if already used by another tenant
        if (license.usedBy && license.usedBy !== tenantId) {
            return res.status(400).json({ error: 'License already in use' });
        }

        // Check expiry
        const expiryDate = new Date(license.expiryDate);
        if (new Date() > expiryDate) {
            return res.status(400).json({ error: 'License has expired' });
        }

        // Activate license for tenant
        await db.collection('tenants').doc(tenantId).update({
            plan: 'licensed',
            licenseKey: licenseKey.toUpperCase(),
            licenseExpiry: license.expiryDate,
            updatedAt: new Date().toISOString()
        });

        // Mark license as used
        await licenseSnapshot.docs[0].ref.update({
            usedBy: tenantId,
            activatedAt: new Date().toISOString()
        });

        res.json({
            message: 'License activated successfully',
            expiryDate: license.expiryDate
        });

    } catch (error) {
        console.error('[Auth/ValidateLicense]', error);
        res.status(500).json({ error: 'License validation failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        const { tenantId } = req;

        const tenantDoc = await db.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const tenant = tenantDoc.data();
        delete tenant.password;

        // Check access status
        const now = new Date();
        let accessStatus = 'active';

        if (tenant.plan === 'trial') {
            const trialEnd = new Date(tenant.trialEndDate);
            if (now > trialEnd) {
                accessStatus = 'trial_expired';
            } else {
                const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
                accessStatus = `trial_${daysLeft}_days`;
            }
        } else if (tenant.licenseExpiry) {
            const licenseEnd = new Date(tenant.licenseExpiry);
            if (now > licenseEnd) {
                accessStatus = 'license_expired';
            }
        }

        res.json({
            ...tenant,
            accessStatus
        });

    } catch (error) {
        console.error('[Auth/Me]', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

module.exports = router;
