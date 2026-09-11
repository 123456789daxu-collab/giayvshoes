/**
 * VSHOES - Trang Chủ Client JS
 * Handles: Hero Slider, Cart, Product Rendering, Scroll effects
 */

// ========== STATE ==========
const state = {
    cart: JSON.parse(localStorage.getItem('vshoes_cart') || '[]'),
    products: [],
    currentSlide: 0,
    slideTimer: null,
};

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    initSlider();
    initScrollEffects();
    initCart();
    initRevealAnimations();
    initHomeCountdown();
    loadProducts();
    initScrollTop();
    updateCartBadge();
});

// ========== HERO SLIDER ==========
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;

    function goTo(idx) {
        slides[state.currentSlide].classList.remove('active');
        slides[state.currentSlide].classList.add('leaving');
        setTimeout(() => slides[state.currentSlide < slides.length ? state.currentSlide : 0]?.classList.remove('leaving'), 800);

        state.currentSlide = (idx + slides.length) % slides.length;
        slides[state.currentSlide].classList.add('active');

        dots.forEach((d, i) => d.classList.toggle('active', i === state.currentSlide));
    }

    function next() { goTo(state.currentSlide + 1); }
    function prev() { goTo(state.currentSlide - 1); }

    function startAuto() {
        clearInterval(state.slideTimer);
        state.slideTimer = setInterval(next, 5000);
    }

    document.getElementById('sliderNext')?.addEventListener('click', () => { next(); startAuto(); });
    document.getElementById('sliderPrev')?.addEventListener('click', () => { prev(); startAuto(); });

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { goTo(i); startAuto(); });
    });

    startAuto();
}

// ========== SCROLL EFFECTS ==========
function initScrollEffects() {
    const header = document.querySelector('.site-header');

    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
}

// ========== REVEAL ANIMATIONS ==========
function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ========== SCROLL TO TOP ==========
function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== CART ==========
function initCart() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartClose = document.getElementById('cartClose');

    function openCart() {
        cartSidebar?.classList.add('open');
        cartOverlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCartItems();
    }

    function closeCart() {
        cartSidebar?.classList.remove('open');
        cartOverlay?.classList.remove('open');
        document.body.style.overflow = '';
    }

    cartBtn?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);
}

function addToCart(product, quantityToAdd = 1) {
    const maxStock = product.soLuongTon != null ? product.soLuongTon : (product.soLuong != null ? product.soLuong : 9999);
    if (maxStock <= 0) {
        showToast('Sản phẩm đã hết hàng trong kho!', 'error');
        return false;
    }

    const existing = state.cart.find(i => i.id === product.id && i.sizeGiay === product.sizeGiay);
    const currentQty = existing ? existing.qty : 0;
    const requestedTotal = currentQty + quantityToAdd;

    if (requestedTotal > maxStock) {
        showToast(`Không thể thêm! Số lượng yêu cầu (${requestedTotal}) vượt quá số lượng tồn kho (${maxStock}).`, 'error');
        return false;
    }

    if (existing) {
        existing.qty = requestedTotal;
    } else {
        state.cart.push({ ...product, qty: quantityToAdd, soLuongTon: maxStock });
    }
    saveCart();
    updateCartBadge();
    showToast(`Đã thêm ${quantityToAdd} "${product.tenSanPham}" vào giỏ hàng`, 'success');
    return true;
}

