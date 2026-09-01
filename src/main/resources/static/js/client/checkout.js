/**
 * VHOES - Checkout page JS with Address Dropdown API and Auth Integration
 */

const state = {
    checkoutItems: JSON.parse(localStorage.getItem('checkout_items') || '[]'),
    shippingFee: 0,
    discountAmount: 0,
    appliedVoucher: null,
    selectedPaymentMethod: 'COD',
    currentUserId: null,
    
    // Address lists
    provinceList: [],
    districtList: [],
    wardList: [],
    selectedProvinceName: '',
    selectedDistrictName: '',
    selectedWardName: ''
};

const SHIP_FEE = 30000;    // Phí ship ngoại thành / tỉnh khác: 30.000 đ

/**
 * Danh sách quận/huyện NỘI THÀNH Hà Nội → Miễn phí vận chuyển
 * (12 quận nội thành cũ + các quận mới thành lập trong vành đai)
 */
const INNER_HANOI_DISTRICTS = [
    // 12 quận nội thành truyền thống
    'quận ba đình', 'quận hoàn kiếm', 'quận tây hồ', 'quận long biên',
    'quận cầu giấy', 'quận đống đa', 'quận hai bà trưng', 'quận hoàng mai',
    'quận thanh xuân', 'quận nam từ liêm', 'quận bắc từ liêm', 'quận hà đông',
    // Viết tắt / không dấu hỗ trợ tìm kiếm
    'ba đình', 'hoàn kiếm', 'tây hồ', 'long biên',
    'cầu giấy', 'đống đa', 'hai bà trưng', 'hoàng mai',
    'thanh xuân', 'nam từ liêm', 'bắc từ liêm', 'hà đông'
];

/**
 * Kiểm tra quận/huyện có thuộc nội thành Hà Nội không.
 * @param {string} districtName - Tên quận/huyện đã chọn
 * @returns {boolean}
 */
function isInnerHanoi(districtName) {
    if (!districtName) return false;
    const d = districtName.toLowerCase().trim();
    return INNER_HANOI_DISTRICTS.some(inner => d.includes(inner) || inner.includes(d));
}

const $ = id => document.getElementById(id);

