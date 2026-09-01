/**
 * SevenStrike - Cart page JS
 * Hỗ trợ đồng bộ giá, tồn kho và kiểm tra trạng thái ngừng kinh doanh theo thời gian thực.
 */

const state = {
    cart: JSON.parse(localStorage.getItem('vshoes_cart') || '[]'),
    checkedIds: [] // list of checked item IDs in the cart
};

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
    // Sync cart prices & status with backend
    await syncCartPricesWithBackend();

    // Initially check only active items
    state.checkedIds = state.cart.filter(item => !item.isStopped).map(item => item.id);
    
    renderCart();
    setupCheckboxHandlers();
    setupActions();
    updateCartBadgeGlobal();
    loadRecommendedProducts();
});

async function syncCartPricesWithBackend() {
    try {
        let cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
        if (!cart || cart.length === 0) {
            state.cart = [];
            return;
        }

        const ids = cart.map(i => i.id).filter(Boolean);
        if (ids.length === 0) {
            state.cart = cart;
            return;
        }

        const res = await fetch('/api/san-pham/check-cart-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
        });

        if (res.ok) {
            const statusList = await res.json();
            const statusMap = new Map();
            statusList.forEach(s => statusMap.set(s.id, s));

            for (let item of cart) {
                const s = statusMap.get(item.id);
                if (s) {
                    item.isStopped = s.isStopped === true || (s.trangThai != null && s.trangThai != 1);
                    item.trangThai = s.trangThai;
                    item.soLuongTon = s.soLuongTon != null ? s.soLuongTon : 0;
                    if (s.giaBan != null) item.giaBan = s.giaBan;
                    if (s.giaGoc != null) item.giaGoc = s.giaGoc;
                    if (s.phanTramGiam != null) item.phanTramGiam = s.phanTramGiam;
                    if (s.tenSanPham) item.tenSanPham = s.tenSanPham;
                    if (s.ma) item.ma = s.ma;
                    if (s.hinhAnh) item.hinhAnh = s.hinhAnh;
                } else {
                    item.isStopped = true;
                    item.trangThai = 0;
                }
            }
        }

        state.cart = cart;
        localStorage.setItem('vshoes_cart', JSON.stringify(cart));
    } catch (err) {
        console.error('Lỗi đồng bộ giỏ hàng:', err);
    }
}

