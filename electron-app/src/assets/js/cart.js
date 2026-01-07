import { auth, onAuthStateChanged, db, doc, getDoc, collection, setDoc, getDocs, query, orderBy } from './firebase-config.js';
import { escapeHtml } from './utils.js';

const PHONE_NUMBER = "94775192756";

// DEBUG: Verify Cart JS Load
console.log('Cart.js: Module Loaded');

// Make functions global immediately (Hoisted)
// Make functions global immediately (Hoisted) - KEEPING FOR BACKWARD COMPATIBILITY
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartCount = updateCartCount;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.injectCartModal = injectCartModal;
window.showToast = showToast;
window.handlePaymentChange = handlePaymentChange;
window.handleShippingChange = handleShippingChange;
window.handleCourierAreaChange = handleCourierAreaChange;

// ... but also EXPORT them for proper module usage
export { addToCart, removeFromCart, updateCartCount, openCart, closeCart, checkout, injectCartModal, showToast };
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('buddika_cart')) || [];
} catch (e) {
    console.error("Cart corrupted, resetting:", e);
    cart = [];
    localStorage.removeItem('buddika_cart');
}

let currentUser = null;
let savedAddress = "";
let courierFeeColombo = 0;
let courierFeeOutstation = 0;

// Fetch Courier Fees on Load
async function fetchCourierFee() {
    try {
        const feeDoc = await getDoc(doc(db, "settings", "store_config"));
        if (feeDoc.exists()) {
            const data = feeDoc.data();
            courierFeeColombo = data.courierFeeColombo || 0;
            courierFeeOutstation = data.courierFeeOutstation || 0;
        }
    } catch (e) {
        console.error("Error fetching courier fees:", e);
    }
}
fetchCourierFee();

// Listen for Auth State
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateCartCount();

    // Check for pending cart item (The "Add to Cart -> Login -> Add" flow)
    if (user) {
        const pendingItem = localStorage.getItem('pendingCartItem');
        if (pendingItem) {
            try {
                const item = JSON.parse(pendingItem);
                console.log("Found pending cart item, adding now:", item);
                addToCart(item.name, item.price, item.qty, item.unit, item.maxStock);
                localStorage.removeItem('pendingCartItem'); // Clear it
                showToast(`Successfully added pending item: ${item.name}`);
            } catch (e) {
                console.error("Error processing pending item:", e);
                localStorage.removeItem('pendingCartItem');
            }
        }
    }

    // Auto-Fetch Address
    if (user) {
        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists() && snap.data().address) {
                savedAddress = snap.data().address;
                // If modal is already open/injected, update it
                const addrEl = document.getElementById('addr-text');
                if (addrEl && !addrEl.value) addrEl.value = savedAddress;
            }
        } catch (e) {
            console.error("Error fetching address:", e);
        }
    } else {
        savedAddress = "";
    }
});

// Make currentUser accessible globally for debugging
window.getCurrentUser = () => currentUser;

function addToCart(name, price, qty = 1, unit = 'unit', maxStock = 999999) {
    console.log(`Add to Cart Clicked: ${name}, Qty: ${qty}`);
    // Debug alert removed for production

    if (!currentUser) {
        // Double check auth state in case onAuthStateChanged is slow
        if (auth.currentUser) {
            currentUser = auth.currentUser;
        } else {
            console.warn("User not logged in. Saving item and redirecting.");

            // DATA PERSISTENCE: Save the intended item to localStorage
            const itemToSave = { name, price, qty, unit, maxStock };
            localStorage.setItem('pendingCartItem', JSON.stringify(itemToSave));

            if (confirm("Please login to add items to cart.")) {
                window.location.href = 'login.html';
            }
            return;
        }
    }

    console.log(`User Logged In: ${currentUser.email}. Proceeding.`);

    // Check if item already exists
    const existingItem = cart.find(item => item.name === name);

    let currentQtyInCart = existingItem ? existingItem.qty : 0;

    if (currentQtyInCart + qty > maxStock) {
        showToast(`Sorry, only ${maxStock} items available in stock!`);
        return;
    }

    if (existingItem) {
        existingItem.qty += qty;
        // Fix float precision (e.g. 0.1 + 0.2)
        existingItem.qty = Math.round(existingItem.qty * 1000) / 1000;
    } else {
        cart.push({ name, price, qty, unit });
    }

    localStorage.setItem('buddika_cart', JSON.stringify(cart));
    updateCartCount();

    // Save to Firebase for Abandoned Cart Recovery
    saveAbandonedCart();

    showToast(`Added ${qty} ${unit} of ${name} to cart!`);
}