function parseFlexibleDate(val) {
    if (!val) return null;
    if (Array.isArray(val)) {
        return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

async function syncCheckoutItemsPricesWithBackend() {
    try {
        let items = state.checkoutItems;
        if (!items || items.length === 0) return;

        const ids = items.map(i => i.id).filter(Boolean);
        if (ids.length === 0) return;

        const res = await fetch('/api/san-pham/check-cart-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
        });

        if (res.ok) {
            const statusList = await res.json();
            const statusMap = new Map();
            statusList.forEach(s => statusMap.set(s.id, s));

            for (let item of items) {
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

        state.checkoutItems = items;
        localStorage.setItem('checkout_items', JSON.stringify(items));
    } catch (e) {
        console.error('Lỗi đồng bộ giá checkout:', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (state.checkoutItems.length === 0) {
        showToast('Không có sản phẩm nào trong hàng chờ thanh toán!', 'error');
        setTimeout(() => {
            window.location.href = '/client/cart';
        }, 1500);
        return;
    }

    await syncCheckoutItemsPricesWithBackend();
    
    renderCheckoutSummary();
    setupPaymentMethods();
    setupVoucherControls();
    setupCheckoutBtn();
    updateCartBadgeGlobal();
    loadProvinces();
    checkAuthAndPrefill();
    loadActiveVouchers();
});

function renderCheckoutSummary() {
    const container = $('checkoutItemsList');
    if (!container) return;

    const hasStopped = state.checkoutItems.some(item => item.isStopped);
    const orderBtn = $('btnOrderComplete');

    let warningHtml = '';
    if (hasStopped) {
        warningHtml = `
            <div style="background:#fef2f2; border:1.5px solid #f87171; border-radius:10px; padding:12px 16px; margin-bottom:16px; color:#991b1b; font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">⚠️</span>
                <span>Trong đơn hàng có sản phẩm <strong>đã ngừng kinh doanh</strong>. Vui lòng quay lại giỏ hàng để xóa trước khi đặt hàng!</span>
            </div>
        `;
        if (orderBtn) {
            orderBtn.disabled = true;
            orderBtn.style.background = '#94a3b8';
            orderBtn.style.cursor = 'not-allowed';
            orderBtn.textContent = 'Sản phẩm đã ngừng bán';
        }
    } else if (orderBtn) {
        orderBtn.disabled = false;
        orderBtn.style.background = 'var(--primary)';
        orderBtn.style.cursor = 'pointer';
        orderBtn.textContent = 'Đặt Hàng';
    }
    
    container.innerHTML = warningHtml + state.checkoutItems.map(item => {
        const isStopped = item.isStopped === true || (item.trangThai != null && item.trangThai != 1);
        const itemTotal = item.qty * (parseFloat(item.giaBan) || 0);
        const code = item.ma || `CTSP${String(item.id).padStart(5, '0')}`;
        const imgUrl = getImageUrl(item.hinhAnh, item.id || 0);
        
        return `
            <div class="summary-item-row" style="${isStopped ? 'background:#fff5f5; opacity:0.85; border-radius:8px; padding:8px;' : ''}">
                <div class="summary-item-img">
                    <img src="${imgUrl}" alt="${item.tenSanPham}" onerror="this.src='${getImageUrl(null, item.id || 0)}'">
                </div>
                <div class="summary-item-details">
                    <div class="summary-item-name" style="${isStopped ? 'color:#64748b; text-decoration:line-through;' : ''}">${item.tenSanPham}</div>
                    <div class="summary-item-meta">Màu: ${item.mauSac || '—'} / Size: ${item.sizeGiay || '—'}</div>
                    <div class="summary-item-code">Mã: ${code}</div>
                    ${isStopped ? `<div style="display:inline-flex; align-items:center; gap:4px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-size:11px; font-weight:800; padding:2px 6px; border-radius:4px; margin-top:3px; width:fit-content;">⛔ ĐÃ NGỪNG BÁN</div>` : ''}
                </div>
                <div class="summary-item-right">
                    <div class="summary-item-price" style="${isStopped ? 'color:#94a3b8;' : ''}">${formatPrice(item.giaBan)}</div>
                    <div class="summary-item-qty">x${item.qty}</div>
                </div>
            </div>
        `;
    }).join('');
    
    calculatePricing();
}

function calculatePricing() {
    let subtotal = 0;
    
    state.checkoutItems.forEach(item => {
        const itemPrice = parseFloat(item.giaBan) || 0;
        subtotal += item.qty * itemPrice;
    });
    
    let discount = 0;
    if (state.appliedVoucher) {
        if (state.appliedVoucher.loaiGiamGia === 'PERCENT') {
            discount = subtotal * (state.appliedVoucher.giaTriGiam / 100);
            if (state.appliedVoucher.giamToiDa) {
                discount = Math.min(discount, state.appliedVoucher.giamToiDa);
            }
        } else {
            discount = state.appliedVoucher.giaTriGiam;
        }
        discount = Math.min(discount, subtotal);
    }
    state.discountAmount = discount;
    
    const total = Math.max(0, subtotal + state.shippingFee - discount);
    
    $('priceSubtotal').textContent = formatPrice(subtotal);
    $('priceShipping').textContent = formatPrice(state.shippingFee);
    $('priceDiscount').textContent = `-${formatPrice(discount)}`;
    $('priceTotal').textContent = formatPrice(total);

    const discountLabelEl = $('priceDiscountLabel');
    if (discountLabelEl) {
        if (state.appliedVoucher) {
            const vName = state.appliedVoucher.tenVoucher || state.appliedVoucher.maVoucher || 'Voucher';
            const vCode = state.appliedVoucher.maVoucher ? state.appliedVoucher.maVoucher : '';
            const combined = (vCode && state.appliedVoucher.tenVoucher && vCode !== state.appliedVoucher.tenVoucher)
                ? `${vCode} - ${state.appliedVoucher.tenVoucher}`
                : (state.appliedVoucher.tenVoucher || vCode);
            discountLabelEl.innerHTML = `Giảm giá <span style="font-size: 11px; font-weight: 600; color: #10b981; margin-left: 4px;">(${combined})</span>`;
        } else {
            discountLabelEl.textContent = 'Giảm giá';
        }
    }
}

function setupPaymentMethods() {
    const items = document.querySelectorAll('.payment-method-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            items.forEach(x => x.classList.remove('active'));
            item.classList.add('active');
            
            const radio = item.querySelector('.payment-radio');
            if (radio) radio.checked = true;
            state.selectedPaymentMethod = radio ? radio.value : 'COD';
            
            updatePaymentPanels();
        });
    });
}

function updatePaymentPanels() {
    // Online QR panels moved to separate payment-online page upon order submission
}

function updateMomoPanel() { updatePaymentPanels(); }

let allVouchers = [];

async function loadActiveVouchers() {
    try {
        let res = await fetch('/api/phieu-giam-gia/list');
        if (!res.ok) {
            res = await fetch('/api/phieu-giam-gia-local/list');
        }
        if (res.ok) {
            allVouchers = await res.json();
            autoApplyBestVoucher();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách voucher, thử tải local:', err);
        try {
            const res = await fetch('/api/phieu-giam-gia-local/list');
            if (res.ok) {
                allVouchers = await res.json();
                autoApplyBestVoucher();
            }
        } catch (localErr) {
            console.error('Lỗi tải danh sách voucher local:', localErr);
        }
    }
}

function getVoucherDiscount(voucher, subtotal) {
    let discount = 0;
    if (voucher.loaiGiamGia === 'PERCENT') {
        discount = subtotal * (voucher.giaTriGiam / 100);
        if (voucher.giamToiDa) {
            discount = Math.min(discount, voucher.giamToiDa);
        }
    } else {
        discount = voucher.giaTriGiam;
    }
    return Math.min(discount, subtotal);
}

function autoApplyBestVoucher() {
    let subtotal = 0;
    state.checkoutItems.forEach(item => {
        subtotal += item.qty * (parseFloat(item.giaBan) || 0);
    });

    let bestVoucher = null;
    let maxDiscount = 0;

    allVouchers.forEach(v => {
        const minOrder = parseFloat(v.donToiThieu) || 0;
        if (subtotal >= minOrder) {
            const discount = getVoucherDiscount(v, subtotal);
            if (discount > maxDiscount) {
                maxDiscount = discount;
                bestVoucher = v;
            }
        }
    });

    if (bestVoucher) {
        state.appliedVoucher = bestVoucher;
        $('inputVoucher').value = bestVoucher.maVoucher;
        const msg = $('voucherMessage');
        msg.textContent = `✓ Tự động áp dụng mã tốt nhất: ${bestVoucher.tenVoucher}`;
        msg.style.color = '#10b981';
    } else {
        state.appliedVoucher = null;
        $('inputVoucher').value = '';
        $('voucherMessage').textContent = '';
    }

    calculatePricing();
    renderVouchers(subtotal);
}

function renderVouchers(subtotal) {
    const container = $('voucherListContainer');
    if (!container) return;

    if (allVouchers.length === 0) {
        container.innerHTML = '<div style="color: var(--gray-400); font-size: 12px; text-align: center;">Không có mã giảm giá khả dụng.</div>';
        return;
    }

    const sorted = [...allVouchers].sort((a, b) => {
        const isAppliedA = state.appliedVoucher && state.appliedVoucher.id === a.id;
        const isAppliedB = state.appliedVoucher && state.appliedVoucher.id === b.id;
        if (isAppliedA) return -1;
        if (isAppliedB) return 1;

        const eligibleA = subtotal >= (parseFloat(a.donToiThieu) || 0);
        const eligibleB = subtotal >= (parseFloat(b.donToiThieu) || 0);
        if (eligibleA && !eligibleB) return -1;
        if (!eligibleA && eligibleB) return 1;

        const discA = getVoucherDiscount(a, subtotal);
        const discB = getVoucherDiscount(b, subtotal);
        return discB - discA;
    });

    container.innerHTML = sorted.map(v => {
        const isApplied = state.appliedVoucher && state.appliedVoucher.id === v.id;
        const minOrder = parseFloat(v.donToiThieu) || 0;
        const eligible = subtotal >= minOrder;
        
        let discountText = '';
        if (v.loaiGiamGia === 'PERCENT') {
            discountText = `Giảm ${v.giaTriGiam}%` + (v.giamToiDa ? ` (tối đa ${formatPrice(v.giamToiDa)})` : '');
        } else {
            discountText = `Giảm ${formatPrice(v.giaTriGiam)}`;
        }

        const borderStyle = isApplied 
            ? 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.05);' 
            : (eligible ? 'border: 1px solid var(--primary); background: #fff;' : 'border: 1px solid var(--border); background: #f8fafc; opacity: 0.7;');

        const badgeHtml = isApplied
            ? `<span style="background: #10b981; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Đang áp dụng (Tốt nhất)</span>`
            : (eligible ? `<span style="background: var(--primary); color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Khả dụng</span>` : `<span style="background: var(--gray-400); color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">Chưa đủ điều kiện</span>`);

        const buttonHtml = eligible && !isApplied
            ? `<button onclick="applySelectedVoucher('${v.maVoucher}')" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: background 0.2s;">Dùng</button>`
            : '';

        return `
            <div style="padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; ${borderStyle}">
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-family: monospace; font-weight: 700; color: var(--gray-900); font-size: 13px; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${v.maVoucher}</span>
                        ${badgeHtml}
                    </div>
                    <div style="font-weight: 700; font-size: 12px; color: var(--gray-800);">${v.tenVoucher}</div>
                    <div style="font-size: 11px; color: #ef4444; font-weight: 600;">${discountText}</div>
                    <div style="font-size: 10px; color: var(--gray-500);">Đơn tối thiểu: ${formatPrice(minOrder)}</div>
                </div>
                ${buttonHtml}
            </div>
        `;
    }).join('');
}

window.applySelectedVoucher = function(code) {
    $('inputVoucher').value = code;
    $('btnApplyVoucher').click();
    const container = $('voucherListContainer');
    if (container) container.style.display = 'none';
};

function setupVoucherControls() {
    const btn = $('btnApplyVoucher');
    const input = $('inputVoucher');
    const container = $('voucherListContainer');

    if (input && container) {
        input.addEventListener('focus', () => {
            container.style.display = 'flex';
        });
        
        input.addEventListener('click', () => {
            container.style.display = 'flex';
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !container.contains(e.target) && (!btn || !btn.contains(e.target))) {
                container.style.display = 'none';
            }
        });
    }

    if (!btn) return;
    
    btn.addEventListener('click', async () => {
        const ma = $('inputVoucher').value.trim().toUpperCase();
        const msg = $('voucherMessage');
        if (!ma) {
            msg.textContent = 'Vui lòng nhập mã voucher!';
            msg.style.color = '#ef4444';
            return;
        }
        
        let subtotal = 0;
        state.checkoutItems.forEach(item => {
            subtotal += item.qty * (parseFloat(item.giaBan) || 0);
        });
        
        btn.disabled = true;
        btn.textContent = 'Đang áp dụng...';
        msg.textContent = '';
        
        try {
            const res = await fetch(`/api/phieu-giam-gia/check?ma=${encodeURIComponent(ma)}&tongTien=${subtotal}`);
            if (!res.ok) {
                let errMsg = 'Phiếu giảm giá này đã hết hạn, vui lòng chọn phiếu giảm giá khác!';
                try {
                    const errData = await res.json();
                    if (errData && errData.message) errMsg = errData.message;
                } catch (_) {}
                throw new Error(errMsg);
            }
            const data = await res.json();
            state.appliedVoucher = data;
            calculatePricing();
            msg.textContent = `✓ Đã áp dụng: ${data.tenVoucher}`;
            msg.style.color = '#10b981';
            showToast(`Áp dụng thành công voucher: ${data.tenVoucher}`, 'success');
            renderVouchers(subtotal);
        } catch (err) {
            state.appliedVoucher = null;
            calculatePricing();
            msg.textContent = err.message || 'Mã voucher không hợp lệ!';
            msg.style.color = '#ef4444';
            showToast(err.message || 'Lỗi áp dụng voucher!', 'error');
            renderVouchers(subtotal);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Áp dụng';
        }
    });
}

