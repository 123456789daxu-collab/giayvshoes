/**
 * SevenStrike - Product Detail JS
 */

const state = {
    target: null,       // target SanPhamChiTiet
    variants: [],       // all variants for this product
    selectedColor: '',
    selectedSize: '',
    selectedVariant: null,
    quantity: 1,
    cart: JSON.parse(localStorage.getItem('vshoes_cart') || '[]')
};

// Elements
const $ = id => document.getElementById(id);
const qtyInput = $('qtyInput');

document.addEventListener('DOMContentLoaded', () => {
    loadProductDetails();
    initQuantityControls();
    setupCartBtn();
    updateCartBadgeGlobal();
    loadRelatedProducts();
    loadProductNavigation();
    initReviewsModule();
});

// Extract ID from path /client/products/{id} or query param ?id={id}
function getProductId() {
    // 1. Kiểm tra query parameter ?id=...
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id') && urlParams.get('id')) {
        return urlParams.get('id');
    }
    // 2. Kiểm tra đường dẫn /client/products/{id} hoặc /client/product-detail/{id}
    const parts = window.location.pathname.split('/').filter(p => p.length > 0);
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(lastPart)) {
        return lastPart;
    }
    return lastPart;
}

let activeDiscountPercent = 0;

function parseFlexibleDate(val) {
    if (!val) return null;
    if (Array.isArray(val)) {
        return new Date(val[0], (val[1] || 1) - 1, val[2] || 1, val[3] || 0, val[4] || 0, val[5] || 0);
    }
    if (typeof val === 'string') {
        let s = val.trim();
        if (s.includes(' ')) {
            s = s.replace(' ', 'T');
        }
        if (s.includes('/')) {
            const parts = s.split('T')[0].split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    s = `${parts[0]}-${parts[1]}-${parts[2]}`;
                } else {
                    s = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

async function loadActiveDiscount() {
    try {
        let res = await fetch('/api/dot-giam-gia');
        if (!res.ok) {
            res = await fetch('/api/dot-giam-gia-local');
        }
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
                const now = new Date();
                const activeEvents = list.filter(d => {
                    const isStatusActive = (d.trangThai == 1 || d.trangThai === true || d.trangThai === '1');
                    if (!isStatusActive) return false;

                    const startDate = parseFlexibleDate(d.ngayBatDau);
                    const endDate = parseFlexibleDate(d.ngayKetThuc);

                    if (startDate && startDate > now) return false;
                    if (endDate && endDate < now) return false;
                    
                    const pct = parseFloat(d.phanTramGiam);
                    return (!isNaN(pct) && pct > 0);
                });

                if (activeEvents.length > 0) {
                    const maxV = activeEvents.reduce((max, curr) => 
                        (parseFloat(curr.phanTramGiam) > parseFloat(max.phanTramGiam)) ? curr : max, activeEvents[0]
                    );
                    activeDiscountPercent = parseFloat(maxV.phanTramGiam) || 0;
                } else {
                    activeDiscountPercent = 0;
                }
            } else {
                activeDiscountPercent = 0;
            }
        } else {
            activeDiscountPercent = 0;
        }
    } catch (err) {
        console.error('Lỗi tải đợt giảm giá:', err);
        activeDiscountPercent = 0;
    }
}

async function loadProductDetails() {
    const id = getProductId();
    try {
        await loadActiveDiscount();
        const res = await fetch(`/api/san-pham/detail-by-spct/${id}`);
        if (!res.ok) throw new Error('Không thể tải chi tiết sản phẩm');
        const data = await res.json();
        
        state.target = data.target;
        // Chỉ lấy các biến thể đang kinh doanh (trangThai == 1 hoặc null)
        state.variants = (data.variants || []).filter(v => v.trangThai == null || v.trangThai == 1);
        
        // Ưu tiên chọn phiên bản còn hàng trong kho nếu target hiện tại có số lượng = 0 hoặc đã ngừng kinh doanh
        let initialVariant = (state.target && (state.target.trangThai == null || state.target.trangThai == 1)) ? state.target : null;
        if ((!initialVariant || initialVariant.soLuongTon == null || initialVariant.soLuongTon <= 0) && state.variants.length > 0) {
            const inStockVariant = state.variants.find(v => v.soLuongTon != null && v.soLuongTon > 0);
            initialVariant = inStockVariant || state.variants[0];
        }

        if (initialVariant) {
            state.selectedColor = initialVariant.mauSac || '';
            state.selectedSize = initialVariant.sizeGiay ? String(initialVariant.sizeGiay) : '';
            state.selectedVariant = initialVariant;
        } else {
            state.selectedVariant = state.target;
        }

        renderProductInfo();
        updateCartBadgeGlobal();

        // Tải đánh giá của sản phẩm này
        const spIdToLoad = (state.target && state.target.sanPhamId) ? state.target.sanPhamId : id;
        loadAndRenderReviews(spIdToLoad);
    } catch (err) {
        console.error(err);
        showToast('Lỗi tải sản phẩm!', 'error');
    }
}

function renderProductInfo() {
    const v = state.selectedVariant;
    if (!v) return;

    $('productTitle').textContent = v.tenSanPham;
    $('productDescription').textContent = v.moTa || 'Giày chạy bộ VHOES chất lượng cao, thiết kế hỗ trợ êm ái và bứt phá tốc độ tối ưu. Da giày mềm mại, độ bền vượt trội.';
    
    // Price & Discount: giaBan là Giá bán/sau giảm, giaGoc là giá gốc niêm yết
    const discountPct = (v.phanTramGiam != null && v.phanTramGiam > 0)
        ? Math.round(v.phanTramGiam)
        : (activeDiscountPercent > 0 ? Math.round(activeDiscountPercent) : 0);

    let giaGocVal = 0;
    let giaDaGiamVal = parseFloat(v.giaBan) || 0;

    if (v.phanTramGiam != null && v.phanTramGiam > 0 && v.giaGoc != null) {
        giaGocVal = parseFloat(v.giaGoc) || 0;
        giaDaGiamVal = parseFloat(v.giaBan) || 0;
    } else if (discountPct > 0) {
        giaGocVal = giaDaGiamVal;
        giaDaGiamVal = Math.round(giaGocVal * (1 - discountPct / 100));
    }

    if (discountPct > 0 && giaGocVal > 0) {
        if ($('priceOriginal')) {
            $('priceOriginal').textContent = formatPrice(giaGocVal);
            $('priceOriginal').style.display = 'block';
        }
        if ($('priceCurrent')) $('priceCurrent').textContent = formatPrice(giaDaGiamVal);
        if ($('discountBadge')) {
            $('discountBadge').textContent = `-${discountPct}%`;
            $('discountBadge').style.display = 'inline-block';
        }
    } else {
        if ($('priceCurrent')) $('priceCurrent').textContent = formatPrice(giaDaGiamVal);
        if ($('priceOriginal')) $('priceOriginal').style.display = 'none';
        if ($('discountBadge')) $('discountBadge').style.display = 'none';
    }

    // Main image
    const spctId = state.target ? (state.target.id || 0) : 0;
    const mainImg = getImageUrl(v.hinhAnh, spctId);
    const fallbackDefault = getImageUrl(null, spctId);

    const mainImgContainer = document.querySelector('.main-image-container');
    if (mainImgContainer) {
        let badgeEl = mainImgContainer.querySelector('.discount-corner-badge');
        if (discountPct > 0) {
            if (!badgeEl) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'discount-corner-badge';
                badgeEl.style.cssText = 'position:absolute;top:16px;left:16px;background:#ef4444;color:white;font-size:13px;font-weight:900;padding:5px 12px;border-radius:20px;z-index:10;box-shadow:0 4px 14px rgba(239,68,68,0.4);';
                mainImgContainer.appendChild(badgeEl);
            }
            badgeEl.textContent = `-${discountPct}%`;
            badgeEl.style.display = 'block';
        } else if (badgeEl) {
            badgeEl.style.display = 'none';
        }
    }

    const mainImgEl = $('mainProductImage');
    if (mainImgEl) {
        mainImgEl.src = mainImg;
        mainImgEl.onerror = function() {
            this.src = fallbackDefault;
        };
    }

    // Render stock indicator
    const stock = v.soLuongTon != null ? v.soLuongTon : 0;
    const dot = document.querySelector('.stock-dot');
    const text = $('stockText');
    
    dot.className = 'stock-dot';
    const btnAdd = $('btnAddToCart');
    const btnBuy = $('btnBuyNow');

    if (v.trangThai != null && v.trangThai != 1) {
        dot.classList.add('out');
        text.textContent = 'Biến thể này đã ngừng kinh doanh';
        if (btnAdd) {
            btnAdd.disabled = true;
            btnAdd.textContent = 'Ngừng kinh doanh';
        }
        if (btnBuy) {
            btnBuy.disabled = true;
            btnBuy.textContent = 'Ngừng kinh doanh';
        }
    } else if (stock === 0) {
        dot.classList.add('out');
        text.textContent = 'Hết hàng trong kho';
        if (btnAdd) {
            btnAdd.disabled = true;
            btnAdd.textContent = 'Hết hàng trong kho';
        }
        if (btnBuy) {
            btnBuy.disabled = true;
            btnBuy.textContent = 'Hết hàng trong kho';
        }
    } else if (stock <= 5) {
        dot.classList.add('low');
        text.textContent = `Chỉ còn ${stock} sản phẩm trong kho`;
        if (btnAdd) {
            btnAdd.disabled = false;
            btnAdd.innerHTML = '<i data-lucide="shopping-cart" style="width: 18px; height: 18px;"></i> Thêm vào giỏ hàng';
        }
        if (btnBuy) {
            btnBuy.disabled = false;
            btnBuy.innerHTML = '<i data-lucide="zap" style="width: 18px; height: 18px;"></i> Mua hàng';
        }
        if (window.lucide) lucide.createIcons();
    } else {
        text.textContent = `Còn hàng (${stock} sản phẩm trong kho)`;
        if (btnAdd) {
            btnAdd.disabled = false;
            btnAdd.innerHTML = '<i data-lucide="shopping-cart" style="width: 18px; height: 18px;"></i> Thêm vào giỏ hàng';
        }
        if (btnBuy) {
            btnBuy.disabled = false;
            btnBuy.innerHTML = '<i data-lucide="zap" style="width: 18px; height: 18px;"></i> Mua hàng';
        }
        if (window.lucide) lucide.createIcons();
    }

    // Render thumbnails: Only include real images of this variant / product
    let realThumbs = [];
    if (v.hinhAnh && typeof v.hinhAnh === 'string') {
        const splitImgs = v.hinhAnh.split(',').map((s, i) => getImageUrl(s.trim(), spctId + i)).filter(Boolean);
        realThumbs.push(...splitImgs);
    }
    
    // Add images from other variants of the same product if available
    if (state.variants && state.variants.length > 0) {
        state.variants.forEach((varItem, i) => {
            if (varItem.hinhAnh && typeof varItem.hinhAnh === 'string') {
                const varImgs = varItem.hinhAnh.split(',').map((s, idx) => getImageUrl(s.trim(), spctId + i + idx)).filter(Boolean);
                realThumbs.push(...varImgs);
            }
        });
    }

    if (!realThumbs.includes(mainImg)) {
        realThumbs.unshift(mainImg);
    }

    const uniqueThumbs = [...new Set(realThumbs)].filter(Boolean);

    const thumbGridEl = $('thumbnailGrid');
    if (thumbGridEl) {
        if (uniqueThumbs.length <= 1) {
            thumbGridEl.innerHTML = '';
            thumbGridEl.style.display = 'none';
        } else {
            thumbGridEl.style.display = 'grid';
            thumbGridEl.innerHTML = uniqueThumbs.slice(0, 5).map((t, idx) => `
                <div class="thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="setMainImage(this, '${t}')">
                    <img src="${t}" alt="Thumbnail" onerror="this.src='${fallbackDefault}'">
                </div>
            `).join('');
        }
    }

    // Render color buttons
    const colors = [...new Set(state.variants.map(x => x.mauSac))].filter(Boolean);
    $('colorButtons').innerHTML = colors.map(c => `
        <button class="btn-option ${c === state.selectedColor ? 'active' : ''}" onclick="selectColor(this, '${c}')">
            ${c}
        </button>
    `).join('');

    // Render size buttons
    const sizes = [...new Set(state.variants.map(x => String(x.sizeGiay)))].filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    $('sizeButtons').innerHTML = sizes.map(s => `
        <button class="btn-option ${s === state.selectedSize ? 'active' : ''}" onclick="selectSize(this, '${s}')">
            ${s}
        </button>
    `).join('');
}