function updateCartQty(id, sizeGiay, delta) {
    const item = state.cart.find(i => i.id === id && i.sizeGiay === sizeGiay);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        state.cart = state.cart.filter(i => !(i.id === id && i.sizeGiay === sizeGiay));
    }
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function removeFromCart(id, sizeGiay) {
    state.cart = state.cart.filter(i => !(i.id === id && i.sizeGiay === sizeGiay));
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('vshoes_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
    const total = state.cart.reduce((s, i) => s + i.qty, 0);
    const badge = document.getElementById('cartCountBadge') || document.getElementById('cartCountBadgeGlobal');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function renderCartItems() {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalAmount');
    if (!container) return;

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <p>Giỏ hàng trống</p>
                <span style="font-size:13px;color:var(--gray-400);">Hãy thêm sản phẩm yêu thích!</span>
            </div>`;
        if (totalEl) totalEl.textContent = '0 ₫';
        return;
    }

    const total = state.cart.reduce((s, i) => s + i.qty * (parseFloat(i.giaBan) || 0), 0);

    container.innerHTML = state.cart.map(item => `
        <div class="cart-item" style="${item.isStopped ? 'background:#fff5f5; opacity:0.85;' : ''}">
            <div class="cart-item-img">
                <img src="${getImageUrl(item.hinhAnh)}" alt="${item.tenSanPham}" onerror="this.src='/images/white.png'">
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name" style="${item.isStopped ? 'color:#64748b; text-decoration:line-through;' : ''}">${item.tenSanPham}</div>
                <div class="cart-item-variant">Màu: ${item.mauSac || '—'} | Size: ${item.sizeGiay || '—'}</div>
                ${item.isStopped ? `<div style="color:#dc2626; font-size:10.5px; font-weight:800; margin-top:2px;"><i data-lucide="ban" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px;"></i>ĐÃ NGỪNG BÁN</div>` : ''}
                <div class="cart-item-bottom">
                    <div class="qty-control" style="${item.isStopped ? 'opacity:0.5; pointer-events:none;' : ''}">
                        <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.sizeGiay}, -1)">−</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.sizeGiay}, 1)">+</button>
                    </div>
                    <div class="cart-item-price" style="${item.isStopped ? 'color:#94a3b8;' : ''}">${formatPrice(item.giaBan * item.qty)}</div>
                    <button class="cart-item-del" onclick="removeFromCart(${item.id}, ${item.sizeGiay})" title="Xóa">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    if (totalEl) totalEl.textContent = formatPrice(total);
}

// ========== LOAD PRODUCTS ==========
async function loadProducts() {
    const grid = document.getElementById('newProductsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/san-pham/search-sale?keyword=');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        // Lấy thống kê đánh giá thực tế từ cơ sở dữ liệu
        let reviewSummary = {};
        try {
            const resReview = await fetch('/api/auth/danh-gia/summary-all');
            if (resReview.ok) reviewSummary = await resReview.json();
        } catch (e) {}

        // Group identical products by parent product (sanPhamId or tenSanPham)
        const groupedMap = {};
        for (const s of data) {
            const key = s.sanPhamId ? ('sp_' + s.sanPhamId) : (s.tenSanPham || 'Sản phẩm').trim().toLowerCase();
            const sId = String(s.id);
            const spId = s.sanPhamId ? String(s.sanPhamId) : null;
            const rev = (spId && reviewSummary[spId]) ? reviewSummary[spId] : (reviewSummary[sId] || null);
            const realRating = rev ? rev.danhGia : '5.0';
            const realCount = rev ? rev.soLuotDanhGia : 0;

            if (!groupedMap[key]) {
                groupedMap[key] = {
                    id: s.id, // ID of first variant as reference
                    sanPhamId: s.sanPhamId || null,
                    tenSanPham: s.tenSanPham || 'VShoes Runner Pro',
                    mauSac: s.mauSac || '',
                    giaBan: s.giaBan || 0,
                    giaGoc: s.giaGoc || null,
                    phanTramGiam: s.phanTramGiam || null,
                    hinhAnh: s.hinhAnh,
                    sizeGiay: s.sizeGiay,
                    soLuongTon: 0,
                    sizes: [],
                    variants: [],
                    danhGia: realRating,
                    soLuotDanhGia: realCount
                };
            } else {
                if (s.phanTramGiam && (!groupedMap[key].phanTramGiam || s.phanTramGiam > groupedMap[key].phanTramGiam)) {
                    groupedMap[key].phanTramGiam = s.phanTramGiam;
                    groupedMap[key].giaGoc = s.giaGoc;
                    groupedMap[key].giaBan = s.giaBan;
                }
                if (rev && rev.soLuotDanhGia > groupedMap[key].soLuotDanhGia) {
                    groupedMap[key].danhGia = rev.danhGia;
                    groupedMap[key].soLuotDanhGia = rev.soLuotDanhGia;
                }
            }
            if (s.sizeGiay && !groupedMap[key].sizes.includes(s.sizeGiay)) {
                groupedMap[key].sizes.push(s.sizeGiay);
            }
            groupedMap[key].soLuongTon += (s.soLuongTon || 0);
            groupedMap[key].variants.push(s);
        }

        state.products = Object.values(groupedMap).map(p => {
            // Sort sizes ascending
            p.sizes = [...new Set(p.sizes)].sort((a, b) => Number(a) - Number(b));
            return p;
        });

        syncHomepageImagesFromDB(state.products);
        renderProducts(grid, state.products.slice(0, 8));

        // Load real flash sale products
        loadHomeFlashSale();
    } catch (err) {
        // Show placeholder products if API fails
        renderPlaceholderProducts(grid);
    }
}

