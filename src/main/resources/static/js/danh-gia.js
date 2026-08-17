/**
 * ============================================================
 * JAVASCRIPT QUẢN LÝ ĐÁNH GIÁ (ADMIN) - VSHOES SYSTEM
 * ============================================================
 */

const dgState = {
    viewMode: 'by-product', // 'by-product' (mặc định) | 'all-reviews'
    currentView: 'list',    // 'list' | 'detail'
    allProducts: [],
    filteredProducts: [],
    allReviews: [],
    filteredReviews: [],
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',

    // State cho trang chi tiết sản phẩm
    selectedProductId: null,
    selectedProduct: null,
    detailStarFilter: 'all', // 'all', 5, 4, 3, 2, 1
    detailDateFrom: '',
    detailDateTo: '',
    detailStatus: '1' // 'all', '1' (đang hiển thị - mặc định), '0' (đã ẩn)
};

document.addEventListener('DOMContentLoaded', () => {
    initReviewAdmin();
});

async function initReviewAdmin() {
    await loadData();
}

/* ============================================================
   1. TẢI DỮ LIỆU TỪ SERVER
   ============================================================ */
async function loadData() {
    const tbody = document.getElementById('reviewTableBody');
    if (tbody && dgState.currentView === 'list') {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 48px; color: #94a3b8;">
                    <div style="display:inline-block; width:24px; height:24px; border:3px solid #cbd5e1; border-top-color:#00adef; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom: 8px;"></div>
                    <div>Đang tải dữ liệu đánh giá...</div>
                </td>
            </tr>
        `;
    }

    try {
        const [resByProduct, resAllReviews] = await Promise.all([
            fetch('/api/admin/danh-gia/by-product'),
            fetch('/api/admin/danh-gia')
        ]);

        if (resByProduct.ok) {
            dgState.allProducts = await resByProduct.json();
        }
        if (resAllReviews.ok) {
            dgState.allReviews = await resAllReviews.json();
        }

        if (dgState.currentView === 'detail' && dgState.selectedProductId) {
            const updatedProd = dgState.allProducts.find(p => p.id === dgState.selectedProductId);
            if (updatedProd) {
                dgState.selectedProduct = updatedProd;
                renderDetailView();
            }
        } else {
            applyFilters();
        }
    } catch (e) {
        console.error('Lỗi tải dữ liệu đánh giá:', e);
        if (tbody && dgState.currentView === 'list') {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 40px; color: #ef4444;">
                        Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau!
                    </td>
                </tr>
            `;
        }
    }
}

/* ============================================================
   2. ĐIỀU HƯỚNG VIEW (DANH SÁCH <-> CHI TIẾT)
   ============================================================ */
function openProductDetail(productId) {
    const prod = dgState.allProducts.find(p => p.id === productId);
    if (!prod) return;

    dgState.currentView = 'detail';
    dgState.selectedProductId = productId;
    dgState.selectedProduct = prod;
    dgState.detailStarFilter = 'all';
    dgState.detailDateFrom = '';
    dgState.detailDateTo = '';
    dgState.detailStatus = '1';

    // Ẩn bảng danh sách, hiển thị trang chi tiết
    const listView = document.getElementById('dgListView');
    const detailView = document.getElementById('dgDetailView');
    const searchWrap = document.getElementById('headerSearchWrap');

    if (listView) listView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';
    if (searchWrap) searchWrap.style.display = 'none';

    // Reset date & status inputs
    const df = document.getElementById('detailDateFrom');
    const dt = document.getElementById('detailDateTo');
    const sf = document.getElementById('detailStatusFilter');
    if (df) df.value = '';
    if (dt) dt.value = '';
    if (sf) sf.value = '1';

    renderDetailView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToList() {
    dgState.currentView = 'list';
    dgState.selectedProductId = null;
    dgState.selectedProduct = null;

    const listView = document.getElementById('dgListView');
    const detailView = document.getElementById('dgDetailView');
    const searchWrap = document.getElementById('headerSearchWrap');

    if (detailView) detailView.style.display = 'none';
    if (listView) listView.style.display = 'block';
    if (searchWrap) searchWrap.style.display = 'block';

    applyFilters();
}

/* ============================================================
   3. CHẾ ĐỘ XEM & TÌM KIẾM (VIEW 1: DANH SÁCH)
   ============================================================ */
function onViewModeChange(mode) {
    dgState.viewMode = mode;
    dgState.currentPage = 1;

    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
        if (mode === 'by-product') {
            searchInput.placeholder = 'Tìm theo tên hoặc mã sản phẩm...';
        } else {
            searchInput.placeholder = 'Tìm theo tên khách, sản phẩm, mã #HD, nội dung...';
        }
    }

    if (dgState.currentView === 'detail') {
        backToList();
    } else {
        applyFilters();
    }
}

