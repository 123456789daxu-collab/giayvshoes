/**
 * VHOES - Order Tracking / Lookup JS
 */

async function safeFetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("Phiên kết nối đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng tải lại trang hoặc đăng nhập lại.");
    }
    if (!res.ok) {
        let errText = "Lỗi kết nối máy chủ";
        try { errText = await res.text(); } catch(e) {}
        throw new Error(errText || "Lỗi kết nối máy chủ");
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
}

const state = {
    currentInvoice: null
};

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    setupTrackBtn();
    updateCartBadgeGlobal();
    setupBackButton();

    // Đọc URL param ?code= và tự động tra cứu (luôn lấy data mới nhất từ server)
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
        const inputCode = $('inputInvoiceCode');
        if (inputCode) inputCode.value = codeParam.trim();
        // Kích hoạt tra cứu sau khi DOM và các hàm khởi tạo xong
        setTimeout(() => $('btnTrack').click(), 100);
    } else {
        // Chỉ auto-load danh sách đơn của user khi không có code param
        checkUserAndAutoLoadOrders();
    }
});

function setupBackButton() {
    const btnBack = $('btnBackToOrdersList');
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide details
            $('trackResultCard').style.display = 'none';
            btnBack.style.display = 'none';
            
            // Show search card again
            const searchCard = $('trackSearchCard');
            if (searchCard) searchCard.style.display = 'block';
            
            // Show the origin list
            const origin = btnBack.getAttribute('data-origin');
            if (origin === 'user') {
                // Luôn refetch danh sách đơn của user để hiển thị trạng thái mới nhất
                const container = $('userOrdersListContainer');
                if (container) {
                    container.style.display = 'block';
                    container.innerHTML = `<div style="text-align:center;padding:30px;color:#64748b;font-size:14px;">Đang cập nhật danh sách...</div>`;
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
    const doSearch = () => $('btnTrack').click();
    $('inputInvoiceCode').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    $('inputContact').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    $('btnTrack').addEventListener('click', async () => {
        let code = $('inputInvoiceCode').value.trim();
        const email = $('inputContact').value.trim().toLowerCase();
        const resultCard = $('trackResultCard');

        if (!code && !email) {
            showToast('Vui lòng nhập ít nhất Mã hoá đơn hoặc Email để tra cứu!', 'error');
            return;
        }

        if (code.startsWith('#')) code = code.substring(1);

        $('btnTrack').disabled = true;
        $('btnTrack').textContent = 'Đang tra cứu...';
        resultCard.style.display = 'none';

        try {
            let matchedInvoice = null;

            if (code && email) {
                // Cả hai: tìm theo mã rồi kiểm tra email khớp
                const data = await safeFetchJson(`/api/auth/tracking/search?keyword=${encodeURIComponent(code)}`);
                matchedInvoice = data.find(inv =>
                    inv.maHoaDon.toUpperCase() === code.toUpperCase() &&
                    (
                        (inv.email && inv.email.toLowerCase() === email) ||
                        (inv.sdtNguoiNhan && inv.sdtNguoiNhan.includes(email)) ||
                        (inv.sdtKhachHang && inv.sdtKhachHang.includes(email))
                    )
                );
                if (!matchedInvoice) {
                    showToast('Không tìm thấy đơn hàng phù hợp với mã và email đã nhập!', 'error');
                    return;
                }

            } else if (code) {
                // Chỉ tìm theo mã hoá đơn
                const data = await safeFetchJson(`/api/auth/tracking/search?keyword=${encodeURIComponent(code)}`);
                matchedInvoice = data.find(inv => inv.maHoaDon.toUpperCase() === code.toUpperCase());
                if (!matchedInvoice) {
                    showToast(`Không tìm thấy đơn hàng với mã "${code}"!`, 'error');
                    return;
                }

            } else {
                // Chỉ tìm theo email - gọi endpoint 8080 (không proxy) để tìm cả khách vãng lai
                const matched = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
                if (!matched || matched.length === 0) {
                    showToast(`Không tìm thấy đơn hàng với email "${email}"!`, 'error');
                    return;
                }
                if (matched.length === 1) {
                    matchedInvoice = matched[0];
                } else {
                    // Nhiều đơn hàng: hiển thị danh sách để chọn
                    renderMultipleResults(matched);
                    resultCard.style.display = 'none';
                    showToast(`Tìm thấy ${matched.length} đơn hàng với email này. Vui lòng chọn đơn cần xem.`, 'success');
                    return;
                }
            }

            state.currentInvoice = matchedInvoice;

            // Lấy chi tiết sản phẩm
            const items = await safeFetchJson(`/api/auth/tracking/${matchedInvoice.id}/items`);

            renderTrackingResult(matchedInvoice, items);
            resultCard.style.display = 'block';
            showToast('Tra cứu đơn hàng thành công!', 'success');
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        } finally {
            $('btnTrack').disabled = false;
            $('btnTrack').textContent = 'Tra cứu';
        }
    });
}

/** Hiển thị danh sách khi có nhiều đơn hàng cùng email */
function renderMultipleResults(invoices) {
    // Tạo hoặc cập nhật bảng danh sách
    let listEl = $('multiResultList');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'multiResultList';
        listEl.style.cssText = 'background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:30px;overflow:hidden;';
        $('trackResultCard').parentNode.insertBefore(listEl, $('trackResultCard'));
    }

    listEl.innerHTML = `
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
            <h3 style="margin:0;font-size:16px;font-weight:800;color:#1e293b;">📋 Các đơn hàng tìm thấy (${invoices.length})</h3>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Nhấn vào đơn hàng để xem chi tiết</p>
        </div>
        <div style="display:flex;flex-direction:column;">
            ${invoices.map(inv => `
                <div onclick="selectInvoice(${inv.id})" style="padding:16px 24px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 0.15s;display:flex;justify-content:space-between;align-items:center;"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                    <div>
                        <div style="font-weight:700;color:#1e293b;font-size:14px;">${inv.maHoaDon}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:3px;">${formatDate(inv.ngayTao)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800;color:#e53e3e;font-size:14px;">${formatPrice(inv.tongTien)}</div>
                        <div style="font-size:11px;font-weight:700;background:#1e293b;color:#fff;padding:2px 8px;border-radius:4px;margin-top:4px;display:inline-block;">${getStatusName(inv.trangThai)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    listEl.style.display = 'block';
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Xem chi tiết một đơn khi click từ danh sách nhiều đơn */
async function selectInvoice(invoiceId, isFromUserList = false) {
    try {
        $('btnTrack').disabled = true;

        // Lấy chi tiết đơn hàng bằng ID
        const [inv, items] = await Promise.all([
            safeFetchJson(`/api/auth/tracking/${invoiceId}`),
            safeFetchJson(`/api/auth/tracking/${invoiceId}/items`)
        ]);

        // HIDE lists
        const multiList = $('multiResultList');
        if (multiList) multiList.style.display = 'none';

        const userList = $('userOrdersListContainer');
        if (userList) userList.style.display = 'none';

        // Hide search card
        const searchCard = $('trackSearchCard');
        if (searchCard) searchCard.style.display = 'none';

        state.currentInvoice = inv;
        renderTrackingResult(inv, items);
        $('trackResultCard').style.display = 'block';

        // Show back button
        const btnBack = $('btnBackToOrdersList');
        if (btnBack) {
            btnBack.style.display = 'inline-flex';
            btnBack.setAttribute('data-origin', isFromUserList ? 'user' : 'multi');
        }

        $('trackResultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        $('btnTrack').disabled = false;
    }
}
window.selectInvoice = selectInvoice;


function renderTrackingResult(inv, items) {
    // Header Info
    $('lblResultCode').textContent = `Đơn hàng ${inv.maHoaDon}`;
    $('lblResultTime').textContent = formatDate(inv.ngayTao);
    
    const statusText = getStatusName(inv.trangThai);
    $('lblResultStatusBadge').textContent = statusText;
    
    // ===========================================================
    // BANNER TRẠNG THÁI ĐẶC BIỆT (Yêu cầu hủy / Đã xác nhận hủy)
    // ===========================================================
    let specialBanner = $('specialStatusBanner');
    if (!specialBanner) {
        specialBanner = document.createElement('div');
        specialBanner.id = 'specialStatusBanner';
        const timelineWrapper = $('cancelBtnContainer') && $('cancelBtnContainer').parentNode;
        if (timelineWrapper) {
            timelineWrapper.insertBefore(specialBanner, timelineWrapper.firstChild);
        }
    }

    if (inv.trangThai === 8) {
        // Đang chờ admin xác nhận hủy
        specialBanner.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; background: linear-gradient(135deg,#fff7ed,#ffedd5); border:1.5px solid #fed7aa; border-radius:10px; padding:14px 18px; margin-bottom:14px;">
                <div style="width:36px; height:36px; background:#f97316; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                    <div style="font-weight:800; font-size:14px; color:#c2410c;">Yêu cầu hủy đang chờ xác nhận</div>
                    <div style="font-size:12px; color:#9a3412; margin-top:3px;">Yêu cầu hủy đơn hàng của bạn đang được bộ phận chăm sóc khách hàng xem xét. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</div>
                </div>
            </div>
        `;
        specialBanner.style.display = 'block';
    } else if (inv.trangThai === 7) {
        // Đã xác nhận hủy
        specialBanner.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; background: linear-gradient(135deg,#fef2f2,#fee2e2); border:1.5px solid #fecaca; border-radius:10px; padding:14px 18px; margin-bottom:14px;">
                <div style="width:36px; height:36px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div>
                    <div style="font-weight:800; font-size:14px; color:#b91c1c;">Đơn hàng đã được xác nhận hủy</div>
                    <div style="font-size:12px; color:#991b1b; margin-top:3px;">Đơn hàng của bạn đã bị hủy. Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền trong 3-5 ngày làm việc.</div>
                </div>
            </div>
        `;
        specialBanner.style.display = 'block';
    } else {
        specialBanner.innerHTML = '';
        specialBanner.style.display = 'none';
    }

    // Edit Shipping Info & Cancel request buttons handler (only active when Chờ xác nhận = status 0)
    const cancelBtnContainer = $('cancelBtnContainer');
    const btnEditHeader = $('btnEditShippingHeader');
    const btnEditInfo = $('btnEditShippingInfo');
    const modalEdit = $('modalEditShippingInfo');

    if (inv.trangThai === 0) {
        cancelBtnContainer.style.display = 'flex';
        if (btnEditHeader) btnEditHeader.style.display = 'inline-flex';
        if (btnEditInfo) btnEditInfo.style.display = 'inline-flex';

        // Setup edit modal opener
        const openEditModal = () => {
            if (!modalEdit) return;
            let currentEmail = inv.email || '';
            if (!currentEmail && inv.ghiChu) {
                const matches = inv.ghiChu.match(/\|\s*email\s*:\s*([^\s|]+)/i);
                if (matches && matches[1]) currentEmail = matches[1].trim();
            }
            if (!currentEmail && $('inputContact')) {
                currentEmail = $('inputContact').value.trim();
            }

            $('editReceiverName').value = inv.tenKhachHang || inv.tenNguoiNhan || '';
            $('editReceiverPhone').value = inv.sdtKhachHang || inv.sdtNguoiNhan || '';
            $('editReceiverEmail').value = currentEmail || '';
            $('editReceiverAddress').value = inv.diaChiGiao || '';

            modalEdit.style.display = 'flex';
            if (window.lucide && lucide.createIcons) lucide.createIcons();
        };

        if (btnEditHeader) {
            const oldHeader = btnEditHeader.cloneNode(true);
            btnEditHeader.parentNode.replaceChild(oldHeader, btnEditHeader);
            oldHeader.addEventListener('click', openEditModal);
        }
        if (btnEditInfo) {
            const oldInfo = btnEditInfo.cloneNode(true);
            btnEditInfo.parentNode.replaceChild(oldInfo, btnEditInfo);
            oldInfo.addEventListener('click', openEditModal);
        }

        // Modal close listeners
        const btnClose = $('btnCloseEditModal');
        const btnCancel = $('btnCancelEditShipping');
        if (btnClose) btnClose.onclick = () => { modalEdit.style.display = 'none'; };
        if (btnCancel) btnCancel.onclick = () => { modalEdit.style.display = 'none'; };

        // Form submit
        const formEdit = $('formEditShipping');
        if (formEdit) {
            formEdit.onsubmit = async (e) => {
                e.preventDefault();
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

                try {
                    const btnSave = $('btnSaveShipping');
                    btnSave.disabled = true;
                    btnSave.textContent = 'Đang lưu...';

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
                    modalEdit.style.display = 'none';

                    // Refresh details
                    await selectInvoice(inv.id);
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    const btnSave = $('btnSaveShipping');
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i> Lưu thay đổi';
                    }
                    if (window.lucide && lucide.createIcons) lucide.createIcons();
                }
            };
        }

        // Remove existing listener to avoid duplicates for cancel order
        const oldBtn = $('btnCancelOrder');
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
        
        newBtn.addEventListener('click', async () => {
            if (confirm(`Bạn có chắc chắn muốn huỷ đơn hàng ${inv.maHoaDon} không?`)) {
                try {
                    newBtn.disabled = true;
                    newBtn.textContent = 'Đang xử lý...';
                    
                    // Create update payload
                    const payload = {
                        id: inv.id,
                        trangThai: 8, // Yêu cầu huỷ
                        ghiChu: 'Khách hàng hủy đơn online từ trang Tra cứu'
                    };
                    
                    await safeFetchJson(`/api/auth/tracking/${inv.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    showToast('Yêu cầu hủy đơn đã được gửi! Chúng tôi sẽ xác nhận trong thời gian sớm nhất.', 'success');
                    
                    // Refresh lại chi tiết đơn để hiển thị trạng thái mới
                    await selectInvoice(inv.id, true);
                } catch (e) {
                    showToast(e.message, 'error');
                    newBtn.disabled = false;
                    newBtn.innerHTML = '<i data-lucide="x-circle" style="width:16px;height:16px;"></i> Yêu Cầu Hủy';
                    lucide.createIcons();
                }
            }
        });
    } else {
        cancelBtnContainer.style.display = 'none';
        if (btnEditHeader) btnEditHeader.style.display = 'none';
        if (btnEditInfo) btnEditInfo.style.display = 'none';
    }

    // ============================================================
    // TIMELINE STEPS
    // ============================================================
    const isCancelled = (inv.trangThai === 7 || inv.trangThai === 8);

    // Nhãn & icon gốc cho 5 bước bình thường
    const stepDefaults = [
        { label: 'Chờ xác nhận',   icon: 'clipboard' },
        { label: 'Đã xác nhận',    icon: 'check-circle' },
        { label: 'Chờ giao hàng',  icon: 'package' },
        { label: 'Đang giao hàng', icon: 'truck' },
        { label: 'Hoàn thành',     icon: 'check-circle-2' }
    ];

    // SVG icons inline cho trạng thái đặc biệt
    const svgClock  = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const svgCheck  = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const svgBan    = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

    if (isCancelled) {
        // ── CHẾ ĐỘ HỦY: chỉ hiển thị step0 và step1, ẩn step2/3/4 ──

        // Ẩn 3 bước cuối
        ['step2', 'step3', 'step4'].forEach(id => {
            const el = $(id);
            if (el) el.style.display = 'none';
        });

        // ─── step0: "Yêu cầu hủy" ───
        const step0 = $('step0');
        if (step0) {
            step0.style.display = '';
            const ib0 = step0.querySelector('.step-icon-box');
            const lb0 = step0.querySelector('.step-label');

            if (inv.trangThai === 8) {
                // Đang chờ xác nhận: pulse cam
                step0.className = 'timeline-step cancel-pending';
                if (ib0) ib0.innerHTML = svgClock;
                if (lb0) { lb0.textContent = 'Yêu cầu hủy'; lb0.style.color = '#f97316'; }
            } else {
                // Đã xác nhận hủy: bước 0 = completed (cam check)
                step0.className = 'timeline-step cancel-done';
                if (ib0) ib0.innerHTML = svgCheck;
                if (lb0) { lb0.textContent = 'Yêu cầu hủy'; lb0.style.color = '#f97316'; }
            }
        }

        // ─── step1: "Đơn hàng đã được hủy" ───
        const step1 = $('step1');
        if (step1) {
            step1.style.display = '';
            const ib1 = step1.querySelector('.step-icon-box');
            const lb1 = step1.querySelector('.step-label');

            if (inv.trangThai === 8) {
                // Chưa xác nhận: bước này còn mờ (future)
                step1.className = 'timeline-step';
                if (ib1) ib1.innerHTML = svgBan;
                if (lb1) { lb1.textContent = 'Đơn hàng đã được hủy'; lb1.style.color = '#94a3b8'; }
            } else {
                // Đã xác nhận hủy: bước này active đỏ
                step1.className = 'timeline-step cancelled';
                if (ib1) ib1.innerHTML = svgBan;
                if (lb1) { lb1.textContent = 'Đơn hàng đã được hủy'; lb1.style.color = '#ef4444'; }
            }
        }

    } else {
        // ── CHẾ ĐỘ BÌNH THƯỜNG: hiện lại cả 5 bước, restore nhãn/icon ──

        for (let i = 0; i <= 4; i++) {
            const stepEl = $('step' + i);
            if (!stepEl) continue;
            stepEl.style.display = '';
            stepEl.className = 'timeline-step';

            const iconBox = stepEl.querySelector('.step-icon-box');
            const labelEl = stepEl.querySelector('.step-label');
            if (iconBox) iconBox.innerHTML = `<i data-lucide="${stepDefaults[i].icon}" style="width:20px;height:20px;"></i>`;
            if (labelEl) { labelEl.textContent = stepDefaults[i].label; labelEl.style.color = ''; }
        }

        // Tính bước active
        let activeIdx = -1;
        if (inv.trangThai === 0)                            activeIdx = 0;
        else if (inv.trangThai === 1)                       activeIdx = 1;
        else if (inv.trangThai === 2)                       activeIdx = 2;
        else if (inv.trangThai === 3)                       activeIdx = 3;
        else if (inv.trangThai === 4 || inv.trangThai === 5) activeIdx = 3.5;
        else if (inv.trangThai === 6)                       activeIdx = 4;

        for (let i = 0; i <= 4; i++) {
            const stepEl = $('step' + i);
            if (!stepEl) continue;
            if (activeIdx !== -1) {
                if (i < activeIdx)                                        stepEl.classList.add('completed');
                else if (Math.floor(activeIdx) === i || Math.ceil(activeIdx) === i) stepEl.classList.add('active');
            }
        }
    }

    // ── CONNECTOR (thanh tiến trình) ──
    const connector  = $('timelineConnectorActive');
    const statusBadge = $('lblResultStatusBadge');

    if (inv.trangThai === 7) {
        // Đã xác nhận hủy → connector chạy hết sang step1
        connector.style.width = '50%';
        connector.style.background = 'linear-gradient(90deg,#f97316,#ef4444)';
        if (statusBadge) { statusBadge.style.background = '#dc2626'; statusBadge.style.color = '#fff'; }
    } else if (inv.trangThai === 8) {
        // Yêu cầu hủy → connector dừng ở step0 (0%)
        connector.style.width = '0%';
        connector.style.background = 'linear-gradient(90deg,#f97316,#ea580c)';
        if (statusBadge) { statusBadge.style.background = '#f97316'; statusBadge.style.color = '#fff'; }
    } else if (inv.trangThai === 9) {
        connector.style.width = '0%';
        connector.style.background = '';
        if (statusBadge) { statusBadge.style.background = '#6b7280'; statusBadge.style.color = '#fff'; }
    } else {
        let activeIdx = -1;
        if (inv.trangThai === 0)                            activeIdx = 0;
        else if (inv.trangThai === 1)                       activeIdx = 1;
        else if (inv.trangThai === 2)                       activeIdx = 2;
        else if (inv.trangThai === 3)                       activeIdx = 3;
        else if (inv.trangThai === 4 || inv.trangThai === 5) activeIdx = 3.5;
        else if (inv.trangThai === 6)                       activeIdx = 4;

        connector.style.width = activeIdx >= 0 ? (activeIdx * 25) + '%' : '0%';
        connector.style.background = '';
        if (statusBadge) { statusBadge.style.background = '#1e293b'; statusBadge.style.color = '#fff'; }
    }

    // Sau khi đổi innerHTML Lucide, gọi lại createIcons
    if (window.lucide && lucide.createIcons) lucide.createIcons();

    // Customer shipping info
    $('lblResultName').textContent = inv.tenKhachHang || inv.nguoiTao || 'Khách lẻ';
    $('lblResultPhone').textContent = inv.sdtKhachHang || 'N/A';
    
    let emailToShow = inv.email;
    if (!emailToShow && inv.ghiChu) {
        const matches = inv.ghiChu.match(/\|\s*email\s*:\s*([^\s|]+)/i);
        if (matches && matches[1]) {
            emailToShow = matches[1].trim();
        }
    }
    if (!emailToShow && $('inputContact')) {
        emailToShow = $('inputContact').value.trim();
    }
    $('lblResultEmail').textContent = emailToShow || 'N/A';
    
    $('lblResultAddress').textContent = inv.diaChiGiao || 'Nhận tại quầy';

    // Pricing details & items
    const itemsList = $('resultItemsList');
    itemsList.innerHTML = items.map(item => `
        <div class="summary-item-line">
            <span class="summary-item-name">${item.tenSanPham || 'Sản phẩm'} x${item.soLuong || 1}</span>
            <span class="summary-item-price">${formatPrice(item.thanhTien || 0)}</span>
        </div>
    `).join('');

    let subtotal = items.reduce((s, i) => s + (parseFloat(i.thanhTien) || 0), 0);
    const ship = parseFloat(inv.phiShip) || 0;
    const discount = parseFloat(inv.tienGiam) || 0;
    
    let total = parseFloat(inv.tongTien) || 0;
    // Nếu tổng tiền trong DB bằng 0 nhưng tạm tính > 0, tự động tính tổng tiền thực tế
    if (total === 0 && subtotal > 0) {
        total = Math.max(0, subtotal + ship - discount);
    }

    $('lblResultSubtotal').textContent = formatPrice(subtotal);
    $('lblResultShipping').textContent = formatPrice(ship);
    $('lblResultDiscount').textContent = `-${formatPrice(discount)}`;
    $('lblResultTotal').textContent = formatPrice(total);

    const voucherInfoEl = $('lblResultVoucherInfo');
    if (voucherInfoEl) {
        let vText = '';
        if (inv.tenVoucher && inv.maVoucher) {
            vText = `(${inv.maVoucher} - ${inv.tenVoucher})`;
        } else if (inv.tenVoucher) {
            vText = `(${inv.tenVoucher})`;
        } else if (inv.maVoucher) {
            vText = `(${inv.maVoucher})`;
        } else if (discount > 0) {
            vText = `(Phiếu giảm giá)`;
        }
        voucherInfoEl.textContent = vText;
    }

    // Refresh icons inside result card
    lucide.createIcons();
}

// Helpers
function getStatusName(status) {
    switch (status) {
        case 0: return 'Chờ xác nhận';
        case 1: return 'Đã xác nhận';
        case 2: return 'Chờ giao hàng';
        case 3: return 'Đang giao hàng';
        case 4: return 'Đã giao';
        case 5: return 'Giao hàng thất bại';
        case 6: return 'Hoàn thành';
        case 7: return 'Đã xác nhận hủy';
        case 8: return 'Yêu cầu hủy';
        case 9: return 'Đã hoàn tiền';
        default: return 'N/A';
    }
}

function formatDate(dateArr) {
    if (!dateArr) return '';
    // Spring Boot returns dates as ISO strings or Arrays [YYYY, MM, DD, HH, mm, ss]
    if (Array.isArray(dateArr)) {
        const y = dateArr[0];
        const m = String(dateArr[1]).padStart(2, '0');
        const d = String(dateArr[2]).padStart(2, '0');
        const hh = String(dateArr[3] || 0).padStart(2, '0');
        const mm = String(dateArr[4] || 0).padStart(2, '0');
        const ss = String(dateArr[5] || 0).padStart(2, '0');
        return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
    }
    // Parse as ISO string
    try {
        const d = new Date(dateArr);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hh}:${mm}:${ss} ${day}/${month}/${year}`;
    } catch (e) {
        return String(dateArr);
    }
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

async function checkUserAndAutoLoadOrders() {
    try {
        const res = await fetch('/api/auth/current-user');
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) return;
        const data = await res.json();
        
        if (data.loggedIn && data.user && data.user.email) {
            const email = data.user.email;
            state.userEmail = email; // cache lại để dùng khi refresh
            
            // Prefill email input
            if ($('inputContact')) {
                $('inputContact').value = email;
            }
            
            // Nếu đang có code param trên URL thì không hiện danh sách ngay
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('code')) return;

            // Show loading state in container
            const container = $('userOrdersListContainer');
            if (container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.06);">
                        <div style="font-weight: 600; color: #64748b; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></span>
                            Đang tải danh sách đơn hàng của bạn...
                        </div>
                    </div>
                    <style>
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                `;
            }
            
            // Fetch orders
            const orders = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
            
            renderUserOrders(orders);
        }
    } catch (e) {
        console.error("Error auto-loading orders:", e);
        showToast('Không tải được danh sách đơn hàng tự động', 'error');
    }
}

/** Refresh nhanh danh sách đơn hàng khi đã biết email (dùng khi quay lại từ chi tiết) */
async function refreshUserOrdersList() {
    const email = state.userEmail;
    if (!email) {
        // Nếu chưa cache thì fetch lại từ đầu
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
        showToast('Không tải được danh sách đơn hàng', 'error');
    }
}


function renderUserOrders(invoices) {
    const container = $('userOrdersListContainer');
    if (!container) return;
    
    if (!invoices || invoices.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: var(--shadow-sm);">
                <i data-lucide="package-x" style="width: 48px; height: 48px; color: #94a3b8; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;"></i>
                <div style="font-weight: 700; color: #1e293b; font-size: 16px; margin-bottom: 4px;">Bạn chưa có đơn hàng nào</div>
                <div style="color: #64748b; font-size: 13px;">Hãy đặt mua sản phẩm để theo dõi trạng thái đơn hàng của bạn tại đây!</div>
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
            <div style="padding:20px 24px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin:0; font-size:16px; font-weight:800; color:#1e293b; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="clipboard-list" style="color: var(--primary); width: 20px; height: 20px;"></i>
                        Danh sách đơn hàng của bạn (${invoices.length})
                    </h3>
                    <p style="margin:4px 0 0; font-size:13px; color:#64748b;">Nhấn vào bất kỳ mã hóa đơn nào để xem đầy đủ thông tin giao hàng</p>
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
                                <div style="font-weight:800; color:var(--primary); font-size:15px; text-decoration: underline;">#${inv.maHoaDon}</div>
                                <div style="font-size:12px; color:#64748b; margin-top:3px; display: flex; align-items: center; gap: 4px;">
                                    <i data-lucide="calendar" style="width:12px; height:12px;"></i>
                                    ${formatDate(inv.ngayTao)}
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:800; color:#ef4444; font-size:15px;">${formatPrice(inv.tongTien)}</div>
                            <div style="font-size:11px; font-weight:700; background:${getStatusBgColor(inv.trangThai)}; color:${getStatusTextColor(inv.trangThai)}; padding:4px 10px; border-radius:6px; margin-top:6px; display:inline-block; border: 1px solid ${getStatusBorderColor(inv.trangThai)};">
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

function getStatusBgColor(status) {
    switch (status) {
        case 0: return 'rgba(234, 179, 8, 0.1)'; // Chờ xác nhận
        case 1: return 'rgba(59, 130, 246, 0.1)'; // Đã xác nhận
        case 2: return 'rgba(99, 102, 241, 0.1)'; // Chờ giao hàng
        case 3: return 'rgba(16, 185, 129, 0.1)'; // Đang giao hàng
        case 4: return 'rgba(16, 185, 129, 0.1)'; // Đang giao hàng
        case 5: return 'rgba(239, 68, 68, 0.1)';  // Giao hàng thất bại
        case 6: return 'rgba(16, 185, 129, 0.1)'; // Hoàn thành
        case 7: return 'rgba(239, 68, 68, 0.1)';  // Đã huỷ
        case 8: return 'rgba(249, 115, 22, 0.1)'; // Yêu cầu huỷ
        case 9: return 'rgba(107, 114, 128, 0.1)'; // Đã hoàn tiền
        default: return '#f1f5f9';
    }
}

function getStatusTextColor(status) {
    switch (status) {
        case 0: return '#ca8a04';
        case 1: return '#2563eb';
        case 2: return '#4f46e5';
        case 3: return '#059669';
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
        case 0: return 'rgba(234, 179, 8, 0.2)';
        case 1: return 'rgba(59, 130, 246, 0.2)';
        case 2: return 'rgba(99, 102, 241, 0.2)';
        case 3: return 'rgba(16, 185, 129, 0.2)';
        case 4: return 'rgba(16, 185, 129, 0.2)';
        case 5: return 'rgba(239, 68, 68, 0.2)';
        case 6: return 'rgba(16, 185, 129, 0.2)';
        case 7: return 'rgba(239, 68, 68, 0.2)';
        case 8: return 'rgba(249, 115, 22, 0.2)';
        case 9: return 'rgba(107, 114, 128, 0.2)';
        default: return '#cbd5e1';
    }
}