async function validateAppliedVoucherRealtime() {
    if (!state.appliedVoucher) return true;

    let subtotal = 0;
    state.checkoutItems.forEach(item => {
        subtotal += item.qty * (parseFloat(item.giaBan) || 0);
    });

    const ma = state.appliedVoucher.maVoucher;
    try {
        const res = await fetch(`/api/phieu-giam-gia/check?ma=${encodeURIComponent(ma)}&tongTien=${subtotal}`);
        if (!res.ok) {
            let errorMsg = 'Phiếu giảm giá này đã hết hạn, vui lòng chọn phiếu giảm giá khác!';
            try {
                const errData = await res.json();
                if (errData && errData.message) errorMsg = errData.message;
            } catch (_) {}

            state.appliedVoucher = null;
            calculatePricing();

            const inputVoucher = $('inputVoucher');
            if (inputVoucher) inputVoucher.value = '';
            const msgEl = $('voucherMessage');
            if (msgEl) {
                msgEl.textContent = `❌ ${errorMsg}`;
                msgEl.style.color = '#ef4444';
            }

            if (typeof loadActiveVouchers === 'function') {
                loadActiveVouchers();
            }

            showToast(`⚠️ ${errorMsg}`, 'error');
            return false;
        }

        const freshData = await res.json();
        state.appliedVoucher = freshData;
        calculatePricing();
        return true;
    } catch (err) {
        console.warn('Lỗi kiểm tra voucher thời gian thực:', err);
        return true;
    }
}

