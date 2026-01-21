/**
 * Admin Routes
 * Super admin endpoints for tenant management
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/firebase-admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * POST /api/admin/login
 * Super admin login (separate from tenant login)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check against environment credentials
        if (email !== process.env.ADMIN_EMAIL ||
            password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        // Generate admin token
        const token = jwt.sign(
            {
                email,
                isAdmin: true,
                role: 'super_admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Admin login successful',
            token
        });

    } catch (error) {
        console.error('[Admin/Login]', error);
        res.status(500).json({ error: 'Admin login failed' });
    }
});

// All routes below require admin authentication
router.use(verifyToken);
router.use(verifyAdmin);

/**
 * GET /api/admin/tenants
 * List all tenants
 */
router.get('/tenants', async (req, res) => {
    try {
        const snapshot = await db.collection('tenants')
            .orderBy('createdAt', 'desc')
            .get();

        const tenants = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            delete data.password; // Never send password
            tenants.push({ id: doc.id, ...data });
        });

        res.json({ tenants, count: tenants.length });

    } catch (error) {
        console.error('[Admin/Tenants]', error);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

/**
 * GET /api/admin/tenants/:id
 * Get single tenant details
 */
router.get('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await db.collection('tenants').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const tenant = doc.data();
        delete tenant.password;

        // Get usage stats
        const productsSnap = await db.collection('tenants').doc(id)
            .collection('products').get();
        const salesSnap = await db.collection('tenants').doc(id)
            .collection('sales').get();

        res.json({
            ...tenant,
            stats: {
                products: productsSnap.size,
                sales: salesSnap.size
            }
        });

    } catch (error) {
        console.error('[Admin/TenantDetail]', error);
        res.status(500).json({ error: 'Failed to fetch tenant' });
    }
});

/**
 * PUT /api/admin/tenants/:id
 * Update tenant (enable/disable, change plan)
 */
router.put('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Only allow certain fields to be updated
        const allowedUpdates = ['status', 'plan', 'licenseKey', 'licenseExpiry', 'companyName'];
        const filteredUpdates = {};

        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        filteredUpdates.updatedAt = new Date().toISOString();

        await db.collection('tenants').doc(id).update(filteredUpdates);

        res.json({ message: 'Tenant updated successfully' });

    } catch (error) {
        console.error('[Admin/UpdateTenant]', error);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

/**
 * POST /api/admin/license/generate
 * Generate new license key
 */
router.post('/license/generate', async (req, res) => {
    try {
        const { clientName, duration = 365, notes = '' } = req.body;

        if (!clientName) {
            return res.status(400).json({ error: 'Client name required' });
        }

        // Generate license key
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const licenseKey = `POS-${randomPart}-${datePart}`;

        // Calculate expiry
        const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

        // Save license
        const licenseData = {
            key: licenseKey,
            clientName,
            duration,
            expiryDate,
            notes,
            usedBy: null,
            activatedAt: null,
            createdAt: new Date().toISOString()
        };

        await db.collection('licenses').add(licenseData);

        res.status(201).json({
            message: 'License generated successfully',
            license: licenseData
        });

    } catch (error) {
        console.error('[Admin/GenerateLicense]', error);
        res.status(500).json({ error: 'Failed to generate license' });
    }
});

/**
 * GET /api/admin/licenses
 * List all licenses
 */
router.get('/licenses', async (req, res) => {
    try {
        const snapshot = await db.collection('licenses')
            .orderBy('createdAt', 'desc')
            .get();

        const licenses = [];
        snapshot.forEach(doc => {
            licenses.push({ id: doc.id, ...doc.data() });
        });

        res.json({ licenses, count: licenses.length });

    } catch (error) {
        console.error('[Admin/Licenses]', error);
        res.status(500).json({ error: 'Failed to fetch licenses' });
    }
});

/**
 * GET /api/admin/stats
 * Get overall system stats
 */
router.get('/stats', async (req, res) => {
    try {
        const tenantsSnap = await db.collection('tenants').get();
        const licensesSnap = await db.collection('licenses').get();

        // Count active vs inactive tenants
        let activeTenants = 0;
        let trialTenants = 0;
        let licensedTenants = 0;

        tenantsSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'active') activeTenants++;
            if (data.plan === 'trial') trialTenants++;
            if (data.plan === 'licensed') licensedTenants++;
        });

        // Count used vs unused licenses
        let usedLicenses = 0;
        licensesSnap.forEach(doc => {
            if (doc.data().usedBy) usedLicenses++;
        });

        res.json({
            totalTenants: tenantsSnap.size,
            activeTenants,
            trialTenants,
            licensedTenants,
            totalLicenses: licensesSnap.size,
            usedLicenses,
            availableLicenses: licensesSnap.size - usedLicenses
        });

    } catch (error) {
        console.error('[Admin/Stats]', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