function onSearchInput(val) {
    dgState.searchQuery = (val || '').trim().toLowerCase();
    dgState.currentPage = 1;
    applyFilters();
}

function applyFilters() {
    const q = dgState.searchQuery;

    if (dgState.viewMode === 'by-product') {
        let list = [...dgState.allProducts];
        if (q) {
            list = list.filter(p => {
                const name = (p.tenSanPham || '').toLowerCase();
                const code = (p.ma || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            });
        }
        dgState.filteredProducts = list;
    } else {
        let list = [...dgState.allReviews];
        if (q) {
            list = list.filter(r => {
                const spName = (r.sanPham?.tenSanPham || '').toLowerCase();
                const spMa = (r.sanPham?.ma || '').toLowerCase();
                const khName = (r.khachHang?.hoTen || r.tenHienThi || '').toLowerCase();
                const khPhone = (r.khachHang?.soDienThoai || '').toLowerCase();
                const hdCode = (r.hoaDon?.maHoaDon || '').toLowerCase();
                const content = (r.noiDung || '').toLowerCase();
                return spName.includes(q) || spMa.includes(q) || khName.includes(q) ||
                       khPhone.includes(q) || hdCode.includes(q) || content.includes(q);
            });
        }
        dgState.filteredReviews = list;
    }

    renderTable();
    renderPagination();
}

/* ============================================================
   4. RENDER BẢNG DANH SÁCH (VIEW 1)
   ============================================================ */
function renderTable() {
    const thead = document.getElementById('dgTableHead');
    const tbody = document.getElementById('reviewTableBody');
    if (!tbody || !thead) return;

    if (dgState.viewMode === 'by-product') {
        thead.innerHTML = `
            <tr>
                <th style="width: 42%;">Sản phẩm</th>
                <th style="width: 15%; text-align: center;">Số đánh giá</th>
                <th style="width: 15%; text-align: center;">Điểm TB</th>
                <th style="width: 18%;">Mới nhất</th>
                <th style="width: 10%; text-align: center;">Thao tác</th>
            </tr>
        `;

        if (dgState.filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 56px 20px; color: #94a3b8;">
                        <div style="font-size: 36px; margin-bottom: 8px;">👟</div>
                        <div style="font-weight: 700; color: #475569; font-size: 15px;">Không tìm thấy sản phẩm nào</div>
                        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Hãy thử đổi từ khoá tìm kiếm khác.</div>
                    </td>
                </tr>
            `;
            return;
        }

        const start = (dgState.currentPage - 1) * dgState.pageSize;
        const pageItems = dgState.filteredProducts.slice(start, start + dgState.pageSize);

        tbody.innerHTML = pageItems.map(p => {
            const imgUrl = getImageUrl(p.hinhAnh, p.id || 0);
            const hasReviews = p.soDanhGia > 0;
            const countDisplay = hasReviews ? `${p.soDanhGia} đánh giá` : '0 đánh giá';
            const timeDisplay = (p.moiNhat && p.moiNhat !== '-') ? p.moiNhat : 'Chưa có';

            return `
                <tr>
                    <td>
                        <div class="dg-prod-cell">
                            <img src="${imgUrl}" class="dg-prod-img" alt="${escapeHtml(p.tenSanPham || '')}" onerror="this.src='/images/shoe1.png'">
                            <div class="dg-prod-info">
                                <div class="dg-prod-title">${escapeHtml(p.tenSanPham || 'Sản phẩm VShoes')}</div>
                                <span class="dg-prod-code">${escapeHtml(p.ma || 'SP-N/A')}</span>
                            </div>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span class="dg-count-pill ${hasReviews ? 'has-review' : 'no-review'}">
                            ${countDisplay}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span class="dg-score-badge ${hasReviews ? 'has-score' : 'no-score'}">
                            ★ ${p.diemTB}
                        </span>
                    </td>
                    <td>
                        <div class="dg-time-cell">
                            <i data-lucide="clock" class="dg-time-ico"></i>
                            <span>${escapeHtml(timeDisplay)}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <button class="dg-btn-action-view" onclick="openProductDetail(${p.id})" title="Xem chi tiết đánh giá">
                            <i data-lucide="eye" style="width: 15px; height: 15px;"></i>
                            <span>Chi tiết</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } else {
        thead.innerHTML = `
            <tr>
                <th style="width: 44px; text-align: center;">STT</th>
                <th style="width: 25%;">Sản phẩm</th>
                <th style="width: 20%;">Khách hàng</th>
                <th style="width: 28%;">Đánh giá & Bình luận</th>
                <th style="width: 13%;">Thời gian</th>
                <th style="width: 10%; text-align: center;">Thao tác</th>
            </tr>
        `;

        if (dgState.filteredReviews.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 56px 20px; color: #94a3b8;">
                        <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                        <div style="font-weight: 700; color: #475569; font-size: 15px;">Không tìm thấy đánh giá nào</div>
                        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Hãy thử đổi từ khoá tìm kiếm khác.</div>
                    </td>
                </tr>
            `;
            return;
        }

        const start = (dgState.currentPage - 1) * dgState.pageSize;
        const pageItems = dgState.filteredReviews.slice(start, start + dgState.pageSize);

        tbody.innerHTML = pageItems.map((r, idx) => {
            const stt = start + idx + 1;
            const sp = r.sanPham || {};
            const kh = r.khachHang || {};
            const stars = r.soSao || 5;
            const authorName = kh.hoTen || r.tenHienThi || 'Khách hàng';
            const imgUrl = getImageUrl(sp.hinhAnh, sp.id || 0);

            return `
                <tr>
                    <td style="text-align: center; color: #94a3b8; font-weight: 600;">${stt}</td>
                    <td>
                        <div class="dg-prod-cell">
                            <img src="${imgUrl}" class="dg-prod-img" alt="${escapeHtml(sp.tenSanPham || '')}" onerror="this.src='/images/shoe1.png'">
                            <div class="dg-prod-info">
                                <div class="dg-prod-title">${escapeHtml(sp.tenSanPham || 'Sản phẩm VShoes')}</div>
                                <span class="dg-prod-code">${escapeHtml(sp.ma || 'SP-N/A')}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(authorName)}</div>
                        <div style="font-size: 12px; color: #94a3b8;">${escapeHtml(kh.soDienThoai || 'Khách trực tuyến')}</div>
                    </td>
                    <td>
                        <div style="color: #f59e0b; font-weight: 700; font-size: 13px; margin-bottom: 2px;">
                            ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}
                        </div>
                        <div style="font-size: 13px; color: #334155;">
                            ${escapeHtml(r.noiDung || '(Không có bình luận chữ)')}
                        </div>
                    </td>
                    <td>
                        <span class="dg-time-text">${escapeHtml(r.ngayTao || '')}</span>
                    </td>
                    <td style="text-align: center;">
                        <button class="dg-icon-btn-view" onclick="openProductDetail(${sp.id})" title="Xem chi tiết">
                            <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function renderPagination() {
    const wrap = document.getElementById('paginationWrap');
    if (!wrap) return;

    const list = (dgState.viewMode === 'by-product') ? dgState.filteredProducts : dgState.filteredReviews;
    const totalPages = Math.ceil(list.length / dgState.pageSize) || 1;
    const current = dgState.currentPage;

    if (totalPages <= 1) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'flex';

    let html = `
        <div style="font-size: 13px; color: #64748b;">
            Hiển thị trang <strong>${current}</strong> / <strong>${totalPages}</strong> (${list.length} mục)
        </div>
        <div style="display: flex; gap: 6px;">
            <button class="dg-page-btn" ${current === 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})">❮</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
            html += `<button class="dg-page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span style="padding: 6px 4px; color: #94a3b8;">...</span>`;
        }
    }

    html += `
            <button class="dg-page-btn" ${current === totalPages ? 'disabled' : ''} onclick="goToPage(${current + 1})">❯</button>
        </div>
    `;

    wrap.innerHTML = html;
}

function goToPage(page) {
    dgState.currentPage = page;
    renderTable();
    renderPagination();
}

/* ============================================================
   5. RENDER DETAIL VIEW (VIEW 2: CHI TIẾT ĐÁNH GIÁ SẢN PHẨM NHƯ ẢNH)
   ============================================================ */
function renderDetailView() {
    const prod = dgState.selectedProduct;
    if (!prod) return;

    // 1. Render Banner Card
    const bannerEl = document.getElementById('detailProductBanner');
    if (bannerEl) {
        const imgUrl = getImageUrl(prod.hinhAnh, prod.id || 0);
        bannerEl.innerHTML = `
            <div class="dg-banner-prod">
                <img src="${imgUrl}" class="dg-banner-img" alt="${escapeHtml(prod.tenSanPham || '')}" onerror="this.src='/images/shoe1.png'">
                <div class="dg-banner-info">
                    <div class="dg-banner-title">${escapeHtml(prod.tenSanPham || 'Sản phẩm')}</div>
                    <div class="dg-banner-code">${escapeHtml(prod.ma || 'SP-N/A')}</div>
                </div>
            </div>
        `;
    }

    // 2. Render Rating & Pill Filters Card
    const pillCardEl = document.getElementById('detailRatingPillCard');
    if (pillCardEl) {
        const allReviews = prod.reviews || [];
        const total = allReviews.length;
        const count5 = allReviews.filter(r => (r.soSao || 5) === 5).length;
        const count4 = allReviews.filter(r => r.soSao === 4).length;
        const count3 = allReviews.filter(r => r.soSao === 3).length;
        const count2 = allReviews.filter(r => r.soSao === 2).length;
        const count1 = allReviews.filter(r => r.soSao === 1).length;

        const currentFilter = dgState.detailStarFilter;
        const avgScoreRound = Math.min(5, Math.max(1, Math.round(prod.diemTBNumeric || 5)));
        const avgStarsHtml = '★'.repeat(avgScoreRound) + '<span style="color:#cbd5e1;letter-spacing:2px;">' + '★'.repeat(5 - avgScoreRound) + '</span>';

        pillCardEl.innerHTML = `
            <div class="dg-rating-pill-card-content">
                <div class="dg-score-summary-left">
                    <div class="dg-score-num-big">${prod.diemTB}</div>
                    <div class="dg-score-stars-col">
                        <div class="dg-score-stars-render">${avgStarsHtml}</div>
                        <div class="dg-score-subtitle">Trung bình sản phẩm · ${total} đánh giá</div>
                    </div>
                </div>

                <div class="dg-pill-group">
                    <button class="dg-star-pill ${currentFilter === 'all' ? 'active' : ''}" onclick="onDetailStarFilter('all')">
                        Tất cả (${total})
                    </button>
                    <button class="dg-star-pill ${currentFilter === 5 ? 'active' : ''}" onclick="onDetailStarFilter(5)">
                        5 ★ (${count5})
                    </button>
                    <button class="dg-star-pill ${currentFilter === 4 ? 'active' : ''}" onclick="onDetailStarFilter(4)">
                        4 ★ (${count4})
                    </button>
                    <button class="dg-star-pill ${currentFilter === 3 ? 'active' : ''}" onclick="onDetailStarFilter(3)">
                        3 ★ (${count3})
                    </button>
                    <button class="dg-star-pill ${currentFilter === 2 ? 'active' : ''}" onclick="onDetailStarFilter(2)">
                        2 ★ (${count2})
                    </button>
                    <button class="dg-star-pill ${currentFilter === 1 ? 'active' : ''}" onclick="onDetailStarFilter(1)">
                        1 ★ (${count1})
                    </button>
                </div>
            </div>
        `;
    }

    // 3. Render Reviews List
    renderDetailReviewsList();

    if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function onDetailStarFilter(star) {
    dgState.detailStarFilter = star;
    renderDetailView();
}

function onDetailFilterChange() {
    const df = document.getElementById('detailDateFrom');
    const dt = document.getElementById('detailDateTo');
    const sf = document.getElementById('detailStatusFilter');

    dgState.detailDateFrom = df ? df.value : '';
    dgState.detailDateTo = dt ? dt.value : '';
    dgState.detailStatus = sf ? sf.value : '1';

    renderDetailReviewsList();
}

function renderDetailReviewsList() {
    const listEl = document.getElementById('detailReviewsList');
    if (!listEl || !dgState.selectedProduct) return;

    let reviews = dgState.selectedProduct.reviews || [];

    // Filter by Star Pill
    if (dgState.detailStarFilter !== 'all') {
        const targetStar = parseInt(dgState.detailStarFilter);
        reviews = reviews.filter(r => (r.soSao || 5) === targetStar);
    }

    // Filter by Status
    if (dgState.detailStatus !== 'all') {
        const targetStatus = parseInt(dgState.detailStatus);
        reviews = reviews.filter(r => (r.trangThai ?? 1) === targetStatus);
    }

    // Filter by Date Range (ngayTaoIso: "2026-07-12T20:52:00")
    if (dgState.detailDateFrom) {
        reviews = reviews.filter(r => {
            if (!r.ngayTaoIso) return true;
            return r.ngayTaoIso.slice(0, 10) >= dgState.detailDateFrom;
        });
    }
    if (dgState.detailDateTo) {
        reviews = reviews.filter(r => {
            if (!r.ngayTaoIso) return true;
            return r.ngayTaoIso.slice(0, 10) <= dgState.detailDateTo;
        });
    }

    if (reviews.length === 0) {
        listEl.innerHTML = `
            <div class="dg-detail-card" style="text-align: center; padding: 48px 20px; color: #94a3b8;">
                <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                <div style="font-size: 15px; font-weight: 700; color: #475569;">Không có đánh giá nào phù hợp với bộ lọc</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Hãy thử chọn số sao khác hoặc thay đổi khoảng ngày tìm kiếm.</div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = reviews.map(r => {
        const kh = r.khachHang || {};
        const stars = r.soSao || 5;
        const authorName = kh.hoTen || r.tenHienThi || 'Khách hàng';
        const initial = authorName.trim().charAt(0).toUpperCase() || 'K';
        const images = r.anhDanhGia || [];

        // Stars render (e.g. ★★★★★ or ★☆☆☆☆ with soft styling)
        const starsDisplay = '★'.repeat(stars) + '<span style="color:#cbd5e1;letter-spacing:2px;">' + '★'.repeat(5 - stars) + '</span>';

        // Images gallery
        const imagesHtml = images.length > 0 ? `
            <div class="dg-review-images-list">
                ${images.map(img => `
                    <img src="${img}" class="dg-review-img-thumb" alt="Ảnh thực tế" 
                         onclick="openLightbox('${img}')"
                         onerror="this.style.display='none'">
                `).join('')}
            </div>
        ` : '';

        // Existing Reply or Reply Form
        let replyHtml = '';
        if (r.phanHoi) {
            replyHtml = `
                <div class="dg-existing-reply-box">
                    <div class="dg-existing-reply-head">
                        <span>💬 Phản hồi từ ${escapeHtml(r.nguoiPhanHoi || 'Shop VShoes')}</span>
                        <span style="font-size: 12px; font-weight: 500; color: #15803d;">${escapeHtml(r.ngayPhanHoi || '')}</span>
                    </div>
                    <div class="dg-existing-reply-text">${escapeHtml(r.phanHoi)}</div>
                </div>
            `;
        } else {
            replyHtml = `
                <div class="dg-reply-form-wrap">
                    <textarea id="replyText_${r.id}" class="dg-reply-textarea" rows="2" 
                              placeholder="Nhập phản hồi cho khách (chỉ phản hồi được 1 lần)..."></textarea>
                    <button class="dg-btn-send-reply" onclick="sendDirectReply(${r.id})">Gửi phản hồi</button>
                </div>
            `;
        }

        return `
            <div class="dg-review-detail-card" id="reviewCard_${r.id}">
                <div class="dg-review-head">
                    <div class="dg-review-user-info">
                        <div class="dg-review-avatar-circle">${initial}</div>
                        <div>
                            <span class="dg-review-author-name">${escapeHtml(authorName)}</span>
                            <span class="dg-review-timestamp">${escapeHtml(r.ngayTao || '')}</span>
                        </div>
                    </div>
                    <div>
                        <button class="dg-btn-del-text" onclick="confirmDeleteReview(${r.id}, ${dgState.selectedProductId})">Xóa</button>
                    </div>
                </div>

                <div class="dg-review-stars-render">${starsDisplay}</div>

                <div class="dg-review-text-content">
                    ${escapeHtml(r.noiDung || '(Khách hàng không để lại nhận xét bằng chữ)')}
                </div>

                ${imagesHtml}
                ${replyHtml}
            </div>
        `;
    }).join('');
}

/* ============================================================
   6. GỬI PHẢN HỒI CHO KHÁCH
   ============================================================ */
async function sendDirectReply(reviewId) {
    const input = document.getElementById(`replyText_${reviewId}`);
    const text = input ? input.value.trim() : '';

    if (!text) {
        if (window.Swal) {
            Swal.fire({ icon: 'warning', title: 'Thông báo', text: 'Vui lòng nhập nội dung phản hồi!' });
        }
        return;
    }

    try {
        const res = await fetch(`/api/admin/danh-gia/${reviewId}/reply`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phanHoi: text,
                nguoiPhanHoi: 'Shop VShoes'
            })
        });

        if (!res.ok) throw new Error('API error');

        await loadData();

        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Đã gửi phản hồi thành công!',
                showConfirmButton: false,
                timer: 2000
            });
        }
    } catch (e) {
        if (window.Swal) {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể gửi phản hồi!' });
        }
    }
}

/* ============================================================
   7. XOÁ ĐÁNH GIÁ
   ============================================================ */
function confirmDeleteReview(reviewId, prodId) {
    if (window.Swal) {
        Swal.fire({
            title: 'Xác nhận xoá đánh giá?',
            text: 'Đánh giá này sẽ bị xoá vĩnh viễn khỏi hệ thống!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Đồng ý xoá',
            cancelButtonText: 'Huỷ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await fetch(`/api/admin/danh-gia/${reviewId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('API error');

                    await loadData();

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Đã xoá đánh giá thành công!',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } catch (e) {
                    Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể xoá đánh giá!' });
                }
            }
        });
    }
}