function setupCheckoutBtn() {
    $('btnOrderComplete').addEventListener('click', async () => {
        const stoppedItem = state.checkoutItems.find(i => i.isStopped);
        if (stoppedItem) {
            showToast(`❌ Sản phẩm "${stoppedItem.tenSanPham}" đã ngừng kinh doanh. Vui lòng quay lại giỏ hàng để xóa!`, 'error');
            return;
        }

        // Kiểm tra phiếu giảm giá theo thời gian thực trước khi mở modal
        if (state.appliedVoucher) {
            const isVoucherValid = await validateAppliedVoucherRealtime();
            if (!isVoucherValid) {
                return;
            }
        }

        const name = $('inputName').value.trim();
        const phone = $('inputPhone').value.trim();
        const email = $('inputEmail').value.trim();
        const specificAddress = $('inputAddress').value.trim();
        
        const province = state.selectedProvinceName;
        const district = state.selectedDistrictName;
        const ward = state.selectedWardName;
        
        // Validation
        if (!name || !phone || !email || !specificAddress || !province || !district || !ward) {
            showToast('Vui lòng điền đầy đủ các thông tin bắt buộc (*)!', 'error');
            return;
        }
        
        if (!phone.match(/^(0[35789])[0-9]{8}$/)) {
            showToast('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08, 09!', 'error');
            return;
        }
        
        // Show confirm modal
        const modal = $('orderConfirmModal');
        if (modal) {
            let subtotal = 0;
            state.checkoutItems.forEach(item => { subtotal += item.qty * (parseFloat(item.giaBan) || 0); });
            const discount = state.discountAmount;
            const total = Math.max(0, subtotal + state.shippingFee - discount);
            const fullAddress = `${specificAddress}, ${ward}, ${district}, ${province}`;
            
            const payMap = { COD: '📦 Thanh toán khi nhận hàng', VNPAY: '💳 VNPAY', MOMO: '💳 MoMo', ZALOPAY: '💳 ZaloPay', VIETQR: '💳 VietQR' };
            const confirmEl = $('orderConfirmSummary');
            if (confirmEl) {
                const feeHtml = state.shippingFee === 0
                    ? '<span style="color:#10b981;font-weight:700;">Miễn phí</span>'
                    : state.shippingFee.toLocaleString('vi-VN') + ' ₫';
                confirmEl.innerHTML = `
                    <div style="display:flex;flex-direction:column;gap:12px;font-size:14px;">
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">👤 Họ tên</span><strong>${name}</strong></div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">📞 SĐT</span><strong>${phone}</strong></div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;"><span style="color:#64748b;flex-shrink:0;">📍 Địa chỉ giao</span><span style="text-align:right;font-weight:600;">${fullAddress}</span></div>
                        <hr style="border:none;border-top:1px dashed #e2e8f0;margin:2px 0;">
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Tạm tính</span><span>${subtotal.toLocaleString('vi-VN')} ₫</span></div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Giảm giá</span><span style="color:#10b981;">-${discount.toLocaleString('vi-VN')} ₫</span></div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Phí vận chuyển</span>${feeHtml}</div>
                        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1e293b;padding-top:6px;border-top:2px solid #f1f5f9;">
                            <span>💰 Tổng cộng</span><span style="color:#e53e3e;">${total.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Thanh toán</span><strong>${payMap[state.selectedPaymentMethod] || state.selectedPaymentMethod}</strong></div>
                    </div>
                `;
            }
            modal.style.display = 'flex';
        } else {
            await submitOrder();
        }
    });
    
    const btnConfirm = $('btnConfirmOrder');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            $('orderConfirmModal').style.display = 'none';
            await submitOrder();
        });
    }
    
    const btnCancelOrder = $('btnCancelOrder');
    if (btnCancelOrder) {
        btnCancelOrder.addEventListener('click', () => {
            $('orderConfirmModal').style.display = 'none';
        });
    }
    
    const modal = $('orderConfirmModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
}

