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
        btnCancel.addEventListener('click', () => {
            sessionStorage.removeItem('pending_online_order');
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
        showToast(`📋 Đã sao chép ${labelName}: ${text}`, 'success');
    }).catch(err => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`📋 Đã sao chép ${labelName}: ${text}`, 'success');
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
            showToast('⚠️ Đơn hàng đã hết thời gian giữ! Vui lòng thao tác lại.', 'error');
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
        } catch (e) {}
    }

    try {
        if (orderId) {
            // Khách xác nhận đã chuyển khoản → CHỈ ghi chú vào đơn hàng, KHÔNG tự xác nhận
            // Admin sẽ kiểm tra thực tế và xác nhận thủ công trên trang quản lý
            const notePayload = {
                ghiChu: `[KHÁCH XÁC NHẬN ĐÃ THANH TOÁN] qua ${method} lúc ${new Date().toLocaleString('vi-VN')}. Vui lòng kiểm tra và xác nhận!`
            };

            await fetch(`/api/auth/tracking/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notePayload)
            });

            // Gửi email xác nhận cho khách
            fetch(`/api/hoa-don/${orderId}/send-email`, { method: 'POST' }).catch(err => console.warn('Lỗi gửi email:', err));
        } else if (pendingData && pendingData.payload) {
            // Trường hợp dự phòng nếu đơn hàng chưa có ID: tạo hóa đơn mới
            const res = await fetch('/api/hoa-don/ban-hang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingData.payload)
            });
            if (res.ok) {
                const newOrder = await res.json();
                orderMa = newOrder.maHoaDon;
                orderTotal = newOrder.tongTien;
                fetch(`/api/hoa-don/${newOrder.id}/send-email`, { method: 'POST' }).catch(err => console.warn(err));
            }
        }

        // Xóa thông tin giỏ hàng và phiên thanh toán tạm
        sessionStorage.removeItem('pending_online_order');

        showToast('✅ Đã ghi nhận thanh toán! Đơn hàng đang chờ admin xác nhận.', 'success');

        setTimeout(() => {
            window.location.href = `/client/checkout/success?ma=${encodeURIComponent(orderMa)}&total=${encodeURIComponent(orderTotal)}&status=${encodeURIComponent('chờ xác nhận thanh toán')}`;
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast('❌ ' + err.message, 'error');
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