/* ============================================================
   8. NÚT PHÂN TÍCH AI / SMART INSIGHTS
   ============================================================ */
async function analyzeCurrentProduct() {
    if (!dgState.selectedProductId) return;

    try {
        const res = await fetch(`/api/admin/danh-gia/analyze/${dgState.selectedProductId}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (window.Swal) {
            Swal.fire({
                title: `✨ Phân tích Đánh giá: ${data.productName}`,
                html: `
                    <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; text-align: center;">
                            <div style="background: #f0fdf4; padding: 12px 8px; border-radius: 10px; border: 1px solid #bbf7d0;">
                                <div style="font-size: 20px; font-weight: 800; color: #16a34a;">${data.positivePercent}%</div>
                                <div style="font-size: 12px; color: #15803d; font-weight: 700;">Tích cực (${data.positiveCount})</div>
                            </div>
                            <div style="background: #fffbeb; padding: 12px 8px; border-radius: 10px; border: 1px solid #fde68a;">
                                <div style="font-size: 20px; font-weight: 800; color: #d97706;">${data.neutralCount}</div>
                                <div style="font-size: 12px; color: #b45309; font-weight: 700;">Trung lập</div>
                            </div>
                            <div style="background: #fef2f2; padding: 12px 8px; border-radius: 10px; border: 1px solid #fecaca;">
                                <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${data.negativePercent}%</div>
                                <div style="font-size: 12px; color: #b91c1c; font-weight: 700;">Tiêu cực (${data.negativeCount})</div>
                            </div>
                        </div>

                        <div style="background: #f8fafc; padding: 14px 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
                            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">📊 Tổng quan sản phẩm:</div>
                            <div>• Tổng số nhận xét: <strong>${data.totalReviews} lượt</strong></div>
                            <div>• Điểm đánh giá trung bình: <strong style="color: #f59e0b;">★ ${data.avgRating} / 5.0</strong></div>
                            <div>• Đánh giá kèm hình ảnh thực tế: <strong>${data.withImagesCount} lượt</strong></div>
                        </div>

                        <div style="background: #eff6ff; padding: 14px 16px; border-radius: 10px; border: 1px solid #bfdbfe;">
                            <div style="font-weight: 700; color: #1e40af; margin-bottom: 6px;">💡 Đề xuất hành động cho Shop:</div>
                            <div>${data.negativeCount > 0 ? '• Cần ưu tiên liên hệ khách hàng có phản hồi chưa hài lòng để hỗ trợ đổi trả hoặc bảo hành kịp thời.' : '• Sản phẩm đang nhận được sự hài lòng cao từ khách hàng, nên tiếp tục duy trì chất lượng và đẩy mạnh khuyến mãi!'}</div>
                        </div>
                    </div>
                `,
                confirmButtonText: 'Đã hiểu',
                confirmButtonColor: '#00adef',
                width: 540
            });
        }
    } catch (e) {
        if (window.Swal) {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể phân tích dữ liệu đánh giá!' });
        }
    }
}

/* ============================================================
   9. LIGHTBOX XEM ẢNH PHÓNG TO
   ============================================================ */
function openLightbox(src) {
    const modal = document.getElementById('dgLightboxModal');
    const img = document.getElementById('dgLightboxImg');
    if (modal && img) {
        img.src = src;
        modal.style.display = 'flex';
    }
}

function closeLightbox(e) {
    if (e && e.target && e.target.id === 'dgLightboxImg') return;
    const modal = document.getElementById('dgLightboxModal');
    if (modal) modal.style.display = 'none';
}

/* ============================================================
   10. UTILITY FUNCTIONS
   ============================================================ */
function getImageUrl(hinhAnh, seedId) {
    if (hinhAnh && typeof hinhAnh === 'string' && hinhAnh.trim().length > 0 && hinhAnh !== '[]') {
        const clean = hinhAnh.replace(/[\[\]"']/g, '').trim();
        const parts = clean.split(',');
        if (parts.length > 0 && parts[0].trim().length > 0) {
            return parts[0].trim();
        }
    }
    const seed = (seedId % 6) + 1;
    return `/images/shoe${seed}.png`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