async function submitOrder() {
    const stoppedItem = state.checkoutItems.find(i => i.isStopped);
    if (stoppedItem) {
        showToast(`❌ Sản phẩm "${stoppedItem.tenSanPham}" đã ngừng kinh doanh. Không thể đặt hàng!`, 'error');
        return;
    }

    // Kiểm tra phiếu giảm giá lần cuối trước khi gửi lên máy chủ
    if (state.appliedVoucher) {
        const isVoucherValid = await validateAppliedVoucherRealtime();
        if (!isVoucherValid) {
            $('btnOrderComplete').disabled = false;
            $('btnOrderComplete').textContent = 'Đặt Hàng';
            return;
        }
    }

    const name = $('inputName').value.trim();
    const phone = $('inputPhone').value.trim();
    const email = $('inputEmail').value.trim();
    const specificAddress = $('inputAddress').value.trim();
    const province = state.selectedProvinceName;
    const district = state.selectedDistrictName;
    const ward = state.selectedWardName;
    const fullAddress = `${specificAddress}, ${ward}, ${district}, ${province}`;
    
    let subtotal = 0;
    state.checkoutItems.forEach(item => { subtotal += item.qty * (parseFloat(item.giaBan) || 0); });
    const discount = state.discountAmount;
    const total = Math.max(0, subtotal + state.shippingFee - discount);
    
    const method = (state.selectedPaymentMethod || 'COD').toUpperCase();

    const payload = {
        email: email,
        loaiHoaDon: true,
        tenNguoiNhan: name,
        sdtNguoiNhan: phone,
        diaChiGiao: fullAddress,

        ghiChu: ($('txtNote').value || '').trim() + ` | PTTT: ${state.selectedPaymentMethod}` + (email ? ` | EMAIL:${email}` : ''),
        trangThai: 0,
        tienGiam: discount,
        phiShip: state.shippingFee,
        tongTien: total,
        phieuGiamGiaId: state.appliedVoucher ? state.appliedVoucher.id : null,
        khachHangId: state.currentUserId || null,
        items: state.checkoutItems.map(item => ({
            sanPhamChiTietId: item.id,
            soLuong: item.qty,
            donGia: item.giaBan,
            thanhTien: item.qty * item.giaBan
        }))
    };

    const emailPayload = email ? {
        email: email,
        tenKhachHang: name,
        sdtKhachHang: phone,
        diaChiGiao: fullAddress,
        ghiChu: ($('txtNote').value || '').trim(),
        tongTien: total,
        tienGiam: discount,
        phiShip: state.shippingFee,
        trangThai: 0,
        loaiHoaDon: 'Trực tuyến',
        items: state.checkoutItems.map(item => ({
            tenSanPham: item.tenSanPham,
            mauSac: item.mauSac || '',
            coGiay: item.sizeGiay ? String(item.sizeGiay) : '',
            soLuong: item.qty,
            donGia: parseFloat(item.giaBan) || 0,
            thanhTien: item.qty * (parseFloat(item.giaBan) || 0)
        }))
    } : null;

    // ===== THANH TOÁN VNPAY: Tạo đơn hàng TRƯỚC rồi redirect sang VNPay thực =====
    if (method === 'VNPAY') {
        $('btnOrderComplete').disabled = true;
        $('btnOrderComplete').textContent = 'Đang tạo đơn hàng...';
        try {
            // 1. Tạo đơn hàng vào DB
            const orderRes2 = await fetch('/api/hoa-don/ban-hang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!orderRes2.ok) {
                const errBody = await orderRes2.json().catch(() => ({}));
                throw new Error(errBody.error || errBody.message || 'Lỗi tạo đơn hàng');
            }
            const order = await orderRes2.json();

            // 2. Gọi API tạo URL thanh toán VNPay
            $('btnOrderComplete').textContent = 'Đang kết nối VNPay...';
            const vnpRes = await fetch('/api/payment/vnpay/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId:   order.maHoaDon,
                    orderCode: order.maHoaDon,
                    amount:    order.tongTien,
                    orderInfo: 'Thanh toan don hang ' + order.maHoaDon,
                    locale:    'vn'
                })
            });
            if (!vnpRes.ok) {
                const ve = await vnpRes.json().catch(() => ({}));
                throw new Error(ve.error || 'Lỗi tạo URL VNPay');
            }
            const vnpData = await vnpRes.json();

            // 3. Xóa giỏ hàng cục bộ
            const purchasedIds3 = state.checkoutItems.map(i => i.id);
            const cart3 = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
            localStorage.setItem('vshoes_cart', JSON.stringify(cart3.filter(i => !purchasedIds3.includes(i.id))));
            localStorage.removeItem('checkout_items');

            // 4. Redirect sang VNPay
            showToast('🔄 Đang chuyển sang cổng thanh toán VNPay...', 'info');
            setTimeout(() => { window.location.href = vnpData.paymentUrl; }, 600);
            return;
        } catch (err) {
            showToast('❌ ' + err.message, 'error');
            $('btnOrderComplete').disabled = false;
            $('btnOrderComplete').textContent = 'Hoàn thành đặt hàng';
            return;
        }
    }

    // ===== THANH TOÁN ONLINE KHÁC (MoMo, ZaloPay, VietQR): Lưu tạm, chuyển sang trang QR =====
    if (method === 'MOMO' || method === 'ZALOPAY' || method === 'VIETQR') {
        const tempMa = 'HD' + Date.now();
        sessionStorage.setItem('pending_online_order', JSON.stringify({
            maHoaDon: tempMa,
            total: total,
            method: method,
            payload: payload,
            emailPayload: emailPayload
        }));
        showToast('🔄 Đang chuyển sang cổng thanh toán online...', 'info');
        setTimeout(() => {
            window.location.href = `/client/checkout/payment-online?ma=${encodeURIComponent(tempMa)}&total=${encodeURIComponent(total)}&method=${encodeURIComponent(method)}`;
        }, 500);
        return;
    }

    // Đối với COD: Tiến hành lưu đơn hàng trực tiếp vào CSDL
    $('btnOrderComplete').disabled = true;
    $('btnOrderComplete').textContent = 'Đang xử lý đặt hàng...';

    try {
        const res = await fetch('/api/hoa-don/ban-hang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            let errMsg = 'Lỗi khi đặt hàng';
            try {
                const errBody = await res.json();
                errMsg = errBody.error || errBody.message || errMsg;
            } catch (_) {
                errMsg = (await res.text()) || errMsg;
            }
            if (errMsg.includes('Phiếu giảm giá') || errMsg.includes('voucher') || errMsg.includes('Voucher')) {
                state.appliedVoucher = null;
                calculatePricing();
                if (typeof loadActiveVouchers === 'function') loadActiveVouchers();
                const inputVoucher = $('inputVoucher');
                if (inputVoucher) inputVoucher.value = '';
                const msgEl = $('voucherMessage');
                if (msgEl) {
                    msgEl.textContent = `❌ ${errMsg}`;
                    msgEl.style.color = '#ef4444';
                }
            }
            throw new Error(errMsg);
        }
        
        const orderRes = await res.json();
        
        // ---- Gửi email thông báo đơn hàng mới ----
        if (email && orderRes.id) {
            fetch(`/api/hoa-don/${orderRes.id}/send-email`, { method: 'POST' }).catch(e => console.warn(e));
        }
        
        // Xóa sản phẩm khỏi giỏ hàng
        const purchasedIds = state.checkoutItems.map(item => item.id);
        const generalCart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
        const remainingCart = generalCart.filter(item => !purchasedIds.includes(item.id));
        
        localStorage.setItem('vshoes_cart', JSON.stringify(remainingCart));
        localStorage.removeItem('checkout_items');

        // COD: Thông báo thành công và chuyển sang trang hoàn tất
        showToast('🎉 Đặt hàng thành công! Đang chuyển hướng...', 'success');
        
        setTimeout(() => {
            window.location.href = `/client/checkout/success?ma=${encodeURIComponent(orderRes.maHoaDon)}&total=${orderRes.tongTien}&status=chờ xác nhận`;
        }, 1500);
        
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
        $('btnOrderComplete').disabled = false;
        $('btnOrderComplete').textContent = 'Hoàn thành đặt hàng';
    }
}


