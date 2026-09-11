/**
 * flash-sale.js - VSHOES Flash Sale Client Logic
 * Lấy dữ liệu thực tế từ các đợt giảm giá (DotGiamGia & ChiTietDotGiamGia) đang hoạt động.
 */

const fsState = {
    campaigns: [],
    allProducts: [],
    filteredProducts: [],
    activeFilter: 'all',
    targetEndTime: null,
    timerInterval: null
};

document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    fetchFlashSaleData();
    updateCartBadge();
});

/* =============================================
   COUNTDOWN TIMER THEO ĐỢT GIẢM GIÁ THỰC TẾ
   ============================================= */
function startCountdown(endTimeStr) {
    if (fsState.timerInterval) clearInterval(fsState.timerInterval);

    if (endTimeStr) {
        fsState.targetEndTime = new Date(endTimeStr);
    } else {
        // Mặc định kết thúc vào cuối ngày nếu không có ngày kết thúc cụ thể
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        fsState.targetEndTime = endOfDay;
    }

    function updateTimer() {
        const now = new Date();
        const diff = Math.max(0, fsState.targetEndTime - now);

        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        const hEl = document.getElementById('fsHours');
        const mEl = document.getElementById('fsMinutes');
        const sEl = document.getElementById('fsSeconds');

        if (hEl) hEl.textContent = String(totalHours).padStart(2, '0');
        if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
        if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    fsState.timerInterval = setInterval(updateTimer, 1000);
}

/* =============================================
   FILTERS
   ============================================= */
function initFilters() {
    const pills = document.querySelectorAll('.fs-pill-btn');
    pills.forEach(pill => {
        pill.addEventListener('click', function() {
            pills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            fsState.activeFilter = this.getAttribute('data-filter') || 'all';
            applyFilter();
        });
    });
}

/* =============================================
   FETCH FLASH SALE DATA (CHỈ LẤY ĐỢT GIẢM GIÁ THẬT)
   ============================================= */
async function fetchFlashSaleData() {
    const grid = document.getElementById('fsProductsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/san-pham/flash-sale');
        if (!res.ok) throw new Error('Không thể kết nối API Flash Sale');
        
        const data = await res.json();
        fsState.campaigns = data.campaigns || [];
        const rawProducts = data.products || [];

        // Cập nhật thông tin đợt giảm giá lên giao diện
        if (fsState.campaigns.length > 0) {
            const activeCamp = fsState.campaigns[0];
            const heroTitle = document.querySelector('.fs-hero-title');
            if (heroTitle && activeCamp.tenDotGiamGia) {
                heroTitle.innerHTML = `<i data-lucide="zap" style="width:24px;height:24px;vertical-align:-3px;color:#fbbf24;fill:#fbbf24;margin-right:4px;"></i>${escapeHtml(activeCamp.tenDotGiamGia)}<br><span style="font-size:24px;font-weight:700;">GIẢM ĐẾN ${activeCamp.phanTramGiam || 50}%</span>`;
            }
            if (activeCamp.ngayKetThuc) {
                startCountdown(activeCamp.ngayKetThuc);
            } else {
                startCountdown(null);
            }
        } else {
            startCountdown(null);
        }

        // Nhóm các chi tiết sản phẩm cùng 1 sản phẩm gốc
        const grouped = {};
        for (const s of rawProducts) {
            const key = s.sanPhamId ? ('sp_' + s.sanPhamId) : (s.tenSanPham || 'Sản phẩm').trim().toLowerCase();
            if (!grouped[key]) {
                grouped[key] = {
                    id: s.id,
                    sanPhamId: s.sanPhamId || null,
                    ma: s.ma,
                    tenSanPham: s.tenSanPham || 'Sản phẩm giảm giá',
                    thuongHieu: s.thuongHieu || '',
                    mauSac: s.mauSac || '',
                    sizeGiay: s.sizeGiay,
                    giaBan: s.giaBan || 0,
                    giaGoc: s.giaGoc || 0,
                    phanTramGiam: s.phanTramGiam || 0,
                    hinhAnh: s.hinhAnh,
                    soLuongTon: s.soLuongTon || 0,
                    sizes: [s.sizeGiay].filter(Boolean),
                    variants: [s]
                };
            } else {
                if (s.sizeGiay && !grouped[key].sizes.includes(s.sizeGiay)) {
                    grouped[key].sizes.push(s.sizeGiay);
                }
                grouped[key].soLuongTon += (s.soLuongTon || 0);
                if (s.phanTramGiam && s.phanTramGiam > grouped[key].phanTramGiam) {
                    grouped[key].phanTramGiam = s.phanTramGiam;
                    grouped[key].giaBan = s.giaBan;
                    grouped[key].giaGoc = s.giaGoc;
                }
                grouped[key].variants.push(s);
            }
        }

        Object.values(grouped).forEach(p => {
            p.sizes = [...new Set(p.sizes)].sort((a, b) => Number(a) - Number(b));
        });

        fsState.allProducts = Object.values(grouped);
        applyFilter();
    } catch (err) {
        console.error('Lỗi tải sản phẩm Flash Sale:', err);
        grid.innerHTML = `
            <div class="fs-empty-box">
                <div class="fs-empty-icon"><i data-lucide="alert-triangle" style="width:42px;height:42px;color:#f59e0b;"></i></div>
                <h3 style="font-size:18px;font-weight:700;color:#334155;margin-bottom:6px;">Lỗi tải dữ liệu Flash Sale</h3>
                <p style="color:#64748b;font-size:14px;">Không thể tải danh sách đợt giảm giá từ máy chủ. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

function applyFilter() {
    let result = [...fsState.allProducts];

    // Lọc theo bộ lọc danh mục
    if (fsState.activeFilter === 'over30') {
        result = result.filter(p => p.phanTramGiam >= 30);
    } else if (fsState.activeFilter === 'under1m') {
        result = result.filter(p => p.giaBan < 1000000);
    } else if (fsState.activeFilter === 'nike') {
        result = result.filter(p => (p.tenSanPham + ' ' + p.thuongHieu).toLowerCase().includes('nike'));
    } else if (fsState.activeFilter === 'adidas') {
        result = result.filter(p => (p.tenSanPham + ' ' + p.thuongHieu).toLowerCase().includes('adidas'));
    } else if (fsState.activeFilter === 'puma') {
        result = result.filter(p => (p.tenSanPham + ' ' + p.thuongHieu).toLowerCase().includes('puma'));
    }

    fsState.filteredProducts = result;
    renderProducts(result);
}

function renderProducts(list) {
    const grid = document.getElementById('fsProductsGrid');
    if (!grid) return;

    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div class="fs-empty-box">
                <div class="fs-empty-icon"><i data-lucide="tag" style="width:42px;height:42px;color:#00adef;"></i></div>
                <h3 style="font-size:18px;font-weight:700;color:#334155;margin-bottom:6px;">Không có sản phẩm nào trong đợt giảm giá này</h3>
                <p style="color:#64748b;font-size:14px;max-width:500px;margin:0 auto 16px;">Hiện tại chưa có sản phẩm nào được áp dụng trong đợt giảm giá đang diễn ra hoặc không có kết quả phù hợp với bộ lọc.</p>
                <a href="/client/san-pham" style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:999px;background:#0f172a;color:white;text-decoration:none;font-weight:600;font-size:13.5px;">
                    Xem tất cả sản phẩm
                </a>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(item => {
        const imgUrl = getImageUrl(item.hinhAnh);
        const formatGiaBan = formatPrice(item.giaBan);
        const formatGiaGoc = item.giaGoc ? formatPrice(item.giaGoc) : '';
        const pct = item.phanTramGiam;
        const tonKho = item.soLuongTon || 0;

        return `
            <div class="fs-card">
                <div class="fs-card-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    -${pct}%
                </div>
                <div class="fs-card-hot-tag"><i data-lucide="flame" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"></i>ĐANG GIẢM GIÁ</div>
                
                <div class="fs-card-img-wrap">
                    <img src="${imgUrl}" alt="${escapeHtml(item.tenSanPham)}" class="fs-card-img" onerror="this.src='/images/white.png'">
                </div>

                <div class="fs-card-body">
                    <h3 class="fs-card-title">${escapeHtml(item.tenSanPham)}</h3>
                    <div class="fs-card-variant">Màu: ${escapeHtml(item.mauSac || 'Tiêu chuẩn')} | Size: ${item.sizes.length ? item.sizes.join(', ') : 'Theo kho'}</div>

                    <div class="fs-price-row">
                        <span class="fs-price-current">${formatGiaBan}</span>
                        ${formatGiaGoc ? `<span class="fs-price-old">${formatGiaGoc}</span>` : ''}
                    </div>

                    <div class="fs-progress-wrap">
                        <div class="fs-progress-bar">
                            <div class="fs-progress-fill" style="width: ${Math.min(100, Math.max(25, 100 - tonKho * 3))}%;"></div>
                            <span class="fs-progress-text"><i data-lucide="zap" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"></i>CÒN ${tonKho} ĐÔI TRONG KHO</span>
                        </div>
                    </div>

                    <button class="fs-btn-buy" onclick="quickBuy(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Săn Deal Ngay
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/* =============================================
   CART & ACTION HELPERS
   ============================================= */
function quickBuy(productId) {
    const product = fsState.allProducts.find(p => p.id === productId);
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
    const chosenSize = product.sizes && product.sizes.length ? product.sizes[0] : (product.sizeGiay || 40);

    const existingIndex = cart.findIndex(item => item.id === product.id && item.sizeGiay === chosenSize);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({
            id: product.id,
            tenSanPham: product.tenSanPham,
            mauSac: product.mauSac || 'Tiêu chuẩn',
            sizeGiay: chosenSize,
            giaBan: product.giaBan,
            hinhAnh: product.hinhAnh,
            qty: 1
        });
    }

    localStorage.setItem('vshoes_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`Đã thêm "${product.tenSanPham}" vào giỏ hàng!`);
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.cart-count, #cartCountBadge');
    badges.forEach(b => {
        b.textContent = totalQty;
        b.style.display = totalQty > 0 ? 'flex' : 'none';
    });
}

function formatPrice(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

function showToast(msg) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.style.cssText = 'background: #0f172a; color: white; border-left: 4px solid #ef4444; padding: 12px 18px; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 13.5px;';
    toast.innerHTML = `<i data-lucide="zap" style="width:16px;height:16px;margin-right:6px;"></i><span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}
