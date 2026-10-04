/**
 * VHOES - Online Payment Gateway Card Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initPaymentDetails();
    startCountdownTimer(15 * 60);

    const btnPaid = document.getElementById('btnConfirmPaid');
    if (btnPaid) {
        btnPaid.addEventListener('click', handlePaidConfirmation);
    }

    const btnCancel = document.getElementById('btnCancelPay');
    if (btnCancel) {
        btnCancel.addEventListener('click', (e) => {
            e.preventDefault();
            const pendingStr = sessionStorage.getItem('pending_online_order');
            if (pendingStr) {
                try {
                    const pending = JSON.parse(pendingStr);
                    if (pending.checkoutItems && pending.checkoutItems.length > 0) {
                        localStorage.setItem('checkout_items', JSON.stringify(pending.checkoutItems));

                        // Restore items to cart as well if not already present
                        const cart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
                        const existingIds = new Set(cart.map(c => c.id));
                        pending.checkoutItems.forEach(item => {
                            if (!existingIds.has(item.id)) {
                                cart.push(item);
                            }
                        });
                        localStorage.setItem('vshoes_cart', JSON.stringify(cart));
                    }
                    if (pending.formData) {
                        sessionStorage.setItem('vshoes_checkout_prefill', JSON.stringify({
                            formData: pending.formData,
                            checkoutItems: pending.checkoutItems
                        }));
                    }
                } catch (err) {
                    console.error('Lỗi khi phục hồi dữ liệu thanh toán:', err);
                }
            }
            window.location.href = '/client/checkout';
        });
    }
});

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || '';
}

function initPaymentDetails() {
    const ma = getQueryParam('ma') || 'HD' + Date.now();
    const rawTotal = parseFloat(getQueryParam('total')) || 0;
    const method = (getQueryParam('method') || 'VNPAY').toUpperCase();

    // Format Amount
    const formattedAmount = rawTotal > 0 ? rawTotal.toLocaleString('vi-VN') + ' ₫' : '0 ₫';
    const amountTextEl = document.getElementById('amountText');
    const amountRawTextEl = document.getElementById('amountRawText');
    if (amountTextEl) amountTextEl.textContent = formattedAmount;
    if (amountRawTextEl) amountRawTextEl.textContent = rawTotal;

    // Memo
    const memoText = `THANH TOAN ${ma}`;
    const memoEl = document.getElementById('memoText');
    if (memoEl) memoEl.textContent = memoText;

    // Subtitle & Method Badge display
    const methodMap = {
        'VNPAY': 'CỔNG THANH TOÁN VNPAY QR',
        'MOMO': 'VÍ ĐIỆN TỬ MOMO',
        'ZALOPAY': 'VÍ ĐIỆN TỬ ZALOPAY',
        'VIETQR': 'CHUYỂN KHOẢN NGÂN HÀNG VIETQR'
    };
    const subTitleEl = document.getElementById('paymentMethodSubtitle');
    if (subTitleEl) {
        subTitleEl.textContent = `Phương thức: ${methodMap[method] || method}`;
    }

    const brandBadgeEl = document.getElementById('brandBadge');
    if (brandBadgeEl) {
        if (method === 'MOMO') {
            brandBadgeEl.textContent = 'Ví MoMo';
            brandBadgeEl.style.background = '#a50064';
        } else if (method === 'ZALOPAY') {
            brandBadgeEl.textContent = 'Ví ZaloPay';
            brandBadgeEl.style.background = 'linear-gradient(135deg,#0068ff,#00b4d8)';
        } else if (method === 'VNPAY') {
            brandBadgeEl.textContent = 'Ví VNPay';
            brandBadgeEl.style.background = 'linear-gradient(135deg,#005bac,#0073e6)';
        } else {
            brandBadgeEl.textContent = 'VietQR';
            brandBadgeEl.style.background = '#2563eb';
        }
    }

    // Dynamic Bank Name & Account Owner display
    const bankNameMap = {
        'VNPAY': 'Ví / Cổng Thanh Toán VNPay',
        'MOMO': 'Ví Điện Tử MoMo',
        'ZALOPAY': 'Ví Điện Tử ZaloPay',
        'VIETQR': 'MBBank (Ngân Hàng Quân Đội)'
    };
    const bankNameEl = document.getElementById('bankNameText');
    if (bankNameEl) {
        bankNameEl.textContent = bankNameMap[method] || 'MBBank (Ngân Hàng Quân Đội)';
    }

    const accountOwnerEl = document.getElementById('accountOwnerText');
    if (accountOwnerEl) {
        accountOwnerEl.textContent = 'VSHOES STORE - LE HUNG';
    }

    // VietQR Image Generation (MBBank - Account 0987033112 - VSHOES STORE LE HUNG)
    const qrImgEl = document.getElementById('qrCodeImg');
    if (qrImgEl) {
        const qrUrl = `https://img.vietqr.io/image/MB-0987033112-compact2.png?amount=${Math.round(rawTotal)}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent('VSHOES STORE LE HUNG')}`;
        qrImgEl.src = qrUrl;
    }
}

function copyText(elementId, labelName) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();

    navigator.clipboard.writeText(text).then(() => {
        showToast(`Đã sao chép ${labelName}: ${text}`, 'success');
    }).catch(err => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Đã sao chép ${labelName}: ${text}`, 'success');
    });
}

function startCountdownTimer(durationSeconds) {
    let timer = durationSeconds;
    const countdownEl = document.getElementById('countdownText');
    if (!countdownEl) return;

    const interval = setInterval(() => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;

        countdownEl.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (--timer < 0) {
            clearInterval(interval);
            countdownEl.textContent = 'HẾT GIỜ';
            showToast('Đơn hàng đã hết thời gian giữ! Vui lòng thao tác lại.', 'error');
        }
    }, 1000);
}

async function handlePaidConfirmation() {
    const idFromUrl = getQueryParam('id');
    const ma = getQueryParam('ma');
    const rawTotal = getQueryParam('total');
    const method = (getQueryParam('method') || 'VNPAY').toUpperCase();
    const btn = document.getElementById('btnConfirmPaid');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang xác thực thanh toán...';
    }

    const pendingStr = sessionStorage.getItem('pending_online_order');
    let orderId = idFromUrl;
    let orderMa = ma;
    let orderTotal = rawTotal;
    let pendingData = null;

    if (pendingStr) {
        try {
            pendingData = JSON.parse(pendingStr);
            if (pendingData.id) orderId = pendingData.id;
            if (pendingData.maHoaDon) orderMa = pendingData.maHoaDon;
            if (pendingData.total) orderTotal = pendingData.total;
        } catch (e) {
            console.warn('Could not parse pending_online_order:', e);
        }
    }

    try {
        let payload = pendingData ? pendingData.payload : null;
        let targetOrderId = orderId;

        if (targetOrderId) {
            // Đơn hàng đã được tạo sẵn từ trước, cập nhật xác nhận thanh toán
            const confirmRes = await fetch(`/api/hoa-don/${targetOrderId}/confirm-online-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: method })
            });

            if (!confirmRes.ok) {
                let errMsg = 'Lỗi khi xác nhận thanh toán';
                try {
                    const errBody = await confirmRes.json();
                    errMsg = errBody.error || errBody.message || errMsg;
                } catch (_) {
                    errMsg = (await confirmRes.text()) || errMsg;
                }
                throw new Error(errMsg);
            }

            const updatedOrder = await confirmRes.json();
            if (updatedOrder && updatedOrder.maHoaDon) orderMa = updatedOrder.maHoaDon;
            if (updatedOrder && updatedOrder.tongTien != null) orderTotal = updatedOrder.tongTien;

            // Gửi email xác nhận
            fetch(`/api/hoa-don/${targetOrderId}/send-email`, { method: 'POST' }).catch(err => console.warn('Lỗi gửi email:', err));
        } else if (payload) {
            // Fallback nếu chưa có orderId: tạo mới đơn hàng
            payload.ghiChu = (payload.ghiChu || '') + ` | [KHÁCH XÁC NHẬN ĐÃ THANH TOÁN QUA ${method}]`;

            const res = await fetch('/api/hoa-don/ban-hang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errMsg = 'Lỗi khi tạo đơn hàng';
                try {
                    const errBody = await res.json();
                    errMsg = errBody.error || errBody.message || errMsg;
                } catch (_) {
                    errMsg = (await res.text()) || errMsg;
                }
                throw new Error(errMsg);
            }

            const newOrder = await res.json();
            targetOrderId = newOrder.id;
            orderMa = newOrder.maHoaDon;
            orderTotal = newOrder.tongTien;

            if (targetOrderId) {
                fetch(`/api/hoa-don/${targetOrderId}/send-email`, { method: 'POST' }).catch(err => console.warn('Lỗi gửi email:', err));
            }
        } else {
            throw new Error('Không tìm thấy thông tin đơn hàng. Vui lòng kiểm tra lại đơn hàng!');
        }

        // Xóa các sản phẩm đã mua khỏi giỏ hàng
        if (payload && payload.items && Array.isArray(payload.items)) {
            const purchasedIds = payload.items.map(item => item.sanPhamChiTietId);
            const generalCart = JSON.parse(localStorage.getItem('vshoes_cart') || '[]');
            const remainingCart = generalCart.filter(item => !purchasedIds.includes(item.id));
            localStorage.setItem('vshoes_cart', JSON.stringify(remainingCart));
            localStorage.removeItem('checkout_items');
        } else {
            localStorage.removeItem('checkout_items');
        }

        // Xóa thông tin phiên thanh toán tạm
        sessionStorage.removeItem('pending_online_order');

        showToast('Đã ghi nhận thanh toán! Đơn hàng đang chờ xác nhận.', 'success');

        setTimeout(() => {
            window.location.href = `/client/checkout/success?ma=${encodeURIComponent(orderMa || '')}&total=${encodeURIComponent(orderTotal || 0)}&status=${encodeURIComponent('chờ xác nhận')}`;
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast('' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Tôi Đã Thanh Toán (Xác Nhận)';
        }
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
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