// Check auth status and prefill customer info
async function checkAuthAndPrefill() {
    try {
        const res = await fetch('/api/auth/current-user');
        if (!res.ok) return;
        const data = await res.json();
        if (data.loggedIn && data.user) {
            state.currentUserId = data.user.id;

            // --- Điền thông tin cơ bản ngay lập tức ---
            const nameEl  = $('inputName');
            const phoneEl = $('inputPhone');
            const emailEl = $('inputEmail');

            if (nameEl  && data.user.hoTen)       { nameEl.value  = data.user.hoTen;       highlightPrefilled(nameEl); }
            if (phoneEl && data.user.soDienThoai) { phoneEl.value = data.user.soDienThoai; highlightPrefilled(phoneEl); }
            if (emailEl && data.user.email)       { emailEl.value = data.user.email;       highlightPrefilled(emailEl); }

            // --- Hiện banner đăng nhập ---
            const banner  = $('loggedInBanner');
            const infoEl  = $('loggedInUserInfo');
            if (banner) {
                banner.style.display = 'flex';
                if (infoEl) {
                    infoEl.textContent = `👤 ${data.user.hoTen || ''}${ data.user.email ? '  •  ' + data.user.email : ''}${ data.user.soDienThoai ? '  •  ' + data.user.soDienThoai : ''}`;
                }
            }

            // --- Điền địa chỉ & Load Sổ địa chỉ ---
            try {
                const resAddr = await fetch('/api/client/dia-chi/list');
                if (resAddr.ok) {
                    const savedAddresses = await resAddr.json();
                    if (Array.isArray(savedAddresses) && savedAddresses.length > 0) {
                        const box = $('savedAddressSelectorBox');
                        const selectEl = $('selectSavedAddress');
                        if (box && selectEl) {
                            box.style.display = 'block';
                            selectEl.innerHTML = savedAddresses.map((addr) => {
                                const loaiStr = addr.loaiDiaChi ? `${addr.loaiDiaChi}` : 'Địa chỉ';
                                const nameStr = addr.tenNguoiNhan ? ` - ${addr.tenNguoiNhan}` : '';
                                const phoneStr = addr.sdt ? ` (${addr.sdt})` : '';
                                const parts = [addr.diaChiChiTiet, addr.phuongXa, addr.quanHuyen, addr.tinhThanh].filter(Boolean);
                                const detailStr = parts.length > 0 ? `: ${parts.join(', ')}` : '';
                                return `<option value="${addr.id}" ${addr.macDinh ? 'selected' : ''}>${loaiStr}${nameStr}${phoneStr}${detailStr}</option>`;
                            }).join('');

                            // Khi người dùng chọn một địa chỉ khác từ dropdown
                            selectEl.onchange = async () => {
                                const selectedId = parseInt(selectEl.value);
                                const selectedObj = savedAddresses.find(a => a.id === selectedId);
                                if (selectedObj) {
                                    await applySavedAddress(selectedObj);
                                }
                            };

                            // Điền sẵn địa chỉ mặc định đầu tiên
                            const defaultAddr = savedAddresses.find(a => a.macDinh) || savedAddresses[0];
                            if (defaultAddr) {
                                await applySavedAddress(defaultAddr);
                            }
                        }
                    } else {
                        const userAddress = data.user.diaChi || '';
                        if (userAddress) {
                            await autoFillFullAddress(userAddress);
                        }
                    }
                } else {
                    const userAddress = data.user.diaChi || '';
                    if (userAddress) {
                        await autoFillFullAddress(userAddress);
                    }
                }
            } catch (errAddr) {
                console.error('Lỗi tải danh sách địa chỉ:', errAddr);
                const userAddress = data.user.diaChi || '';
                if (userAddress) {
                    await autoFillFullAddress(userAddress);
                }
            }

        }
    } catch (e) {
        console.error('Failed to check auth status', e);
    }
}

async function applySavedAddress(addrObj) {
    if (!addrObj) return;
    const nameEl = $('inputName');
    const phoneEl = $('inputPhone');
    const addressEl = $('inputAddress');

    if (nameEl && addrObj.tenNguoiNhan) {
        nameEl.value = addrObj.tenNguoiNhan;
        highlightPrefilled(nameEl);
    }
    if (phoneEl && addrObj.sdt) {
        phoneEl.value = addrObj.sdt;
        highlightPrefilled(phoneEl);
    }
    if (addressEl && addrObj.diaChiChiTiet) {
        addressEl.value = addrObj.diaChiChiTiet;
        highlightPrefilled(addressEl);
    }

    if (addrObj.tinhThanh) {
        await fillAdministrativeAddress(addrObj.tinhThanh, addrObj.quanHuyen, addrObj.phuongXa);
    } else if (addrObj.diaChiChiTiet) {
        await autoFillFullAddress(addrObj.diaChiChiTiet);
    }
}

async function fillAdministrativeAddress(tinhThanh, quanHuyen, phuongXa) {
    if (!tinhThanh) return;

    if (!state.provinceList || state.provinceList.length === 0) {
        await loadProvinces();
    }

    function isNameMatch(optionName, targetName) {
        if (!optionName || !targetName) return false;
        const o = optionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const t = targetName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (o === t || o.includes(t) || t.includes(o)) return true;
        const oClean = o.replace(/^(thanh pho|tinh|tp\.?|quan|huyen|thi xa|xa|phuong|thi tran)\s+/i, '').trim();
        const tClean = t.replace(/^(thanh pho|tinh|tp\.?|quan|huyen|thi xa|xa|phuong|thi tran)\s+/i, '').trim();
        return oClean === tClean || oClean.includes(tClean) || tClean.includes(oClean);
    }

    // 1. Tỉnh / Thành phố
    const matchedProv = (state.provinceList || []).find(p => isNameMatch(p.name, tinhThanh));
    if (matchedProv) {
        await selectOption('province', matchedProv.code, matchedProv.name);

        // 2. Quận / Huyện
        if (quanHuyen && state.districtList && state.districtList.length > 0) {
            const matchedDist = state.districtList.find(d => isNameMatch(d.name, quanHuyen));
            if (matchedDist) {
                await selectOption('district', matchedDist.code, matchedDist.name);

                // 3. Phường / Xã
                if (phuongXa && state.wardList && state.wardList.length > 0) {
                    const matchedWard = state.wardList.find(w => isNameMatch(w.name, phuongXa));
                    if (matchedWard) {
                        await selectOption('ward', matchedWard.code, matchedWard.name);
                    }
                }
            }
        }
    }
}

/** Highlight input đã được prefill bằng viền xanh nhạt */
function highlightPrefilled(inputEl) {
    if (!inputEl) return;
    inputEl.style.borderColor = '#6ee7b7';
    inputEl.style.backgroundColor = '#f0fdf4';
    // Khi user chỉnh sửa thì bỏ highlight
    inputEl.addEventListener('input', () => {
        inputEl.style.borderColor = '';
        inputEl.style.backgroundColor = '';
    }, { once: true });
}