// Abandoned Cart Recovery - Save cart state to Firebase
async function saveAbandonedCart() {
    if (!currentUser || cart.length === 0) return;

    try {
        // Get user profile for phone number
        let userPhone = '';
        try {
            const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (userSnap.exists() && userSnap.data().phone) {
                userPhone = userSnap.data().phone;
            }
        } catch (e) {
            console.warn("Could not fetch user phone:", e);
        }

        // Calculate cart total
        const cartTotal = cart.reduce((sum, item) => {
            const price = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
            return sum + (price * item.qty);
        }, 0);

        // Save/Update abandoned cart
        const abandonedCartRef = doc(db, 'abandoned_carts', currentUser.uid);
        await setDoc(abandonedCartRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            userName: currentUser.displayName || '',
            userPhone: userPhone,
            items: cart,
            cartTotal: cartTotal,
            lastUpdated: new Date(),
            status: 'pending'
        }, { merge: true });

        console.log('Abandoned cart saved for recovery');
    } catch (e) {
        console.warn('Error saving abandoned cart:', e);
    }
}

// Mark cart as recovered when checkout completes
async function markCartRecovered() {
    if (!currentUser) return;

    try {
        const abandonedCartRef = doc(db, 'abandoned_carts', currentUser.uid);
        await setDoc(abandonedCartRef, {
            status: 'recovered',
            recoveredAt: new Date()
        }, { merge: true });
        console.log('Cart marked as recovered');
    } catch (e) {
        console.warn('Error marking cart as recovered:', e);
    }
}

// Create Lucky Draw entry for purchases >= Rs.5000
async function createLuckyDrawEntry(orderTotal, customerName, phone) {
    const LUCKY_DRAW_THRESHOLD = 5000;

    if (orderTotal < LUCKY_DRAW_THRESHOLD) {
        console.log('Order total below Lucky Draw threshold:', orderTotal);
        return null;
    }

    try {
        const entryId = 'LD-' + Date.now();
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const entryData = {
            entryId: entryId,
            customerName: customerName || 'Guest',
            phone: phone || '',
            userId: currentUser?.uid || null,
            orderTotal: orderTotal,
            month: month,
            status: 'active',
            createdAt: now
        };

        await setDoc(doc(db, 'lucky_draw_entries', entryId), entryData);
        console.log('Lucky Draw entry created:', entryId);

        return entryId;
    } catch (e) {
        console.error('Error creating Lucky Draw entry:', e);
        return null;
    }
}

// Export for global access
window.createLuckyDrawEntry = createLuckyDrawEntry;

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('buddika_cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function updateCartCount() {
    const count = cart.length;
    const badge = document.getElementById('cart-count');
    const mobileBadge = document.getElementById('mobile-cart-count');

    if (badge) {
        badge.innerText = count;
        badge.classList.remove('hidden');
        if (count === 0) badge.classList.add('hidden');
    }

    if (mobileBadge) {
        mobileBadge.innerText = count;
        mobileBadge.classList.remove('hidden');
        if (count === 0) mobileBadge.classList.add('hidden');
    }
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) {
        injectCartModal();
        requestAnimationFrame(openCart);
        return;
    }

    renderCart();

    // Auto-fill address if empty
    const addrEl = document.getElementById('addr-text');
    if (addrEl && !addrEl.value && savedAddress) {
        addrEl.value = savedAddress;
    }

    modal.classList.remove('hidden');

    const panel = document.getElementById('cart-panel');
    const backdrop = document.getElementById('cart-backdrop');
    requestAnimationFrame(() => {
        if (panel) panel.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
    });
}