async function loadHomeFlashSale() {
    const fsGrid = document.getElementById('homeFlashSaleGrid');
    if (!fsGrid) return;

    try {
        const res = await fetch('/api/san-pham/flash-sale');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const rawProducts = data.products || [];
        const campaigns = data.campaigns || [];

        if (campaigns.length > 0 && campaigns[0].ngayKetThuc) {
            initHomeCountdown(campaigns[0].ngayKetThuc);
        } else {
            initHomeCountdown(null);
        }

        if (rawProducts.length === 0) {
            fsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 32px 16px; background: rgba(255,255,255,0.05); border-radius: 12px; color: rgba(255,255,255,0.7); font-size: 14px;">
                    Hiện chưa có sản phẩm nào trong đợt giảm giá. Vui lòng quay lại sau!
                </div>
            `;
            return;
        }

        // Lấy thống kê đánh giá thực tế
        let reviewSummary = {};
        try {
            const resReview = await fetch('/api/auth/danh-gia/summary-all');
            if (resReview.ok) reviewSummary = await resReview.json();
        } catch (e) {}

        // Group variants by parent product
        const grouped = {};
        for (const s of rawProducts) {
            const key = s.sanPhamId ? ('sp_' + s.sanPhamId) : (s.tenSanPham || 'Sản phẩm').trim().toLowerCase();
            const sId = String(s.id);
            const spId = s.sanPhamId ? String(s.sanPhamId) : null;
            const rev = (spId && reviewSummary[spId]) ? reviewSummary[spId] : (reviewSummary[sId] || null);
            const realRating = rev ? rev.danhGia : '5.0';
            const realCount = rev ? rev.soLuotDanhGia : 0;

            if (!grouped[key]) {
                grouped[key] = {
                    id: s.id,
                    sanPhamId: s.sanPhamId || null,
                    tenSanPham: s.tenSanPham || 'Sản phẩm giảm giá',
                    mauSac: s.mauSac || '',
                    sizeGiay: s.sizeGiay,
                    giaBan: s.giaBan || 0,
                    giaGoc: s.giaGoc || null,
                    phanTramGiam: s.phanTramGiam || null,
                    hinhAnh: s.hinhAnh,
                    soLuongTon: s.soLuongTon || 0,
                    sizes: [s.sizeGiay].filter(Boolean),
                    variants: [s],
                    danhGia: realRating,
                    soLuotDanhGia: realCount
                };
            } else {
                if (s.sizeGiay && !grouped[key].sizes.includes(s.sizeGiay)) {
                    grouped[key].sizes.push(s.sizeGiay);
                }
                grouped[key].soLuongTon += (s.soLuongTon || 0);
                if (s.phanTramGiam && (!grouped[key].phanTramGiam || s.phanTramGiam > grouped[key].phanTramGiam)) {
                    grouped[key].phanTramGiam = s.phanTramGiam;
                    grouped[key].giaBan = s.giaBan;
                    grouped[key].giaGoc = s.giaGoc;
                }
                if (rev && rev.soLuotDanhGia > grouped[key].soLuotDanhGia) {
                    grouped[key].danhGia = rev.danhGia;
                    grouped[key].soLuotDanhGia = rev.soLuotDanhGia;
                }
                grouped[key].variants.push(s);
            }
        }

        Object.values(grouped).forEach(p => {
            p.sizes = [...new Set(p.sizes)].sort((a, b) => Number(a) - Number(b));
        });

        renderProducts(fsGrid, Object.values(grouped).slice(0, 4));
    } catch (e) {
        console.warn('Lỗi tải home flash sale:', e);
    }
}

let homeCountdownTimer = null;
function initHomeCountdown(endTimeStr) {
    if (homeCountdownTimer) clearInterval(homeCountdownTimer);
    const targetEnd = endTimeStr ? new Date(endTimeStr) : (() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return end;
    })();

    function update() {
        const now = new Date();
        const diff = Math.max(0, targetEnd - now);

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        const hEl = document.getElementById('homeFsH');
        const mEl = document.getElementById('homeFsM');
        const sEl = document.getElementById('homeFsS');

        if (hEl) hEl.textContent = String(h).padStart(2, '0');
        if (mEl) mEl.textContent = String(m).padStart(2, '0');
        if (sEl) sEl.textContent = String(s).padStart(2, '0');
    }
    update();
    homeCountdownTimer = setInterval(update, 1000);
}

function syncHomepageImagesFromDB(products) {
    if (!products || !Array.isArray(products) || products.length === 0) return;

    const listWithImages = products.filter(p => p.hinhAnh);
    if (listWithImages.length === 0) return;

    // 1. Hero Slides
    if (listWithImages[0]) {
        const el1 = document.getElementById('heroSlideImg1');
        if (el1) el1.src = getImageUrl(listWithImages[0].hinhAnh, 0);
    }
    if (listWithImages[1]) {
        const el2 = document.getElementById('heroSlideImg2');
        if (el2) el2.src = getImageUrl(listWithImages[1].hinhAnh, 1);
    }
    if (listWithImages[2]) {
        const el3 = document.getElementById('heroSlideImg3');
        if (el3) el3.src = getImageUrl(listWithImages[2].hinhAnh, 2);
    }

    // 2. Category Cards
    if (listWithImages[0]) {
        const cat1 = document.getElementById('catImg1');
        if (cat1) cat1.src = getImageUrl(listWithImages[0].hinhAnh, 0);
    }
    if (listWithImages[1]) {
        const cat2 = document.getElementById('catImg2');
        if (cat2) cat2.src = getImageUrl(listWithImages[1].hinhAnh, 1);
    }
    if (listWithImages[2]) {
        const cat3 = document.getElementById('catImg3');
        if (cat3) cat3.src = getImageUrl(listWithImages[2].hinhAnh, 2);
    }

    // 3. Promo Banner
    if (listWithImages[3] || listWithImages[0]) {
        const targetPromo = listWithImages[3] || listWithImages[0];
        const promoImg = document.getElementById('promoImgMain');
        if (promoImg) promoImg.src = getImageUrl(targetPromo.hinhAnh, 3);
    }
}

function renderProducts(grid, products) {
    if (!products.length) {
        renderPlaceholderProducts(grid);
        return;
    }

    grid.innerHTML = products.map((p, idx) => {
        const isNew = idx < 3;
        const isHot = idx === 0 || idx === 4;

        // Choose first in-stock variant, or default to first variant
        const firstVariant = p.variants.find(v => (v.soLuongTon || 0) > 0) || p.variants[0];
        const firstVariantStr = JSON.stringify(firstVariant).replace(/"/g, '&quot;');

        const hasDiscount = p.phanTramGiam != null && p.phanTramGiam > 0 && p.giaGoc != null;
        const discountPct = hasDiscount ? Math.round(p.phanTramGiam) : 0;
        const price = parseFloat(p.giaBan) || 0;
        const originalPrice = hasDiscount ? parseFloat(p.giaGoc) : 0;

        return `
        <div class="product-card reveal" style="transition-delay: ${idx * 0.07}s" onclick="window.location.href='/client/products/${p.id}'">
            <div class="product-image-wrap">
                <div class="product-badges">
                    ${isNew ? '<span class="badge badge-new">Mới</span>' : ''}
                    ${isHot ? '<span class="badge badge-hot">Hot</span>' : ''}
                    ${hasDiscount ? `<span class="badge badge-sale" style="background:#ef4444;color:white;font-weight:900;">-${discountPct}%</span>` : ''}
                </div>
                <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist(${p.id})" title="Yêu thích">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 0 0 0 0-7.78z"/></svg>
                </button>
                <img src="${getImageUrl(p.hinhAnh, idx)}" alt="${p.tenSanPham}" loading="lazy" onerror="this.src='${getImageUrl(null, idx)}'">
                <div class="product-actions-hover">
                    <button class="hover-btn hover-btn-cart" onclick="event.stopPropagation(); addToCart(${firstVariantStr})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" width="14" height="14"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Thêm vào giỏ
                    </button>
                    <button class="hover-btn hover-btn-detail" onclick="event.stopPropagation(); openProductModal(state.products.find(x => x.id == ${p.id}))">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Xem
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-brand">VShoes Collection</div>
                <div class="product-name">${p.tenSanPham}</div>
                <div class="product-sizes">
                    ${(p.sizes || []).map(sz => `<span class="size-chip">${sz}</span>`).join('')}
                </div>
                <div class="product-price-row">
                    <div style="display:flex;flex-direction:column;align-items:flex-start;">
                        ${hasDiscount ? `<div class="price-original" style="font-size:12px;color:#94a3b8;text-decoration:line-through;margin-bottom:2px;font-weight:500;">${formatPrice(originalPrice)}</div>` : ''}
                        <div class="price-current" style="font-size:17px;font-weight:900;color:#ef4444;line-height:1.1;">${formatPrice(price)}</div>
                    </div>
                    <div class="rating-mini">
                        <span class="star"><i data-lucide="star" style="width:13px;height:13px;fill:#f59e0b;color:#f59e0b;"></i></span>
                        <span>${p.danhGia || '5.0'}</span>
                        <span>(${p.soLuotDanhGia || 0})</span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Re-run reveal animation observer
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.1 });
        obs.observe(el);
    });
}