function setMainImage(el, src) {
    document.querySelectorAll('.thumbnail-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    $('mainProductImage').src = src;
}

function selectColor(btn, color) {
    document.querySelectorAll('#colorButtons .btn-option').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    state.selectedColor = color;
    findMatchingVariant();
}

function selectSize(btn, size) {
    document.querySelectorAll('#sizeButtons .btn-option').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    state.selectedSize = size;
    findMatchingVariant();
}

function findMatchingVariant() {
    const match = state.variants.find(v => v.mauSac === state.selectedColor && String(v.sizeGiay) === state.selectedSize);
    if (match) {
        state.selectedVariant = match;
        renderProductInfo();
    } else {
        state.selectedVariant = null;
        $('stockText').textContent = 'Kích thước / Màu sắc này hiện không có sẵn';
        const dot = document.querySelector('.stock-dot');
        if (dot) dot.className = 'stock-dot out';
        const btnAdd = $('btnAddToCart');
        const btnBuy = $('btnBuyNow');
        if (btnAdd) {
            btnAdd.disabled = true;
            btnAdd.textContent = 'Không có sẵn';
        }
        if (btnBuy) {
            btnBuy.disabled = true;
            btnBuy.textContent = 'Không có sẵn';
        }
    }
}

function initQuantityControls() {
    $('btnQtyMinus').addEventListener('click', () => {
        if (state.quantity > 1) {
            state.quantity--;
            qtyInput.value = state.quantity;
        }
    });

    $('btnQtyPlus').addEventListener('click', () => {
        const v = state.selectedVariant;
        if (!v) return;
        const max = v.soLuongTon != null ? v.soLuongTon : 0;
        if (state.quantity < max) {
            state.quantity++;
            qtyInput.value = state.quantity;
        } else {
            showToast('Không thể vượt quá số lượng trong kho!', 'error');
        }
    });

    qtyInput.addEventListener('input', () => {
        qtyInput.value = qtyInput.value.replace(/[^0-9]/g, '');
    });

    qtyInput.addEventListener('change', () => {
        const v = state.selectedVariant;
        let val = parseInt(qtyInput.value);
        if (isNaN(val) || val < 1) {
            val = 1;
        }
        if (v) {
            const max = v.soLuongTon != null ? v.soLuongTon : 0;
            if (val > max) {
                showToast('Không thể vượt quá số lượng trong kho!', 'error');
                val = max > 0 ? max : 1;
            }
        }
        state.quantity = val;
        qtyInput.value = val;
    });
}

function setupCartBtn() {
    const btnAdd = $('btnAddToCart');
    const btnBuy = $('btnBuyNow');

    if (btnAdd) {
        btnAdd.addEventListener('click', () => handleAddToCart(false));
    }
    if (btnBuy) {
        btnBuy.addEventListener('click', () => handleAddToCart(true));
    }
}

function handleAddToCart(isBuyNow = false) {
    const v = state.selectedVariant;
    if (!v) {
        showToast('Vui lòng chọn màu sắc và kích thước!', 'error');
        return;
    }

    if (v.trangThai != null && v.trangThai != 1) {
        showToast('Biến thể này đã ngừng kinh doanh!', 'error');
        return;
    }

    const max = v.soLuongTon != null ? v.soLuongTon : 0;
    if (max <= 0) {
        showToast('Sản phẩm đã hết hàng trong kho!', 'error');
        return;
    }

    const requestedQty = parseInt(qtyInput?.value) || state.quantity || 1;
    if (requestedQty <= 0) {
        showToast('Số lượng phải lớn hơn 0!', 'error');
        return;
    }

    const priceToUse = activeDiscountPercent > 0 
        ? Math.round(parseFloat(v.giaBan) * (1 - activeDiscountPercent / 100))
        : parseFloat(v.giaBan);

    const itemData = {
        id: v.id,
        tenSanPham: v.tenSanPham,
        mauSac: v.mauSac,
        sizeGiay: v.sizeGiay,
        giaGoc: parseFloat(v.giaBan),
        giaBan: priceToUse,
        phanTramGiam: activeDiscountPercent,
        hinhAnh: v.hinhAnh,
        qty: requestedQty,
        soLuongTon: max
    };

    if (isBuyNow) {
        if (requestedQty > max) {
            showToast(`Không thể mua số lượng (${requestedQty}) vượt quá tồn kho (${max})!`, 'error');
            if (qtyInput) qtyInput.value = max > 0 ? max : 1;
            state.quantity = max > 0 ? max : 1;
            return;
        }

        // Mua hàng nhanh: Đặt vào checkout_items và chuyển hướng sang trang thanh toán ngay
        localStorage.setItem('checkout_items', JSON.stringify([itemData]));
        window.location.href = '/client/checkout';
        return;
    }

    // Thêm vào giỏ hàng
    const existingIndex = state.cart.findIndex(i => i.id === v.id);
    const currentQty = existingIndex > -1 ? state.cart[existingIndex].qty : 0;
    const totalRequested = currentQty + requestedQty;

    if (totalRequested > max) {
        showToast(`Không thể thêm vào giỏ hàng! Số lượng yêu cầu (${totalRequested}) vượt quá tồn kho (${max}).`, 'error');
        if (qtyInput) qtyInput.value = max > 0 ? max : 1;
        state.quantity = max > 0 ? max : 1;
        return;
    }

    if (existingIndex > -1) {
        state.cart[existingIndex].qty = totalRequested;
    } else {
        state.cart.push(itemData);
    }

    localStorage.setItem('vshoes_cart', JSON.stringify(state.cart));
    
    // Cập nhật badge giỏ hàng toàn cục
    if (typeof window.updateCartBadgeGlobal === 'function') {
        window.updateCartBadgeGlobal();
    }

    showToast(`Đã thêm ${requestedQty} sản phẩm vào giỏ hàng!`, 'success');
}

// Utils
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
    }, 2500);
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