function closeCart() {
    const panel = document.getElementById('cart-panel');
    const backdrop = document.getElementById('cart-backdrop');

    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');

    setTimeout(() => {
        const modal = document.getElementById('cart-modal');
        if (modal) modal.classList.add('hidden');
    }, 300);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">Your cart is empty.</p>';
        totalEl.innerText = 'Rs. 0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        const priceVal = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        const itemTotal = priceVal * item.qty;
        total += itemTotal;

        return `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg animate-fade-in-up">
                <div>
                    <h4 class="font-bold text-sm text-black">${escapeHtml(item.name)}</h4>
                    <p class="text-xs text-gray-500">${escapeHtml(item.qty)} ${escapeHtml(item.unit || 'unit')} x ${escapeHtml(item.price)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm">Rs. ${itemTotal.toLocaleString()}</span>
                    <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700 p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');



    // Update Totals
    document.getElementById('cart-item-total').innerText = `Rs. ${total.toLocaleString()}.00`;

    // Check current shipping method to recalc total
    const shippingMethodElement = document.querySelector('input[name="shipping"]:checked');
    const method = shippingMethodElement ? shippingMethodElement.value : 'pickup';
    updateGrandTotal(total, method);
}

function updateGrandTotal(itemTotal, shippingMethod) {
    const totalEl = document.getElementById('cart-total');
    const shippingRow = document.getElementById('cart-shipping-row');
    const shippingEl = document.getElementById('cart-shipping-fee');

    let grandTotal = itemTotal;
    let shipping = 0;

    if (shippingMethod === 'delivery' || shippingMethod === 'threewheel') {
        // No shipping fee for local delivery/threewheel in this flow
        shippingRow.classList.add('hidden');
    } else if (shippingMethod === 'courier') {
        const areaSelect = document.getElementById('courier-area-select');
        const area = areaSelect ? areaSelect.value : '';

        if (area === 'colombo') {
            shipping = courierFeeColombo;
        } else if (area === 'outstation') {
            shipping = courierFeeOutstation;
        }

        if (shipping > 0) {
            grandTotal += shipping;
            shippingRow.classList.remove('hidden');
            shippingEl.innerText = `Rs. ${shipping.toLocaleString()}.00`;
        } else {
            shippingRow.classList.add('hidden'); // Hide if no area selected
        }
    } else {
        shippingRow.classList.add('hidden');
    }

    totalEl.innerText = `Rs. ${grandTotal.toLocaleString()}.00`;
}


function checkout() {
    if (!currentUser) {
        closeCart();
        window.location.href = 'login.html';
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const methodElement = document.querySelector('input[name="payment"]:checked');
    if (!methodElement) {
        alert("Please select a payment method.");
        return;
    }
    const method = methodElement.value;

    // Get Shipping Details
    const shippingMethodElement = document.querySelector('input[name="shipping"]:checked');
    const shippingMethod = shippingMethodElement ? shippingMethodElement.value : 'pickup';

    let addressText = '';
    let contactPhone = '';
    let driverInfo = '';

    if (shippingMethod === 'delivery' || shippingMethod === 'threewheel') {
        const addrInput = document.getElementById('addr-text').value.trim();
        contactPhone = document.getElementById('addr-phone').value.trim();

        if (!addrInput || !contactPhone) {
            alert("Please fill in your full delivery address and contact number.");
            return;
        }
        addressText = addrInput;
    }

    if (shippingMethod === 'threewheel') {
        const driverSelect = document.getElementById('driver-select');
        if (!driverSelect.value) {
            alert("Please select a Three-wheel Driver.");
            return;
        }
        driverInfo = driverSelect.options[driverSelect.selectedIndex].text;
    }

    // Map method codes to readable names
    const methodNames = {
        'whatsapp': 'Cash on Delivery / WhatsApp',
        'card': 'Card Payment',
        'bank': 'Bank Transfer',
        'crypto': 'Crypto Payment'
    };

    const paymentMethodName = methodNames[method] || method;

    // Construct WhatsApp Message
    let message = `*New Order from ${currentUser.displayName || 'Customer'}*\n\n`;
    message += `*Customer:* ${currentUser.displayName || 'N/A'}\n`;
    message += `*Email:* ${currentUser.email || 'N/A'}\n`;

    message += `----------------------------\n`;
    message += `*Shipping Method:* ${shippingMethod === 'delivery' ? '🚚 Home Delivery' : (shippingMethod === 'threewheel' ? '🛺 Three-wheel Delivery' : '🏪 Store Pickup')}\n`;
    if (shippingMethod === 'threewheel') {
        message += `*Driver:* ${driverInfo}\n`;
    }
    if (shippingMethod === 'delivery' || shippingMethod === 'threewheel') {
        message += `*Address:* ${addressText}\n`;
        message += `*Contact:* ${contactPhone}\n`;
    }
    message += `----------------------------\n`;

    message += `*Payment Method:* ${paymentMethodName}\n\n`;
    message += `*Items:*\n`;

    let total = 0;
    const orderItems = [];
    cart.forEach(item => {
        const itemTotal = parseFloat(item.price.replace(/[^0-9.]/g, '')) * item.qty;
        message += `- ${item.name} (${item.qty} ${item.unit || 'unit'}): Rs. ${itemTotal}\n`;
        total += itemTotal;
        orderItems.push({ ...item, itemTotal });
    });

    message += `\n*Items Total: Rs. ${total.toLocaleString()}.00*`;

    let boxFee = 0;
    if (shippingMethod === 'courier' && courierFee > 0) {
        boxFee = courierFee;
        message += `\n*Shipping Fee:* Rs. ${boxFee.toLocaleString()}.00`;
        total += boxFee;
    }

    message += `\n*Grand Total: Rs. ${total.toLocaleString()}.00*`;

    // --- SAVE ORDER TO FIRESTORE ---
    saveOrderToHistory(currentUser, {
        items: orderItems,
        total: total,
        paymentMethod: method,
        shippingMethod: shippingMethod,
        address: addressText,
        contact: contactPhone,
        status: 'Pending'
    }).then(() => {
        // Proceed to WhatsApp
        const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        cart = [];
        localStorage.setItem('buddika_cart', JSON.stringify(cart));
        markCartRecovered(); // Mark as recovered in Firebase

        // Create Lucky Draw entry for Rs.5000+ purchases
        const luckyEntryId = await createLuckyDrawEntry(grandTotal, currentUser?.displayName || 'Guest', contactPhone);
        if (luckyEntryId) {
            setTimeout(() => {
                alert(`🎰 Congratulations! You've entered the Lucky Draw!\n\nEntry ID: ${luckyEntryId}\n\nKeep this ID safe. Winners announced at month end!`);
            }, 1000);
        }

        updateCartCount();
        closeCart();
    }).catch(err => {
        console.error("Error saving order:", err);
        // If saving fails, still proceed to WhatsApp
        const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        cart = [];
        localStorage.setItem('buddika_cart', JSON.stringify(cart));
        updateCartCount();
        closeCart();
    });
}

