/**
 * Sales Routes
 * Sales processing and history (tenant-isolated)
 */

const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase-admin');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/sales
 * Create new sale
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId, user } = req;
        const { items, subtotal, discount, total, paymentMethod, receivedAmount, change, customerInfo } = req.body;

        // Validate
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in sale' });
        }

        // Generate sale ID
        const saleId = 'SALE-' + Date.now();

        // Create sale document
        const saleData = {
            saleId,
            items,
            subtotal: parseFloat(subtotal) || 0,
            discount: parseFloat(discount) || 0,
            total: parseFloat(total) || 0,
            paymentMethod: paymentMethod || 'cash',
            receivedAmount: parseFloat(receivedAmount) || 0,
            change: parseFloat(change) || 0,
            customerInfo: customerInfo || null,
            cashier: user.email || 'Unknown',
            status: 'completed',
            createdAt: new Date().toISOString()
        };

        // Save sale
        await db.collection('tenants').doc(tenantId)
            .collection('sales').doc(saleId).set(saleData);

        // Update product stock
        const batch = db.batch();

        for (const item of items) {
            const productRef = db.collection('tenants').doc(tenantId)
                .collection('products').doc(item.productId);

            batch.update(productRef, {
                stock: admin.firestore.FieldValue.increment(-item.qty),
                updatedAt: new Date().toISOString()
            });

            // Log stock movement
            const movementRef = db.collection('tenants').doc(tenantId)
                .collection('stockMovements').doc();

            batch.set(movementRef, {
                productId: item.productId,
                productName: item.name,
                change: -item.qty,
                operation: 'sale',
                saleId,
                timestamp: new Date().toISOString()
            });
        }

        await batch.commit();

        res.status(201).json({
            message: 'Sale completed successfully',
            sale: saleData
        });

    } catch (error) {
        console.error('[Sales/Create]', error);
        res.status(500).json({ error: 'Failed to process sale' });
    }
});

/**
 * GET /api/sales
 * Get sales history
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req;
        const { startDate, endDate, limit = 50 } = req.query;

        let query = db.collection('tenants').doc(tenantId)
            .collection('sales')
            .orderBy('createdAt', 'desc');

        // Date filters
        if (startDate) {
            query = query.where('createdAt', '>=', startDate);
        }
        if (endDate) {
            query = query.where('createdAt', '<=', endDate);
        }

        const snapshot = await query.limit(parseInt(limit)).get();

        const sales = [];
        snapshot.forEach(doc => {
            sales.push({ id: doc.id, ...doc.data() });
        });

        // Calculate totals
        const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalItems = sales.reduce((sum, s) => sum + (s.items?.length || 0), 0);

        res.json({
            sales,
            count: sales.length,
            totalSales,
            totalItems
        });

    } catch (error) {
        console.error('[Sales/List]', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

/**
 * GET /api/sales/:id
 * Get single sale
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req;
        const { id } = req.params;

        const doc = await db.collection('tenants').doc(tenantId)
            .collection('sales').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json({ id: doc.id, ...doc.data() });

    } catch (error) {
        console.error('[Sales/Get]', error);
        res.status(500).json({ error: 'Failed to fetch sale' });
    }
});

/**
 * GET /api/sales/report/daily
 * Get daily sales report
 */
router.get('/report/daily', async (req, res) => {
    try {
        const { tenantId } = req;
        const { date } = req.query;

        const targetDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = targetDate + 'T00:00:00.000Z';
        const endOfDay = targetDate + 'T23:59:59.999Z';

        const snapshot = await db.collection('tenants').doc(tenantId)
            .collection('sales')
            .where('createdAt', '>=', startOfDay)
            .where('createdAt', '<=', endOfDay)
            .get();

        const sales = [];
        snapshot.forEach(doc => {
            sales.push(doc.data());
        });

        // Calculate metrics
        const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalTransactions = sales.length;
        const totalItems = sales.reduce((sum, s) => sum + (s.items?.reduce((i, item) => i + item.qty, 0) || 0), 0);
        const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // Payment method breakdown
        const byPaymentMethod = {};
        sales.forEach(s => {
            const method = s.paymentMethod || 'cash';
            byPaymentMethod[method] = (byPaymentMethod[method] || 0) + s.total;
        });

        res.json({
            date: targetDate,
            totalSales,
            totalTransactions,
            totalItems,
            averageTransaction,
            byPaymentMethod
        });

    } catch (error) {
        console.error('[Sales/DailyReport]', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;
