/**
 * san-pham.js — Product listing page logic
 * VShoes - Giày chạy bộ
 */

/* =============================================
   spState
   ============================================= */
const spState = {
    products: [],          // all products from API
    filtered: [],          // after filter/search
    currentPage: 1,
    pageSize: 9,
    sort: 'newest',
    searchKw: '',
    maxPrice: 10000000,
    selectedSizes: [],
    selectedBrands: [],    // thương hiệu được chọn
    selectedColors: [],    // màu sắc được chọn
    view: 'grid',          // 'grid' | 'list'
    activeModalProduct: null,
    selectedModalVariant: null
};

/* Shoe images mapping */
const shoeImages = [
    '/images/shoe1.png',
    '/images/shoe2.png',
    '/images/shoe3.png',
    '/images/shoe4.png',
];

/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    initToolbarSearch();
    initPriceSlider();
    initResetFilter();
});

/* =============================================
   API FETCH
   ============================================= */
async function fetchProducts() {
    try {
        const res = await fetch('/api/san-pham/search-sale');
        if (!res.ok) throw new Error('API error ' + res.status);
        const raw = await res.json();   // trả về List<Map> trực tiếp

        if (!raw || !Array.isArray(raw) || raw.length === 0) {
            throw new Error('Cơ sở dữ liệu rỗng, sử dụng sản phẩm mẫu.');
        }

        // Lấy thống kê đánh giá thực tế từ cơ sở dữ liệu
        let reviewSummary = {};
        try {
            const resReview = await fetch('/api/auth/danh-gia/summary-all');
            if (resReview.ok) {
                reviewSummary = await resReview.json();
            }
        } catch (e) {
            console.warn('Không thể tải thống kê đánh giá:', e);
        }

        // Nhóm các biến thể (SPCT) thành 1 sản phẩm gốc duy nhất
        const spMap = {};
        for (const s of raw) {
            const key = s.sanPhamId ? ('sp_' + s.sanPhamId) : (s.tenSanPham || 'Sản phẩm').trim().toLowerCase();
            const sId = String(s.id);
            const spId = s.sanPhamId ? String(s.sanPhamId) : null;
            const rev = (spId && reviewSummary[spId]) ? reviewSummary[spId] : (reviewSummary[sId] || null);
            const realRating = rev ? rev.danhGia : '5.0';
            const realCount = rev ? rev.soLuotDanhGia : 0;

            if (!spMap[key]) {
                spMap[key] = {
                    id: s.id,
                    sanPhamId: s.sanPhamId || null,
                    ma: s.ma || `SP${String(s.id).padStart(5,'0')}`,
                    ten: s.tenSanPham || 'VShoes Runner Pro',
                    gia: s.giaBan || 850000,
                    giaGoc: s.giaGoc || null,
                    discountPct: s.phanTramGiam || 0,
                    soLuong: 0,
                    hinh: (() => {
                        if (!s.hinhAnh) return null;
                        let c = String(s.hinhAnh).replace(/[\[\]"']/g, '').trim();
                        if (c.includes(',')) c = c.split(',')[0].trim();
                        if (!c) return null;
                        return (c.startsWith('http') || c.startsWith('/') ? c : '/images/' + c);
                    })(),
                    mauSac: s.mauSac || '',
                    colors: s.mauSac ? [s.mauSac] : [],
                    sizes: [],
                    variants: [],
                    danhGia: realRating,
                    soLuotDanhGia: realCount,
                    isNew: false,
                };
            } else {
                if (s.hinhAnh && !spMap[key].hinh) {
                    let c = String(s.hinhAnh).replace(/[\[\]"']/g, '').trim();
                    if (c.includes(',')) c = c.split(',')[0].trim();
                    if (c) {
                        spMap[key].hinh = (c.startsWith('http') || c.startsWith('/') ? c : '/images/' + c);
                    }
                }
                if (s.phanTramGiam && s.phanTramGiam > spMap[key].discountPct) {
                    spMap[key].discountPct = s.phanTramGiam;
                    spMap[key].giaGoc = s.giaGoc;
                    spMap[key].gia = s.giaBan;
                }
                if (rev && rev.soLuotDanhGia > spMap[key].soLuotDanhGia) {
                    spMap[key].danhGia = rev.danhGia;
                    spMap[key].soLuotDanhGia = rev.soLuotDanhGia;
                }
                if (s.mauSac && !spMap[key].colors.includes(s.mauSac)) {
                    spMap[key].colors.push(s.mauSac);
                }
            }
            if (s.sizeGiay && !spMap[key].sizes.includes(String(s.sizeGiay))) {
                spMap[key].sizes.push(String(s.sizeGiay));
            }
            spMap[key].soLuong += (s.soLuongTon || 0);
            spMap[key].variants.push(s);
        }

        Object.values(spMap).forEach(p => {
            p.sizes.sort((a, b) => Number(a) - Number(b));
        });

        let activePct = 0;
        try {
            let resD = await fetch('/api/dot-giam-gia');
            if (!resD.ok) resD = await fetch('/api/dot-giam-gia-local');
            if (resD.ok) {
                const listD = await resD.json();
                const now = new Date();
                const activeEvents = (listD || []).filter(d => {
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
                    activePct = parseFloat(maxV.phanTramGiam) || 0;
                }
            }
        } catch(e) {}

        // Chuyển map thành mảng, gán ảnh fallback + badge
        const shoeImgs = [
            '/images/sp_33_1781237903207.png',
            '/images/sp_34_1781238256333.png',
            '/images/sp_35_1781242880837.png',
            '/images/sp_36_1781244856644.png',
            '/images/sp_37_1781246418348.png'
        ];
        spState.products = Object.values(spMap).map((p, i) => {
            const uniqueSizes = [...new Set(p.sizes)].sort((a,b)=>Number(a)-Number(b));
            let imgPath = p.hinh;
            if (imgPath && imgPath.includes(',')) {
                imgPath = imgPath.split(',')[0].trim();
            }
            const discountPct = p.discountPct || (activePct > 0 ? activePct : 0);
            const giaGoc = p.giaGoc ? p.giaGoc : (discountPct > 0 ? p.gia : null);
            const giaActual = p.giaGoc ? p.gia : (discountPct > 0 ? Math.round(p.gia * (1 - discountPct / 100)) : p.gia);

            return {
                ...p,
                gia: giaActual,
                giaGoc: giaGoc,
                hinh: imgPath ? (imgPath.startsWith('http') || imgPath.startsWith('/') ? imgPath : '/images/' + imgPath) : shoeImgs[i % shoeImgs.length],
                sizes: uniqueSizes,
                isNew: i < 4,
                discountPct: Math.round(discountPct),
            };
        });

        // Check URL search parameter
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            spState.searchKw = searchParam.trim();
            const toolbarInput = document.getElementById('toolbarSearch');
            if (toolbarInput) toolbarInput.value = searchParam.trim();
        }

        applyFilters();
    } catch (err) {
        console.warn('API lỗi, dùng demo data:', err);
        const rawDemo = generateDemoData();
        spState.products = rawDemo.map(p => ({
            ...p,
            variants: p.sizes.map(sz => ({
                id: p.id,
                tenSanPham: p.ten,
                giaBan: p.gia,
                sizeGiay: sz,
                mauSac: p.mauSac,
                soLuongTon: p.soLuong
            }))
        }));

        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            spState.searchKw = searchParam.trim();
            const toolbarInput = document.getElementById('toolbarSearch');
            if (toolbarInput) toolbarInput.value = searchParam.trim();
        }

        applyFilters();
    }
}

/* =============================================
   DEMO DATA
   ============================================= */
function generateDemoData() {
    const names = [
        'Nike Air Zoom Pegasus 41',
        'ASICS Gel-Kayano 31',
        'Adidas Ultraboost 23',
        'New Balance Fresh Foam X 1080v13',
        'Brooks Ghost 16',
        'Saucony Kinvara 14',
        'HOKA Clifton 9',
        'Mizuno Wave Rider 27',
        'Nike React Infinity Run 4',
        'ASICS GT-2000 13',
        'Adidas SL 20.3',
        'New Balance Rebel v4',
    ];

    return names.map((name, i) => {
        const gia = [850000, 1200000, 1500000, 1800000, 2000000, 2400000, 2500000, 900000, 1100000, 1600000, 1900000, 2200000][i];
        const giaGoc = i % 3 === 0 ? Math.round(gia * 1.15) : null;
        return {
            id: i + 1,
            ma: `SP${String(i + 1).padStart(5, '0')}`,
            ten: name,
            gia,
            giaGoc,
            soLuong: [15, 3, 0, 22, 8, 1, 30, 5, 12, 0, 18, 7][i],
            hinh: shoeImages[i % 4],
            mauSac: ['Đen', 'Trắng', 'Đỏ', 'Xanh dương', 'Xanh lá', 'Xám', 'Đen', 'Cam', 'Tím', 'Trắng', 'Đỏ', 'Xanh dương'][i],
            sizes: ['40','41','42','43'].slice(0, Math.floor(Math.random() * 3 + 2)),
            danhGia: (3.8 + Math.random() * 1.1).toFixed(1),
            soLuotDanhGia: Math.floor(Math.random() * 180 + 20),
            isNew: i < 4,
            discountPct: giaGoc ? Math.round((1 - gia / giaGoc) * 100) : 0,
        };
    });
}

function randomColor() {
    const c = ['Đen', 'Trắng', 'Đỏ', 'Xanh dương', 'Xanh lá', 'Xám'];
    return c[Math.floor(Math.random() * c.length)];
}

function randomSizes() {
    const all = ['38','39','40','41','42','43','44'];
    return all.slice(Math.floor(Math.random() * 2), Math.floor(Math.random() * 3 + 4));
}

/* =============================================
   FILTER & SORT
   ============================================= */
function applyFilters() {
    let list = [...spState.products];

    // Search
    if (spState.searchKw) {
        const kw = spState.searchKw.toLowerCase();
        list = list.filter(p =>
            p.ten.toLowerCase().includes(kw) || p.ma.toLowerCase().includes(kw)
        );
    }

    // Price
    list = list.filter(p => p.gia <= spState.maxPrice);

    // Filter by brand (thương hiệu)
    if (spState.selectedBrands && spState.selectedBrands.length > 0) {
        list = list.filter(p => {
            const tenLower = (p.ten || '').toLowerCase();
            return spState.selectedBrands.some(brand => {
                const b = brand.toLowerCase();
                if (b === 'vshoes') return tenLower.includes('vshoes') || tenLower.includes('v shoes');
                return tenLower.includes(b);
            });
        });
    }

    // Filter by color (màu sắc)
    if (spState.selectedColors && spState.selectedColors.length > 0) {
        list = list.filter(p => {
            const pColors = (p.colors || [p.mauSac || '']).map(c => c.toLowerCase());
            const pTen = (p.ten || '').toLowerCase();
            return spState.selectedColors.some(color => {
                const selColor = color.toLowerCase();
                return pColors.some(c => c.includes(selColor)) || pTen.includes(selColor);
            });
        });
    }

    // Filter by size (kích cỡ)
    if (spState.selectedSizes && spState.selectedSizes.length > 0) {
        list = list.filter(p => {
            return spState.selectedSizes.some(size => p.sizes.includes(String(size)));
        });
    }

    // Sort
    switch (spState.sort) {
        case 'price-asc':  list.sort((a,b) => a.gia - b.gia); break;
        case 'price-desc': list.sort((a,b) => b.gia - a.gia); break;
        case 'popular':    list.sort((a,b) => b.soLuotDanhGia - a.soLuotDanhGia); break;
        case 'newest':
        default:           list.sort((a,b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }

    spState.filtered = list;
    spState.currentPage = 1;
    renderProducts();
    updatePagination();
    document.getElementById('resultCount').textContent = list.length;
}

/* =============================================
   RENDER
   ============================================= */
function renderProducts() {
    const grid = document.getElementById('productListGrid');
    const start = (spState.currentPage - 1) * spState.pageSize;
    const page  = spState.filtered.slice(start, start + spState.pageSize);

    if (!page.length) {
        grid.innerHTML = `
            <div class="products-empty">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>`;
        return;
    }

    grid.innerHTML = page.map((p, idx) => renderCard(p, start + idx)).join('');

    // Set list/grid view class
    grid.className = 'product-list-grid' + (spState.view === 'list' ? ' list-view' : '');
}

function detectBrand(ten) {
    const t = (ten || '').toLowerCase();
    if (t.includes('nike'))        return { name: 'Nike',        color: '#ff6600' };
    if (t.includes('adidas'))      return { name: 'Adidas',      color: '#000000' };
    if (t.includes('puma'))        return { name: 'Puma',        color: '#c10000' };
    if (t.includes('asics'))       return { name: 'ASICS',       color: '#003cb4' };
    if (t.includes('new balance')) return { name: 'New Balance', color: '#cf102d' };
    if (t.includes('brooks'))      return { name: 'Brooks',      color: '#5a2d9c' };
    if (t.includes('saucony'))     return { name: 'Saucony',     color: '#e8a000' };
    if (t.includes('hoka'))        return { name: 'HOKA',        color: '#1a1a1a' };
    if (t.includes('mizuno'))      return { name: 'Mizuno',      color: '#003087' };
    if (t.includes('vshoes') || t.includes('vshoe')) return { name: 'VShoes', color: '#e3707e' };
    return null;
}

function renderCard(p, globalIdx = 0) {
    const stockClass = p.soLuong === 0 ? 'out' : p.soLuong <= 5 ? 'low-stock' : 'in-stock';
    const stockLabel = p.soLuong === 0
        ? 'Hết hàng'
        : p.soLuong <= 5
            ? `Còn ${p.soLuong} sản phẩm`
            : 'Còn hàng';

    const badges = [];
    if (p.isNew) badges.push(`<span class="sp-badge sp-badge-new">Mới</span>`);
    if (p.discountPct > 0) badges.push(`<span class="sp-badge sp-badge-sale">-${p.discountPct}%</span>`);

    const originalPriceHtml = (p.discountPct > 0 && p.giaGoc)
        ? `<div class="sp-price-original" style="font-size:12px;color:#94a3b8;text-decoration:line-through;margin-bottom:2px;font-weight:500;">${formatPrice(p.giaGoc)}</div>`
        : '';

    const sizesHtml = (p.sizes || []).slice(0, 5).map(s =>
        `<span class="sp-size-tag">${s}</span>`
    ).join('');

    const firstVariant = p.variants && p.variants.length ? (p.variants.find(v => (v.soLuongTon || 0) > 0) || p.variants[0]) : p;
    const targetId = firstVariant.id || p.id;
    const targetStock = firstVariant.soLuongTon != null ? firstVariant.soLuongTon : p.soLuong;

    // Detect brand for label
    const brand = detectBrand(p.ten);
    const brandBadge = brand
        ? `<span class="sp-brand-label" style="background:${brand.color};">${brand.name}</span>`
        : '';

    const fallbackImgs = [
        '/images/sp_33_1781237903207.png',
        '/images/sp_34_1781238256333.png',
        '/images/sp_35_1781242880837.png',
        '/images/sp_36_1781244856644.png',
        '/images/sp_37_1781246418348.png'
    ];
    const fallbackImg = fallbackImgs[globalIdx % fallbackImgs.length];

    return `
    <div class="sp-card" onclick="window.location.href='/client/products/${p.id}'">
        <div class="sp-card-img">
            ${badges.length ? `<div class="sp-badges">${badges.join('')}</div>` : ''}
            ${brandBadge}
            <img src="${p.hinh || fallbackImg}" alt="${p.ten}" loading="lazy"
                 onerror="this.src='${fallbackImg}'">
            <div class="sp-hover-actions">
                <button class="sp-hover-btn sp-hover-btn-cart"
                        onclick="event.stopPropagation(); addToCart(${targetId}, '${p.ten}', ${p.gia}, '${p.hinh}', ${targetStock})">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Thêm vào giỏ
                </button>
                <button class="sp-hover-btn sp-hover-btn-view"
                        onclick="event.stopPropagation(); openProductModal(${p.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Xem nhanh
                </button>
            </div>
        </div>
        <div class="sp-card-body">
            <div class="sp-card-code">${p.ma}</div>
            <div class="sp-card-name">${p.ten}</div>
            ${sizesHtml ? `<div class="sp-sizes">${sizesHtml}</div>` : ''}
            <div class="sp-price-row">
                <div style="display:flex;flex-direction:column;align-items:flex-start;">
                    ${originalPriceHtml}
                    <div class="sp-price-main" style="font-size:17px;font-weight:900;color:#ef4444;line-height:1.1;">${formatPrice(p.gia)}</div>
                </div>
                <div class="sp-rating">
                    <span class="star">★</span>
                    ${p.danhGia}
                    <span>(${p.soLuotDanhGia})</span>
                </div>
            </div>
            <div class="sp-stock ${stockClass}">
                <span class="sp-stock-dot"></span>
                ${stockLabel}
            </div>
        </div>
    </div>`;
}

/* =============================================
   PAGINATION
   ============================================= */
function updatePagination() {
    const total = spState.filtered.length;
    const totalPages = Math.ceil(total / spState.pageSize);
    const wrap = document.getElementById('paginationWrap');
    const info = document.getElementById('pageInfo');
    const nums = document.getElementById('pageNumbers');
    const prev = document.getElementById('prevPageBtn');
    const next = document.getElementById('nextPageBtn');

    wrap.style.display = total > 0 ? 'flex' : 'none';

    const start = (spState.currentPage - 1) * spState.pageSize + 1;
    const end   = Math.min(spState.currentPage * spState.pageSize, total);
    info.textContent = `Hiển thị ${start}–${end} trong ${total} sản phẩm`;

    prev.disabled = spState.currentPage === 1;
    next.disabled = spState.currentPage === totalPages;

    // Page numbers
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - spState.currentPage) <= 1) {
            html += `<button class="page-btn ${i === spState.currentPage ? 'active' : ''}"
                         onclick="goToPage(${i})">${i}</button>`;
        } else if (Math.abs(i - spState.currentPage) === 2) {
            html += `<span style="padding:0 4px;color:var(--gray-400)">…</span>`;
        }
    }
    nums.innerHTML = html;
}

function goToPage(n) {
    spState.currentPage = n;
    renderProducts();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changePage(dir) {
    const totalPages = Math.ceil(spState.filtered.length / spState.pageSize);
    const newPage = spState.currentPage + dir;
    if (newPage < 1 || newPage > totalPages) return;
    goToPage(newPage);
}

/* =============================================
   FILTER CONTROLS
   ============================================= */
function setSort(btn) {
    document.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    spState.sort = btn.dataset.sort;
    applyFilters();
}

function toggleBrand(btn) {
    btn.classList.toggle('active');
    spState.selectedBrands = [...document.querySelectorAll('.brand-option.active')]
        .map(b => b.dataset.brand);
    applyFilters();
}

function toggleSize(btn) {
    btn.classList.toggle('active');
    spState.selectedSizes = [...document.querySelectorAll('.size-option.active')]
        .map(b => b.textContent.trim());
    applyFilters();
}

function updatePriceRange(val) {
    spState.maxPrice = parseInt(val);
    document.getElementById('priceRangeVal').textContent = formatPrice(spState.maxPrice);
    applyFilters();
}

function initPriceSlider() {
    const slider = document.getElementById('priceSlider');
    updatePriceRange(slider.value);
}

function initResetFilter() {
    document.getElementById('btnResetFilter').addEventListener('click', () => {
        // Reset sort
        document.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
        const newestBtn = document.querySelector('[data-sort="newest"]');
        if (newestBtn) newestBtn.classList.add('active');
        spState.sort = 'newest';

        // Reset brands
        document.querySelectorAll('.brand-option').forEach(b => b.classList.remove('active'));
        spState.selectedBrands = [];

        // Reset sizes
        document.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
        spState.selectedSizes = [];

        // Reset price
        const slider = document.getElementById('priceSlider');
        if (slider) {
            slider.value = 10000000;
            updatePriceRange(10000000);
        }

        // Reset search
        const searchInput = document.getElementById('toolbarSearch');
        if (searchInput) searchInput.value = '';
        spState.searchKw = '';

        applyFilters();
        showToast('Đã xóa tất cả bộ lọc', 'success');
    });
}

function initToolbarSearch() {
    const input = document.getElementById('toolbarSearch');
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            spState.searchKw = input.value.trim();
            applyFilters();
        }, 300);
    });
}