function renderPlaceholderProducts(grid) {
    const placeholders = [
        { id: 1, tenSanPham: 'Giày Chạy Bộ Thunder Pro', mauSac: 'Đen/Đỏ', sizeGiay: 42, giaBan: 1250000, hinhAnh: null },
        { id: 2, tenSanPham: 'Giày Bóng Đá Storm Elite', mauSac: 'Trắng/Xanh', sizeGiay: 43, giaBan: 980000, hinhAnh: null },
        { id: 3, tenSanPham: 'Giày Thể Thao Velocity X', mauSac: 'Cam/Xám', sizeGiay: 41, giaBan: 1450000, hinhAnh: null },
        { id: 4, tenSanPham: 'Giày Training Ultra Boost', mauSac: 'Trắng', sizeGiay: 44, giaBan: 1680000, hinhAnh: null },
        { id: 5, tenSanPham: 'Giày Chạy Bộ AirMax Sport', mauSac: 'Xanh Navy', sizeGiay: 42, giaBan: 890000, hinhAnh: null },
        { id: 6, tenSanPham: 'Giày Futsal Speed King', mauSac: 'Vàng/Đen', sizeGiay: 43, giaBan: 1150000, hinhAnh: null },
        { id: 7, tenSanPham: 'Giày Running FlexFit Pro', mauSac: 'Đỏ/Trắng', sizeGiay: 40, giaBan: 1320000, hinhAnh: null },
        { id: 8, tenSanPham: 'Giày Đá Banh Classic Edition', mauSac: 'Xanh/Trắng', sizeGiay: 44, giaBan: 760000, hinhAnh: null },
    ];
    
    // Group placeholders too
    const groupedMap = {};
    for (const s of placeholders) {
        const key = `${s.tenSanPham || 'Sản phẩm'}_${s.mauSac || ''}`;
        if (!groupedMap[key]) {
            groupedMap[key] = {
                id: s.id,
                tenSanPham: s.tenSanPham || 'VShoes Runner Pro',
                mauSac: s.mauSac || '',
                giaBan: s.giaBan || 0,
                hinhAnh: s.hinhAnh,
                sizeGiay: s.sizeGiay,
                soLuongTon: 10, // Mock stock
                sizes: [],
                variants: []
            };
        }
        if (s.sizeGiay) {
            groupedMap[key].sizes.push(s.sizeGiay);
        }
        groupedMap[key].variants.push(s);
    }
    
    const processed = Object.values(groupedMap).map(p => {
        p.sizes = [...new Set(p.sizes)].sort((a, b) => Number(a) - Number(b));
        return p;
    });

    state.products = processed;
    renderProducts(grid, processed);
}