function renderCart() {
    const tbody = $('cartTableBody');
    const wrapper = $('cartContentWrapper');
    const emptyState = $('cartEmptyState');
    
    if (state.cart.length === 0) {
        wrapper.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    wrapper.style.display = 'block';
    emptyState.style.display = 'none';

    // Hiển thị thông báo nếu có sản phẩm đã ngừng kinh doanh
    let alertBox = document.getElementById('cartStoppedWarningBox');
    const hasStopped = state.cart.some(item => item.isStopped);
    if (hasStopped) {
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'cartStoppedWarningBox';
            alertBox.style.cssText = 'background:#fef2f2; border:1.5px solid #f87171; border-radius:10px; padding:12px 18px; margin-bottom:18px; color:#991b1b; font-size:13.5px; font-weight:700; display:flex; align-items:center; gap:10px; box-shadow:0 2px 8px rgba(239,68,68,0.1);';
            alertBox.innerHTML = `
                <span style="font-size:18px;">⚠️</span>
                <span>Trong giỏ hàng có sản phẩm <strong>đã ngừng kinh doanh</strong>. Các sản phẩm này không thể thanh toán, vui lòng xóa để tiếp tục!</span>
            `;
            wrapper.insertBefore(alertBox, wrapper.firstChild);
        }
    } else if (alertBox) {
        alertBox.remove();
    }
    
    tbody.innerHTML = state.cart.map(item => {
        const isStopped = item.isStopped === true || (item.trangThai != null && item.trangThai != 1);
        const isChecked = !isStopped && state.checkedIds.includes(item.id);
        const itemTotal = item.qty * (parseFloat(item.giaBan) || 0);
        
        const code = item.ma || `CTSP${String(item.id).padStart(5, '0')}`;
        const imgUrl = getImageUrl(item.hinhAnh, item.id || 0);
        const hasDiscount = item.phanTramGiam > 0 && item.giaGoc > item.giaBan;
        
        return `
            <tr style="${isStopped ? 'background: #fff5f5; opacity: 0.88;' : ''}">
                <td>
                    <input type="checkbox" class="custom-checkbox item-checkbox" data-id="${item.id}" 
                           ${isChecked ? 'checked' : ''} 
                           ${isStopped ? 'disabled title="Sản phẩm này đã ngừng kinh doanh"' : ''}>
                </td>
                <td style="font-family: monospace; font-weight: 600; color: var(--gray-700);">${code}</td>
                <td>
                    <div class="cart-product-cell">
                        <div class="cart-product-img">
                            <img src="${imgUrl}" alt="${item.tenSanPham}" onerror="this.src='/images/white.png'">
                        </div>
                        <div class="cart-product-info">
                            <div class="cart-product-name" style="${isStopped ? 'color:#64748b; text-decoration:line-through;' : ''}">${item.tenSanPham}</div>
                            <div class="cart-product-variant">Phân loại hàng: ${item.mauSac || '—'}, ${item.sizeGiay || '—'}</div>
                            ${isStopped 
                                ? `<div style="display:inline-flex; align-items:center; gap:4px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; margin-top:4px; width:fit-content;">⛔ ĐÃ NGỪNG BÁN</div>` 
                                : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="cart-price-main">
                        <span style="font-weight: 700; color: ${isStopped ? '#94a3b8' : 'var(--gray-900)'};">${formatPrice(item.giaBan)}</span>
                        ${hasDiscount ? `<div style="font-size: 12px; color: #94a3b8; text-decoration: line-through; margin-top: 2px;">${formatPrice(item.giaGoc)}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="cart-qty-selector" style="${isStopped ? 'opacity:0.5; pointer-events:none;' : ''}">
                        <button class="cart-qty-btn" onclick="changeQty(${item.id}, -1)" ${isStopped ? 'disabled' : ''}>−</button>
                        <input type="text" class="cart-qty-input" value="${item.qty}" ${isStopped ? 'disabled' : ''} onchange="updateQtyInput(${item.id}, this)" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        <button class="cart-qty-btn" onclick="changeQty(${item.id}, 1)" ${isStopped ? 'disabled' : ''}>+</button>
                    </div>
                </td>
                <td>
                    <div class="cart-total-price" style="${isStopped ? 'color:#94a3b8; text-decoration:line-through;' : ''}">${formatPrice(itemTotal)}</div>
                </td>
                <td>
                    <button class="cart-action-btn" onclick="deleteItem(${item.id})" style="color: #ef4444; font-weight:700;">Xóa</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update check status of select all buttons
    const activeItems = state.cart.filter(item => !item.isStopped);
    const allChecked = activeItems.length > 0 && state.checkedIds.length === activeItems.length;
    $('selectAllHeader').checked = allChecked;
    $('selectAllSummary').checked = allChecked;
    
    calculateTotals();
}

function setupCheckboxHandlers() {
    // Item checkbox changes
    document.addEventListener('change', e => {
        if (e.target.classList.contains('item-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            const item = state.cart.find(i => i.id === id);
            if (item && item.isStopped) {
                e.target.checked = false;
                showToast(`Sản phẩm "${item.tenSanPham}" đã ngừng bán, không thể chọn!`, 'error');
                return;
            }
            if (e.target.checked) {
                if (!state.checkedIds.includes(id)) state.checkedIds.push(id);
            } else {
                state.checkedIds = state.checkedIds.filter(x => x !== id);
            }
            renderCart();
        }
    });
    
    // Select all header checkbox
    $('selectAllHeader').addEventListener('change', e => {
        const checked = e.target.checked;
        if (checked) {
            state.checkedIds = state.cart.filter(item => !item.isStopped).map(item => item.id);
        } else {
            state.checkedIds = [];
        }
        renderCart();
    });
    
    // Select all summary checkbox
    $('selectAllSummary').addEventListener('change', e => {
        const checked = e.target.checked;
        if (checked) {
            state.checkedIds = state.cart.filter(item => !item.isStopped).map(item => item.id);
        } else {
            state.checkedIds = [];
        }
        renderCart();
    });
}

function changeQty(id, delta) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    if (item.isStopped) {
        showToast('Sản phẩm đã ngừng kinh doanh!', 'error');
        return;
    }
    
    if (delta === -1 && item.qty <= 1) {
        deleteItem(id);
        return;
    }
    
    if (delta === 1) {
        const maxStock = item.soLuongTon != null ? item.soLuongTon : 9999;
        if (item.qty >= maxStock) {
            showToast(`Chỉ còn ${maxStock} sản phẩm trong kho!`, 'error');
            return;
        }
        item.qty += 1;
    } else if (delta === -1) {
        item.qty -= 1;
    }
    saveCart();
    renderCart();
    updateCartBadgeGlobal();
}

function updateQtyInput(id, inputElement) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    if (item.isStopped) {
        showToast('Sản phẩm đã ngừng kinh doanh!', 'error');
        return;
    }

    let newQty = parseInt(inputElement.value);
    if (isNaN(newQty) || newQty < 1) {
        inputElement.value = item.qty;
        return;
    }

    if (newQty === item.qty) return;

    const maxStock = item.soLuongTon != null ? item.soLuongTon : 9999;
    if (newQty > maxStock) {
        showToast(`Chỉ còn ${maxStock} sản phẩm trong kho!`, 'error');
        inputElement.value = item.qty;
        return;
    }

    item.qty = newQty;
    saveCart();
    renderCart();
    updateCartBadgeGlobal();
}

function deleteItem(id) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    
    if (confirm(`Bạn muốn xóa "${item.tenSanPham}" khỏi giỏ hàng?`)) {
        state.cart = state.cart.filter(i => i.id !== id);
        state.checkedIds = state.checkedIds.filter(x => x !== id);
        saveCart();
        renderCart();
        updateCartBadgeGlobal();
        showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
    }
}