/** Đăng xuất ngay tại trang checkout */
window.handleCheckoutLogout = async function(e) {
    e.preventDefault();
    try {
        await fetch('/api/auth/dang-xuat', { method: 'POST' });
    } catch (_) {}
    // Xoá thông tin đã điền
    ['inputName','inputPhone','inputEmail','inputAddress'].forEach(id => {
        const el = $(id);
        if (el) { el.value = ''; el.style.borderColor = ''; el.style.backgroundColor = ''; }
    });
    state.currentUserId = null;
    const banner = $('loggedInBanner');
    if (banner) banner.style.display = 'none';
    // Reset địa chỉ dropdowns
    $('provinceLabel').textContent  = 'Chọn Tỉnh/Thành phố';
    $('districtLabel').textContent  = 'Chọn Quận/Huyện';
    $('wardLabel').textContent      = 'Chọn Xã/Phường';
    $('selectProvince').value = '';
    $('selectDistrict').value = '';
    $('selectWard').value     = '';
    state.selectedProvinceName = '';
    state.selectedDistrictName = '';
    state.selectedWardName     = '';
    state.districtList = [];
    state.wardList     = [];
    state.shippingFee  = 0;
    calculatePricing();
    showToast('Đã đăng xuất khỏi tài khoản', 'success');
};

