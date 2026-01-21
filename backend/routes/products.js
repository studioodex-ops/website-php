/**
 * Products Routes
 * CRUD operations for products (tenant-isolated)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/products
 * List all products for tenant
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req;
        const { category, search, limit = 100 } = req.query;

        let query = db.collection('tenants').doc(tenantId).collection('products');

        // Filter by category
        if (category && category !== 'all') {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.limit(parseInt(limit)).get();

        let products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // Search filter (client-side for now)
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(p =>
                p.name?.toLowerCase().includes(searchLower) ||
                p.sku?.toLowerCase().includes(searchLower)
            );
        }

        res.json({ products, count: products.length });

    } catch (error) {
        console.error('[Products/List]', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

/**
 * GET /api/products/:id
 * Get single product
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req;
        const { id } = req.params;

        const doc = await db.collection('tenants').doc(tenantId)
            .collection('products').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ id: doc.id, ...doc.data() });

    } catch (error) {
        console.error('[Products/Get]', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

/**
 * POST /api/products
 * Create new product
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId } = req;
        const productData = req.body;

        // Validate required fields
        if (!productData.name || !productData.price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        // Add metadata
        const product = {
            ...productData,
            price: parseFloat(productData.price) || 0,
            stock: parseFloat(productData.stock) || 0,
            cost: parseFloat(productData.cost) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('tenants').doc(tenantId)
            .collection('products').add(product);

        res.status(201).json({
            id: docRef.id,
            ...product,
            message: 'Product created successfully'
        });

    } catch (error) {
        console.error('[Products/Create]', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', async (req, res) => {
    try {
        const { tenantId } = req;
        const { id } = req.params;
        const updates = req.body;

        // Remove immutable fields
        delete updates.id;
        delete updates.createdAt;

        // Add updated timestamp
        updates.updatedAt = new Date().toISOString();

        // Parse numeric fields
        if (updates.price) updates.price = parseFloat(updates.price);
        if (updates.stock) updates.stock = parseFloat(updates.stock);
        if (updates.cost) updates.cost = parseFloat(updates.cost);

        const docRef = db.collection('tenants').doc(tenantId)
            .collection('products').doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await docRef.update(updates);

        res.json({
            id,
            ...doc.data(),
            ...updates,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('[Products/Update]', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

/**
 * DELETE /api/products/:id
 * Delete product
 */
router.delete('/:id', async (req, res) => {
    try {
        const { tenantId } = req;
        const { id } = req.params;

        const docRef = db.collection('tenants').doc(tenantId)
            .collection('products').doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await docRef.delete();

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('[Products/Delete]', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

/**
 * PUT /api/products/:id/stock
 * Update product stock
 */
router.put('/:id/stock', async (req, res) => {
    try {
        const { tenantId } = req;
        const { id } = req.params;
        const { quantity, operation = 'set', reason = '' } = req.body;

        if (quantity === undefined) {
            return res.status(400).json({ error: 'Quantity required' });
        }

        const docRef = db.collection('tenants').doc(tenantId)
            .collection('products').doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const currentStock = doc.data().stock || 0;
        let newStock;

        switch (operation) {
            case 'add':
                newStock = currentStock + parseFloat(quantity);
                break;
            case 'subtract':
                newStock = currentStock - parseFloat(quantity);
                break;
            case 'set':
            default:
                newStock = parseFloat(quantity);
        }

        await docRef.update({
            stock: newStock,
            updatedAt: new Date().toISOString()
        });

        // Log stock movement
        await db.collection('tenants').doc(tenantId)
            .collection('stockMovements').add({
                productId: id,
                productName: doc.data().name,
                previousStock: currentStock,
                newStock,
                change: newStock - currentStock,
                operation,
                reason,
                timestamp: new Date().toISOString()
            });

        res.json({
            id,
            previousStock: currentStock,
            newStock,
            message: 'Stock updated successfully'
        });

    } catch (error) {
        console.error('[Products/Stock]', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

module.exports = router;
