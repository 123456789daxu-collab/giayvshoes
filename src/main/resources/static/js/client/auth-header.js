document.addEventListener('DOMContentLoaded', () => {
    checkCurrentUserStatus();
    initHeaderSearch();
});

function initHeaderSearch() {
    const searchInput = document.getElementById('searchKeyword');
    if (!searchInput) return;

    // Populate search input from URL parameter if available
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        searchInput.value = searchParam;
    }

    const searchForm = searchInput.closest('form') || document.getElementById('searchForm');
    const searchBtn = searchInput.nextElementSibling || document.querySelector('.search-btn');

    function executeSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        if (window.location.pathname === '/client/san-pham') {
            if (typeof spState !== 'undefined') {
                spState.searchKw = query;
                const toolbarInput = document.getElementById('toolbarSearch');
                if (toolbarInput) toolbarInput.value = query;
                if (typeof applyFilters === 'function') applyFilters();
            }
            const newUrl = '/client/san-pham?search=' + encodeURIComponent(query);
            window.history.pushState({ path: newUrl }, '', newUrl);
        } else {
            window.location.href = '/client/san-pham?search=' + encodeURIComponent(query);
        }
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            executeSearch();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeSearch();
        });
    }

    // Live search dropdown
    const searchContainer = searchInput.parentElement;
    let dropdown = document.getElementById('headerSearchDropdown');
    if (searchContainer) {
        searchContainer.style.position = 'relative';
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'headerSearchDropdown';
            dropdown.style.cssText = `
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                right: 0;
                background: white;
                border-radius: 12px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.15);
                border: 1px solid #e2e8f0;
                z-index: 9999;
                display: none;
                overflow: hidden;
                max-height: 380px;
                overflow-y: auto;
            `;
            searchContainer.appendChild(dropdown);
        }
    }

    let fetchTimer = null;
    let cachedProducts = null;

    async function getProducts() {
        if (cachedProducts) return cachedProducts;
        try {
            const res = await fetch('/api/san-pham/search-sale');
            if (res.ok) {
                cachedProducts = await res.json();
                return cachedProducts;
            }
        } catch (e) {}
        return [];
    }

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        clearTimeout(fetchTimer);

        if (!query) {
            if (dropdown) dropdown.style.display = 'none';
            return;
        }

        fetchTimer = setTimeout(async () => {
            const products = await getProducts();
            const matches = products.filter(p => 
                (p.tenSanPham && p.tenSanPham.toLowerCase().includes(query)) ||
                (p.mauSac && p.mauSac.toLowerCase().includes(query)) ||
                (p.ma && p.ma.toLowerCase().includes(query))
            );

            const seen = new Set();
            const uniqueMatches = [];
            for (const p of matches) {
                const name = p.tenSanPham || 'Sản phẩm';
                if (!seen.has(name)) {
                    seen.add(name);
                    uniqueMatches.push(p);
                }
            }

            renderDropdown(query, uniqueMatches.slice(0, 5));
        }, 200);
    });

    function renderDropdown(query, items) {
        if (!dropdown) return;
        if (!items || items.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">
                    Không tìm thấy sản phẩm nào khớp với "<strong>${escapeHtml(query)}</strong>"
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }

        let html = items.map(item => {
            const img = getImageUrlHeader(item.hinhAnh, item.id || 0);
            const price = parseFloat(item.giaBan) || 0;
            const priceFmt = price.toLocaleString('vi-VN') + ' ₫';

            return `
                <a href="/client/products/${item.id}" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 14px;
                    text-decoration: none;
                    color: inherit;
                    border-bottom: 1px solid #f1f5f9;
                    transition: background 0.15s;
                " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <img src="${img}" alt="" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; background: #f8fafc; padding: 4px; border: 1px solid #e8edf3;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.tenSanPham)}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(item.mauSac || '')} ${item.sizeGiay ? '— Size ' + item.sizeGiay : ''}</div>
                    </div>
                    <div style="font-weight: 800; font-size: 13px; color: #ef4444; flex-shrink: 0;">${priceFmt}</div>
                </a>
            `;
        }).join('');

        html += `
            <div onclick="executeHeaderSearchFromDropdown('${escapeHtml(query)}')" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 12px;
                background: #f0f7ff;
                color: #00adef;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                text-align: center;
            " onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f0f7ff'">
                Xem tất cả kết quả cho "${escapeHtml(query)}" →
            </div>
        `;

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }

    document.addEventListener('click', (e) => {
        if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function executeHeaderSearchFromDropdown(query) {
    const dropdown = document.getElementById('headerSearchDropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (window.location.pathname === '/client/san-pham') {
        if (typeof spState !== 'undefined') {
            spState.searchKw = query;
            const toolbarInput = document.getElementById('toolbarSearch');
            if (toolbarInput) toolbarInput.value = query;
            if (typeof applyFilters === 'function') applyFilters();
        }
        const newUrl = '/client/san-pham?search=' + encodeURIComponent(query);
        window.history.pushState({ path: newUrl }, '', newUrl);
    } else {
        window.location.href = '/client/san-pham?search=' + encodeURIComponent(query);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function checkCurrentUserStatus() {
    const authSection = document.getElementById('headerAuthSection');
    if (!authSection) return;
    
    try {
        const res = await fetch('/api/auth/current-user');
        if (!res.ok) {
            if (res.status === 403) {
                const data = await res.json();
                if (data.expired) {
                    alert(data.message || 'Trạng thái đăng nhập đã hết hạn hoặc tài khoản bị khóa!');
                    window.location.href = '/client/dang-nhap';
                }
            }
            return;
        }
        const data = await res.json();

        
        if (data.loggedIn) {
            authSection.innerHTML = `
                <a href="/client/tra-cuu">Theo dõi đơn hàng</a>
                <span class="user-welcome" style="font-weight: 600; color: var(--secondary-dark); margin-left: 10px; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="user" style="width:14px;height:14px;"></i>
                    Xin chào, <strong style="color: var(--primary);">${data.user.hoTen}</strong>
                </span>
                <a href="#" id="btnLogoutAction" style="color: #ef4444; font-weight: 700; margin-left: 15px; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="log-out" style="width:14px;height:14px;"></i>
                    Đăng xuất
                </a>
            `;
            
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            const btnLogout = document.getElementById('btnLogoutAction');
            if (btnLogout) {
                btnLogout.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
                        await performLogout();
                    }
                });
            }
            
            const accountBtn = document.querySelector('a.action-btn[aria-label="Tài khoản"]');
            if (accountBtn) {
                accountBtn.href = "/client/tai-khoan";
                accountBtn.onclick = null;
            }
        } else {
            authSection.innerHTML = `
                <a href="/client/tra-cuu">Theo dõi đơn hàng</a>
                <a href="/client/dang-nhap" id="loginLink">Đăng nhập</a>
                <a href="/client/dang-ky" class="btn-register" id="registerLink">Đăng ký</a>
            `;
            
            const accountBtn = document.querySelector('a.action-btn[aria-label="Tài khoản"]');
            if (accountBtn) {
                accountBtn.href = "/client/dang-nhap";
                accountBtn.onclick = null;
            }
        }
    } catch (e) {
        console.error("Error checking auth status", e);
    }
}

async function performLogout() {
    try {
        const res = await fetch('/api/auth/dang-xuat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            localStorage.removeItem('checkout_items');
            window.location.href = '/trang-chu';
        } else {
            alert('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối máy chủ!');
    }
}

function getImageUrlHeader(hinhAnh, defaultIdx = 0) {
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