async function autoFillFullAddress(fullAddr) {
    if (!fullAddr || !fullAddr.trim()) return;

    if (!state.provinceList || state.provinceList.length === 0) {
        await loadProvinces();
    }

    /**
     * So sánh mềm: kiểm tra xem name có xuất hiện trong fullText không,
     * bỏ qua prefix phân loại (tỉnh/huyện/xã...).
     */
    function isMatch(name, fullText) {
        if (!name || !fullText) return false;
        const t = fullText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (t.includes(n)) return true;

        // Bỏ prefix (thành phố / tỉnh / quận / huyện / xã / phường / thị trấn)
        const nClean = n.replace(/^(thanh pho|tinh|tp\.?|quan|huyen|thi xa|xa|phuong|thi tran)\s+/i, '').trim();
        if (nClean && nClean.length >= 2 && t.includes(nClean)) return true;

        return false;
    }

    // 1. Match Province
    let matchedProv = (state.provinceList || []).find(p => isMatch(p.name, fullAddr));

    let matchedDist = null;
    let matchedWard = null;

    if (matchedProv) {
        await selectOption('province', matchedProv.code, matchedProv.name);

        // 2. Match District
        if (state.districtList && state.districtList.length > 0) {
            matchedDist = state.districtList.find(d => isMatch(d.name, fullAddr));

            if (matchedDist) {
                await selectOption('district', matchedDist.code, matchedDist.name);

                // 3. Match Ward
                if (state.wardList && state.wardList.length > 0) {
                    matchedWard = state.wardList.find(w => isMatch(w.name, fullAddr));

                    if (matchedWard) {
                        await selectOption('ward', matchedWard.code, matchedWard.name);
                    }
                }
            }
        }
    }

    // Trích phần địa chỉ cụ thể (số nhà, tên đường) bằng cách bỏ tên tỉnh/quận/xã
    let cleanAddress = fullAddr;
    if (matchedProv) {
        cleanAddress = cleanAddress.replace(new RegExp(matchedProv.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        const pClean = matchedProv.name.replace(/^(thành phố|tỉnh|tp\.?)\s+/i, '').trim();
        if (pClean && pClean.length >= 2) cleanAddress = cleanAddress.replace(new RegExp(pClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }
    if (matchedDist) {
        cleanAddress = cleanAddress.replace(new RegExp(matchedDist.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        const dClean = matchedDist.name.replace(/^(quận|huyện|thị xã)\s+/i, '').trim();
        if (dClean && dClean.length >= 2) cleanAddress = cleanAddress.replace(new RegExp(dClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }
    if (matchedWard) {
        cleanAddress = cleanAddress.replace(new RegExp(matchedWard.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        const wClean = matchedWard.name.replace(/^(xã|phường|thị trấn)\s+/i, '').trim();
        if (wClean && wClean.length >= 2) cleanAddress = cleanAddress.replace(new RegExp(wClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }

    // Dọn dẹp dấu phẩy/khoảng trắng thừa
    cleanAddress = cleanAddress.replace(/^[\s,.\-\/]+|[\s,.\-\/]+$/g, '').replace(/,\s*,/g, ',').trim();

    if ($('inputAddress') && cleanAddress) {
        $('inputAddress').value = cleanAddress;
        highlightPrefilled($('inputAddress'));
    }
}

// Load Provinces
async function loadProvinces() {
    try {
        let res = await fetch('https://provinces.open-api.vn/api/v1/p/');
        let data = null;
        if (res.ok) data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            res = await fetch('/api/address/provinces');
            if (res.ok) data = await res.json();
        }
        if (!Array.isArray(data) || data.length === 0) {
            res = await fetch('https://provinces.open-api.vn/api/?depth=1');
            if (res.ok) data = await res.json();
        }
        state.provinceList = Array.isArray(data) ? data : [];
        renderDropdownList('province', state.provinceList);
    } catch (e) {
        console.error("Failed to load provinces", e);
        showToast("Không thể tải danh sách tỉnh thành. Vui lòng thử lại!", "error");
    }
}

function renderDropdownList(type, items) {
    const listEl = $(`${type}List`);
    if (!listEl) return;
    
    if (items.length === 0) {
        listEl.innerHTML = `<div style="padding:10px; font-size:12px; color:var(--gray-400); text-align:center;">Không tìm thấy kết quả</div>`;
        return;
    }
    
    listEl.innerHTML = items.map(item => `
        <div class="dropdown-option-item" onclick="selectOption('${type}', ${item.code}, '${item.name.replace(/'/g, "\\'")}')">
            ${item.name}
        </div>
    `).join('');
}

function toggleDropdown(type) {
    ['province', 'district', 'ward'].forEach(t => {
        if (t !== type) {
            $(`${t}Content`).style.display = 'none';
            $(`${t}Select`).classList.remove('active');
        }
    });
    
    const content = $(`${type}Content`);
    const select = $(`${type}Select`);
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        select.classList.add('active');
        const searchInput = content.querySelector('.dropdown-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
            filterDropdown(type, '');
        }
    } else {
        content.style.display = 'none';
        select.classList.remove('active');
    }
}

function filterDropdown(type, val) {
    const list = state[`${type}List`] || [];
    const query = val.toLowerCase().trim();
    const filtered = list.filter(item => item.name.toLowerCase().includes(query));
    renderDropdownList(type, filtered);
}

async function selectOption(type, code, name) {
    const labelEl = $(`${type}Label`);
    if (labelEl) labelEl.textContent = name;
    
    const hiddenEl = $(`select${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (hiddenEl) hiddenEl.value = code;
    
    state[`selected${type.charAt(0).toUpperCase() + type.slice(1)}Name`] = name;
    
    // Explicitly hide dropdown content
    const content = $(`${type}Content`);
    const select = $(`${type}Select`);
    if (content) content.style.display = 'none';
    if (select) select.classList.remove('active');
    
    if (type === 'province') {
        $('districtLabel').textContent = 'Chọn Quận/Huyện';
        $('selectDistrict').value = '';
        state.selectedDistrictName = '';
        state.districtList = [];
        renderDropdownList('district', []);
        
        $('wardLabel').textContent = 'Chọn Xã/Phường';
        $('selectWard').value = '';
        state.selectedWardName = '';
        state.wardList = [];
        renderDropdownList('ward', []);
        
        // Reset phí ship khi chọn tỉnh mới
        updateShippingByArea(name, '');
        
        try {
            let res = await fetch(`https://provinces.open-api.vn/api/v1/p/${code}?depth=2`);
            let data = null;
            if (res.ok) data = await res.json();
            if (!data || !data.districts || data.districts.length === 0) {
                res = await fetch(`/api/address/districts/${code}`);
                if (res.ok) data = await res.json();
            }
            if (!data || !data.districts || data.districts.length === 0) {
                res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
                if (res.ok) data = await res.json();
            }
            state.districtList = (data && data.districts) ? data.districts : [];
            renderDropdownList('district', state.districtList);
        } catch (e) {
            console.error(e);
            showToast("Lỗi tải danh sách Quận/Huyện!", "error");
        }
    } else if (type === 'district') {
        $('wardLabel').textContent = 'Chọn Xã/Phường';
        $('selectWard').value = '';
        state.selectedWardName = '';
        state.wardList = [];
        renderDropdownList('ward', []);
        
        try {
            let res = await fetch(`https://provinces.open-api.vn/api/v1/d/${code}?depth=2`);
            let data = null;
            if (res.ok) data = await res.json();
            if (!data || !data.wards || data.wards.length === 0) {
                res = await fetch(`/api/address/wards/${code}`);
                if (res.ok) data = await res.json();
            }
            if (!data || !data.wards || data.wards.length === 0) {
                res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
                if (res.ok) data = await res.json();
            }
            state.wardList = (data && data.wards) ? data.wards : [];
            renderDropdownList('ward', state.wardList);
        } catch (e) {
            console.error(e);
            showToast('Lỗi tải danh sách Xã/Phường!', 'error');
        }
        
        // Tính phí ship dựa theo quận/huyện và tỉnh/thành phố
        updateShippingByArea(state.selectedProvinceName, name);
        
    } else if (type === 'ward') {
        // Khi chọn xã/phường, phí ship đã tính từ bước quận/huyện → không thay đổi
    }
}

/**
 * Cập nhật phí ship dựa theo khu vực quận/huyện.
 * - Hà Nội nội thành (12 quận) → Miễn phí vận chuyển
 * - Hà Nội ngoại thành (huyện) hoặc tỉnh/thành khác → 30.000 đ
 *
 * @param {string} provinceName - Tên tỉnh/thành phố đã chọn
 * @param {string} districtName - Tên quận/huyện đã chọn (rỗng nếu chưa chọn)
 */
function updateShippingByArea(provinceName, districtName) {
    const distInfoEl = $('shippingDistanceInfo');

    if (!provinceName) {
        // Chưa chọn tỉnh/thành phố
        state.shippingFee = 0;
        if (distInfoEl) distInfoEl.textContent = '';
        calculatePricing();
        return;
    }

    const provLower = provinceName.toLowerCase();
    const isHanoi = provLower.includes('hà nội') || provLower.includes('ha noi');

    if (!isHanoi) {
        // Tỉnh/thành khác ngoài Hà Nội → phí 30k
        state.shippingFee = SHIP_FEE;
        if (distInfoEl) {
            distInfoEl.innerHTML = `🚚 Giao ngoài Hà Nội &bull; <span style="color:#f59e0b; font-weight:600;">Phí vận chuyển: 30.000 đ</span>`;
        }
        calculatePricing();
        return;
    }

    // Là Hà Nội → kiểm tra nội thành / ngoại thành
    if (!districtName) {
        // Chưa chọn quận/huyện
        state.shippingFee = 0;
        if (distInfoEl) {
            distInfoEl.innerHTML = `📍 Hà Nội &bull; <span style="color:#64748b;">Vui lòng chọn Quận/Huyện để tính phí ship</span>`;
        }
        calculatePricing();
        return;
    }

    if (isInnerHanoi(districtName)) {
        // Nội thành Hà Nội → Free ship
        state.shippingFee = 0;
        if (distInfoEl) {
            distInfoEl.innerHTML = `📍 Nội thành Hà Nội &bull; <span style="color:#10b981; font-weight:700;">Miễn phí vận chuyển! 🎉</span>`;
        }
    } else {
        // Ngoại thành Hà Nội (huyện) → phí 30k
        state.shippingFee = SHIP_FEE;
        if (distInfoEl) {
            distInfoEl.innerHTML = `📍 Ngoại thành Hà Nội &bull; <span style="color:#f59e0b; font-weight:600;">Phí vận chuyển: 30.000 đ</span>`;
        }
    }

    calculatePricing();
}



// Expose dropdown functions globally
window.toggleDropdown = toggleDropdown;
window.filterDropdown = filterDropdown;
window.selectOption = selectOption;

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-select')) {
        ['province', 'district', 'ward'].forEach(t => {
            const content = $(`${t}Content`);
            const select = $(`${t}Select`);
            if (content) content.style.display = 'none';
            if (select) select.classList.remove('active');
        });
    }
});

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