// ========== PRODUCT MODAL ==========
async function openProductModal(product) {
    if (!product) return;
    state.activeModalProduct = product;
    const defaultVariant = product.variants.find(v => (v.soLuongTon || 0) > 0) || product.variants[0];
    state.selectedModalVariant = defaultVariant;

    const overlay = document.getElementById('productModalOverlay');
    const content = document.getElementById('productModalContent');
    if (!overlay || !content) return;

    await loadActiveDiscount();
    renderModalContent();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}


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

function renderModalContent() {
    const product = state.activeModalProduct;
    const v = state.selectedModalVariant;
    if (!product || !v) return;

    const content = document.getElementById('productModalContent');
    if (!content) return;

    const discountPct = (v.phanTramGiam != null && v.phanTramGiam > 0)
        ? Math.round(v.phanTramGiam)
        : (product.phanTramGiam != null && product.phanTramGiam > 0
            ? Math.round(product.phanTramGiam)
            : (activeDiscountPercent > 0 ? Math.round(activeDiscountPercent) : 0));

    let giaDaGiam = parseFloat(v.giaBan) || 0;
    let originalPrice = 0;

    if (v.phanTramGiam != null && v.phanTramGiam > 0 && v.giaGoc != null) {
        giaDaGiam = parseFloat(v.giaBan) || 0;
        originalPrice = parseFloat(v.giaGoc) || 0;
    } else if (discountPct > 0) {
        originalPrice = giaDaGiam;
        giaDaGiam = Math.round(originalPrice * (1 - discountPct / 100));
    }

    const stock = v.soLuongTon != null ? v.soLuongTon : 0;

    const uniqueSizes = [...new Set(product.variants.map(x => x.sizeGiay))].filter(Boolean).sort((a,b)=>Number(a)-Number(b));
    const uniqueColors = [...new Map(product.variants.map(x => [x.mauSac, x])).values()].filter(x => x.mauSac);

    const mainImg = getImageUrl(v.hinhAnh, product.id || 0);
    const fallbackDefault = getImageUrl(null, product.id || 0);
    
    let realThumbs = [];
    if (v.hinhAnh && typeof v.hinhAnh === 'string') {
        realThumbs.push(...v.hinhAnh.split(',').map(s => getImageUrl(s.trim(), product.id || 0)));
    }
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach((vItem, i) => {
            if (vItem.hinhAnh && typeof vItem.hinhAnh === 'string') {
                realThumbs.push(...vItem.hinhAnh.split(',').map(s => getImageUrl(s.trim(), (product.id || 0) + i)));
            }
        });
    }
    if (!realThumbs.includes(mainImg)) realThumbs.unshift(mainImg);
    const uniqueThumbs = [...new Set(realThumbs)].filter(Boolean);

    const stockColor = stock > 5 ? '#059669' : stock > 0 ? '#d97706' : '#ef4444';
    const stockLabel = stock > 0 ? `Chỉ còn ${stock} sản phẩm trong kho` : 'Hết hàng';

    content.innerHTML = `
        <button onclick="closeProductModal()"
            style="position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#64748b;z-index:10;">×</button>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:420px;">

            <!-- LEFT -->
            <div style="background:#f8fafc;display:flex;flex-direction:column;gap:10px;padding:24px;border-radius:16px 0 0 16px;">
                <div style="background:#fff;border-radius:12px;border:1px solid #e8edf3;display:flex;align-items:center;justify-content:center;min-height:240px;overflow:hidden;position:relative;">
                    ${discountPct > 0 ? `<span style="position:absolute;top:10px;left:10px;background:#ef4444;color:white;font-size:12px;font-weight:900;padding:4px 10px;border-radius:20px;z-index:5;box-shadow:0 3px 10px rgba(239,68,68,0.35);">-${discountPct}%</span>` : ''}
                    <img id="modalMainImage" src="${mainImg}" alt="${product.tenSanPham}"
                        style="max-height:210px;max-width:100%;object-fit:contain;padding:12px;transition:transform .35s;"
                        onerror="this.src='${fallbackDefault}'">
                </div>
                ${uniqueThumbs.length > 1 ? `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;" id="modalThumbnailGrid">
                    ${uniqueThumbs.slice(0,4).map((t, i) => `
                        <div onclick="setModalMainImage(this,'${t}')"
                            style="border:2px solid ${i===0?'#00adef':'#e2e8f0'};border-radius:8px;padding:4px;cursor:pointer;background:#fff;display:flex;align-items:center;justify-content:center;height:56px;transition:all .2s;"
                            class="${i===0?'modal-thumbnail-item active':'modal-thumbnail-item'}">
                            <img src="${t}" alt="" style="max-height:100%;max-width:100%;object-fit:contain;" onerror="this.src='${fallbackDefault}'">
                        </div>`).join('')}
                </div>` : ''}
            </div>

            <!-- RIGHT -->
            <div style="padding:28px 28px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;max-height:520px;">
                <div>
                    <div style="font-size:11px;font-weight:700;color:#00adef;text-transform:uppercase;letter-spacing:2px;">VHOES COLLECTION</div>
                    <h2 style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.25;margin:5px 0 0;">${product.tenSanPham}</h2>
                </div>

                <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${stockColor};">
                    <span style="width:8px;height:8px;border-radius:50%;background:${stockColor};flex-shrink:0;"></span>
                    ${stockLabel}
                </div>

                <div style="display:flex;flex-direction:column;gap:2px;">
                    ${discountPct > 0 && originalPrice > 0 ? `
                        <span style="font-size:14px;text-decoration:line-through;color:#94a3b8;font-weight:500;">${formatPrice(originalPrice)}</span>
                    ` : ''}
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:26px;font-weight:900;color:#ef4444;">${formatPrice(giaDaGiam)}</span>
                        ${discountPct > 0 ? `
                            <span style="background:#ef4444;color:white;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;">-${discountPct}%</span>
                        ` : ''}
                    </div>
                </div>

                ${uniqueColors.length > 0 ? `
                <div>
                    <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">M\u00e0u S\u1eafc</div>
                    <div style="display:flex;gap:7px;flex-wrap:wrap;">
                        ${uniqueColors.map(c => {
                            const isA = c.mauSac === v.mauSac;
                            return `<button onclick="selectModalColor('${c.mauSac}')"
                                style="padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:${isA?'1.5px solid #00adef':'1.5px solid #cbd5e1'};background:${isA?'rgba(0,173,239,0.06)':'white'};color:${isA?'#00adef':'#334155'};">${c.mauSac}</button>`;
                        }).join('')}
                    </div>
                </div>` : ''}

                <div>
                    <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">K\u00edch Th\u01b0\u1edbc</div>
                    <div style="display:flex;gap:7px;flex-wrap:wrap;" id="modalSizeButtons">
                        ${uniqueSizes.map(sz => {
                            const isA = sz === v.sizeGiay;
                            return `<button onclick="selectModalSize(${sz})"
                                style="min-width:42px;height:38px;padding:0 10px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;border:${isA?'1.5px solid #00adef':'1.5px solid #cbd5e1'};background:${isA?'rgba(0,173,239,0.06)':'white'};color:${isA?'#00adef':'#334155'};">${sz}</button>`;
                        }).join('')}
                    </div>
                </div>

                <div>
                    <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">S\u1ed1 L\u01b0\u1ee3ng</div>
                    <div style="display:flex;align-items:center;background:#f1f5f9;border-radius:10px;overflow:hidden;width:fit-content;">
                        <button onclick="changeModalQty(-1)" style="background:transparent;border:none;width:38px;height:38px;cursor:pointer;font-size:20px;font-weight:700;color:#334155;display:flex;align-items:center;justify-content:center;">−</button>
                        <input type="text" id="modalQtyInput" value="1" onchange="validateModalQtyInput(this)" oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="width:40px;height:38px;border:none;text-align:center;font-size:15px;font-weight:800;color:#0f172a;background:white;outline:none;">
                        <button onclick="changeModalQty(1)" style="background:transparent;border:none;width:38px;height:38px;cursor:pointer;font-size:20px;font-weight:700;color:#334155;display:flex;align-items:center;justify-content:center;">+</button>
                    </div>
                </div>

                <button id="modalAddToCartBtn" onclick="addModalProductToCart()"
                    style="width:100%;padding:14px;border:none;border-radius:50px;background:${stock>0?'#00adef':'#94a3b8'};color:white;font-size:15px;font-weight:800;cursor:${stock>0?'pointer':'not-allowed'};display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:${stock>0?'0 6px 20px rgba(0,173,239,0.35)':'none'};transition:all .25s;"
                    ${stock > 0 ? '' : 'disabled'}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" width="18" height="18" stroke="white"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    ${stock > 0 ? 'Th\u00eam v\u00e0o gi\u1ecf h\u00e0ng' : 'H\u1ebft h\u00e0ng'}
                </button>
            </div>
        </div>`;
}


