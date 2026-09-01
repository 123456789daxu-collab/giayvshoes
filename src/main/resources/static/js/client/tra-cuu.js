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

document.addEventListener('DOMContentLoaded', async () => {
    setupTrackBtn();
    updateCartBadgeGlobal();
    setupBackButton();

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');

    await checkUserAndAutoLoadOrders();

    if (codeParam) {
        const inputCode = $('inputInvoiceCode');
        if (inputCode) inputCode.value = codeParam.trim();
        setTimeout(() => $('btnTrack').click(), 100);
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
            
            const origin = btnBack.getAttribute('data-origin');
            if (origin === 'user') {
                // Ở chế độ user đã đăng nhập - hiện lại danh sách đơn hàng
                const container = $('userOrdersListContainer');
                if (container) {
                    container.style.display = 'block';
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                refreshUserOrdersList();
            } else {
                // Ở chế độ tìm kiếm thủ công - show lại form hoặc multiList
                const multiList = $('multiResultList');
                if (multiList && multiList.children.length > 0) {
                    multiList.style.display = 'block';
                    multiList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    const searchCard = $('trackSearchCard');
                    if (searchCard) {
                        searchCard.style.display = 'block';
                        searchCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
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
        const listContainer = $('userOrdersListContainer');

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
                if (data && Array.isArray(data)) {
                    matchedInvoice = data.find(inv =>
                        inv.maHoaDon && inv.maHoaDon.toUpperCase() === code.toUpperCase() &&
                        (
                            (inv.email && inv.email.toLowerCase() === email) ||
                            (inv.sdtNguoiNhan && inv.sdtNguoiNhan.includes(email)) ||
                            (inv.sdtKhachHang && inv.sdtKhachHang.includes(email))
                        )
                    );
                }
                if (!matchedInvoice) {
                    showToast('Không tìm thấy đơn hàng phù hợp với mã và email đã nhập!', 'error');
                    return;
                }

            } else if (code) {
                // Chỉ tìm theo mã hoá đơn
                const data = await safeFetchJson(`/api/auth/tracking/search?keyword=${encodeURIComponent(code)}`);
                if (data && Array.isArray(data)) {
                    matchedInvoice = data.find(inv => inv.maHoaDon && inv.maHoaDon.toUpperCase() === code.toUpperCase());
                }
                if (!matchedInvoice) {
                    showToast(`Không tìm thấy đơn hàng với mã "${code}"!`, 'error');
                    return;
                }

            } else {
                // Chỉ tìm theo email
                const matched = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(email)}`);
                if (!matched || matched.length === 0) {
                    showToast(`Không tìm thấy đơn hàng nào với email "${email}"!`, 'error');
                    return;
                }
                
                // Hiển thị danh sách đơn hàng chuẩn giao diện thẻ
                const searchCard = $('trackSearchCard');
                if (searchCard) searchCard.style.display = 'none';
                
                renderUserOrders(matched);
                resultCard.style.display = 'none';
                showToast(`Tìm thấy ${matched.length} đơn hàng!`, 'success');
                
                const btnBack = $('btnBackToOrdersList');
                if (btnBack) {
                    btnBack.style.display = 'inline-flex';
                    btnBack.setAttribute('data-origin', 'user');
                }
                
                if (listContainer) {
                    listContainer.style.display = 'block';
                    listContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }

            state.currentInvoice = matchedInvoice;

            // Lấy chi tiết sản phẩm và lịch sử
            const [items, history] = await Promise.all([
                safeFetchJson(`/api/auth/tracking/${matchedInvoice.id}/items`),
                safeFetchJson(`/api/auth/tracking/${matchedInvoice.id}/history`).catch(() => [])
            ]);

            if (listContainer) listContainer.style.display = 'none';

            renderTrackingResult(matchedInvoice, items || [], history || []);
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

        // Lấy chi tiết đơn hàng, danh sách sản phẩm và lịch sử thay đổi
        const [inv, items, history] = await Promise.all([
            safeFetchJson(`/api/auth/tracking/${invoiceId}`),
            safeFetchJson(`/api/auth/tracking/${invoiceId}/items`),
            safeFetchJson(`/api/auth/tracking/${invoiceId}/history`).catch(() => [])
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
        renderTrackingResult(inv, items || [], history || []);
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


function renderTrackingResult(inv, items, history = []) {
    const ma = inv.maHoaDon || ('HD' + inv.id);
    const st = inv.trangThai;

    // Header Info
    $('lblResultCode').textContent = `Đơn hàng #${ma}`;
    $('lblResultTime').textContent = formatDate(inv.ngayTao);
    
    // Status badge styling
    const statusBadge = $('lblResultStatusBadge');
    const statusText = getStatusName(st);
    if (statusBadge) {
        statusBadge.textContent = statusText;
        statusBadge.className = 'status-badge-detail';
        if (st === 6) {
            statusBadge.classList.add('status-completed');
        } else if (st === 7 || st === 8) {
            statusBadge.classList.add('status-cancelled');
        } else if (st === 3 || st === 4) {
            statusBadge.classList.add('status-shipping');
        } else {
            statusBadge.classList.add('status-pending');
        }
    }
    
    // ===========================================================
    // BANNER TRẠNG THÁI ĐẶC BIỆT (Yêu cầu hủy / Đã xác nhận hủy)
    // ===========================================================
    let specialBanner = $('specialStatusBanner');
    if (specialBanner) {
        if (st === 8) {
            specialBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; background: linear-gradient(135deg,#fff7ed,#ffedd5); border:1.5px solid #fed7aa; border-radius:10px; padding:14px 18px;">
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
        } else if (st === 7) {
            specialBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; background: linear-gradient(135deg,#fef2f2,#fee2e2); border:1.5px solid #fecaca; border-radius:10px; padding:14px 18px;">
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
    }

    // ============================================================
    // TIMELINE RENDERING (2 bước khi Hủy / Yêu cầu hủy, 6 bước khi Bình thường)
    // ============================================================
    const timelineWrapper = $('timelineWrapper');
    const isCancelled = (st === 7 || st === 8);

    if (timelineWrapper) {
        if (isCancelled) {
            // ==========================================
            // CHẾ ĐỘ HỦY: CHỈ HIỆN 2 BƯỚC: "Chờ xác nhận" -> "Xác nhận huỷ" / "Yêu cầu huỷ"
            // ==========================================
            let cancelTime = '';
            if (history && Array.isArray(history)) {
                const cancelEntry = history.find(h => {
                    const act = (h.hanhDong || '').toLowerCase();
                    const note = (h.ghiChu || '').toLowerCase();
                    return act.includes('hủy') || note.includes('hủy');
                });
                if (cancelEntry && cancelEntry.ngayTao) {
                    cancelTime = formatDate(cancelEntry.ngayTao);
                }
            }
            if (!cancelTime) {
                cancelTime = formatDate(inv.ngayCapNhat || inv.ngayTao);
            }
            const orderTime = inv.ngayTao ? formatDate(inv.ngayTao) : '--:--:-- --/--/----';
            const isRequestCancel = (st === 8);

            timelineWrapper.className = 'timeline-6steps-wrap timeline-cancelled-wrap';
            timelineWrapper.style.maxWidth = '560px';
            timelineWrapper.style.margin = '10px auto 0 auto';
            timelineWrapper.innerHTML = `
                <div class="timeline-6steps-line" style="left: 17.5%; right: 17.5%; top: 33px;"></div>
                <div class="timeline-6steps-line-active" style="left: 17.5%; width: 65%; max-width: 65%; top: 33px; background: ${isRequestCancel ? '#f59e0b' : '#ef4444'};"></div>

                <!-- Step 1: Chờ xác nhận -->
                <div class="timeline-step-col step-ordered completed" style="width: 35%;">
                    <div class="timeline-circle" style="background: #10b981; border-color: #10b981; color: #ffffff; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                        <i data-lucide="clock" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div class="timeline-step-name" style="color: #0f172a; font-weight: 800;">Chờ xác nhận</div>
                    <div class="timeline-step-date" style="color: #64748b;">${orderTime}</div>
                </div>

                <!-- Step 2: Xác nhận huỷ / Yêu cầu huỷ -->
                <div class="timeline-step-col ${isRequestCancel ? 'step-request-cancel active' : 'step-cancelled completed'}" style="width: 35%;">
                    <div class="timeline-circle" style="background: ${isRequestCancel ? '#f59e0b' : '#ef4444'}; border-color: ${isRequestCancel ? '#f59e0b' : '#ef4444'}; color: #ffffff; box-shadow: 0 4px 14px ${isRequestCancel ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'};">
                        <i data-lucide="${isRequestCancel ? 'alert-circle' : 'x-circle'}" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div class="timeline-step-name" style="color: ${isRequestCancel ? '#ea580c' : '#dc2626'}; font-weight: 800;">
                        ${isRequestCancel ? 'Yêu cầu huỷ (Chờ duyệt)' : 'Xác nhận huỷ'}
                    </div>
                    <div class="timeline-step-date" style="color: #64748b;">${cancelTime}</div>
                </div>
            `;
            if (window.lucide && lucide.createIcons) {
                lucide.createIcons();
            }
        } else {
            // ==========================================
            // CHẾ ĐỘ BÌNH THƯỜNG: 6 BƯỚC TIÊU CHUẨN
            // ==========================================
            timelineWrapper.className = 'timeline-6steps-wrap';
            timelineWrapper.style.maxWidth = '';
            timelineWrapper.style.margin = '';

            const stepTimes = {
                0: inv.ngayTao ? formatDate(inv.ngayTao) : '',
                1: '',
                2: '',
                3: '',
                4: '',
                5: ''
            };

            if (history && Array.isArray(history)) {
                const chronoHistory = [...history].reverse();
                chronoHistory.forEach(h => {
                    const act = (h.hanhDong || '').toLowerCase();
                    const note = (h.ghiChu || '').toLowerCase();
                    const dateStr = formatDate(h.ngayTao);

                    if (act.includes('tạo') || note.includes('tạo')) {
                        stepTimes[0] = dateStr;
                    } else if (act.includes('xác nhận') || note.includes('đã xác nhận') || note.includes('sang: đã xác nhận')) {
                        stepTimes[1] = dateStr;
                    } else if (act.includes('lấy hàng') || note.includes('chờ lấy hàng') || note.includes('đang xử lý')) {
                        stepTimes[2] = dateStr;
                    } else if (act.includes('giao hàng') || note.includes('đang giao')) {
                        stepTimes[3] = dateStr;
                    } else if (act.includes('đã giao') || note.includes('đã giao')) {
                        stepTimes[4] = dateStr;
                    } else if (act.includes('hoàn thành') || note.includes('hoàn thành')) {
                        stepTimes[5] = dateStr;
                    }
                });
            }

            if (st === 6 && !stepTimes[5] && (inv.ngayThanhToan || inv.ngayCapNhat)) {
                stepTimes[5] = formatDate(inv.ngayThanhToan || inv.ngayCapNhat);
            }

            let maxCompletedIdx = -1;
            if (st === 0) maxCompletedIdx = 0;
            else if (st === 1) maxCompletedIdx = 1;
            else if (st === 2) maxCompletedIdx = 2;
            else if (st === 3) maxCompletedIdx = 3;
            else if (st === 4) maxCompletedIdx = 4;
            else if (st === 6) maxCompletedIdx = 5;

            const activePct = maxCompletedIdx > 0 ? (maxCompletedIdx / 5) * 85 : 0;

            timelineWrapper.innerHTML = `
                <div class="timeline-6steps-line"></div>
                <div class="timeline-6steps-line-active" id="timelineConnectorActive" style="left: 7.5%; width: ${activePct}%; max-width: 85%; background: #ef4444;"></div>

                <!-- Step 0: Chờ xác nhận -->
                <div class="timeline-step-col ${maxCompletedIdx >= 0 ? 'completed' : ''}" id="stepCol0">
                    <div class="timeline-circle" id="circleStep0"><i data-lucide="clock" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep0">Chờ xác nhận</div>
                    <div class="timeline-step-date" id="dateStep0">${stepTimes[0]}</div>
                </div>

                <!-- Step 1: Đã xác nhận -->
                <div class="timeline-step-col ${maxCompletedIdx >= 1 ? 'completed' : ''}" id="stepCol1">
                    <div class="timeline-circle" id="circleStep1"><i data-lucide="file-check" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep1">Đã xác nhận</div>
                    <div class="timeline-step-date" id="dateStep1">${stepTimes[1]}</div>
                </div>

                <!-- Step 2: Chờ lấy hàng -->
                <div class="timeline-step-col ${maxCompletedIdx >= 2 ? 'completed' : ''}" id="stepCol2">
                    <div class="timeline-circle" id="circleStep2"><i data-lucide="package" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep2">Chờ lấy hàng</div>
                    <div class="timeline-step-date" id="dateStep2">${stepTimes[2]}</div>
                </div>

                <!-- Step 3: Đang giao hàng -->
                <div class="timeline-step-col ${maxCompletedIdx >= 3 ? 'completed' : ''}" id="stepCol3">
                    <div class="timeline-circle" id="circleStep3"><i data-lucide="truck" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep3">Đang giao hàng</div>
                    <div class="timeline-step-date" id="dateStep3">${stepTimes[3]}</div>
                </div>

                <!-- Step 4: Đã giao hàng -->
                <div class="timeline-step-col ${maxCompletedIdx >= 4 ? 'completed' : ''}" id="stepCol4">
                    <div class="timeline-circle" id="circleStep4"><i data-lucide="check" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep4">Đã giao hàng</div>
                    <div class="timeline-step-date" id="dateStep4">${stepTimes[4]}</div>
                </div>

                <!-- Step 5: Hoàn thành -->
                <div class="timeline-step-col ${maxCompletedIdx >= 5 ? 'completed' : ''}" id="stepCol5">
                    <div class="timeline-circle" id="circleStep5"><i data-lucide="check-circle-2" style="width: 20px; height: 20px;"></i></div>
                    <div class="timeline-step-name" id="nameStep5">Hoàn thành</div>
                    <div class="timeline-step-date" id="dateStep5">${stepTimes[5]}</div>
                </div>
            `;
            if (window.lucide && lucide.createIcons) {
                lucide.createIcons();
            }
        }
    }

    // ============================================================
    // ACTION BUTTONS (Đánh giá sản phẩm, Yêu cầu trả hàng...)
    // ============================================================
    const actionsBar = $('detailActionButtonsWrap');
    if (actionsBar) {
        actionsBar.innerHTML = '';

        if (st === 6) {
            // ĐƠN HOÀN THÀNH: Nút Đánh giá sản phẩm & Nút Mua Lại
            const cachedInfo = _danhGiaCache[inv.id];
            const isAlreadyReviewed = cachedInfo === true || (cachedInfo && (cachedInfo.daDanhGia === true || typeof cachedInfo === 'number'));
            const stars = (cachedInfo && cachedInfo.soSao) ? cachedInfo.soSao : ((typeof cachedInfo === 'number') ? cachedInfo : 5);
            const starsText = isAlreadyReviewed ? ('⭐'.repeat(stars) + ' Đã đánh giá') : '★ Đánh giá sản phẩm';

            actionsBar.innerHTML = `
                <button class="btn-action-review-main ${isAlreadyReviewed ? 'btn-reviewed' : ''}" 
                        id="btnDetailReview" 
                        onclick="${isAlreadyReviewed ? `showToast('Bạn đã đánh giá đơn hàng này ${stars} sao rồi!', 'info')` : `openDanhGiaModal(${inv.id}, '${ma}')`}">
                    ${starsText}
                </button>
                <a href="/client/san-pham" class="btn-action-return-main" style="text-decoration:none; color:#1e293b; border-color:#e2e8f0; background:#f8fafc;">
                    Mua Lại
                </a>
            `;

            // Kiểm tra trạng thái đánh giá bất đồng bộ nếu chưa cache
            if (!isAlreadyReviewed) {
                safeFetchJson(`/api/auth/danh-gia/check/${inv.id}`).then(check => {
                    if (check && check.daDanhGia) {
                        const checkedStars = check.soSao || 5;
                        _danhGiaCache[inv.id] = { daDanhGia: true, soSao: checkedStars };
                        const btn = $('btnDetailReview');
                        if (btn) {
                            btn.innerHTML = '⭐'.repeat(checkedStars) + ' Đã đánh giá';
                            btn.classList.add('btn-reviewed');
                            btn.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${checkedStars} sao rồi!`, 'info');
                        }
                    }
                }).catch(() => {});
            }
        } else if (st === 0) {
            // ĐƠN CHỜ XÁC NHẬN: Nút Hủy đơn
            actionsBar.innerHTML = `
                <button class="btn-action-cancel-main" onclick="requestCancelOrder(${inv.id}, '${ma}')">
                    ✕ Hủy đơn hàng
                </button>
            `;
        } else if (st === 4) {
            // ĐÃ GIAO HÀNG
            actionsBar.innerHTML = `
                <a href="/client/san-pham" class="btn-action-review-main" style="text-decoration:none;">
                    Mua Lại
                </a>
            `;
        } else if (st === 7 || st === 8) {
            // ĐÃ HỦY / YÊU CẦU HỦY
            actionsBar.innerHTML = `
                <a href="/client/san-pham" class="btn-action-review-main" style="text-decoration:none;">
                    Mua Lại
                </a>
            `;
        }
    }

    // ============================================================
    // THÔNG TIN NHẬN HÀNG
    // ============================================================
    const recipientName = inv.tenNguoiNhan || inv.tenKhachHang || inv.nguoiTao || 'Khách lẻ';
    const recipientPhone = inv.sdtNguoiNhan || inv.sdtKhachHang || 'N/A';
    $('lblResultName').textContent = recipientName;
    $('lblResultPhone').textContent = recipientPhone;
    $('lblResultAddress').textContent = inv.diaChiGiao || inv.diaChiNhan || 'Nhận tại quầy';

    let emailToShow = inv.email;
    if (!emailToShow && inv.ghiChu) {
        const matches = inv.ghiChu.match(/\|\s*email\s*:\s*([^\s|]+)/i);
        if (matches && matches[1]) emailToShow = matches[1].trim();
    }
    if (!emailToShow && $('inputContact')) {
        emailToShow = $('inputContact').value.trim();
    }
    const emailWrap = $('lblResultEmailWrap');
    if (emailWrap) {
        if (emailToShow) {
            $('lblResultEmail').textContent = emailToShow;
            emailWrap.style.display = 'block';
        } else {
            emailWrap.style.display = 'none';
        }
    }

    // Hiển thị ghi chú nếu có
    const ghiChuWrap = $('lblResultGhiChuWrap');
    const ghiChuEl = $('lblResultGhiChu');
    let cleanNote = (inv.ghiChu || '').replace(/\|\s*EMAIL:[^|]+/i, '').trim();
    if (ghiChuWrap && ghiChuEl) {
        if (cleanNote) {
            ghiChuEl.textContent = cleanNote;
            ghiChuWrap.style.display = 'block';
        } else {
            ghiChuWrap.style.display = 'none';
        }
    }

    // Nút Sửa thông tin: chỉ cho phép sửa khi đơn hàng đang Chờ xác nhận (trangThai === 0)
    // VÀ khách hàng chưa từng chỉnh sửa thông tin lần nào (soLanSuaThongTin < 1)
    // Đối với những đơn hàng đã sửa thông tin rồi thì biến mất nút sửa thông tin
    const btnEditShip = $('btnEditShippingInfo');
    if (btnEditShip) {
        const editCount = (inv.soLanSuaThongTin != null) ? parseInt(inv.soLanSuaThongTin) : 0;
        const hasHistoryEdit = Array.isArray(history) && history.some(h => (h.hanhDong || '').toLowerCase().includes('cập nhật thông tin nhận hàng'));
        const isAlreadyEdited = (editCount >= 1) || hasHistoryEdit;
        const canEdit = (inv.trangThai === 0) && !isAlreadyEdited;
        btnEditShip.style.display = canEdit ? 'inline-flex' : 'none';
    }

    // ============================================================
    // SẢN PHẨM LIST
    // ============================================================
    const itemsList = $('resultItemsList');
    if (items && items.length > 0) {
        itemsList.innerHTML = items.map(item => {
            const itemTotal = parseFloat(item.thanhTien) || ((parseFloat(item.donGia) || 0) * (item.soLuong || 1));
            return `
                <div class="detail-product-row">
                    <div class="detail-prod-left">
                        <img src="${item.hinhAnh || '/images/logo.png'}" 
                             alt="${escapeHtml(item.tenSanPham)}" 
                             class="detail-prod-img" 
                             onerror="this.src='/images/logo.png'">
                        <div>
                            <div class="detail-prod-title">${escapeHtml(item.tenSanPham || 'Giày Sneaker VHOES')}</div>
                            <div class="detail-prod-variant">${escapeHtml(item.mauSac || 'Tiêu chuẩn')} · Size ${escapeHtml(item.coGiay || '40')} · x${item.soLuong || 1}</div>
                            <div class="detail-prod-price">${formatPrice(item.donGia || item.thanhTien)}</div>
                        </div>
                    </div>
                    <div>
                        <div class="detail-prod-total">${formatPrice(itemTotal)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        itemsList.innerHTML = `
            <div class="detail-product-row">
                <div class="detail-prod-left">
                    <img src="/images/logo.png" alt="Sản phẩm" class="detail-prod-img">
                    <div>
                        <div class="detail-prod-title">Sản phẩm đơn hàng #${ma}</div>
                        <div class="detail-prod-variant">Tiêu chuẩn · x${inv.soLuong || 1}</div>
                        <div class="detail-prod-price">${formatPrice(inv.tongTien)}</div>
                    </div>
                </div>
                <div>
                    <div class="detail-prod-total">${formatPrice(inv.tongTien)}</div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // THANH TOÁN
    // ============================================================
    let subtotal = (items && items.length > 0)
        ? items.reduce((s, i) => s + (parseFloat(i.thanhTien) || 0), 0)
        : (parseFloat(inv.tongTien) || 0);

    const ship = parseFloat(inv.phiShip) || 0;
    const discount = parseFloat(inv.tienGiam) || 0;
    let total = parseFloat(inv.tongTien) || 0;

    if (total === 0 && subtotal > 0) {
        total = Math.max(0, subtotal + ship - discount);
    }

    $('lblResultSubtotal').textContent = formatPrice(subtotal);
    $('lblResultShipping').textContent = formatPrice(ship);
    $('lblResultTotal').textContent = formatPrice(total);

    // Xử lý hiển thị dòng Giảm giá (Phiếu giảm giá / Voucher)
    const rowDiscount = $('rowResultDiscount');
    const badgeVoucher = $('lblResultVoucherBadge');
    const lblDiscount = $('lblResultDiscount');

    if (discount > 0 || (inv.tenVoucher && inv.tenVoucher.trim()) || (inv.maVoucher && inv.maVoucher.trim())) {
        if (rowDiscount) rowDiscount.style.display = 'flex';
        if (lblDiscount) lblDiscount.textContent = `-${formatPrice(discount)}`;

        if (badgeVoucher) {
            let vName = '';
            if (inv.tenVoucher && inv.maVoucher) {
                vName = `${inv.maVoucher} · ${inv.tenVoucher}`;
            } else if (inv.tenVoucher) {
                vName = inv.tenVoucher;
            } else if (inv.maVoucher) {
                vName = inv.maVoucher;
            } else {
                vName = 'Phiếu giảm giá';
            }
            badgeVoucher.innerHTML = `🎟️ ${escapeHtml(vName)}`;
            badgeVoucher.style.display = 'inline-flex';
        }
    } else {
        // Nếu không có giảm giá -> Ẩn hoàn toàn dòng này
        if (rowDiscount) rowDiscount.style.display = 'none';
    }

    // Refresh Lucide icons inside result card
    if (window.lucide && lucide.createIcons) lucide.createIcons();
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
            
            if (orders && orders.length > 0) {
                // Ẩn form tìm kiếm, hiển thị danh sách
                const searchCard = $('trackSearchCard');
                if (searchCard) searchCard.style.display = 'none';
                
                const btnBack = $('btnBackToOrdersList');
                if (btnBack) {
                    btnBack.style.display = 'inline-flex';
                    btnBack.setAttribute('data-origin', 'user');
                }
            }
            
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
    
    state.userInvoices = invoices || [];
    if (!state.currentOrderTab) state.currentOrderTab = 'all';
    if (!state.trackCurrentPage) state.trackCurrentPage = 1;
    state.trackPageSize = 8;

    if (!invoices || invoices.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: var(--shadow-sm);">
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

    const tabsConfig = [
        { key: 'all', label: 'Tất cả' },
        { key: '0', label: 'Chờ xác nhận' },
        { key: '1', label: 'Đã xác nhận' },
        { key: '2', label: 'Chờ lấy hàng' },
        { key: 'shipping', label: 'Đang giao hàng' },
        { key: 'completed', label: 'Hoàn thành' },
        { key: 'cancelled', label: 'Đã hủy' },
        { key: 'return', label: 'Trả hàng/Hoàn tiền' }
    ];

    // Tính count cho mỗi tab
    const tabCounts = {};
    tabsConfig.forEach(tab => {
        tabCounts[tab.key] = getFilteredInvoices(invoices, tab.key).length;
    });

    container.innerHTML = `
        <div style="margin-top: 10px;">
            <!-- Title matching Image -->
            <h2 class="orders-ref-heading">Đơn hàng của bạn</h2>

            <!-- Filter Tabs matching Image -->
            <div class="track-tabs-bar" id="trackTabsBar">
                ${tabsConfig.map(tab => {
                    const cnt = tabCounts[tab.key];
                    const countBadge = cnt > 0 ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;background:${state.currentOrderTab===tab.key?'#ef4444':'#e2e8f0'};color:${state.currentOrderTab===tab.key?'#fff':'#64748b'};border-radius:9px;font-size:11px;font-weight:700;padding:0 5px;margin-left:5px;">${cnt}</span>` : '';
                    return `
                    <button class="track-tab-btn ${state.currentOrderTab === tab.key ? 'active' : ''}" 
                            data-tab="${tab.key}" 
                            onclick="switchTrackTab('${tab.key}')">
                        ${tab.label}${countBadge}
                    </button>
                `}).join('')}
            </div>

            <!-- List Items Container -->
            <div id="trackOrdersItemsWrapper" style="display:flex; flex-direction:column;"></div>

            <!-- Pagination Container -->
            <div id="trackPaginationWrapper"></div>
        </div>
    `;
    container.style.display = 'block';
    
    renderTrackTabContent();
}

function renderTrackTabContent() {
    const wrapper = $('trackOrdersItemsWrapper');
    const paginationWrapper = $('trackPaginationWrapper');
    if (!wrapper || !state.userInvoices) return;

    const filtered = getFilteredInvoices(state.userInvoices, state.currentOrderTab);
    const totalItems = filtered.length;
    const pageSize = state.trackPageSize || 8;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (state.trackCurrentPage > totalPages) {
        state.trackCurrentPage = totalPages;
    }
    if (state.trackCurrentPage < 1) {
        state.trackCurrentPage = 1;
    }

    const startIdx = (state.trackCurrentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + pageSize);

    wrapper.innerHTML = renderTrackOrdersListHtml(pageItems);

    if (paginationWrapper) {
        paginationWrapper.innerHTML = renderPaginationHtml(totalItems, state.trackCurrentPage, pageSize, totalPages);
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

    // Kiểm tra trạng thái đánh giá sau khi render xong
    checkBatchDanhGia(pageItems);
}

function renderPaginationHtml(totalItems, currentPage, pageSize, totalPages) {
    if (totalItems <= 0) return '';
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    if (totalPages <= 1) {
        return `
            <div class="track-pagination">
                <div class="track-pagination-info">
                    Hiển thị <strong>${startItem} - ${endItem}</strong> trên tổng số <strong>${totalItems}</strong> đơn hàng
                </div>
            </div>
        `;
    }

    // Build page buttons array with ellipsis
    const pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
    }

    return `
        <div class="track-pagination">
            <div class="track-pagination-info">
                Hiển thị <strong>${startItem} - ${endItem}</strong> trên tổng số <strong>${totalItems}</strong> đơn hàng
            </div>
            <div class="track-pagination-controls">
                <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changeTrackPage(${currentPage - 1})" title="Trang trước">
                    <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
                </button>
                ${pages.map(p => {
                    if (p === '...') {
                        return `<span class="page-dots">...</span>`;
                    }
                    return `
                        <button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changeTrackPage(${p})">
                            ${p}
                        </button>
                    `;
                }).join('')}
                <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changeTrackPage(${currentPage + 1})" title="Trang sau">
                    <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    `;
}

window.changeTrackPage = function(newPage) {
    state.trackCurrentPage = newPage;
    renderTrackTabContent();

    const container = $('userOrdersListContainer');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

window.switchTrackTab = function(tabKey) {
    state.currentOrderTab = tabKey;
    state.trackCurrentPage = 1;
    
    // Update active tab buttons
    const tabBtns = document.querySelectorAll('.track-tab-btn');
    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderTrackTabContent();
};

function getFilteredInvoices(invoices, tabKey) {
    if (!invoices) return [];
    switch (tabKey) {
        case '0':
            return invoices.filter(i => i.trangThai === 0);
        case '1':
            return invoices.filter(i => i.trangThai === 1);
        case '2':
            return invoices.filter(i => i.trangThai === 2);
        case 'shipping':
            return invoices.filter(i => i.trangThai === 3 || i.trangThai === 4 || i.trangThai === 5);
        case 'completed':
            return invoices.filter(i => i.trangThai === 6);
        case 'cancelled':
            return invoices.filter(i => i.trangThai === 7 || i.trangThai === 8);
        case 'return':
            return invoices.filter(i => i.trangThai === 9);
        case 'all':
        default:
            return invoices;
    }
}

function getTabNameByKey(key) {
    switch (key) {
        case '0': return 'Chờ xác nhận';
        case '1': return 'Đã xác nhận';
        case '2': return 'Chờ lấy hàng';
        case 'shipping': return 'Đang giao hàng';
        case 'completed': return 'Hoàn thành';
        case 'cancelled': return 'Đã hủy';
        case 'return': return 'Trả hàng/Hoàn tiền';
        default: return 'Tất cả';
    }
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
const escHtml = escapeHtml;

function renderTrackOrdersListHtml(invoices) {
    if (!invoices || invoices.length === 0) {
        const tabName = getTabNameByKey(state.currentOrderTab);
        return `
            <div style="padding: 40px 20px; text-align: center; color: #94a3b8; background: white; border-radius: 10px; border: 1px solid #e2e8f0;">
                <i data-lucide="inbox" style="width: 44px; height: 44px; margin-bottom: 10px; color: #cbd5e1; display: inline-block;"></i>
                <div style="font-weight: 700; font-size: 15px; color: #64748b;">Không có đơn hàng nào ở trạng thái "${tabName}"</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Hãy chọn các tab trạng thái khác để xem đơn hàng</div>
            </div>
        `;
    }

    return invoices.map(inv => {
        const ma = inv.maHoaDon || ('HD' + inv.id);
        const dateStr = formatDate(inv.ngayTao);
        const st = inv.trangThai;
        const items = (inv.chiTietList && inv.chiTietList.length > 0) ? inv.chiTietList : null;

        return `
            <div class="ref-order-card">
                <!-- Header -->
                <div class="ref-card-header">
                    <div class="ref-card-meta">
                        <span class="label-ma">MÃ ĐƠN HÀNG</span>
                        <span class="val-ma">#${ma}</span>
                        <span class="sep">|</span>
                        <span class="val-date">${dateStr}</span>
                    </div>
                    <div>
                        <span style="font-size: 12.5px; font-weight: 700; background: ${getStatusBgColor(st)}; color: ${getStatusTextColor(st)}; padding: 4px 12px; border-radius: 6px; border: 1px solid ${getStatusBorderColor(st)}; display: inline-block;">
                            ${getStatusName(st)}
                        </span>
                    </div>
                </div>

                <!-- Product Items -->
                <div class="ref-card-body">
                    ${items ? items.map(item => `
                        <div class="ref-product-row">
                            <div class="ref-prod-left">
                                <img src="${item.hinhAnh || '/images/logo.png'}" 
                                     alt="${escapeHtml(item.tenSanPham)}" 
                                     class="ref-prod-thumb" 
                                     onerror="this.src='/images/logo.png'">
                                <div>
                                    <div class="ref-prod-title">${escapeHtml(item.tenSanPham || 'Giày Chạy Bộ VHOES')}</div>
                                    <div class="ref-prod-variant">Phân loại hàng: Màu ${escapeHtml(item.mauSac || 'Tiêu chuẩn')}, Size ${escapeHtml(item.coGiay || '40')}</div>
                                    <div class="ref-prod-qty">x${item.soLuong || 1}</div>
                                </div>
                            </div>
                            <div>
                                <div class="ref-prod-price">${formatPrice(item.donGia || item.thanhTien)}</div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="ref-product-row">
                            <div class="ref-prod-left">
                                <img src="/images/logo.png" alt="Sản phẩm" class="ref-prod-thumb">
                                <div>
                                    <div class="ref-prod-title">Sản phẩm VHOES #${ma}</div>
                                    <div class="ref-prod-variant">Phân loại hàng: Tiêu chuẩn</div>
                                    <div class="ref-prod-qty">x${inv.soLuong || 1}</div>
                                </div>
                            </div>
                            <div>
                                <div class="ref-prod-price">${formatPrice(inv.tongTien)}</div>
                            </div>
                        </div>
                    `}
                </div>

                <!-- Footer -->
                <div class="ref-card-footer">
                    <div>
                        <span class="ref-total-label">Thành tiền:</span>
                        <span class="ref-total-val">${formatPrice(inv.tongTien)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${st === 0 ? `
                            <button class="btn-ref-cancel" onclick="requestCancelOrder(${inv.id}, '${ma}')">Hủy đơn</button>
                        ` : ''}
                        ${st === 6 ? (() => {
                            const cached = _danhGiaCache[inv.id];
                            const daDG = cached === true || (cached && (cached.daDanhGia === true || typeof cached === 'number'));
                            const stars = (cached && cached.soSao) ? cached.soSao : ((typeof cached === 'number') ? cached : 5);
                            if (daDG) {
                                return `
                                    <button class="btn-ref-review btn-ref-reviewed" id="btnDanhGia_${inv.id}" disabled style="background:#f0fdf4; color:#16a34a; border-color:#86efac;" onclick="showToast('Bạn đã đánh giá đơn hàng này ${stars} sao rồi!', 'info')">
                                        ${'⭐'.repeat(stars)} Đã đánh giá
                                    </button>
                                `;
                            }
                            return `
                                <button class="btn-ref-review" id="btnDanhGia_${inv.id}" onclick="openDanhGiaModal(${inv.id}, '${ma}')">
                                    ⭐ Đánh giá
                                </button>
                            `;
                        })() : ''}
                        ${st === 4 ? `
                            <a href="/client/san-pham" class="btn-ref-primary">Mua Lại</a>
                        ` : ''}
                        ${st === 7 || st === 8 ? `
                            <a href="/client/san-pham" class="btn-ref-primary">Mua Lại</a>
                        ` : ''}
                        <button class="btn-ref-detail" onclick="selectInvoice(${inv.id}, true)">
                            Xem chi tiết
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.requestCancelOrder = function(id, code) {
    openCancelOrderModal(id, code, async () => {
        // Refresh detail view if currently open
        if (state.currentInvoice && (state.currentInvoice.id === id || state.currentInvoice.id == id)) {
            await selectInvoice(id, false);
        }
        // Refresh user order list if on orders tab
        if (state.currentUser && state.currentUser.email) {
            const refreshed = await safeFetchJson(`/api/auth/tracking/by-email?email=${encodeURIComponent(state.currentUser.email)}`);
            if (refreshed && Array.isArray(refreshed)) {
                renderUserOrders(refreshed);
            }
        } else {
            const searchInput = $('trackingSearchInput');
            if (searchInput && searchInput.value.trim()) {
                handleSearch(searchInput.value.trim());
            }
        }
    });
};

window.openCancelOrderModal = function(id, code, onCancelledCallback) {
    const existing = document.getElementById('cancelOrderModal');
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
    modal.id = 'cancelOrderModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px; animation: fadeInModal 0.2s ease;
    `;

    modal.innerHTML = `
        <style>
            .com-box {
                background: #ffffff; border-radius: 18px;
                width: 100%; max-width: 520px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.3);
                overflow: hidden; animation: popUpCancel 0.25s cubic-bezier(.34,1.56,.64,1);
            }
            .com-header {
                padding: 18px 24px; border-bottom: 1px solid #fee2e2;
                display: flex; justify-content: space-between; align-items: center;
                background: #fff5f5;
            }
            .com-title {
                font-size: 17px; font-weight: 800; color: #dc2626; margin: 0;
                display: flex; align-items: center; gap: 8px;
            }
            .com-close {
                background: none; border: none; font-size: 18px; color: #94a3b8;
                cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1;
            }
            .com-close:hover { background: #fee2e2; color: #dc2626; }
            .com-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; max-height: calc(85vh - 140px); overflow-y: auto; }
            .com-order-badge {
                background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px;
                padding: 10px 14px; font-size: 13.5px; color: #334155; font-weight: 600;
                display: flex; align-items: center; justify-content: space-between;
            }
            .com-reasons-list { display: flex; flex-direction: column; gap: 8px; }
            .com-reason-option {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
                cursor: pointer; transition: all 0.15s; font-size: 13.5px; font-weight: 600; color: #1e293b;
                user-select: none;
            }
            .com-reason-option:hover {
                border-color: #cbd5e1; background: #f8fafc;
            }
            .com-reason-option.selected {
                border-color: #ef4444; background: #fff5f5; color: #b91c1c;
            }
            .com-reason-option input[type="radio"] {
                accent-color: #ef4444; width: 16px; height: 16px; cursor: pointer;
            }
            .com-textarea {
                width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1;
                border-radius: 10px; font-size: 13.5px; color: #0f172a; outline: none;
                transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
                resize: vertical; min-height: 75px; box-sizing: border-box;
            }
            .com-textarea:focus {
                border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
            }
            .com-footer {
                padding: 16px 24px; border-top: 1px solid #f1f5f9;
                display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;
            }
            .com-btn-back {
                padding: 10px 20px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                background: #fff; color: #64748b; font-size: 13.5px; font-weight: 700;
                cursor: pointer; transition: all 0.15s;
            }
            .com-btn-back:hover { background: #f1f5f9; color: #334155; }
            .com-btn-submit {
                padding: 10px 24px; border-radius: 8px; border: none;
                background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff;
                font-size: 13.5px; font-weight: 800; cursor: pointer; transition: all 0.15s;
                box-shadow: 0 4px 14px rgba(239,68,68,0.35);
            }
            .com-btn-submit:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); transform: translateY(-1px); }
            .com-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            @keyframes popUpCancel { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
        </style>
        <div class="com-box">
            <div class="com-header">
                <div class="com-title">
                    <span>⚠️ Xác nhận hủy đơn hàng</span>
                </div>
                <button class="com-close" onclick="document.getElementById('cancelOrderModal').remove()">✕</button>
            </div>
            <div class="com-body">
                <div class="com-order-badge">
                    <span>Mã đơn hàng: <strong style="color:#00adef;">#${escapeHtml(code || String(id))}</strong></span>
                    <span style="font-size: 12px; color: #ef4444; font-weight: 700;">Không thể hoàn tác</span>
                </div>
                
                <div>
                    <label style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; display: block;">
                        Vui lòng chọn lý do hủy đơn: <span style="color: #ef4444;">*</span>
                    </label>
                    <div class="com-reasons-list">
                        ${reasons.map((r, idx) => `
                            <label class="com-reason-option ${idx === 0 ? 'selected' : ''}" onclick="selectCancelReasonOption(this, '${escapeHtml(r)}')">
                                <input type="radio" name="cancelReasonRadio" value="${escapeHtml(r)}" ${idx === 0 ? 'checked' : ''}>
                                <span>${escapeHtml(r)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div id="customReasonWrapper" style="display: none;">
                    <label style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; display: block;">
                        Nhập lý do khác / Chi tiết: <span style="color: #ef4444;">*</span>
                    </label>
                    <textarea id="comCustomReasonInput" class="com-textarea" placeholder="Vui lòng nêu rõ lý do bạn muốn hủy đơn hàng này..."></textarea>
                </div>
            </div>
            <div class="com-footer">
                <button class="com-btn-back" onclick="document.getElementById('cancelOrderModal').remove()">Quay lại</button>
                <button class="com-btn-submit" id="comBtnSubmit" onclick="submitCancelOrderModal(${id}, '${escapeHtml(code || String(id))}')">
                    ✕ Xác nhận hủy đơn
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal._onCancelled = onCancelledCallback;
};

window.selectCancelReasonOption = function(labelEl, reasonValue) {
    const modal = document.getElementById('cancelOrderModal');
    if (!modal) return;
    modal.querySelectorAll('.com-reason-option').forEach(el => el.classList.remove('selected'));
    labelEl.classList.add('selected');
    const radio = labelEl.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    const customWrapper = document.getElementById('customReasonWrapper');
    const customInput = document.getElementById('comCustomReasonInput');
    if (reasonValue === "Lý do khác") {
        if (customWrapper) customWrapper.style.display = 'block';
        if (customInput) customInput.focus();
    } else {
        if (customWrapper) customWrapper.style.display = 'none';
    }
};

window.submitCancelOrderModal = async function(id, code) {
    const modal = document.getElementById('cancelOrderModal');
    if (!modal) return;

    const selectedRadio = modal.querySelector('input[name="cancelReasonRadio"]:checked');
    if (!selectedRadio) {
        alert('Vui lòng chọn một lý do hủy đơn hàng!');
        return;
    }

    let finalReason = selectedRadio.value;
    if (finalReason === "Lý do khác") {
        const customInput = document.getElementById('comCustomReasonInput');
        const customVal = customInput ? customInput.value.trim() : '';
        if (!customVal) {
            alert('Vui lòng nhập chi tiết lý do hủy đơn hàng!');
            if (customInput) customInput.focus();
            return;
        }
        finalReason = customVal;
    }

    const btnSubmit = document.getElementById('comBtnSubmit');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang xử lý hủy...';
    }

    try {
        const res = await fetch(`/api/auth/tracking/cancel/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: finalReason })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            modal.remove();
            showToast(data.message || 'Đã hủy đơn hàng thành công!', 'success');
            if (typeof modal._onCancelled === 'function') {
                modal._onCancelled();
            }
        } else {
            alert(data.message || 'Không thể hủy đơn hàng!');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = '✕ Xác nhận hủy đơn';
            }
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối máy chủ! Vui lòng thử lại sau.');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = '✕ Xác nhận hủy đơn';
        }
    }
};

function getStatusBgColor(status) {
    switch (status) {
        case 0: return 'rgba(234, 179, 8, 0.1)'; // Chờ xác nhận
        case 1: return 'rgba(59, 130, 246, 0.1)'; // Đã xác nhận
        case 2: return 'rgba(99, 102, 241, 0.1)'; // Chờ giao hàng
        case 3: return 'rgba(16, 185, 129, 0.1)'; // Đang giao hàng
        case 4: return 'rgba(16, 185, 129, 0.1)'; // Đã giao
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

// ============================================================
// ĐÁNH GIÁ SẢN PHẨM
// ============================================================

/** Cache trạng thái đã đánh giá theo hoaDonId */
const _danhGiaCache = {};

/**
 * Mở modal đánh giá. Kiểm tra server xem đã đánh giá chưa trước khi mở.
 */
window.openDanhGiaModal = async function(hoaDonId, maHoaDon) {
    const btn = document.getElementById('btnDanhGia_' + hoaDonId);
    const cached = _danhGiaCache[hoaDonId];
    const isCached = cached === true || (cached && (cached.daDanhGia === true || typeof cached === 'number'));

    if (isCached) {
        const stars = (cached && cached.soSao) ? cached.soSao : ((typeof cached === 'number') ? cached : 5);
        showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Đang kiểm tra...'; }

    try {
        const check = await safeFetchJson(`/api/auth/danh-gia/check/${hoaDonId}`);
        if (check && check.daDanhGia) {
            const stars = check.soSao || 5;
            _danhGiaCache[hoaDonId] = { daDanhGia: true, soSao: stars };
            if (btn) {
                btn.innerHTML = '⭐'.repeat(stars) + ' Đã đánh giá';
                btn.disabled = true;
                btn.style.background = '#f0fdf4';
                btn.style.color = '#16a34a';
                btn.style.borderColor = '#86efac';
                btn.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
            }
            const btnDetail = $('btnDetailReview');
            if (btnDetail) {
                btnDetail.innerHTML = '⭐'.repeat(stars) + ' Đã đánh giá';
                btnDetail.classList.add('btn-reviewed');
                btnDetail.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
            }
            showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
            return;
        }
    } catch (e) {
        console.warn('Không kiểm tra được trạng thái đánh giá:', e);
    } finally {
        if (btn && btn.disabled && !(_danhGiaCache[hoaDonId]?.daDanhGia)) {
            btn.disabled = false;
            btn.innerHTML = '⭐ Đánh giá';
        }
    }

    _showDanhGiaModal(hoaDonId, maHoaDon);
};

function _showDanhGiaModal(hoaDonId, maHoaDon) {
    const existingModal = document.getElementById('danhGiaModal');
    if (existingModal) existingModal.remove();

    const displayCode = maHoaDon || ('HD' + hoaDonId);

    const modal = document.createElement('div');
    modal.id = 'danhGiaModal';
    modal.innerHTML = `
        <style>
            #danhGiaModal {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(4px);
                animation: fadeInModal 0.2s ease;
                padding: 16px;
            }
            @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
            .dg-modal-box {
                background: #fff;
                border-radius: 18px;
                width: min(520px, 100%);
                max-height: calc(100vh - 32px);
                display: flex; flex-direction: column;
                box-shadow: 0 24px 64px rgba(0,0,0,0.22);
                animation: slideUpModal 0.25s ease;
                overflow: hidden;
            }
            @keyframes slideUpModal { from { transform: translateY(28px); opacity:0; } to { transform: translateY(0); opacity:1; } }
            .dg-header {
                padding: 18px 22px 14px;
                border-bottom: 1px solid #f1f5f9;
                display: flex; align-items: flex-start; justify-content: space-between;
                flex-shrink: 0;
            }
            .dg-title { font-size: 17px; font-weight: 800; color: #1e293b; }
            .dg-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
            .dg-close {
                width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
                background: #f8fafc; border: none; cursor: pointer;
                font-size: 16px; color: #94a3b8;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.15s; margin-left: 12px;
            }
            .dg-close:hover { background: #f1f5f9; color: #475569; }
            .dg-body {
                padding: 18px 22px;
                overflow-y: auto;
                flex: 1;
            }
            /* Stars */
            .dg-star-row {
                display: flex; justify-content: center; gap: 8px;
                margin-bottom: 6px;
            }
            .dg-star {
                font-size: 36px; cursor: pointer; transition: transform 0.15s;
                line-height: 1; user-select: none;
                filter: grayscale(1) opacity(0.3);
            }
            .dg-star:hover, .dg-star.active { filter: none; transform: scale(1.18); }
            .dg-star-label {
                text-align: center; font-size: 13px; font-weight: 600;
                color: #f59e0b; margin-bottom: 14px; min-height: 18px;
            }
            /* Textarea */
            .dg-textarea {
                width: 100%; box-sizing: border-box;
                border: 1.5px solid #e2e8f0; border-radius: 10px;
                padding: 11px 13px; font-size: 13.5px; font-family: inherit;
                color: #1e293b; resize: vertical; min-height: 80px;
                transition: border-color 0.2s; margin-bottom: 14px;
            }
            .dg-textarea:focus { outline: none; border-color: #f59e0b; }
            .dg-textarea::placeholder { color: #94a3b8; }
            /* Image upload zone */
            .dg-img-section { margin-bottom: 4px; }
            .dg-img-label {
                font-size: 12.5px; font-weight: 700; color: #475569;
                margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
            }
            .dg-img-label span { color: #94a3b8; font-weight: 400; }
            .dg-drop-zone {
                border: 2px dashed #e2e8f0; border-radius: 12px;
                padding: 16px; text-align: center; cursor: pointer;
                transition: all 0.2s; background: #fafafa;
                position: relative;
            }
            .dg-drop-zone:hover, .dg-drop-zone.drag-over {
                border-color: #f59e0b; background: #fffbeb;
            }
            .dg-drop-zone input[type=file] {
                position: absolute; inset: 0; opacity: 0;
                cursor: pointer; width: 100%; height: 100%;
            }
            .dg-drop-icon { font-size: 28px; margin-bottom: 4px; }
            .dg-drop-text { font-size: 13px; color: #64748b; }
            .dg-drop-text strong { color: #f59e0b; }
            .dg-drop-hint { font-size: 11px; color: #94a3b8; margin-top: 3px; }
            /* Preview grid */
            .dg-preview-grid {
                display: flex; flex-wrap: wrap; gap: 8px;
                margin-top: 10px;
            }
            .dg-preview-item {
                position: relative; width: 72px; height: 72px;
                border-radius: 8px; overflow: hidden;
                border: 1.5px solid #e2e8f0;
                background: #f8fafc;
                flex-shrink: 0;
            }
            .dg-preview-item img {
                width: 100%; height: 100%; object-fit: cover; display: block;
            }
            .dg-preview-remove {
                position: absolute; top: 2px; right: 2px;
                width: 18px; height: 18px; border-radius: 50%;
                background: rgba(0,0,0,0.55); color: #fff;
                border: none; cursor: pointer; font-size: 11px;
                display: flex; align-items: center; justify-content: center;
                transition: background 0.15s; line-height: 1;
            }
            .dg-preview-remove:hover { background: #ef4444; }
            .dg-img-counter {
                font-size: 11.5px; color: #94a3b8; margin-top: 6px;
                text-align: right;
            }
            /* Footer */
            .dg-footer {
                padding: 14px 22px;
                border-top: 1px solid #f1f5f9;
                display: flex; justify-content: flex-end; gap: 10px;
                flex-shrink: 0;
            }
            .dg-btn-cancel {
                padding: 9px 18px; border-radius: 8px;
                border: 1.5px solid #e2e8f0; background: #fff;
                color: #64748b; font-size: 13.5px; font-weight: 600;
                cursor: pointer; transition: all 0.15s;
            }
            .dg-btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }
            .dg-btn-submit {
                padding: 9px 22px; border-radius: 8px;
                border: none; background: #f59e0b;
                color: #fff; font-size: 13.5px; font-weight: 700;
                cursor: pointer; transition: all 0.15s;
                display: flex; align-items: center; gap: 6px;
            }
            .dg-btn-submit:hover { background: #d97706; }
            .dg-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        </style>
        <div class="dg-modal-box">
            <div class="dg-header">
                <div>
                    <div class="dg-title">⭐ Đánh giá sản phẩm</div>
                    <div class="dg-subtitle">#${displayCode} — Cảm ơn bạn đã tin tưởng VHOES!</div>
                </div>
                <button class="dg-close" onclick="document.getElementById('danhGiaModal').remove()">✕</button>
            </div>
            <div class="dg-body">
                <!-- Stars -->
                <div class="dg-star-row" id="dgStarRow">
                    <span class="dg-star" data-val="1">⭐</span>
                    <span class="dg-star" data-val="2">⭐</span>
                    <span class="dg-star" data-val="3">⭐</span>
                    <span class="dg-star" data-val="4">⭐</span>
                    <span class="dg-star" data-val="5">⭐</span>
                </div>
                <div class="dg-star-label" id="dgStarLabel">Tuyệt vời! 🤩</div>

                <!-- Textarea -->
                <textarea class="dg-textarea" id="dgNoiDung"
                          placeholder="Chia sẻ cảm nhận của bạn về chất lượng sản phẩm, độ vừa vặn..."></textarea>

                <!-- Image upload -->
                <div class="dg-img-section">
                    <div class="dg-img-label">
                        📷 Thêm ảnh <span>(tối đa 5 ảnh, mỗi ảnh ≤ 5MB)</span>
                    </div>
                    <div class="dg-drop-zone" id="dgDropZone">
                        <input type="file" id="dgFileInput" accept="image/*" multiple>
                        <div class="dg-drop-icon">🖼️</div>
                        <div class="dg-drop-text">
                            <strong>Nhấn để chọn ảnh</strong> hoặc kéo thả vào đây
                        </div>
                        <div class="dg-drop-hint">JPG, PNG, WEBP — tối đa 5MB mỗi ảnh</div>
                    </div>
                    <div class="dg-preview-grid" id="dgPreviewGrid"></div>
                    <div class="dg-img-counter" id="dgImgCounter"></div>
                </div>
            </div>
            <div class="dg-footer">
                <button class="dg-btn-cancel" onclick="document.getElementById('danhGiaModal').remove()">Huỷ</button>
                <button class="dg-btn-submit" id="dgBtnSubmit" onclick="submitDanhGia(${hoaDonId})">
                    ⭐ Gửi đánh giá
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ── Close backdrop ──
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // ── Stars (default 5 stars) ──
    let selectedStar = 5;
    const starLabels = ['', 'Rất tệ 😞', 'Không hài lòng 😕', 'Bình thường 😐', 'Hài lòng 😊', 'Tuyệt vời! 🤩'];
    const stars  = modal.querySelectorAll('.dg-star');
    const label  = modal.querySelector('#dgStarLabel');

    function applyStars(v) {
        stars.forEach((s, i) => s.classList.toggle('active', i < v));
        if (label) label.textContent = starLabels[v] || '';
    }
    applyStars(5);

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            const v = +star.dataset.val;
            applyStars(v);
        });
        star.addEventListener('mouseleave', () => {
            applyStars(selectedStar);
        });
        star.addEventListener('click', () => {
            selectedStar = +star.dataset.val;
            applyStars(selectedStar);
        });
    });
    modal._selectedStar = () => selectedStar;

    // ── Image upload ──
    const MAX_IMG   = 5;
    const MAX_BYTES = 5 * 1024 * 1024;
    let imageFiles  = []; // { dataUrl, name }

    const fileInput  = modal.querySelector('#dgFileInput');
    const dropZone   = modal.querySelector('#dgDropZone');
    const previewGrid = modal.querySelector('#dgPreviewGrid');
    const counter    = modal.querySelector('#dgImgCounter');

    function updateCounter() {
        if (counter) {
            counter.textContent = imageFiles.length > 0
                ? `${imageFiles.length} / ${MAX_IMG} ảnh đã chọn`
                : '';
        }
        if (dropZone) {
            dropZone.style.display = imageFiles.length >= MAX_IMG ? 'none' : '';
        }
    }

    function renderPreviews() {
        if (!previewGrid) return;
        previewGrid.innerHTML = '';
        imageFiles.forEach((f, idx) => {
            const item = document.createElement('div');
            item.className = 'dg-preview-item';
            item.innerHTML = `
                <img src="${f.dataUrl}" alt="ảnh ${idx+1}">
                <button class="dg-preview-remove" type="button" title="Xoá ảnh">✕</button>
            `;
            item.querySelector('.dg-preview-remove').addEventListener('click', () => {
                imageFiles.splice(idx, 1);
                renderPreviews();
            });
            previewGrid.appendChild(item);
        });
        updateCounter();
    }

    function addFiles(files) {
        for (const file of files) {
            if (imageFiles.length >= MAX_IMG) {
                showToast(`Tối đa ${MAX_IMG} ảnh!`, 'error'); break;
            }
            if (!file.type.startsWith('image/')) {
                showToast(`"${file.name}" không phải ảnh!`, 'error'); continue;
            }
            if (file.size > MAX_BYTES) {
                showToast(`"${file.name}" vượt quá 5MB!`, 'error'); continue;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                imageFiles.push({ dataUrl: e.target.result, name: file.name });
                renderPreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            addFiles(e.dataTransfer.files);
        });
    }

    modal._getImageBase64List = () => imageFiles.map(f => f.dataUrl);
    updateCounter();
}

window.submitDanhGia = async function(hoaDonId) {
    const modal = document.getElementById('danhGiaModal');
    if (!modal) return;

    const soSao = modal._selectedStar ? modal._selectedStar() : 5;
    const noiDung = (modal.querySelector('#dgNoiDung')?.value || '').trim();
    const anhBase64List = modal._getImageBase64List ? modal._getImageBase64List() : [];
    const submitBtn = modal.querySelector('#dgBtnSubmit');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Đang gửi...';
    }

    try {
        const resp = await safeFetchJson('/api/auth/danh-gia/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hoaDonId, soSao, noiDung, anhBase64List })
        });

        if (resp && resp.success) {
            _danhGiaCache[hoaDonId] = { daDanhGia: true, soSao: soSao };

            // Đóng modal
            modal.remove();

            // Cập nhật nút đánh giá ở danh sách đơn
            const btn = document.getElementById('btnDanhGia_' + hoaDonId);
            if (btn) {
                btn.innerHTML = '⭐'.repeat(soSao) + ' Đã đánh giá';
                btn.disabled = true;
                btn.style.background = '#f0fdf4';
                btn.style.color = '#16a34a';
                btn.style.borderColor = '#86efac';
                btn.classList.add('btn-ref-reviewed');
                btn.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${soSao} sao rồi!`, 'info');
            }

            // Cập nhật nút đánh giá ở chi tiết đơn hàng
            const btnDetail = document.getElementById('btnDetailReview');
            if (btnDetail) {
                btnDetail.innerHTML = '⭐'.repeat(soSao) + ' Đã đánh giá';
                btnDetail.classList.add('btn-reviewed');
                btnDetail.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${soSao} sao rồi!`, 'info');
            }

            showToast('🎉 Cảm ơn bạn đã đánh giá sản phẩm!', 'success');
        } else {
            showToast(resp?.error || 'Gửi đánh giá thất bại!', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '⭐ Gửi đánh giá'; }
        }
    } catch (e) {
        showToast(e.message || 'Lỗi kết nối máy chủ!', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '⭐ Gửi đánh giá'; }
    }
};

// Khi render danh sách, check batch trạng thái đánh giá cho tất cả đơn hoàn thành
async function checkBatchDanhGia(invoices) {
    const completedIds = (invoices || [])
        .filter(inv => inv.trangThai === 6)
        .map(inv => inv.id);
    
    if (completedIds.length === 0) return;

    try {
        const result = await safeFetchJson('/api/auth/danh-gia/check-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hoaDonIds: completedIds })
        });

        if (result) {
            Object.keys(result).forEach(id => {
                const item = result[id];
                const daDanhGia = (item === true || (item && item.daDanhGia === true));
                if (daDanhGia) {
                    const stars = (item && item.soSao) ? item.soSao : 5;
                    _danhGiaCache[id] = { daDanhGia: true, soSao: stars };

                    // Cập nhật nút nếu đã render
                    const btn = document.getElementById('btnDanhGia_' + id);
                    if (btn) {
                        btn.innerHTML = '⭐'.repeat(stars) + ' Đã đánh giá';
                        btn.disabled = true;
                        btn.style.background = '#f0fdf4';
                        btn.style.color = '#16a34a';
                        btn.style.borderColor = '#86efac';
                        btn.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
                    }

                    const btnDetail = document.getElementById('btnDetailReview');
                    if (btnDetail && window._currentTrackingInvoice && window._currentTrackingInvoice.id == id) {
                        btnDetail.innerHTML = '⭐'.repeat(stars) + ' Đã đánh giá';
                        btnDetail.classList.add('btn-reviewed');
                        btnDetail.onclick = () => showToast(`Bạn đã đánh giá đơn hàng này ${stars} sao rồi!`, 'info');
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Không check batch đánh giá được:', e);
    }
}

/* ============================================================
   MODAL SỬA THÔNG TIN NHẬN HÀNG
   ============================================================ */
window.openEditShippingModal = function() {
    const inv = state.currentInvoice;
    if (!inv) {
        showToast('Không tìm thấy thông tin đơn hàng!', 'error');
        return;
    }

    if (inv.trangThai !== 0) {
        showToast('Đơn hàng đã được xác nhận hoặc đang xử lý, không thể chỉnh sửa thông tin nhận hàng!', 'warning');
        return;
    }

    if (inv.soLanSuaThongTin && inv.soLanSuaThongTin >= 1) {
        showToast('Quý khách chỉ được thay đổi thông tin một lần', 'warning');
        return;
    }

    const existing = document.getElementById('editShippingModal');
    if (existing) existing.remove();

    const currentName = inv.tenNguoiNhan || inv.tenKhachHang || '';
    const currentPhone = inv.sdtNguoiNhan || inv.sdtKhachHang || '';
    const currentAddress = inv.diaChiGiao || inv.diaChiNhan || '';
    let currentNote = (inv.ghiChu || '').replace(/\|\s*EMAIL:[^|]+/i, '').trim();

    const modal = document.createElement('div');
    modal.id = 'editShippingModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15,23,42,0.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px; animation: fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
        <style>
            .esm-box {
                background: #ffffff; border-radius: 16px;
                width: 100%; max-width: 520px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.25);
                overflow: hidden; animation: popUp 0.25s cubic-bezier(.34,1.56,.64,1);
            }
            .esm-header {
                padding: 18px 24px; border-bottom: 1px solid #f1f5f9;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8fafc;
            }
            .esm-title {
                font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;
                display: flex; align-items: center; gap: 8px;
            }
            .esm-close {
                background: none; border: none; font-size: 18px; color: #94a3b8;
                cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1;
            }
            .esm-close:hover { background: #e2e8f0; color: #0f172a; }
            .esm-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
            .esm-field { display: flex; flex-direction: column; gap: 6px; }
            .esm-label { font-size: 13px; font-weight: 700; color: #334155; }
            .esm-input, .esm-textarea {
                width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1;
                border-radius: 8px; font-size: 14px; color: #0f172a; outline: none;
                transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
            }
            .esm-input:focus, .esm-textarea:focus {
                border-color: #00adef; box-shadow: 0 0 0 3px rgba(0,173,239,0.15);
            }
            .esm-footer {
                padding: 16px 24px; border-top: 1px solid #f1f5f9;
                display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;
            }
            .esm-btn-cancel {
                padding: 10px 20px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                background: #fff; color: #64748b; font-size: 13.5px; font-weight: 700;
                cursor: pointer; transition: all 0.15s;
            }
            .esm-btn-cancel:hover { background: #f1f5f9; color: #334155; }
            .esm-btn-submit {
                padding: 10px 24px; border-radius: 8px; border: none;
                background: #00adef; color: #fff; font-size: 13.5px; font-weight: 800;
                cursor: pointer; transition: all 0.15s; box-shadow: 0 4px 12px rgba(0,173,239,0.3);
            }
            .esm-btn-submit:hover { background: #0284c7; }
            .esm-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
            @keyframes popUp { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        </style>
        <div class="esm-box">
            <div class="esm-header">
                <div class="esm-title">
                    <span>✏️ Sửa thông tin nhận hàng</span>
                </div>
                <button class="esm-close" onclick="document.getElementById('editShippingModal').remove()">✕</button>
            </div>
            <div class="esm-body">
                <div class="esm-field">
                    <label class="esm-label">Họ và tên người nhận <span style="color: #ef4444;">*</span></label>
                    <input type="text" id="esmInputName" class="esm-input" placeholder="Nhập họ tên người nhận..." value="${escapeHtml(currentName)}">
                </div>
                <div class="esm-field">
                    <label class="esm-label">Số điện thoại nhận hàng <span style="color: #ef4444;">*</span></label>
                    <input type="tel" id="esmInputPhone" class="esm-input" placeholder="Ví dụ: 0912345678" value="${escapeHtml(currentPhone)}">
                </div>
                <div class="esm-field">
                    <label class="esm-label">Địa chỉ nhận hàng chi tiết <span style="color: #ef4444;">*</span></label>
                    <textarea id="esmInputAddress" class="esm-textarea" rows="3" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố...">${escapeHtml(currentAddress)}</textarea>
                </div>
                <div class="esm-field">
                    <label class="esm-label">Ghi chú giao hàng (không bắt buộc)</label>
                    <input type="text" id="esmInputNote" class="esm-input" placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..." value="${escapeHtml(currentNote)}">
                </div>
            </div>
            <div class="esm-footer">
                <button class="esm-btn-cancel" onclick="document.getElementById('editShippingModal').remove()">Huỷ</button>
                <button class="esm-btn-submit" id="esmBtnSubmit" onclick="submitEditShipping(${inv.id})">
                    💾 Lưu thay đổi
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('esmInputName').focus();
};

window.submitEditShipping = async function(hoaDonId) {
    const modal = document.getElementById('editShippingModal');
    if (!modal) return;

    if (state.currentInvoice && state.currentInvoice.trangThai !== 0) {
        showToast('Đơn hàng đã được xác nhận hoặc đang xử lý, không thể chỉnh sửa thông tin nhận hàng!', 'error');
        modal.remove();
        return;
    }

    if (state.currentInvoice && state.currentInvoice.soLanSuaThongTin && state.currentInvoice.soLanSuaThongTin >= 1) {
        showToast('Quý khách chỉ được thay đổi thông tin một lần', 'warning');
        modal.remove();
        return;
    }

    const name = (document.getElementById('esmInputName').value || '').trim();
    const phone = (document.getElementById('esmInputPhone').value || '').trim();
    const address = (document.getElementById('esmInputAddress').value || '').trim();
    const note = (document.getElementById('esmInputNote').value || '').trim();
    const submitBtn = document.getElementById('esmBtnSubmit');

    if (!name) {
        showToast('Vui lòng nhập họ tên người nhận!', 'error');
        document.getElementById('esmInputName').focus();
        return;
    }
    if (!phone) {
        showToast('Vui lòng nhập số điện thoại!', 'error');
        document.getElementById('esmInputPhone').focus();
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải bao gồm đúng 10 chữ số!', 'error');
        document.getElementById('esmInputPhone').focus();
        return;
    }
    if (!address) {
        showToast('Vui lòng nhập địa chỉ giao hàng!', 'error');
        document.getElementById('esmInputAddress').focus();
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Đang lưu...';
    }

    try {
        const resp = await safeFetchJson(`/api/auth/tracking/${hoaDonId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenNguoiNhan: name,
                sdtNguoiNhan: phone,
                diaChiGiao: address,
                ghiChu: note
            })
        });

        if (resp && !resp.error) {
            // Cập nhật state nội bộ
            if (state.currentInvoice && state.currentInvoice.id === hoaDonId) {
                state.currentInvoice.tenNguoiNhan = name;
                state.currentInvoice.sdtNguoiNhan = phone;
                state.currentInvoice.diaChiGiao = address;
                state.currentInvoice.diaChiNhan = address;
                state.currentInvoice.ghiChu = note;
                state.currentInvoice.soLanSuaThongTin = (state.currentInvoice.soLanSuaThongTin || 0) + 1;
            }

            // Ẩn ngay nút sửa thông tin vì khách đã thay đổi thông tin rồi
            const btnEditShip = $('btnEditShippingInfo');
            if (btnEditShip) {
                btnEditShip.style.display = 'none';
            }

            // Cập nhật trực tiếp lên giao diện chi tiết
            if ($('lblResultName')) $('lblResultName').textContent = name;
            if ($('lblResultPhone')) $('lblResultPhone').textContent = phone;
            if ($('lblResultAddress')) $('lblResultAddress').textContent = address;

            const ghiChuWrap = $('lblResultGhiChuWrap');
            const ghiChuEl = $('lblResultGhiChu');
            if (ghiChuWrap && ghiChuEl) {
                if (note) {
                    ghiChuEl.textContent = note;
                    ghiChuWrap.style.display = 'block';
                } else {
                    ghiChuWrap.style.display = 'none';
                }
            }

            // Cập nhật trong danh sách nếu có
            if (state.invoices && Array.isArray(state.invoices)) {
                const found = state.invoices.find(x => x.id === hoaDonId);
                if (found) {
                    found.tenNguoiNhan = name;
                    found.sdtNguoiNhan = phone;
                    found.diaChiGiao = address;
                    found.diaChiNhan = address;
                    found.ghiChu = note;
                    found.soLanSuaThongTin = (found.soLanSuaThongTin || 0) + 1;
                }
            }

            modal.remove();
            showToast('🎉 Đã cập nhật thông tin nhận hàng thành công!', 'success');
        } else {
            showToast(resp?.error || 'Cập nhật thất bại!', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '💾 Lưu thay đổi'; }
        }
    } catch (e) {
        showToast(e.message || 'Lỗi kết nối máy chủ!', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '💾 Lưu thay đổi'; }
    }
};