function setupActions() {
    // Delete selected
    $('btnDeleteSelected').addEventListener('click', () => {
        if (state.checkedIds.length === 0) {
            showToast('Vui lòng chọn ít nhất một sản phẩm để xóa!', 'error');
            return;
        }
        
        if (confirm(`Bạn muốn xóa ${state.checkedIds.length} sản phẩm đã chọn?`)) {
            state.cart = state.cart.filter(item => !state.checkedIds.includes(item.id));
            state.checkedIds = [];
            saveCart();
            renderCart();
            updateCartBadgeGlobal();
            showToast('Đã xóa các sản phẩm được chọn', 'success');
        }
    });
    
    // Checkout Click
    $('btnCheckoutSubmit').addEventListener('click', () => {
        if (state.checkedIds.length === 0) {
            showToast('Vui lòng chọn ít nhất một sản phẩm hợp lệ để mua hàng!', 'error');
            return;
        }
        
        // Filter checked items and ensure none are stopped
        const stoppedSelected = state.cart.filter(item => state.checkedIds.includes(item.id) && item.isStopped);
        if (stoppedSelected.length > 0) {
            showToast(`❌ Sản phẩm "${stoppedSelected[0].tenSanPham}" đã ngừng kinh doanh. Vui lòng xóa trước khi thanh toán!`, 'error');
            return;
        }

        const checkoutItems = state.cart.filter(item => state.checkedIds.includes(item.id) && !item.isStopped);
        if (checkoutItems.length === 0) {
            showToast('Không có sản phẩm hợp lệ nào để mua hàng!', 'error');
            return;
        }

        localStorage.setItem('checkout_items', JSON.stringify(checkoutItems));
        window.location.href = '/client/checkout';
    });
}