async function saveOrderToHistory(user, orderData) {
    try {
        const ordersRef = collection(db, `users/${user.uid}/orders`);
        const newOrderRef = doc(ordersRef);
        await setDoc(newOrderRef, {
            ...orderData,
            createdAt: new Date(),
            id: newOrderRef.id
        });
        showToast("Order Saved to History!");
    } catch (e) {
        console.error("Save Order Failed", e);
        throw e;
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-black text-white px-6 py-3 rounded-lg shadow-xl z-[200] transform transition-all duration-300 translate-y-10 opacity-0';
    toast.innerText = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function injectCartModal() {
    if (document.getElementById('cart-modal')) return;

    const modalHTML = `
    <div id="cart-modal" class="fixed inset-0 z-[100] hidden">
        <!-- Backdrop -->
        <div id="cart-backdrop" class="cart-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeCart()"></div>
        
        <!-- Drawer Panel -->
        <div id="cart-panel" class="cart-drawer absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl p-6 flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold font-heading">Shopping Cart</h2>
                <button onclick="closeCart()" class="p-2 hover:bg-gray-100 rounded-full">
                    <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Items Scroll Area -->
            <div id="cart-items-container" class="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                <!-- Items injected here -->
            </div>

            <!-- Footer Area -->
            <div class="mt-auto border-t border-gray-100 pt-4">
                
                <!-- 1. Shipping Method Selection -->
                <div class="mb-5">
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Shipping Method</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="cursor-pointer">
                            <input type="radio" name="shipping" value="delivery" class="peer hidden" checked onchange="handleShippingChange(this.value)">
                            <div class="border border-gray-200 rounded-xl p-4 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all flex flex-col items-center gap-2 hover:border-gray-400">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                                <span class="font-bold text-sm">Delivery</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="shipping" value="pickup" class="peer hidden" onchange="handleShippingChange(this.value)">
                            <div class="border border-gray-200 rounded-xl p-4 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all flex flex-col items-center gap-2 hover:border-gray-400">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                <span class="font-bold text-sm">Store Pickup</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="shipping" value="threewheel" class="peer hidden" onchange="handleShippingChange(this.value)">
                            <div class="border border-gray-200 rounded-xl p-4 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all flex flex-col items-center gap-2 hover:border-gray-400">
                                <span class="text-2xl">🛺</span>
                                <span class="font-bold text-sm">Three-wheel</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="shipping" value="courier" class="peer hidden" onchange="handleShippingChange(this.value)">
                            <div class="border border-gray-200 rounded-xl p-4 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all flex flex-col items-center gap-2 hover:border-gray-400">
                                <span class="text-2xl">📦</span>
                                <span class="font-bold text-sm">Courier</span>
                            </div>
                        </label>
                    </div>

                    <!-- Driver Selection (Visible for Three-wheel) -->
                    <div id="driver-selection" class="hidden mt-4 animate-fade-in-up">
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Driver</label>
                        <select id="driver-select" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none">
                            <option value="">-- Choose a Driver --</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1 italic">* Hire fee is separate and paid directly to the driver.</p>
                    </div>

                    <div id="courier-area-selection" class="hidden mt-4 animate-fade-in-up">
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Delivery Area</label>
                        <select id="courier-area-select" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" onchange="handleCourierAreaChange()">
                            <option value="">-- Select Area --</option>
                            <option value="colombo">Nuwaraeliya & Suburbs</option>
                            <option value="outstation">Outstation (Other Areas)</option>
                        </select>
                    </div>

                    <!-- Address Form (Visible for Delivery) -->
                    <div id="address-form" class="mt-4 space-y-3 animate-fade-in-up">
                        <div>
                            <textarea id="addr-text" rows="2" placeholder="Start typing your address... (House No, Street, City)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none">${savedAddress}</textarea>
                        </div>
                        <div>
                            <input type="tel" id="addr-phone" placeholder="Contact Number *" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all">
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2 mb-4 border-t border-dashed border-gray-200 pt-3">
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <span>Items Total</span>
                        <span id="cart-item-total">Rs. 0.00</span>
                    </div>
                    <div class="flex justify-between items-center text-sm text-gray-500 hidden" id="cart-shipping-row">
                        <span>Shipping Fee</span>
                        <span id="cart-shipping-fee">Rs. 0.00</span>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span class="text-gray-900 font-bold">Grand Total</span>
                        <span id="cart-total" class="text-2xl font-bold font-heading">Rs. 0.00</span>
                    </div>
                </div>

                <!-- Payment Method Selection -->
                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Method</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="cursor-pointer">
                            <input type="radio" name="payment" value="whatsapp" class="peer hidden" checked onchange="handlePaymentChange(this.value)">
                            <div class="border border-gray-200 rounded-lg p-3 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all h-full flex items-center justify-center">
                                <span id="payment-method-cod-text" class="text-xs font-bold block">WhatsApp / COD</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="payment" value="bank" class="peer hidden" onchange="handlePaymentChange(this.value)">
                            <div class="border border-gray-200 rounded-lg p-3 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all h-full flex items-center justify-center">
                                <span class="text-xs font-bold block">Bank Transfer</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="payment" value="crypto" class="peer hidden" onchange="handlePaymentChange(this.value)">
                            <div class="border border-gray-200 rounded-lg p-3 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all h-full flex items-center justify-center">
                                <span class="text-xs font-bold block">Crypto</span>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="payment" value="card" class="peer hidden" onchange="handlePaymentChange(this.value)">
                            <div class="border border-gray-200 rounded-lg p-3 text-center peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all h-full flex items-center justify-center">
                                <span class="text-xs font-bold block">Card Payment</span>
                            </div>
                        </label>
                    </div>

                    <!-- Payment Details Section -->
                    <div id="payment-details-bank" class="hidden mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in-up">
                        <h4 class="text-xs font-bold uppercase text-gray-500 mb-2">Bank Details</h4>
                        <div class="text-sm space-y-1">
                            <p><span class="font-bold">Bank:</span> Bank of Ceylon</p>
                            <p><span class="font-bold">Branch:</span> Walapane Branch</p>
                            <p><span class="font-bold">Name:</span> Tharindu Mayuranga</p>
                            <p><span class="font-bold">Acc No:</span> 0004134063</p>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 italic">Please send the receipt via WhatsApp after checking out.</p>
                    </div>
                </div>

                <button onclick="checkout()" class="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-lg">
                    Checkout & Place Order
                </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handlePaymentChange(value) {
    const bankDetails = document.getElementById('payment-details-bank');

    if (value === 'bank') {
        bankDetails.classList.remove('hidden');
    } else {
        bankDetails.classList.add('hidden');
    }
}



let driversLoaded = false;
async function fetchDriversForCart() {
    if (driversLoaded) return;
    const select = document.getElementById('driver-select');
    try {
        const q = query(collection(db, "delivery_drivers"), orderBy("name"));
        const snap = await getDocs(q);
        if (snap.empty) {
            select.innerHTML = '<option value="">No drivers available</option>';
            return;
        }
        let html = '<option value="">-- Choose a Driver --</option>';
        snap.forEach(doc => {
            const d = doc.data();
            html += `<option value="${doc.id}">${escapeHtml(d.name)} (${escapeHtml(d.phone)})</option>`;
        });
        select.innerHTML = html;
        driversLoaded = true;
    } catch (e) {
        console.error("Error loading drivers:", e);
    }
}

function handleShippingChange(value) {
    const form = document.getElementById('address-form');
    const driverDiv = document.getElementById('driver-selection');
    const paymentLabel = document.getElementById('payment-method-cod-text');
    const bankRadio = document.querySelector('input[name="payment"][value="bank"]');
    const codRadio = document.querySelector('input[name="payment"][value="whatsapp"]');

    const courierDiv = document.getElementById('courier-area-selection');

    if (value === 'delivery') {
        form.classList.remove('hidden');
        driverDiv.classList.add('hidden');
        if (courierDiv) courierDiv.classList.add('hidden');
        if (paymentLabel) paymentLabel.innerText = "WhatsApp / COD";
        codRadio.disabled = false;
    } else if (value === 'threewheel') {
        form.classList.remove('hidden');
        driverDiv.classList.remove('hidden');
        if (courierDiv) courierDiv.classList.add('hidden');
        fetchDriversForCart(); // Load drivers

        // Auto-select Bank (For Items) and Disable COD
        if (bankRadio) {
            bankRadio.checked = true;
            handlePaymentChange('bank');
        }
        if (paymentLabel) paymentLabel.innerText = "Unavailable for 3-wheel";
        codRadio.disabled = true;

        alert("Payment Notice:\n\n1. Items must be paid via Bank Transfer.\n2. Three-wheel Hire Fee is paid directly to the Driver in Cash.");

    } else if (value === 'courier') {
        form.classList.remove('hidden');
        driverDiv.classList.add('hidden');
        const courierDiv = document.getElementById('courier-area-selection');
        if (courierDiv) courierDiv.classList.remove('hidden');

        if (paymentLabel) paymentLabel.innerText = "Unavailable";
        codRadio.disabled = true;

        // Auto-select Bank
        if (bankRadio) {
            bankRadio.checked = true;
            handlePaymentChange('bank');
        }
    } else {
        // Pickup
        form.classList.add('hidden');
        driverDiv.classList.add('hidden');
        const courierDiv = document.getElementById('courier-area-selection');
        if (courierDiv) courierDiv.classList.add('hidden');

        if (paymentLabel) paymentLabel.innerText = "Pay on Pickup";
        codRadio.disabled = false;
    }

    // Recalculate Total
    renderCart(); // This triggers updateGrandTotal
}

function handleCourierAreaChange() {
    renderCart();
}

// Functions are exposed at the start of the file

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});