function setModalMainImage(el, src) {
    document.querySelectorAll('.modal-thumbnail-item').forEach(x => {
        x.style.borderColor = 'var(--border)';
        x.classList.remove('active');
    });
    el.style.borderColor = 'var(--primary)';
    el.classList.add('active');
    document.getElementById('modalMainImage').src = src;
}

function selectModalSize(size) {
    const product = state.activeModalProduct;
    if (!product) return;
    const match = product.variants.find(v => v.sizeGiay === size && v.mauSac === state.selectedModalVariant?.mauSac)
        || product.variants.find(v => v.sizeGiay === size);
    if (match) {
        state.selectedModalVariant = match;
        renderModalContent();
    }
}

function selectModalColor(color) {
    const product = state.activeModalProduct;
    if (!product) return;
    const match = product.variants.find(v => v.mauSac === color && v.sizeGiay === state.selectedModalVariant?.sizeGiay)
        || product.variants.find(v => v.mauSac === color);
    if (match) {
        state.selectedModalVariant = match;
        renderModalContent();
    }
}

function validateModalQtyInput(inputEl) {
    const v = state.selectedModalVariant;
    const maxStock = v ? (v.soLuongTon != null ? v.soLuongTon : 9999) : 9999;
    let val = parseInt(inputEl.value) || 1;
    if (val > maxStock) {
        showToast(`Số lượng nhập (${val}) vượt quá tồn kho (${maxStock})!`, 'error');
        val = maxStock > 0 ? maxStock : 1;
        inputEl.value = val;
    }
}