/* =============================================
   VIEW TOGGLE
   ============================================= */
function setView(type) {
    spState.view = type;
    const grid = document.getElementById('productListGrid');
    const gBtn = document.getElementById('gridViewBtn');
    const lBtn = document.getElementById('listViewBtn');

    if (type === 'list') {
        grid.classList.add('list-view');
        gBtn.classList.remove('active');
        lBtn.classList.add('active');
    } else {
        grid.classList.remove('list-view');
        gBtn.classList.add('active');
        lBtn.classList.remove('active');
    }
}

/* =============================================
   PRODUCT MODAL
   ============================================= */
function openProductModal(id) {
    const p = spState.products.find(x => x.id === id);
    if (!p) return;

    spState.activeModalProduct = p;
    // Default to the first variant with stock, or just the first variant
    const defaultVariant = p.variants.find(v => (v.soLuongTon || v.soLuong || 0) > 0) || p.variants[0];
    spState.selectedModalVariant = defaultVariant;

    const overlay = document.getElementById('productModalOverlay');
    if (!overlay) return;

    renderProductModalContent();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function renderProductModalContent() {
    const p = spState.activeModalProduct;
    const v = spState.selectedModalVariant;
    if (!p || !v) return;

    const content = document.getElementById('productModalContent');
    if (!content) return;

    // Use current selected variant's stock details
    const stock = v.soLuongTon != null ? v.soLuongTon : (v.soLuong != null ? v.soLuong : 0);
    const selectedSizeStr = String(v.sizeGiay);

    const mainImg = p.hinh || '/images/shoe1.png';
    const thumbnails = [mainImg, '/images/shoe1.png', '/images/shoe2.png', '/images/shoe3.png', '/images/shoe4.png'];
    const uniqueThumbs = [...new Set(thumbnails)];

    content.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;min-height:380px;">
            <!-- Image with thumbnails -->
            <div style="background:var(--gray-50);display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:24px;border-right:1px solid var(--border);">
                <div style="border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; background: #fff; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 220px; box-shadow: var(--shadow-sm);">
                    <img id="modalMainImage" src="${mainImg}" alt="${p.ten}"
                         style="max-height:190px;max-width:100%;object-fit:contain;filter:drop-shadow(0 12px 30px rgba(0,0,0,0.1));"
                         onerror="this.src='/images/shoe1.png'">
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%;" id="modalThumbnailGrid">
                    ${uniqueThumbs.map((t, idx) => `
                        <div class="modal-thumbnail-item ${idx === 0 ? 'active' : ''}" 
                             onclick="setModalMainImage(this, '${t}')"
                             style="border: 2px solid ${idx === 0 ? 'var(--primary)' : 'var(--border)'}; border-radius: 8px; padding: 4px; cursor: pointer; background: #fff; display: flex; align-items: center; justify-content: center; height: 50px; transition: all 0.2s;">
                            <img src="${t}" alt="Thumbnail" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                        </div>
                    `).join('')}
                </div>
            </div>
            <!-- Info -->
            <div style="padding:32px;display:flex;flex-direction:column;gap:16px;position:relative;">
                <button onclick="closeProductModal()" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:8px;background:var(--gray-100);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;z-index:10;">✕</button>

                <div>
                    <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">${v.ma || p.ma}</div>
                    <h3 style="font-size:20px;font-weight:800;color:var(--gray-900);line-height:1.3;">${p.ten}</h3>
                </div>

                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="color:#f59e0b;">★★★★★</span>
                    <span style="font-size:13px;color:var(--gray-500);">${p.danhGia} (${p.soLuotDanhGia} đánh giá)</span>
                </div>

                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:26px;font-weight:900;color:var(--primary);">${formatPrice(p.gia)}</span>
                    ${p.giaGoc ? `<span style="font-size:14px;text-decoration:line-through;color:var(--gray-300);">${formatPrice(p.giaGoc)}</span>` : ''}
                    ${p.discountPct > 0 ? `<span style="background:var(--primary);color:white;font-size:11px;font-weight:800;padding:3px 9px;border-radius:50px;">-${p.discountPct}%</span>` : ''}
                </div>

                <div>
                    <div style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Kích thước</div>
                    <div style="display:flex;gap:7px;flex-wrap:wrap;">
                        ${p.sizes.map(s => {
                            const isActive = String(s) === selectedSizeStr;
                            const btnStyle = isActive
                                ? 'background:linear-gradient(135deg,#00adef 0%,#0f2d4a 100%);color:white;border-color:transparent;'
                                : 'background:white;color:var(--gray-700);border:1.5px solid var(--border);';
                            return `
                                <button onclick="selectProductModalSize('${s}')"
                                    style="min-width:40px;height:36px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;padding:0 8px;font-family:var(--font); ${btnStyle}">
                                    ${s}
                                </button>`;
                        }).join('')}
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${stock===0?'#dc2626':stock<=5?'#d97706':'#059669'}">
                    <span style="width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block;flex-shrink:0;"></span>
                    ${stock===0 ? 'Hết hàng' : stock<=5 ? `Chỉ còn ${stock} sản phẩm` : 'Còn hàng'}
                </div>

                <div style="display:flex;gap:10px;margin-top:auto;">
                    <button onclick="addProductModalToCart()"
                        style="flex:1;padding:13px;background:var(--gradient);color:white;border:none;border-radius:var(--radius-md);font-size:14px;font-weight:800;cursor:pointer;font-family:var(--font);box-shadow:var(--shadow-primary);transition:all .2s;" ${stock > 0 ? '' : 'disabled style="background:#ccc;box-shadow:none;cursor:not-allowed;"'}>
                        🛒 Thêm vào giỏ hàng
                    </button>
                    <button style="width:46px;height:46px;border:1.5px solid var(--border);border-radius:var(--radius-md);background:white;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">♡</button>
                </div>
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

function selectProductModalSize(size) {
    const p = spState.activeModalProduct;
    if (!p) return;
    const match = p.variants.find(v => String(v.sizeGiay) === String(size));
    if (match) {
        spState.selectedModalVariant = match;
        renderProductModalContent();
    }
}

function addProductModalToCart() {
    const v = spState.selectedModalVariant;
    const p = spState.activeModalProduct;
    if (!v || !p) return;
    addToCart(v.id, p.ten, p.gia, p.hinh, v.soLuongTon || v.soLuong);
    closeProductModal();
}

function closeProductModal() {
    document.getElementById('productModalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

/* =============================================
   CART (delegates to trang-chu.js functions)
   ============================================= */
function addToCart(id, ten, gia, hinh, soLuong) {
    if (typeof window.addToCartGlobal === 'function') {
        window.addToCartGlobal(id, ten, gia, hinh, soLuong);
    } else {
        showToast(`Đã thêm "${ten}" vào giỏ hàng`, 'success');
    }
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

function formatPrice(v) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
}

function showToast(msg, type = 'success') {
    if (typeof window.showToastGlobal === 'function') {
        window.showToastGlobal(msg, type);
        return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