function calculateTotals() {
    let total = 0;
    let checkedCount = 0;
    
    state.cart.forEach(item => {
        if (!item.isStopped && state.checkedIds.includes(item.id)) {
            total += item.qty * (parseFloat(item.giaBan) || 0);
            checkedCount += item.qty;
        }
    });
    
    $('selectedCount').textContent = state.checkedIds.length;
    $('totalCheckedCount').textContent = checkedCount;
    $('totalPaymentAmount').textContent = formatPrice(total);
}

function saveCart() {
    localStorage.setItem('vshoes_cart', JSON.stringify(state.cart));
}

function formatPrice(val) {
    const n = parseFloat(val) || 0;
    return n.toLocaleString('vi-VN') + ' ₫';
}

function showToast(msg, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="#10b981" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="#ef4444" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    toast.innerHTML = `${icon} <span style="margin-left:8px;">${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.35s ease reverse';
        setTimeout(() => toast.remove(), 350);
    }, 2800);
}

function updateCartBadgeGlobal() {
    const cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const badge = $('cartCountBadgeGlobal') || $('cartCountBadge');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function getImageUrl(hinhAnh, defaultIdx = 0) {
    if (!hinhAnh || typeof hinhAnh !== 'string') {
        return '/images/white.png';
    }
    let img = hinhAnh.replace(/[\[\]"']/g, '').trim();
    if (!img) return '/images/white.png';
    if (img.includes(',')) {
        img = img.split(',')[0].trim();
    }
    if (!img) return '/images/white.png';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
        return img;
    }
    return '/images/' + img;
}

/* =============================================
   RECOMMENDED PRODUCTS
   ============================================= */
async function loadRecommendedProducts() {
    const container = $('recommendedProductsGrid');
    if (!container) return;

    try {
        const res = await fetch('/api/san-pham/search-sale');
        if (!res.ok) throw new Error('API error');
        const list = await res.json();

        if (!list || list.length === 0) {
            container.innerHTML = '<div style="grid-column: span 4; text-align: center; color: var(--gray-400); padding: 20px;">Chưa có sản phẩm đề xuất.</div>';
            return;
        }

        const grouped = {};
        for (const s of list) {
            const key = s.sanPhamId ? ('sp_' + s.sanPhamId) : (s.tenSanPham || 'Sản phẩm').trim().toLowerCase();
            if (!grouped[key]) {
                grouped[key] = {
                    id: s.id,
                    sanPhamId: s.sanPhamId || null,
                    tenSanPham: s.tenSanPham || 'Sản phẩm',
                    mauSac: s.mauSac || '',
                    giaBan: s.giaBan || 0,
                    giaGoc: s.giaGoc || null,
                    phanTramGiam: s.phanTramGiam || 0,
                    hinhAnh: s.hinhAnh
                };
            }
        }

        const items = Object.values(grouped).slice(0, 4);
        container.innerHTML = items.map(p => {
            const img = getImageUrl(p.hinhAnh, p.id);
            const hasDiscount = p.phanTramGiam > 0;
            return `
                <div class="product-card" onclick="window.location.href='/client/products/${p.id}'" style="cursor: pointer;">
                    <div class="product-img-wrap">
                        <img src="${img}" alt="${p.tenSanPham}" onerror="this.src='/images/white.png'">
                        ${hasDiscount ? `<span class="product-badge" style="background:#ef4444; color:white;">-${p.phanTramGiam}%</span>` : '<span class="product-badge">MỚI</span>'}
                    </div>
                    <div class="product-info">
                        <div class="product-name">${p.tenSanPham}</div>
                        <div class="product-price-row">
                            <span class="product-price">${formatPrice(p.giaBan)}</span>
                            ${hasDiscount && p.giaGoc ? `<span class="product-price-old">${formatPrice(p.giaGoc)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.warn('Lỗi tải sản phẩm đề xuất:', e);
        if (container) container.innerHTML = '';
    }
}