function changeModalQty(delta) {
    const input = document.getElementById('modalQtyInput');
    if (!input) return;
    const v = state.selectedModalVariant;
    const maxStock = v ? (v.soLuongTon != null ? v.soLuongTon : 9999) : 9999;
    let val = parseInt(input.value) || 1;
    val = val + delta;

    if (val > maxStock) {
        showToast(`Số lượng vượt quá tồn kho (${maxStock})!`, 'error');
        val = maxStock > 0 ? maxStock : 1;
    }
    if (val < 1) val = 1;
    input.value = val;
}

function addModalProductToCart() {
    const v = state.selectedModalVariant;
    if (!v) return;
    const inputEl = document.getElementById('modalQtyInput');
    let qty = parseInt(inputEl?.value) || 1;

    const maxStock = v.soLuongTon != null ? v.soLuongTon : 0;
    if (maxStock <= 0) {
        showToast('Sản phẩm đã hết hàng!', 'error');
        return;
    }

    const existing = state.cart.find(i => i.id === v.id && i.sizeGiay === v.sizeGiay);
    const currentQty = existing ? existing.qty : 0;
    const totalRequested = currentQty + qty;

    if (totalRequested > maxStock) {
        showToast(`Không thể thêm vào giỏ hàng! Số lượng yêu cầu (${totalRequested}) vượt quá tồn kho (${maxStock}).`, 'error');
        if (inputEl) inputEl.value = maxStock > 0 ? maxStock : 1;
        return;
    }

    const priceToUse = activeDiscountPercent > 0 
        ? Math.round(parseFloat(v.giaBan) * (1 - activeDiscountPercent / 100))
        : parseFloat(v.giaBan);

    const productToAdd = { ...v, giaBan: priceToUse };
    const added = addToCart(productToAdd, qty);
    if (added) {
        closeProductModal();
    }
}



