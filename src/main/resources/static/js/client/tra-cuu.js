/**
 * VHOES - Order Tracking / Lookup JS
 * Version 6.5 - Supports Order Review & Immediate Sync
 */

async function safeFetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("Phiên kết nối đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng tải lại trang hoặc đăng nhập lại.");
    }
    if (!res.ok) {
        let errText = "Lỗi kết nối máy chủ";
        try { 
            const data = await res.json();
            errText = data.message || data.error || errText;
        } catch(e) {
            try { errText = await res.text(); } catch(e2) {}
        }
        throw new Error(errText || "Lỗi kết nối máy chủ");
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
}

const state = {
    currentInvoice: null,
    currentItems: [],
    userEmail: null,
    reviewRating: 5,
    reviewImages: [],
    reviewImageSizes: [],
    reviewVideo: null,
    reviewVideoSize: 0
};

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    setupTrackBtn();
    updateCartBadgeGlobal();
    setupBackButton();
    setupEditShippingModal();
    setupReviewOrderModal();

    // Đọc URL param ?code= và tự động tra cứu
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
        const inputCode = $('inputInvoiceCode');
        if (inputCode) inputCode.value = codeParam.trim();
        setTimeout(() => $('btnTrack') && $('btnTrack').click(), 100);
    } else {
        checkUserAndAutoLoadOrders();
    }
});