async function loadRelatedProducts() {
    try {
        const res = await fetch('/api/san-pham/search-sale');
        if (!res.ok) throw new Error('Không thể tải sản phẩm liên quan');
        const data = await res.json();
        
        const currentId = getProductId();
        const related = data.filter(p => String(p.id) !== String(currentId)).slice(0, 4);
        
        const grid = $('relatedProductsGrid');
        if (!grid) return;
        
        if (related.length === 0) {
            grid.innerHTML = '<div style="grid-column: span 4; text-align: center; color: var(--gray-400); padding: 20px;">Không có sản phẩm liên quan.</div>';
            return;
        }
        
        let reviewSummary = {};
        try {
            const resReview = await fetch('/api/auth/danh-gia/summary-all');
            if (resReview.ok) reviewSummary = await resReview.json();
        } catch (e) {}

        grid.innerHTML = related.map(p => {
            const hasDiscount = p.phanTramGiam != null && p.phanTramGiam > 0 && p.giaGoc != null;
            const discountPct = hasDiscount ? Math.round(p.phanTramGiam) : 0;
            const price = parseFloat(p.giaBan) || 0;
            const originalPrice = hasDiscount ? parseFloat(p.giaGoc) : 0;
            const imgUrl = p.hinhAnh ? (p.hinhAnh.startsWith('http') || p.hinhAnh.startsWith('/') ? p.hinhAnh : '/images/' + p.hinhAnh) : '/images/white.png';
            
            const sId = String(p.id);
            const spId = p.sanPhamId ? String(p.sanPhamId) : null;
            const rev = reviewSummary[sId] || (spId ? reviewSummary[spId] : null);
            const realRating = rev ? rev.danhGia : '5.0';
            const realCount = rev ? rev.soLuotDanhGia : 0;

            return `
                <div class="product-card" onclick="window.location.href='/client/products/${p.id}'">
                    <div class="product-image-wrap">
                        <div class="product-badges">
                            ${hasDiscount ? `<span class="badge badge-sale" style="background:#ef4444;color:white;font-weight:900;">-${discountPct}%</span>` : ''}
                        </div>
                        <img src="${imgUrl}" alt="${p.tenSanPham}" onerror="this.src='/images/white.png'">
                    </div>
                    <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--gray-400); text-transform: uppercase;">Mã: ${p.ma}</div>
                        <h3 style="font-size: 14px; font-weight: 700; color: var(--gray-900); margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px;">${p.tenSanPham}</h3>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px;">
                            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                ${hasDiscount ? `<span style="font-size: 12px; color: #94a3b8; text-decoration: line-through; font-weight: 500;">${formatPrice(originalPrice)}</span>` : ''}
                                <span style="font-size: 16px; font-weight: 900; color: #ef4444; line-height: 1.2;">${formatPrice(price)}</span>
                            </div>
                            <div style="font-size: 12px; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 3px;">
                                <i data-lucide="star" style="width:14px;height:14px;fill:#f59e0b;color:#f59e0b;vertical-align:-1px;margin-right:2px;"></i> <span>${realRating}</span> <span style="color: #94a3b8; font-weight: 500;">(${realCount})</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Reinitialize icons in related products
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    } catch (err) {
        console.error(err);
        const grid = $('relatedProductsGrid');
        if (grid) grid.innerHTML = '<div style="grid-column: span 4; text-align: center; color: var(--gray-400); padding: 20px;">Lỗi tải sản phẩm liên quan.</div>';
    }
}

// ========== PRODUCT NAVIGATION ==========
async function loadProductNavigation() {
    try {
        const res = await fetch('/api/san-pham/search-sale');
        if (!res.ok) return;
        const data = await res.json();

        // Deduplicate: keep first variant per unique product name
        const seen = new Set();
        const uniqueProducts = [];
        for (const p of data) {
            const key = p.tenSanPham;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueProducts.push(p);
            }
        }

        const currentId = String(getProductId());
        const currentIdx = uniqueProducts.findIndex(p => String(p.id) === currentId);
        if (currentIdx === -1 || uniqueProducts.length < 2) return;

        const total = uniqueProducts.length;
        const prevProd = currentIdx > 0 ? uniqueProducts[currentIdx - 1] : null;
        const nextProd = currentIdx < total - 1 ? uniqueProducts[currentIdx + 1] : null;

        // Show nav bar
        const navBar = document.getElementById('productNavBar');
        if (navBar) navBar.style.display = 'block';

        // Counter
        const counter = document.getElementById('productNavCounter');
        if (counter) counter.textContent = `${currentIdx + 1} / ${total}`;

        // Prev button
        const prevLink = document.getElementById('prevProductLink');
        const prevName = document.getElementById('prevProductName');
        if (prevLink && prevName) {
            if (prevProd) {
                prevLink.href = `/client/products/${prevProd.id}`;
                prevName.textContent = prevProd.tenSanPham;
                prevLink.classList.remove('disabled-nav');
            } else {
                prevLink.classList.add('disabled-nav');
                prevName.textContent = 'Đầu danh sách';
            }
        }

        // Next button
        const nextLink = document.getElementById('nextProductLink');
        const nextName = document.getElementById('nextProductName');
        if (nextLink && nextName) {
            if (nextProd) {
                nextLink.href = `/client/products/${nextProd.id}`;
                nextName.textContent = nextProd.tenSanPham;
                nextLink.classList.remove('disabled-nav');
            } else {
                nextLink.classList.add('disabled-nav');
                nextName.textContent = 'Cuối danh sách';
            }
        }

    } catch (err) {
        console.warn('Không thể tải điều hướng sản phẩm:', err);
    }
}

// ========== CUSTOMER REVIEWS MODULE (DATABASE DRIVEN) ==========
let currentStarRating = 5;

async function initReviewsModule() {
    const prodId = getProductId();
    if (!prodId) return;

    await loadAndRenderReviews(prodId);

    // Toggle form with auth check
    const btnToggle = $('btnToggleReviewForm');
    const formContainer = $('reviewFormContainer');
    const btnCancel = $('btnCancelReview');
    const btnSubmit = $('btnSubmitReview');

    if (btnToggle && formContainer) {
        btnToggle.addEventListener('click', async () => {
            const isHidden = formContainer.style.display === 'none';
            if (!isHidden) {
                formContainer.style.display = 'none';
                return;
            }

            // Kiểm tra trạng thái đăng nhập
            try {
                const res = await fetch('/api/auth/current-user');
                const data = res.ok ? await res.json() : null;

                if (!data || !data.loggedIn) {
                    showToast('Bạn cần đăng nhập để viết đánh giá cho sản phẩm!', 'error');
                    if (confirm('Bạn cần đăng nhập tài khoản để viết đánh giá.\n\nBạn có muốn chuyển sang trang Đăng nhập ngay bây giờ?')) {
                        window.location.href = '/client/dang-nhap';
                    }
                    return;
                }

                // Nếu đã đăng nhập -> tự động điền họ tên người dùng
                const nameInput = $('reviewAuthorInput');
                if (nameInput) {
                    nameInput.value = (data.user && data.user.hoTen) ? data.user.hoTen : '';
                }

                formContainer.style.display = 'block';
                const textInput = $('reviewTextInput');
                if (textInput) textInput.focus();

            } catch (e) {
                showToast('Vui lòng đăng nhập để viết đánh giá!', 'error');
            }
        });
    }

    if (btnCancel && formContainer) {
        btnCancel.addEventListener('click', () => {
            formContainer.style.display = 'none';
        });
    }

    // Star picker
    const starSpans = document.querySelectorAll('#starPicker span');
    starSpans.forEach(span => {
        span.addEventListener('click', () => {
            const starVal = parseInt(span.dataset.star);
            currentStarRating = starVal;
            starSpans.forEach((s, idx) => {
                s.style.color = idx < starVal ? '#f59e0b' : '#cbd5e1';
            });
        });
    });

    // Submit review trực tiếp vào database qua API
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const authorInput = $('reviewAuthorInput');
            const textInput = $('reviewTextInput');
            const author = authorInput ? authorInput.value.trim() : '';
            const text = textInput ? textInput.value.trim() : '';

            if (!author) {
                showToast('Vui lòng nhập họ tên của bạn!', 'error');
                return;
            }
            if (!text) {
                showToast('Vui lòng nhập nội dung đánh giá!', 'error');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Đang gửi...';

            try {
                const resp = await fetch('/api/auth/danh-gia/submit-direct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sanPhamId: prodId,
                        soSao: currentStarRating,
                        noiDung: text,
                        tenHienThi: author
                    })
                });

                const data = await resp.json();
                if (resp.ok && data.success) {
                    showToast('Cảm ơn bạn đã gửi đánh giá cho sản phẩm!', 'success');
                    if (textInput) textInput.value = '';
                    if (formContainer) formContainer.style.display = 'none';
                    // Tải lại danh sách đánh giá từ server
                    await loadAndRenderReviews(prodId);
                } else {
                    showToast(data.error || 'Gửi đánh giá thất bại!', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối máy chủ!', 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Gửi Đánh Giá';
            }
        });
    }
}

async function loadAndRenderReviews(prodId) {
    try {
        const res = await fetch(`/api/auth/danh-gia/san-pham/${prodId}`);
        const reviews = res.ok ? await res.json() : [];
        renderReviewsDashboard(reviews);
        renderReviewsList(reviews);
    } catch (e) {
        console.warn('Lỗi khi tải đánh giá sản phẩm:', e);
        renderReviewsDashboard([]);
        renderReviewsList([]);
    }
}

function renderReviewsDashboard(reviews) {
    const total = reviews.length;
    const badge = $('reviewCountBadge');
    const totalText = $('totalReviewsCountText');
    if (badge) badge.textContent = `${total} đánh giá`;
    if (totalText) totalText.textContent = total;

    const sumRating = reviews.reduce((sum, r) => sum + (parseInt(r.rating || r.soSao) || 5), 0);
    const avg = total > 0 ? (sumRating / total).toFixed(1) : '0.0';

    const avgScoreEl = $('avgRatingScore');
    const avgStarsEl = $('avgRatingStars');
    if (avgScoreEl) avgScoreEl.textContent = avg;
    if (avgStarsEl) {
        const numStars = total > 0 ? Math.round(parseFloat(avg)) : 0;
        avgStarsEl.innerHTML = '<i data-lucide="star" style="width:18px;height:18px;fill:#f59e0b;color:#f59e0b;"></i>'.repeat(numStars) + '<i data-lucide="star" style="width:18px;height:18px;color:#cbd5e1;"></i>'.repeat(5 - numStars); if(window.lucide) lucide.createIcons();
    }

    // Breakdown bars
    const breakdownContainer = $('ratingBreakdownBars');
    if (!breakdownContainer) return;

    let counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const star = parseInt(r.rating || r.soSao) || 5;
        if (counts[star] !== undefined) counts[star]++;
    });

    let html = '';
    for (let star = 5; star >= 1; star--) {
        const count = counts[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        html += `
            <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#475569;">
                <span style="width:30px;font-weight:700;text-align:right;color:#0f172a;">${star} <i data-lucide="star" style="width:13px;height:13px;fill:#f59e0b;color:#f59e0b;vertical-align:-1px;"></i></span>
                <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:4px;transition:width 0.5s;"></div>
                </div>
                <span style="width:40px;font-size:12px;color:#64748b;font-weight:600;">${pct}%</span>
            </div>
        `;
    }
    breakdownContainer.innerHTML = html;
}

function renderReviewsList(reviews) {
    const listEl = $('reviewsList');
    if (!listEl) return;

    if (!reviews || reviews.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center;color:#94a3b8;padding:40px 20px;background:#f8fafc;border-radius:14px;border:1px dashed #cbd5e1;">
                <div style="margin-bottom:8px;"><i data-lucide="star" style="width:32px;height:32px;color:#f59e0b;fill:#f59e0b;"></i></div>
                <div style="font-size:15px;font-weight:700;color:#475569;">Chưa có đánh giá nào cho sản phẩm này</div>
                <div style="font-size:13px;color:#94a3b8;margin-top:4px;">Hãy mua hàng để là người đầu tiên chia sẻ cảm nhận!</div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = reviews.map(r => {
        const authorName = r.author || r.tenHienThi || 'Khách hàng';
        const initial = authorName.trim().charAt(0).toUpperCase() || 'U';
        const rating = parseInt(r.rating || r.soSao) || 5;
        const starsStr = '<i data-lucide="star" style="width:14px;height:14px;fill:#f59e0b;color:#f59e0b;"></i>'.repeat(rating) + '<i data-lucide="star" style="width:14px;height:14px;color:#cbd5e1;"></i>'.repeat(5 - rating);
        const images = r.images || r.anhDanhGia || [];
        const dateStr = r.date || (r.ngayTao ? r.ngayTao.substring(0, 10) : 'Vừa xong');

        let imagesHtml = '';
        if (Array.isArray(images) && images.length > 0) {
            imagesHtml = `
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                    ${images.map(img => {
                        let finalSrc = (img || '').trim();
                        if (finalSrc && !finalSrc.startsWith('/') && !finalSrc.startsWith('http') && !finalSrc.startsWith('data:')) {
                            finalSrc = '/upload/' + finalSrc;
                        }
                        return `
                        <img src="${finalSrc}" 
                             alt="Ảnh đánh giá" 
                             style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1.5px solid #e2e8f0; cursor: pointer; transition: transform 0.2s;"
                             onclick="showImageModal('${finalSrc}')"
                             onmouseover="this.style.transform='scale(1.05)'"
                             onmouseout="this.style.transform='scale(1)'"
                             onerror="this.style.display='none'">
                        `;
                    }).join('')}
                </div>
            `;
        }

        return `
            <div style="background:#f8fafc;border-radius:14px;border:1px solid #e8edf3;padding:18px 20px;display:flex;flex-direction:column;gap:8px;transition:all .2s;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#00adef,#0077b6);color:white;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,173,239,0.3);flex-shrink:0;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-weight:800;color:#0f172a;font-size:14px;display:flex;align-items:center;gap:8px;">
                                ${escHtml(authorName)}
                                ${r.verified ? '<span style="background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="check-circle" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px;"></i>Đã mua hàng</span>' : ''}
                            </div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${escHtml(dateStr)}</div>
                        </div>
                    </div>
                    <div style="color:#f59e0b;font-size:15px;letter-spacing:2px;">${starsStr}</div>
                </div>
                <p style="font-size:14px;color:#334155;line-height:1.6;margin:4px 0 0 0;">${escHtml(r.text || r.noiDung || '')}</p>
                ${imagesHtml}

                ${r.phanHoi ? `
                    <div style="margin-top:12px;background:#ffffff;border-left:3.5px solid #00adef;border-radius:0 10px 10px 0;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);border-top:1px solid #edf2f7;border-right:1px solid #edf2f7;border-bottom:1px solid #edf2f7;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px;">
                            <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#0284c7;">
                                <span style="background:linear-gradient(135deg,#00adef,#0f2d4a);color:white;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.2px;">Phản Hồi Của Người Bán</span>
                                <span>${escHtml(r.nguoiPhanHoi || 'Shop VShoes')}</span>
                            </div>
                            <div style="font-size:11.5px;color:#94a3b8;">${escHtml(r.ngayPhanHoi || '')}</div>
                        </div>
                        <div style="font-size:13.5px;color:#334155;line-height:1.55;margin-top:6px;">
                            ${escHtml(r.phanHoi)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

window.showImageModal = function(imgSrc) {
    const existing = document.getElementById('reviewImgModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'reviewImgModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.8); display: flex;
        align-items: center; justify-content: center;
        padding: 20px; cursor: pointer;
    `;
    modal.innerHTML = `
        <div style="position: relative; max-width: 90vw; max-height: 90vh;">
            <img src="${imgSrc}" style="max-width: 100%; max-height: 85vh; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <button style="position: absolute; top: -14px; right: -14px; width: 32px; height: 32px; border-radius: 50%; background: white; border: none; font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i data-lucide="x" style="width:18px;height:18px;"></i></button>
        </div>
    `;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
};

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