function closeProductModal() {
    document.getElementById('productModalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
}

// ========== WISHLIST ==========
function toggleWishlist(id) {
    showToast('Đã thêm vào danh sách yêu thích!', 'success');
}

// ========== UTILS ==========
function formatPrice(val) {
    const n = parseFloat(val) || 0;
    return n.toLocaleString('vi-VN') + ' ₫';
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

// ========== TOAST ==========
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    const iconColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.innerHTML = `<i data-lucide="${iconName}" style="width: 18px; height: 18px; color: ${iconColor}; flex-shrink: 0;"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons({ root: toast });
        } catch(e) {}
    }

    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.35s ease reverse';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

// ========== SEARCH ==========
document.getElementById('searchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const keyword = document.getElementById('searchKeyword')?.value.trim();
    if (keyword) {
        showToast(`Tìm kiếm: "${keyword}"...`, 'success');
    }
});

// ========== NEWSLETTER ==========
document.getElementById('newsletterForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]')?.value;
    if (email) {
        showToast('Cảm ơn! Bạn đã đăng ký nhận tin thành công.', 'success');
        e.target.reset();
    }
});

// ========== CHECKOUT (mock) ==========
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    if (state.cart.length === 0) {
        showToast('Giỏ hàng trống!', 'error');
        return;
    }
    showToast('Đang chuyển đến trang thanh toán...', 'success');
    setTimeout(() => window.location.href = '/client/checkout', 1500);
});

// ========== COUNTER ANIMATION ==========
function animateCounter(el, target) {
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.floor(current).toLocaleString('vi-VN');
    }, 16);
}

const statsObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const val = parseInt(el.dataset.target || '0');
            animateCounter(el, val);
            statsObs.unobserve(el);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number[data-target]').forEach(el => statsObs.observe(el));

// Global helper for adding to cart from other scripts (like san-pham.js)
window.addToCartGlobal = function(id, ten, gia, hinh, soLuongTon) {
    const maxStock = soLuongTon != null ? soLuongTon : 9999;
    if (maxStock <= 0) {
        showToast('Sản phẩm đã hết hàng!', 'error');
        return;
    }

    const existing = state.cart.find(i => i.id === id);
    if (existing) {
        if (existing.qty >= maxStock) {
            showToast(`Chỉ còn ${maxStock} sản phẩm trong kho!`, 'error');
            return;
        }
        existing.qty += 1;
    } else {
        state.cart.push({
            id: id,
            tenSanPham: ten,
            giaBan: gia,
            hinhAnh: hinh,
            soLuongTon: maxStock,
            qty: 1
        });
    }
    saveCart();
    updateCartBadge();
    showToast(`Đã thêm "${ten}" vào giỏ hàng`, 'success');
    
    // Update globally if applicable
    if (typeof window.updateCartBadgeGlobal === 'function') {
        window.updateCartBadgeGlobal();
    }
};