function setupBackButton() {
    const btnBack = $('btnBackToOrdersList');
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            e.preventDefault();
            
            const resultCard = $('trackResultCard');
            if (resultCard) resultCard.style.display = 'none';
            btnBack.style.display = 'none';
            
            const searchCard = $('trackSearchCard');
            if (searchCard) searchCard.style.display = 'block';
            
            const origin = btnBack.getAttribute('data-origin');
            if (origin === 'user') {
                const container = $('userOrdersListContainer');
                if (container) {
                    container.style.display = 'block';
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                refreshUserOrdersList();
            } else {
                const multiList = $('multiResultList');
                if (multiList) {
                    multiList.style.display = 'block';
                    multiList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    }
}

function setupTrackBtn() {
    const btnTrack = $('btnTrack');
    const inputCode = $('inputInvoiceCode');
    const inputContact = $('inputContact');
    
    if (!btnTrack) return;

    const doSearch = () => btnTrack.click();
    if (inputCode) inputCode.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    if (inputContact) inputContact.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    btnTrack.addEventListener('click', async () => {
        let code = inputCode ? inputCode.value.trim() : '';
        const email = inputContact ? inputContact.value.trim().toLowerCase() : '';
        const resultCard = $('trackResultCard');

        if (!code && !email) {
            showToast('Vui lòng nhập ít nhất Mã hoá đơn hoặc Email để tra cứu!', 'error');
            return;
        }

        if (code.startsWith('#')) code = code.substring(1).trim();

        btnTrack.disabled = true;
        btnTrack.textContent = 'Đang tra cứu...';
        if (resultCard) resultCard.style.display = 'none';

        const multiList = $('multiResultList');
        if (multiList) multiList.style.display = 'none';
        const userList = $('userOrdersListContainer');
        if (userList) userList.style.display = 'none';

        try {
            let matchedInvoice = null;

            if (code && email) {
                const data = await safeFetchJson(`/api/auth/tracking/search?keyword=${encodeURIComponent(code)}`);
                if (Array.isArray(data)) {
                    matchedInvoice = data.find(inv =>
                        inv.maHoaDon && inv.maHoaDon.toUpperCase() === code.toUpperCase() &&
                        (
                            (inv.email && inv.email.toLowerCase() === email) ||
                            (inv.sdtNguoiNhan && inv.sdtNguoiNhan.includes(email)) ||
                            (inv.sdtKhachHang && inv.sdtKhachHang.includes(email)) ||
                            (inv.ghiChu && inv.ghiChu.toLowerCase().includes(email))
                        )
                    );
                }
                if (!matchedInvoice) {
                    showToast('Không tìm thấy đơn hàng phù hợp với mã và email đã nhập!', 'error');
                    return;
                }

            } else if (code) {
                const data = await safeFetchJson(`/api/auth/tracking/search?keyword=${encodeURIComponent(code)}`);
                if (Array.isArray(data)) {
                    matchedInvoice = data.find(inv => inv.maHoaDon && inv.maHoaDon.toUpperCase() === code.toUpperCase());
                    if (!matchedInvoice && data.length > 0) {
                        matchedInvoice = data[0];
                    }
                }
                if (!matchedInvoice) {
                    showToast(`Không tìm thấy đơn hàng với mã "${code}"!`, 'error');
                    return;
                }

            } else {
                const matched = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
                if (!matched || !Array.isArray(matched) || matched.length === 0) {
                    showToast(`Không tìm thấy đơn hàng nào liên kết với email "${email}"!`, 'error');
                    return;
                }
                if (matched.length === 1) {
                    matchedInvoice = matched[0];
                } else {
                    renderMultipleResults(matched);
                    if (resultCard) resultCard.style.display = 'none';
                    showToast(`Tìm thấy ${matched.length} đơn hàng. Vui lòng chọn đơn cần xem.`, 'success');
                    return;
                }
            }

            state.currentInvoice = matchedInvoice;

            const [items, history] = await Promise.all([
                safeFetchJson(`/api/auth/tracking/${matchedInvoice.id}/items`).catch(() => []),
                safeFetchJson(`/api/auth/tracking/${matchedInvoice.id}/history`).catch(() => [])
            ]);

            state.currentItems = items || [];

            await renderTrackingResult(matchedInvoice, items || [], history || []);
            if (resultCard) {
                resultCard.style.display = 'block';
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            showToast('Tra cứu đơn hàng thành công!', 'success');

        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        } finally {
            btnTrack.disabled = false;
            btnTrack.textContent = 'Tra cứu';
        }
    });
}

/** Hiển thị danh sách khi có nhiều đơn hàng cùng email */
function renderMultipleResults(invoices) {
    let listEl = $('multiResultList');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'multiResultList';
        listEl.style.cssText = 'background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:30px;overflow:hidden;';
        const trackResultCard = $('trackResultCard');
        if (trackResultCard && trackResultCard.parentNode) {
            trackResultCard.parentNode.insertBefore(listEl, trackResultCard);
        }
    }

    listEl.innerHTML = `
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:16px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px;">
                    <i data-lucide="file-text" style="width:18px;height:18px;color:var(--primary);"></i>
                    Các đơn hàng tìm thấy (${invoices.length})
                </h3>
                <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Nhấn vào bất kỳ đơn hàng nào để xem đầy đủ thông tin</p>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;">
            ${invoices.map(inv => `
                <div onclick="selectInvoice(${inv.id}, false)" style="padding:16px 24px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:all 0.15s;display:flex;justify-content:space-between;align-items:center;"
                    onmouseover="this.style.background='#f8fafc'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='#fff'; this.style.transform='none';">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="background:rgba(0,173,239,0.08);width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--primary);">
                            <i data-lucide="receipt" style="width:18px;height:18px;"></i>
                        </div>
                        <div>
                            <div style="font-weight:800;color:var(--primary);font-size:14.5px;text-decoration:underline;">#${inv.maHoaDon || ('HD' + inv.id)}</div>
                            <div style="font-size:12px;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:4px;">
                                <i data-lucide="calendar" style="width:12px;height:12px;"></i>
                                ${formatDate(inv.ngayTao)}
                            </div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800;color:#ef4444;font-size:15px;">${formatPrice(inv.tongTien)}</div>
                        <div style="font-size:11.5px;font-weight:700;background:${getStatusBgColor(inv.trangThai)};color:${getStatusTextColor(inv.trangThai)};padding:3px 9px;border-radius:5px;margin-top:5px;display:inline-block;border:1px solid ${getStatusBorderColor(inv.trangThai)};">
                            ${getStatusName(inv.trangThai)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    listEl.style.display = 'block';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Xem chi tiết một đơn khi click từ danh sách */
async function selectInvoice(invoiceId, isFromUserList = false) {
    try {
        const btnTrack = $('btnTrack');
        if (btnTrack) btnTrack.disabled = true;

        const [inv, items, history] = await Promise.all([
            safeFetchJson(`/api/auth/tracking/${invoiceId}`),
            safeFetchJson(`/api/auth/tracking/${invoiceId}/items`).catch(() => []),
            safeFetchJson(`/api/auth/tracking/${invoiceId}/history`).catch(() => [])
        ]);

        if (!inv) throw new Error("Không tìm thấy thông tin đơn hàng!");

        const multiList = $('multiResultList');
        if (multiList) multiList.style.display = 'none';

        const userList = $('userOrdersListContainer');
        if (userList) userList.style.display = 'none';

        const searchCard = $('trackSearchCard');
        if (searchCard) searchCard.style.display = 'none';

        state.currentInvoice = inv;
        state.currentItems = items || [];
        
        await renderTrackingResult(inv, items || [], history || []);

        const resultCard = $('trackResultCard');
        if (resultCard) resultCard.style.display = 'block';

        const btnBack = $('btnBackToOrdersList');
        if (btnBack) {
            btnBack.style.display = 'inline-flex';
            btnBack.setAttribute('data-origin', isFromUserList ? 'user' : 'multi');
        }

        if (resultCard) {
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
    } finally {
        const btnTrack = $('btnTrack');
        if (btnTrack) btnTrack.disabled = false;
    }
}
window.selectInvoice = selectInvoice;

async function renderTrackingResult(inv, items, history = []) {
    if (!inv) return;

    // Header Info
    const lblCode = $('lblResultCode');
    if (lblCode) lblCode.textContent = `Đơn hàng #${inv.maHoaDon || ('HD' + inv.id)}`;
    
    const lblTime = $('lblResultTime');
    if (lblTime) lblTime.textContent = formatDate(inv.ngayTao);
    
    const statusText = getStatusName(inv.trangThai);
    const lblBadge = $('lblResultStatusBadge');
    if (lblBadge) {
        lblBadge.textContent = statusText;
        lblBadge.className = `status-badge-detail ${getStatusBadgeClass(inv.trangThai)}`;
    }
    
    // ===========================================================
    // BANNER TRẠNG THÁI ĐẶC BIỆT
    // ===========================================================
    const specialBanner = $('specialStatusBanner');
    if (specialBanner) {
        if (inv.trangThai === 8) {
            specialBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:14px; background: linear-gradient(135deg,#fff7ed,#ffedd5); border:1.5px solid #fed7aa; border-radius:12px; padding:16px 20px; box-shadow:0 2px 6px rgba(249,115,22,0.1);">
                    <div style="width:40px; height:40px; background:#f97316; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:white;">
                        <i data-lucide="alert-triangle" style="width:22px; height:22px;"></i>
                    </div>
                    <div>
                        <div style="font-weight:800; font-size:15px; color:#c2410c;">Yêu cầu hủy đơn hàng đang chờ xác nhận</div>
                        <div style="font-size:13px; color:#9a3412; margin-top:3px;">Yêu cầu hủy đơn hàng của bạn đã được tiếp nhận và nhân viên sẽ xử lý trong thời gian sớm nhất.</div>
                    </div>
                </div>
            `;
            specialBanner.style.display = 'block';
        } else if (inv.trangThai === 7) {
            specialBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:14px; background: linear-gradient(135deg,#fef2f2,#fee2e2); border:1.5px solid #fecaca; border-radius:12px; padding:16px 20px; box-shadow:0 2px 6px rgba(239,68,68,0.1);">
                    <div style="width:40px; height:40px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:white;">
                        <i data-lucide="x-circle" style="width:22px; height:22px;"></i>
                    </div>
                    <div>
                        <div style="font-weight:800; font-size:15px; color:#b91c1c;">Đơn hàng đã được xác nhận hủy</div>
                        <div style="font-size:13px; color:#991b1b; margin-top:3px;">Đơn hàng của bạn đã bị hủy thành công. Nếu bạn đã thanh toán trực tuyến qua VNPay, số tiền sẽ được hoàn trả theo quy định.</div>
                    </div>
                </div>
            `;
            specialBanner.style.display = 'block';
        } else {
            specialBanner.innerHTML = '';
            specialBanner.style.display = 'none';
        }
    }

    // ============================================================
    // 6-STEPS TIMELINE
    // ============================================================
    renderTimeline6Steps(inv, history);

    // ============================================================
    // ACTION BUTTONS (Đánh giá, Mua lại, Hủy đơn, Sửa thông tin)
    // ============================================================
    await renderActionButtons(inv, items);

    // ============================================================
    // CUSTOMER & SHIPPING INFO
    // ============================================================
    const nameEl = $('lblResultName');
    if (nameEl) nameEl.textContent = inv.tenNguoiNhan || inv.tenKhachHang || inv.nguoiTao || 'Khách lẻ';
    
    const phoneEl = $('lblResultPhone');
    if (phoneEl) phoneEl.textContent = inv.sdtNguoiNhan || inv.sdtKhachHang || 'N/A';
    
    let emailToShow = inv.email;
    if (!emailToShow && inv.ghiChu) {
        const matches = inv.ghiChu.match(/\|\s*email\s*:\s*([^\s|]+)/i);
        if (matches && matches[1]) emailToShow = matches[1].trim();
    }
    if (!emailToShow && $('inputContact')) {
        emailToShow = $('inputContact').value.trim();
    }
    
    const emailEl = $('lblResultEmail');
    const emailWrap = $('lblResultEmailWrap');
    if (emailEl) emailEl.textContent = emailToShow || '';
    if (emailWrap) emailWrap.style.display = emailToShow ? 'block' : 'none';
    
    const addrEl = $('lblResultAddress');
    if (addrEl) addrEl.textContent = inv.diaChiGiao || 'Nhận tại quầy';

    const noteEl = $('lblResultGhiChu');
    const noteWrap = $('lblResultGhiChuWrap');
    let cleanNote = (inv.ghiChu || '').replace(/\|\s*EMAIL:[^\s|]+/gi, '').trim();
    if (noteEl) noteEl.textContent = cleanNote;
    if (noteWrap) noteWrap.style.display = cleanNote ? 'block' : 'none';

    // Edit Shipping Info Button
    const btnEditInfo = $('btnEditShippingInfo');
    if (btnEditInfo) {
        btnEditInfo.style.display = (inv.trangThai === 0) ? 'inline-flex' : 'none';
    }

    // ============================================================
    // PRODUCT ITEMS
    // ============================================================
    const itemsList = $('resultItemsList');
    if (itemsList) {
        if (!items || items.length === 0) {
            itemsList.innerHTML = `<div style="padding:15px;text-align:center;color:#94a3b8;font-size:13.5px;">Không có thông tin chi tiết sản phẩm</div>`;
        } else {
            itemsList.innerHTML = items.map((item, idx) => {
                const img = getProductItemImage(item.hinhAnh, idx);
                const name = item.tenSanPham || 'Sản phẩm';
                const color = item.mauSac || '';
                const size = item.coGiay || item.sizeGiay || '';
                const qty = item.soLuong || 1;
                const unitPrice = parseFloat(item.donGia) || 0;
                const lineTotal = parseFloat(item.thanhTien) || (unitPrice * qty);

                return `
                    <div class="detail-product-row">
                        <div class="detail-prod-left">
                            <img src="${img}" alt="${escapeHtml(name)}" class="detail-prod-img" onerror="this.src='/images/logo.png'">
                            <div>
                                <div class="detail-prod-title">${escapeHtml(name)}</div>
                                <div class="detail-prod-variant">
                                    ${color ? `Màu: <strong>${escapeHtml(color)}</strong>` : ''} 
                                    ${size ? `· Size: <strong>${escapeHtml(size)}</strong>` : ''}
                                    <span style="color:#94a3b8; margin-left:6px;">x${qty}</span>
                                </div>
                                <div class="detail-prod-price">${formatPrice(unitPrice)}</div>
                            </div>
                        </div>
                        <div class="detail-prod-total">${formatPrice(lineTotal)}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // ============================================================
    // PRICING SUMMARY
    // ============================================================
    let subtotal = (items && items.length > 0) 
        ? items.reduce((s, i) => s + (parseFloat(i.thanhTien) || (parseFloat(i.donGia || 0) * (i.soLuong || 1))), 0)
        : (parseFloat(inv.tongTien) || 0);

    const ship = parseFloat(inv.phiShip) || 0;
    const discount = parseFloat(inv.tienGiam) || 0;
    
    let total = parseFloat(inv.tongTien) || 0;
    if (total === 0 && subtotal > 0) {
        total = Math.max(0, subtotal + ship - discount);
    }

    if ($('lblResultSubtotal')) $('lblResultSubtotal').textContent = formatPrice(subtotal);
    if ($('lblResultShipping')) $('lblResultShipping').textContent = formatPrice(ship);
    
    const rowDiscount = $('rowResultDiscount');
    const lblDiscount = $('lblResultDiscount');
    const voucherBadge = $('lblResultVoucherBadge');
    
    if (discount > 0) {
        if (rowDiscount) rowDiscount.style.display = 'flex';
        if (lblDiscount) lblDiscount.textContent = `-${formatPrice(discount)}`;
        if (voucherBadge) {
            let vText = inv.maVoucher ? inv.maVoucher : (inv.tenVoucher ? inv.tenVoucher : 'Đã áp dụng');
            voucherBadge.textContent = vText;
            voucherBadge.style.display = 'inline-flex';
        }
    } else {
        if (rowDiscount) rowDiscount.style.display = 'none';
        if (voucherBadge) voucherBadge.style.display = 'none';
    }

    if ($('lblResultTotal')) $('lblResultTotal').textContent = formatPrice(total);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/** Cập nhật timeline các bước và thanh tiến trình kết nối giống 100% như trong chi tiết hóa đơn (invoice-detail.js) */
function renderTimeline6Steps(inv, history = []) {
    const status = Number(inv.trangThai);
    const isCancelled = (status === 7 || status === 8);
    const ngayTao = inv.ngayTao ? new Date(inv.ngayTao) : new Date();

    // Kiểm tra nếu là đơn Bán hàng tại quầy (mua trực tiếp, không giao hàng) - giống hệt invoice-detail.js
    const isOnline = (inv.loaiHoaDon === 'Trực tuyến' || inv.loaiHoaDon === 'Online' || inv.loaiHoaDon === true);
    const isGiaoHang = ((inv.diaChiGiao && inv.diaChiGiao.trim() !== '' && inv.diaChiGiao !== '-') || (inv.phiShip && Number(inv.phiShip) > 0));
    const isTaiQuayDirect = !isOnline && !isGiaoHang;

    const connector = $('timelineConnectorActive');
    const baseLine = document.querySelector('.timeline-6steps-line');
    const timelineWrap = $('timelineWrapper');

    const defaultLabels = {
        0: { label: 'Chờ xác nhận', icon: 'clipboard-list' },
        1: { label: 'Đã xác nhận',  icon: 'check-circle' },
        2: { label: 'Đang xử lý',   icon: 'package' },
        3: { label: 'Đang giao',    icon: 'truck' },
        4: { label: 'Đã giao',      icon: 'inbox' },
        5: { label: 'Hoàn thành',   icon: 'check-square' }
    };

    // Chuẩn bị map ngày giờ mặc định: chỉ có step 0 có ngày tạo, các step khác là '-'
    const dates = { 0: '-', 1: '-', 2: '-', 3: '-', 4: '-', 5: '-' };
    if (inv.ngayTao) {
        dates[0] = formatDate(inv.ngayTao);
    }

    // Tải ngày giờ thực tế từ lịch sử hóa đơn giống hệt invoice-detail.js
    let latestUpdateTime = inv.ngayTao;
    if (Array.isArray(history) && history.length > 0) {
        history.forEach(item => {
            if (!item || !item.ngayTao) return;
            const dStr = formatDate(item.ngayTao);
            latestUpdateTime = item.ngayTao;
            const note = ((item.ghiChu || '') + ' ' + (item.hanhDong || '')).toLowerCase();

            if (note.includes('tạo đơn hàng') || note.includes('tự động tạo') || note.includes('chờ xác nhận')) {
                dates[0] = dStr;
            } else if (note.includes('đã xác nhận')) {
                dates[1] = dStr;
            } else if (note.includes('đang xử lý') || note.includes('chờ lấy hàng') || note.includes('chờ đóng gói') || note.includes('đã thanh toán')) {
                dates[2] = dStr;
            } else if (note.includes('đang giao')) {
                dates[3] = dStr;
            } else if (note.includes('đã giao')) {
                dates[4] = dStr;
            } else if (note.includes('hoàn thành')) {
                dates[5] = dStr;
            }
        });
    }

    // Cập nhật text Cập nhật lần cuối ở góc phải card
    const lastUpdatedEl = $('valTimelineLastUpdated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = formatDate(latestUpdateTime || inv.ngayThanhToan || inv.ngayTao);
    }

    // ── TRƯỜNG HỢP 1: ĐƠN HỦY (status 7 hoặc 8) ──
    if (isCancelled) {
        // Ẩn các bước vận chuyển 2, 3, 4, 5
        [2, 3, 4, 5].forEach(i => {
            const el = $('stepCol' + i);
            if (el) el.style.display = 'none';
        });

        const step0 = $('stepCol0');
        const step1 = $('stepCol1');
        if (step0) {
            step0.style.display = '';
            step0.className = 'timeline-step-col ' + (status === 8 ? 'active' : 'completed');
            const name0 = $('nameStep0');
            const date0 = $('dateStep0');
            const circle0 = $('circleStep0');
            if (name0) name0.textContent = 'Yêu cầu hủy';
            if (date0) date0.textContent = dates[0] || formatDate(inv.ngayTao);
            if (circle0) circle0.innerHTML = `<i data-lucide="${status === 8 ? 'clock' : 'check'}"></i>`;
        }
        if (step1) {
            step1.style.display = '';
            step1.className = 'timeline-step-col ' + (status === 8 ? '' : 'active completed');
            const name1 = $('nameStep1');
            const date1 = $('dateStep1');
            const circle1 = $('circleStep1');
            if (name1) name1.textContent = 'Đơn hàng đã được hủy';
            if (date1) date1.textContent = (status === 7) ? formatDate(latestUpdateTime || inv.ngayTao) : '-';
            if (circle1) circle1.innerHTML = `<i data-lucide="x-circle"></i>`;
        }

        if (timelineWrap) timelineWrap.style.justifyContent = 'space-around';
        if (baseLine) {
            baseLine.style.left = '25%';
            baseLine.style.right = '25%';
        }
        if (connector) {
            connector.style.left = '25%';
            connector.style.width = (status === 7) ? '50%' : '0%';
            connector.style.background = '#ef4444';
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    // ── TRƯỜNG HỢP 2: BÁN HÀNG TẠI QUẦY (Mua trực tiếp tại quầy, không giao hàng) ──
    // Giống 100% logic invoice-detail.js: chỉ hiện 2 bước step-0 và step-6
    if (isTaiQuayDirect) {
        // Ẩn tất cả các bước trung gian 1, 2, 3, 4
        [1, 2, 3, 4].forEach(i => {
            const el = $('stepCol' + i);
            if (el) el.style.display = 'none';
        });

        const step0 = $('stepCol0');
        const step5 = $('stepCol5');

        if (step0) {
            step0.style.display = '';
            step0.className = 'timeline-step-col completed' + (status === 0 ? ' active' : '');
            const name0 = $('nameStep0');
            const date0 = $('dateStep0');
            const circle0 = $('circleStep0');
            if (name0) name0.textContent = 'Chờ xác nhận';
            if (date0) date0.textContent = dates[0] || formatDate(inv.ngayTao);
            if (circle0) circle0.innerHTML = `<i data-lucide="clipboard-list"></i>`;
        }

        if (step5) {
            step5.style.display = '';
            const isDone = (status === 6);
            step5.className = 'timeline-step-col' + (isDone ? ' completed active' : '');
            const name5 = $('nameStep5');
            const date5 = $('dateStep5');
            const circle5 = $('circleStep5');
            if (name5) name5.textContent = 'Hoàn thành';
            if (date5) {
                if (isDone) {
                    const compTime = dates[5] !== '-' ? dates[5] : formatDate(inv.ngayThanhToan || inv.ngayCapNhat || latestUpdateTime || inv.ngayTao);
                    date5.textContent = compTime;
                } else {
                    date5.textContent = '-';
                }
            }
            if (circle5) circle5.innerHTML = `<i data-lucide="check-square"></i>`;
        }

        if (timelineWrap) timelineWrap.style.justifyContent = 'space-around';
        if (baseLine) {
            baseLine.style.left = '25%';
            baseLine.style.right = '25%';
        }
        if (connector) {
            connector.style.left = '25%';
            connector.style.width = (status === 6) ? '50%' : '0%';
            connector.style.background = 'linear-gradient(90deg, #00adef, #0284c7)';
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    // ── TRƯỜNG HỢP 3: ĐƠN HÀNG CÓ GIAO HÀNG (Online / Giao hàng tại quầy): hiển thị đầy đủ 6 bước ──
    if (timelineWrap) timelineWrap.style.justifyContent = 'space-between';
    if (baseLine) {
        baseLine.style.left = '7.5%';
        baseLine.style.right = '7.5%';
    }
    if (connector) {
        connector.style.left = '7.5%';
    }

    let currentIdx = 0;
    if (status === 0) currentIdx = 0;
    else if (status === 1) currentIdx = 1;
    else if (status === 2) currentIdx = 2;
    else if (status === 3) currentIdx = 3;
    else if (status === 4 || status === 5) currentIdx = 4;
    else if (status === 6) currentIdx = 5;

    [0, 1, 2, 3, 4, 5].forEach(idx => {
        const col = $('stepCol' + idx);
        const nameEl = $('nameStep' + idx);
        const dateEl = $('dateStep' + idx);
        const circleEl = $('circleStep' + idx);

        if (!col) return;
        col.style.display = '';

        if (nameEl && defaultLabels[idx]) nameEl.textContent = defaultLabels[idx].label;
        if (circleEl && defaultLabels[idx]) circleEl.innerHTML = `<i data-lucide="${defaultLabels[idx].icon}"></i>`;

        if (idx <= currentIdx) {
            col.className = 'timeline-step-col completed' + (idx === currentIdx ? ' active' : '');
            if (dateEl) {
                if (dates[idx] && dates[idx] !== '-') {
                    dateEl.textContent = dates[idx];
                } else if (idx === 0) {
                    dateEl.textContent = formatDate(inv.ngayTao);
                } else if (idx === currentIdx) {
                    if (idx === 5 && inv.ngayThanhToan) {
                        dateEl.textContent = formatDate(inv.ngayThanhToan);
                    } else if (dates[idx] !== '-') {
                        dateEl.textContent = dates[idx];
                    } else {
                        dateEl.textContent = formatDate(latestUpdateTime || inv.ngayTao);
                    }
                } else {
                    dateEl.textContent = '-';
                }
            }
        } else {
            col.className = 'timeline-step-col';
            if (dateEl) dateEl.textContent = '-';
        }
    });

    if (connector) {
        const percent = Math.min(100, Math.max(0, currentIdx * 20));
        connector.style.width = percent + '%';
        connector.style.background = 'linear-gradient(90deg, #00adef, #0284c7)';
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/** Render các nút hành động (Đánh giá, Mua lại, Yêu cầu hủy, Sửa thông tin) */
async function renderActionButtons(inv, items) {
    const wrap = $('detailActionButtonsWrap');
    if (!wrap) return;

    wrap.innerHTML = '';

    if (inv.trangThai === 0) {
        // Chờ xác nhận
        wrap.innerHTML = `
            <button type="button" class="btn-action-cancel-main" onclick="openCancelModalFromDetails(${inv.id}, '${escapeHtml(inv.maHoaDon || ('HD' + inv.id))}')">
                <i data-lucide="x-circle" style="width:16px;height:16px;"></i> Yêu cầu hủy đơn hàng
            </button>
            <button type="button" class="btn-action-return-main" onclick="openEditShippingModal()" style="background:#f0f9ff; color:#0284c7; border-color:#bae6fd;">
                <i data-lucide="edit-3" style="width:16px;height:16px;"></i> Sửa thông tin nhận hàng
            </button>
        `;
    } else if (inv.trangThai === 6 || inv.trangThai === 4) {
        // Đã hoàn thành hoặc đã giao hàng: Kiểm tra đã đánh giá chưa
        let isReviewed = false;
        let reviewedStars = 5;
        try {
            const checkData = await safeFetchJson(`/api/auth/danh-gia/check/${inv.id}`);
            if (checkData && checkData.daDanhGia) {
                isReviewed = true;
                reviewedStars = checkData.soSao || 5;
            }
        } catch (e) {
            console.warn("Could not check review status:", e);
        }

        let reviewBtnHtml = '';
        if (isReviewed) {
            reviewBtnHtml = `
                <button type="button" class="btn-action-review-main btn-reviewed" disabled style="cursor:default; background:#ecfdf5; color:#059669; border:1.5px solid #a7f3d0; box-shadow:none;">
                    <i data-lucide="check-circle-2" style="width:16px;height:16px;"></i> Đã đánh giá (${reviewedStars}★)
                </button>
            `;
        } else {
            reviewBtnHtml = `
                <button type="button" class="btn-action-review-main" onclick="openReviewOrderModal()" style="background:linear-gradient(135deg,#f59e0b,#d97706); border:none; box-shadow:0 4px 14px rgba(245,158,11,0.35);">
                    <i data-lucide="star" style="width:16px;height:16px;fill:#fff;"></i> Đánh giá sản phẩm
                </button>
            `;
        }

        wrap.innerHTML = `
            ${reviewBtnHtml}
            <button type="button" class="btn-action-review-main" onclick="reorderInvoiceItems()" style="background:var(--gradient); border:none; box-shadow:0 4px 12px rgba(0,173,239,0.25);">
                <i data-lucide="shopping-bag" style="width:16px;height:16px;"></i> Mua lại đơn hàng
            </button>
            <a href="/client/san-pham" class="btn-action-return-main" style="text-decoration:none; background:#f8fafc; color:#334155; border-color:#e2e8f0;">
                <i data-lucide="arrow-right" style="width:16px;height:16px;"></i> Tiếp tục mua sắm
            </a>
        `;
    }
}

/** Chức năng mua lại đơn hàng (thêm sản phẩm vào giỏ) */
function reorderInvoiceItems() {
    showToast('Đang chuyển hướng tới trang sản phẩm...', 'success');
    setTimeout(() => {
        window.location.href = '/client/san-pham';
    }, 400);
}
window.reorderInvoiceItems = reorderInvoiceItems;

/* ============================================================
   REVIEW ORDER MODAL & SUBMIT (MAX 3 PHOTOS + 1 VIDEO <= 30MB)
   ============================================================ */
const MAX_REVIEW_MEDIA_BYTES = 30 * 1024 * 1024; // 30MB

function getTotalReviewMediaBytes() {
    const imagesSize = (state.reviewImageSizes || []).reduce((acc, s) => acc + (s || 0), 0);
    const videoSize = state.reviewVideoSize || 0;
    return imagesSize + videoSize;
}

function formatBytesToMb(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return (mb < 0.1 ? 0.1 : mb.toFixed(1)) + ' MB';
}

function updateReviewMediaSizeStatus() {
    const statusEl = $('reviewMediaSizeStatus');
    const imgCountEl = $('reviewImageCount');
    const vidCountEl = $('reviewVideoCount');

    if (imgCountEl) imgCountEl.textContent = state.reviewImages ? state.reviewImages.length : 0;
    if (vidCountEl) vidCountEl.textContent = state.reviewVideo ? 1 : 0;

    if (statusEl) {
        const usedBytes = getTotalReviewMediaBytes();
        const usedMb = formatBytesToMb(usedBytes);
        if (usedBytes > MAX_REVIEW_MEDIA_BYTES) {
            statusEl.style.color = '#ef4444';
            statusEl.style.background = '#fee2e2';
            statusEl.textContent = `Vượt giới hạn: ${usedMb} / 30 MB ⚠️`;
        } else if (usedBytes > 0) {
            statusEl.style.color = '#0284c7';
            statusEl.style.background = '#e0f2fe';
            statusEl.textContent = `Dung lượng: ${usedMb} / 30 MB`;
        } else {
            statusEl.style.color = '#64748b';
            statusEl.style.background = '#e2e8f0';
            statusEl.textContent = `Tối đa 3 ảnh, 1 video (≤ 30MB)`;
        }
    }
}

function setupReviewOrderModal() {
    const modal = $('modalReviewOrder');
    const btnClose = $('btnCloseReviewModal');
    const btnCancel = $('btnCancelReviewModal');
    const form = $('formSubmitReview');

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
        state.reviewImages = [];
        state.reviewImageSizes = [];
        state.reviewVideo = null;
        state.reviewVideoSize = 0;
        renderReviewMediaPreviews();
    };

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    // Interactive Star Rating using Event Delegation
    const starContainer = $('starRatingContainer');
    if (starContainer) {
        starContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-star]');
            if (btn) {
                const starVal = parseInt(btn.getAttribute('data-star'), 10) || 5;
                setReviewStarRating(starVal);
            }
        });

        starContainer.addEventListener('mouseover', (e) => {
            const btn = e.target.closest('[data-star]');
            if (btn) {
                const starVal = parseInt(btn.getAttribute('data-star'), 10) || 5;
                highlightStars(starVal);
            }
        });

        starContainer.addEventListener('mouseleave', () => {
            highlightStars(state.reviewRating || 5);
        });
    }

    // Image Upload input (Max 3)
    const imgInput = $('reviewImageFileInput');
    if (imgInput) {
        imgInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const currentCount = state.reviewImages.length;
            const remainingSlots = 3 - currentCount;
            if (remainingSlots <= 0) {
                showToast('Chỉ được tải lên tối đa 3 hình ảnh!', 'error');
                imgInput.value = '';
                return;
            }

            const filesToProcess = files.slice(0, remainingSlots);
            for (const file of filesToProcess) {
                if (!file.type.startsWith('image/')) {
                    showToast(`File "${file.name}" không phải là định dạng hình ảnh hợp lệ!`, 'error');
                    continue;
                }

                const currentTotal = getTotalReviewMediaBytes();
                if (currentTotal + file.size > MAX_REVIEW_MEDIA_BYTES) {
                    showToast(`Tổng dung lượng ảnh và video không được vượt quá 30MB! (File "${file.name}" quá lớn)`, 'error');
                    continue;
                }

                try {
                    const base64 = await fileToBase64(file);
                    state.reviewImages.push(base64);
                    state.reviewImageSizes.push(file.size);
                } catch (err) {
                    console.error('Lỗi đọc ảnh:', err);
                    showToast(`Không thể tải ảnh: ${file.name}`, 'error');
                }
            }

            imgInput.value = '';
            renderReviewMediaPreviews();
        });
    }

    // Video Upload input (Max 1)
    const vidInput = $('reviewVideoFileInput');
    if (vidInput) {
        vidInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            if (state.reviewVideo) {
                showToast('Chỉ được tải lên tối đa 1 video!', 'error');
                vidInput.value = '';
                return;
            }

            const file = files[0];
            if (!file.type.startsWith('video/')) {
                showToast(`File "${file.name}" không phải là định dạng video hợp lệ!`, 'error');
                vidInput.value = '';
                return;
            }

            const currentTotal = getTotalReviewMediaBytes();
            if (currentTotal + file.size > MAX_REVIEW_MEDIA_BYTES) {
                showToast(`Dung lượng video vượt quá giới hạn 30MB! Vui lòng chọn video ngắn hơn.`, 'error');
                vidInput.value = '';
                return;
            }

            try {
                showToast('Đang xử lý video...', 'info');
                const base64 = await fileToBase64(file);
                state.reviewVideo = base64;
                state.reviewVideoSize = file.size;
                showToast('Đã thêm video thành công!', 'success');
            } catch (err) {
                console.error('Lỗi đọc video:', err);
                showToast(`Không thể tải video: ${file.name}`, 'error');
            }

            vidInput.value = '';
            renderReviewMediaPreviews();
        });
    }

    // Submit Review Form
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const inv = state.currentInvoice;
            if (!inv) return;

            const textInput = $('reviewTextInput');
            const authorInput = $('reviewAuthorInput');
            const content = textInput ? textInput.value.trim() : '';
            const author = authorInput ? authorInput.value.trim() : '';

            if (!content) {
                showToast('Vui lòng nhập nội dung đánh giá sản phẩm!', 'error');
                return;
            }
            if (!author) {
                showToast('Vui lòng nhập tên người đánh giá!', 'error');
                return;
            }

            if (getTotalReviewMediaBytes() > MAX_REVIEW_MEDIA_BYTES) {
                showToast('Tổng dung lượng ảnh và video vượt quá 30MB! Vui lòng giảm bớt ảnh hoặc video.', 'error');
                return;
            }

            const btnSubmit = $('btnSubmitReviewAction');
            try {
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = 'Đang gửi đánh giá...';
                }

                const payload = {
                    hoaDonId: inv.id,
                    soSao: state.reviewRating || 5,
                    noiDung: content,
                    tenHienThi: author,
                    anhBase64List: state.reviewImages || [],
                    videoBase64: state.reviewVideo || null
                };

                const res = await safeFetchJson('/api/auth/danh-gia/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                showToast(res.message || 'Cảm ơn bạn đã gửi đánh giá sản phẩm!', 'success');
                closeModal();

                // Broadcast real-time sync across tabs/admin
                try {
                    if ('BroadcastChannel' in window) {
                        const bc = new BroadcastChannel('vshoes_sync_channel');
                        bc.postMessage({ type: 'REVIEW_UPDATED', timestamp: Date.now() });
                    }
                    localStorage.setItem('vshoes_sync_trigger', Date.now().toString());
                } catch(e) {}

                // Refresh details to update button to "Đã đánh giá"
                await selectInvoice(inv.id, true);

            } catch (err) {
                console.error(err);
                showToast(err.message || 'Gửi đánh giá thất bại!', 'error');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Gửi Đánh Giá';
                }
            }
        };
    }
}

function setReviewStarRating(val) {
    state.reviewRating = Math.max(1, Math.min(5, parseInt(val, 10) || 5));
    highlightStars(state.reviewRating);
    const label = $('starRatingLabel');
    if (label) {
        const texts = {
            1: 'Rất không hài lòng (1/5 sao)',
            2: 'Không hài lòng (2/5 sao)',
            3: 'Bình thường (3/5 sao)',
            4: 'Hài lòng (4/5 sao)',
            5: 'Tuyệt vời (5/5 sao)'
        };
        label.textContent = texts[state.reviewRating] || `${state.reviewRating}/5 sao`;
    }
}

function highlightStars(val) {
    const starContainer = $('starRatingContainer');
    if (!starContainer) return;
    const btns = starContainer.querySelectorAll('[data-star]');
    btns.forEach(btn => {
        const starIdx = parseInt(btn.getAttribute('data-star'), 10) || 1;
        const svg = btn.querySelector('svg');
        if (svg) {
            if (starIdx <= val) {
                svg.setAttribute('fill', '#f59e0b');
                svg.setAttribute('stroke', '#f59e0b');
                btn.style.transform = 'scale(1.15)';
            } else {
                svg.setAttribute('fill', '#e2e8f0');
                svg.setAttribute('stroke', '#cbd5e1');
                btn.style.transform = 'scale(1)';
            }
        }
    });
}

function addReviewTag(tag) {
    const textarea = $('reviewTextInput');
    if (!textarea) return;
    if (textarea.value.trim()) {
        textarea.value = textarea.value.trim() + ' - ' + tag;
    } else {
        textarea.value = tag;
    }
    textarea.focus();
}
window.addReviewTag = addReviewTag;

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function renderReviewMediaPreviews() {
    renderReviewImagePreviews();
    renderReviewVideoPreview();
    updateReviewMediaSizeStatus();
}

function renderReviewImagePreviews() {
    const wrap = $('reviewImagesPreviewWrap');
    const uploadBtn = $('btnUploadReviewImage');
    if (!wrap) return;

    wrap.innerHTML = (state.reviewImages || []).map((src, i) => {
        const sizeBytes = state.reviewImageSizes[i] || 0;
        const sizeStr = formatBytesToMb(sizeBytes);
        return `
        <div style="position:relative; width:64px; height:64px; border-radius:10px; overflow:hidden; border:1.5px solid #cbd5e1; box-shadow:0 1px 4px rgba(0,0,0,0.06); background:#000;">
            <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
            <span style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.65); color:#fff; font-size:9px; font-weight:700; padding:1px 4px; border-radius:4px; line-height:1.2;">${sizeStr}</span>
            <button type="button" onclick="removeReviewImage(${i})" title="Xóa ảnh này" style="position:absolute; top:2px; right:2px; background:rgba(239,68,68,0.9); border:none; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; font-size:12px; line-height:1; font-weight:bold;">×</button>
        </div>
        `;
    }).join('');

    if (uploadBtn) {
        uploadBtn.style.display = (state.reviewImages || []).length >= 3 ? 'none' : 'flex';
    }
}

function renderReviewVideoPreview() {
    const wrap = $('reviewVideoPreviewWrap');
    const uploadBtn = $('btnUploadReviewVideo');
    if (!wrap) return;

    if (state.reviewVideo) {
        const sizeStr = formatBytesToMb(state.reviewVideoSize || 0);
        wrap.innerHTML = `
        <div style="position:relative; width:90px; height:64px; border-radius:10px; overflow:hidden; border:1.5px solid #f59e0b; box-shadow:0 1px 4px rgba(245,158,11,0.15); background:#000;">
            <video src="${state.reviewVideo}" style="width:100%; height:100%; object-fit:cover;"></video>
            <span style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.75); color:#fbbf24; font-size:9px; font-weight:700; padding:1px 4px; border-radius:4px; line-height:1.2;">🎬 ${sizeStr}</span>
            <button type="button" onclick="removeReviewVideo()" title="Xóa video này" style="position:absolute; top:2px; right:2px; background:rgba(239,68,68,0.9); border:none; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; font-size:12px; line-height:1; font-weight:bold;">×</button>
        </div>
        `;
        if (uploadBtn) uploadBtn.style.display = 'none';
    } else {
        wrap.innerHTML = '';
        if (uploadBtn) uploadBtn.style.display = 'flex';
    }
}

function removeReviewImage(index) {
    if (state.reviewImages) state.reviewImages.splice(index, 1);
    if (state.reviewImageSizes) state.reviewImageSizes.splice(index, 1);
    renderReviewMediaPreviews();
}
window.removeReviewImage = removeReviewImage;

function removeReviewVideo() {
    state.reviewVideo = null;
    state.reviewVideoSize = 0;
    renderReviewMediaPreviews();
}
window.removeReviewVideo = removeReviewVideo;

window.openReviewOrderModal = function() {
    const inv = state.currentInvoice;
    if (!inv) return;

    const modal = $('modalReviewOrder');
    if (!modal) return;

    const titleEl = $('reviewModalTitle');
    if (titleEl) titleEl.textContent = `Đánh giá đơn hàng #${inv.maHoaDon || ('HD' + inv.id)}`;

    // Render product items preview inside modal
    const itemsPreview = $('reviewProductsListPreview');
    if (itemsPreview) {
        const items = state.currentItems || [];
        if (items.length > 0) {
            itemsPreview.innerHTML = items.map((item, idx) => {
                const img = getProductItemImage(item.hinhAnh, idx);
                return `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${img}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;">
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:700; font-size:13px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.tenSanPham || 'Sản phẩm')}</div>
                            <div style="font-size:11.5px; color:#64748b;">${escapeHtml(item.mauSac || '')} ${item.coGiay ? '· Size ' + item.coGiay : ''} (x${item.soLuong || 1})</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            itemsPreview.innerHTML = `<div style="font-size:12.5px; color:#64748b;">Đơn hàng #${inv.maHoaDon || ('HD' + inv.id)}</div>`;
        }
    }

    // Reset fields & states
    state.reviewRating = 5;
    state.reviewImages = [];
    state.reviewImageSizes = [];
    state.reviewVideo = null;
    state.reviewVideoSize = 0;
    setReviewStarRating(5);
    renderReviewMediaPreviews();

    const textInput = $('reviewTextInput');
    if (textInput) textInput.value = '';

    const authorInput = $('reviewAuthorInput');
    if (authorInput) {
        authorInput.value = inv.tenNguoiNhan || inv.tenKhachHang || (state.userEmail ? state.userEmail.split('@')[0] : 'Khách hàng');
    }

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons({ root: modal });
    }
};

/** Setup Modal Sửa Thông Tin Nhận Hàng */
function setupEditShippingModal() {
    const modal = $('modalEditShippingInfo');
    const btnClose = $('btnCloseEditModal');
    const btnCancel = $('btnCancelEditShipping');
    const form = $('formEditShipping');

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const inv = state.currentInvoice;
            if (!inv) return;

            const nameVal = $('editReceiverName').value.trim();
            const phoneVal = $('editReceiverPhone').value.trim();
            const emailVal = $('editReceiverEmail').value.trim();
            const addressVal = $('editReceiverAddress').value.trim();

            if (!nameVal) {
                showToast('Vui lòng nhập họ và tên người nhận!', 'error');
                return;
            }
            if (!phoneVal || !phoneVal.match(/^\d{10}$/)) {
                showToast('Số điện thoại người nhận phải đúng 10 chữ số!', 'error');
                return;
            }
            if (!addressVal) {
                showToast('Vui lòng nhập địa chỉ nhận hàng!', 'error');
                return;
            }

            const btnSave = $('btnSaveShipping');
            try {
                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.textContent = 'Đang lưu...';
                }

                let updatedGhiChu = inv.ghiChu || '';
                if (emailVal) {
                    if (updatedGhiChu.toUpperCase().includes('| EMAIL:')) {
                        updatedGhiChu = updatedGhiChu.replace(/\|\s*EMAIL:\s*[^\s|]+/i, `| EMAIL: ${emailVal}`);
                    } else {
                        updatedGhiChu = (updatedGhiChu ? updatedGhiChu + ' ' : '') + `| EMAIL: ${emailVal}`;
                    }
                }

                const payload = {
                    id: inv.id,
                    tenNguoiNhan: nameVal,
                    sdtNguoiNhan: phoneVal,
                    diaChiGiao: addressVal,
                    ghiChu: updatedGhiChu,
                    trangThai: inv.trangThai
                };

                await safeFetchJson(`/api/auth/tracking/${inv.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                showToast('Cập nhật thông tin nhận hàng thành công!', 'success');
                closeModal();

                await selectInvoice(inv.id, true);
            } catch (err) {
                console.error(err);
                showToast(err.message, 'error');
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'Lưu thay đổi';
                }
            }
        };
    }
}

window.openEditShippingModal = function() {
    const inv = state.currentInvoice;
    if (!inv) return;

    const modal = $('modalEditShippingInfo');
    if (!modal) return;

    let currentEmail = inv.email || '';
    if (!currentEmail && inv.ghiChu) {
        const matches = inv.ghiChu.match(/\|\s*email\s*:\s*([^\s|]+)/i);
        if (matches && matches[1]) currentEmail = matches[1].trim();
    }
    if (!currentEmail && $('inputContact')) {
        currentEmail = $('inputContact').value.trim();
    }

    if ($('editReceiverName')) $('editReceiverName').value = inv.tenNguoiNhan || inv.tenKhachHang || '';
    if ($('editReceiverPhone')) $('editReceiverPhone').value = inv.sdtNguoiNhan || inv.sdtKhachHang || '';
    if ($('editReceiverEmail')) $('editReceiverEmail').value = currentEmail || '';
    if ($('editReceiverAddress')) $('editReceiverAddress').value = inv.diaChiGiao || '';

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
};

/** Mở Modal Hủy Đơn Hàng */
window.openCancelModalFromDetails = function(orderId, orderCode) {
    if (state.currentInvoice && state.currentInvoice.trangThai !== 0) {
        showToast('Đơn hàng đã được xác nhận, không được phép hủy đơn!', 'error');
        return;
    }
    openCancelOrderModal(orderId, orderCode, async () => {
        await selectInvoice(orderId, true);
    });
};

function openCancelOrderModal(orderId, orderCode, onCancelledSuccess) {
    const existing = document.getElementById('cancelOrderModalTraCuu');
    if (existing) existing.remove();

    const reasons = [
        "Tôi muốn thay đổi địa chỉ nhận hàng",
        "Tôi muốn đổi kích thước, màu sắc hoặc sản phẩm khác",
        "Tôi tìm thấy sản phẩm giá tốt hơn ở nơi khác",
        "Thời gian giao hàng dự kiến quá lâu",
        "Tôi đổi ý, không còn nhu cầu mua sản phẩm nữa",
        "Lý do khác"
    ];

    const modal = document.createElement('div');
    modal.id = 'cancelOrderModalTraCuu';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
    `;

    modal.innerHTML = `
        <div style="background: #fff; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden;">
            <div style="padding: 18px 24px; border-bottom: 1px solid #fee2e2; display: flex; justify-content: space-between; align-items: center; background: #fff5f5;">
                <h3 style="font-size: 16.5px; font-weight: 800; color: #dc2626; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="alert-circle" style="width: 20px; height: 20px;"></i>
                    Yêu cầu hủy đơn hàng #${orderCode}
                </h3>
                <button type="button" id="btnCloseCancelModal" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'">
                    <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                </button>
            </div>
            <div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; max-height: 75vh; overflow-y: auto;">
                <p style="font-size: 13.5px; color: #475569; margin: 0; line-height: 1.5;">
                    Vui lòng chọn lý do bạn muốn hủy đơn hàng này:
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${reasons.map((r, i) => `
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-size: 13.5px; color: #1e293b; font-weight: 600;"
                               onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc';" 
                               onmouseout="if(!this.querySelector('input').checked) { this.style.borderColor='#e2e8f0'; this.style.background='#fff'; }">
                            <input type="radio" name="cancelReasonRadio" value="${escapeHtml(r)}" ${i === 0 ? 'checked' : ''} style="accent-color:#ef4444; width:16px; height:16px;" onchange="document.querySelectorAll('label').forEach(l => { if(l.querySelector('input')) l.style.borderColor = l.querySelector('input').checked ? '#ef4444' : '#e2e8f0'; l.style.background = l.querySelector('input').checked ? '#fff5f5' : '#fff'; });">
                            <span>${escapeHtml(r)}</span>
                        </label>
                    `).join('')}
                </div>
                <textarea id="customCancelNote" style="width: 100%; height: 60px; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; resize: none; display: none;" placeholder="Nhập chi tiết lý do của bạn..."></textarea>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #fafafa;">
                <button type="button" id="btnCancelDismiss" style="padding: 9px 18px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 14px; font-weight: 700; color: #475569; cursor: pointer;">Đóng</button>
                <button type="button" id="btnConfirmCancel" style="padding: 9px 20px; border-radius: 8px; border: none; background: #ef4444; font-size: 14px; font-weight: 800; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">Xác nhận hủy</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons({ root: modal });
    }

    const close = () => modal.remove();
    modal.querySelector('#btnCloseCancelModal').onclick = close;
    modal.querySelector('#btnCancelDismiss').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    const radios = modal.querySelectorAll('input[name="cancelReasonRadio"]');
    const customNote = modal.querySelector('#customCancelNote');
    radios.forEach(r => {
        r.addEventListener('change', () => {
            if (customNote) {
                customNote.style.display = (r.value === 'Lý do khác') ? 'block' : 'none';
            }
        });
    });

    const btnConfirm = modal.querySelector('#btnConfirmCancel');
    btnConfirm.onclick = async () => {
        const selectedRadio = modal.querySelector('input[name="cancelReasonRadio"]:checked');
        let reason = selectedRadio ? selectedRadio.value : 'Khách hàng yêu cầu hủy';
        if (reason === 'Lý do khác' && customNote && customNote.value.trim()) {
            reason = 'Lý do khác: ' + customNote.value.trim();
        }

        try {
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Đang gửi...';

            const res = await safeFetchJson(`/api/auth/tracking/cancel/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason })
            });

            showToast(res.message || 'Yêu cầu hủy đơn hàng đã được gửi thành công!', 'success');
            close();
            if (typeof onCancelledSuccess === 'function') {
                onCancelledSuccess();
            }
        } catch (e) {
            console.error(e);
            showToast(e.message, 'error');
            btnConfirm.disabled = false;
            btnConfirm.textContent = 'Xác nhận hủy';
        }
    };
}

/** Tự động tải đơn hàng của khách hàng đăng nhập */
async function checkUserAndAutoLoadOrders() {
    try {
        const res = await fetch('/api/auth/current-user');
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) return;
        const data = await res.json();
        
        if (data.loggedIn && data.user && data.user.email) {
            const email = data.user.email;
            state.userEmail = email;
            
            if ($('inputContact')) {
                $('inputContact').value = email;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('code')) return;

            const container = $('userOrdersListContainer');
            if (container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="text-align: center; padding: 36px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.06);">
                        <div style="font-weight: 600; color: #64748b; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span style="width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></span>
                            Đang tải danh sách đơn hàng của bạn...
                        </div>
                    </div>
                    <style>
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                `;
            }
            
            const orders = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
            renderUserOrders(orders);
        }
    } catch (e) {
        console.error("Error auto-loading orders:", e);
    }
}

async function refreshUserOrdersList() {
    const email = state.userEmail;
    if (!email) {
        await checkUserAndAutoLoadOrders();
        return;
    }
    try {
        const orders = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
        renderUserOrders(orders);
        const container = $('userOrdersListContainer');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        console.error("Error refreshing orders:", e);
    }
}

function renderUserOrders(invoices) {
    const container = $('userOrdersListContainer');
    if (!container) return;
    
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        container.innerHTML = `
            <div style="padding: 36px 20px; text-align: center; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: var(--shadow-sm);">
                <i data-lucide="package-open" style="width: 44px; height: 44px; color: #94a3b8; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;"></i>
                <div style="font-weight: 800; color: #1e293b; font-size: 16px; margin-bottom: 4px;">Bạn chưa có đơn hàng nào</div>
                <div style="color: #64748b; font-size: 13.5px;">Hãy đặt hàng ngay để theo dõi trạng thái đơn hàng tại đây!</div>
            </div>
        `;
        container.style.display = 'block';
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        return;
    }
    
    container.innerHTML = `
        <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.06); overflow:hidden;">
            <div style="padding:18px 24px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin:0; font-size:16px; font-weight:800; color:#1e293b; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="clipboard-list" style="color: var(--primary); width: 20px; height: 20px;"></i>
                        Danh sách đơn hàng của bạn (${invoices.length})
                    </h3>
                    <p style="margin:4px 0 0; font-size:13px; color:#64748b;">Nhấn vào bất kỳ đơn hàng nào để xem đầy đủ chi tiết</p>
                </div>
            </div>
            <div style="display:flex; flex-direction:column;">
                ${invoices.map(inv => `
                    <div onclick="selectInvoice(${inv.id}, true)" style="padding:18px 24px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:all 0.15s; display:flex; justify-content:space-between; align-items:center;"
                        onmouseover="this.style.background='#f8fafc'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='#fff'; this.style.transform='none';">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(0, 173, 239, 0.08); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                                <i data-lucide="receipt" style="width: 20px; height: 20px;"></i>
                            </div>
                            <div>
                                <div style="font-weight:800; color:var(--primary); font-size:15px; text-decoration: underline;">#${inv.maHoaDon || ('HD' + inv.id)}</div>
                                <div style="font-size:12px; color:#64748b; margin-top:3px; display: flex; align-items: center; gap: 4px;">
                                    <i data-lucide="calendar" style="width:12px; height:12px;"></i>
                                    ${formatDate(inv.ngayTao)}
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:800; color:#ef4444; font-size:15px;">${formatPrice(inv.tongTien)}</div>
                            <div style="font-size:11.5px; font-weight:700; background:${getStatusBgColor(inv.trangThai)}; color:${getStatusTextColor(inv.trangThai)}; padding:4px 10px; border-radius:6px; margin-top:6px; display:inline-block; border: 1px solid ${getStatusBorderColor(inv.trangThai)};">
                                ${getStatusName(inv.trangThai)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    container.style.display = 'block';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// Helpers
function getStatusName(status) {
    switch (status) {
        case 0: return 'Chờ xác nhận';
        case 1: return 'Đã xác nhận';
        case 2: return 'Chờ lấy hàng';
        case 3: return 'Đang giao hàng';
        case 4: return 'Đã giao hàng';
        case 5: return 'Giao hàng thất bại';
        case 6: return 'Hoàn thành';
        case 7: return 'Đã xác nhận hủy';
        case 8: return 'Yêu cầu hủy';
        case 9: return 'Đã hoàn tiền';
        default: return 'N/A';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 0: return 'status-pending';
        case 1: return 'status-shipping';
        case 2: return 'status-shipping';
        case 3: return 'status-shipping';
        case 4: return 'status-completed';
        case 6: return 'status-completed';
        case 7: return 'status-cancelled';
        case 8: return 'status-pending';
        case 9: return 'status-cancelled';
        default: return 'status-pending';
    }
}

function getStatusBgColor(status) {
    switch (status) {
        case 0: return 'rgba(234, 179, 8, 0.1)';
        case 1: return 'rgba(59, 130, 246, 0.1)';
        case 2: return 'rgba(99, 102, 241, 0.1)';
        case 3: return 'rgba(14, 165, 233, 0.1)';
        case 4: return 'rgba(16, 185, 129, 0.1)';
        case 5: return 'rgba(239, 68, 68, 0.1)';
        case 6: return 'rgba(16, 185, 129, 0.1)';
        case 7: return 'rgba(239, 68, 68, 0.1)';
        case 8: return 'rgba(249, 115, 22, 0.1)';
        case 9: return 'rgba(107, 114, 128, 0.1)';
        default: return '#f1f5f9';
    }
}

function getStatusTextColor(status) {
    switch (status) {
        case 0: return '#ca8a04';
        case 1: return '#2563eb';
        case 2: return '#4f46e5';
        case 3: return '#0284c7';
        case 4: return '#059669';
        case 5: return '#dc2626';
        case 6: return '#059669';
        case 7: return '#dc2626';
        case 8: return '#ea580c';
        case 9: return '#4b5563';
        default: return '#1e293b';
    }
}

function getStatusBorderColor(status) {
    switch (status) {
        case 0: return 'rgba(234, 179, 8, 0.25)';
        case 1: return 'rgba(59, 130, 246, 0.25)';
        case 2: return 'rgba(99, 102, 241, 0.25)';
        case 3: return 'rgba(14, 165, 233, 0.25)';
        case 4: return 'rgba(16, 185, 129, 0.25)';
        case 5: return 'rgba(239, 68, 68, 0.25)';
        case 6: return 'rgba(16, 185, 129, 0.25)';
        case 7: return 'rgba(239, 68, 68, 0.25)';
        case 8: return 'rgba(249, 115, 22, 0.25)';
        case 9: return 'rgba(107, 114, 128, 0.25)';
        default: return '#cbd5e1';
    }
}

function formatDate(dateArr) {
    if (!dateArr) return '';
    if (Array.isArray(dateArr)) {
        const y = dateArr[0];
        const m = String(dateArr[1]).padStart(2, '0');
        const d = String(dateArr[2]).padStart(2, '0');
        const hh = String(dateArr[3] || 0).padStart(2, '0');
        const mm = String(dateArr[4] || 0).padStart(2, '0');
        return `${hh}:${mm} ${d}/${m}/${y}`;
    }
    try {
        const d = new Date(dateArr);
        if (isNaN(d.getTime())) return String(dateArr);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hh}:${mm} ${day}/${month}/${year}`;
    } catch (e) {
        return String(dateArr);
    }
}

function formatPrice(val) {
    const n = parseFloat(val) || 0;
    return n.toLocaleString('vi-VN') + ' ₫';
}

function getProductItemImage(hinhAnh, defaultIdx = 0) {
    const fallbacks = ['/images/shoe1.png', '/images/shoe2.png', '/images/shoe3.png', '/images/shoe4.png'];
    const fallback = fallbacks[Math.abs(defaultIdx || 0) % fallbacks.length];
    if (!hinhAnh || typeof hinhAnh !== 'string') return fallback;
    let img = hinhAnh.replace(/[\[\]"']/g, '').trim();
    if (!img) return fallback;
    if (img.includes(',')) img = img.split(',')[0].trim();
    if (!img) return fallback;
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) return img;
    return '/images/' + img;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    const iconColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.innerHTML = `<i data-lucide="${iconName}" style="width: 16px; height: 16px; color: ${iconColor}; flex-shrink: 0;"></i> <span style="margin-left:8px;">${msg}</span>`;
    container.appendChild(toast);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            lucide.createIcons({ root: toast });
        } catch(e) {}
    }

    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.35s ease reverse';
        setTimeout(() => toast.remove(), 350);
    }, 2800);
}

function updateCartBadgeGlobal() {
    try {
        const cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
        const total = cart.reduce((s, i) => s + (i.qty || 1), 0);
        const badge = $('cartCountBadgeGlobal') || $('cartCountBadge');
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
        }
    } catch (e) {}
}
