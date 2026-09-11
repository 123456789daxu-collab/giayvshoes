(async function () {
    const params = new URLSearchParams(window.location.search);

    const responseCode = params.get('vnp_ResponseCode') || '';
    const txnRef       = params.get('vnp_TxnRef') || '';
    const transNo      = params.get('vnp_TransactionNo') || '';
    const amountRaw    = params.get('vnp_Amount') || '0';
    const bankCode     = params.get('vnp_BankCode') || '';
    const payDate      = params.get('vnp_PayDate') || '';
    const secureHash   = params.get('vnp_SecureHash') || '';

    const amount = parseInt(amountRaw) / 100;
    const fmtAmount = amount.toLocaleString('vi-VN') + ' đ';

    function fmtDate(s) {
        if (!s || s.length < 14) return s;
        return `${s.substring(6,8)}/${s.substring(4,6)}/${s.substring(0,4)} ${s.substring(8,10)}:${s.substring(10,12)}:${s.substring(12,14)}`;
    }

    let isSuccess = responseCode === '00';
    let ipnError = null;

    // Xác thực và cập nhật DB qua IPN-like call (server sẽ verify chữ ký)
    if (isSuccess && txnRef) {
        try {
            const ipnRes = await fetch(`/api/payment/vnpay/ipn?${window.location.search.substring(1)}`);
            const ipnData = await ipnRes.json().catch(() => ({}));
            if (ipnData && ipnData.RspCode && ipnData.RspCode !== '00') {
                isSuccess = false;
                ipnError = ipnData.Message || 'Số lượng tồn kho không đủ hoặc xảy ra lỗi xác nhận đơn hàng';
            }
        } catch (e) { 
            console.warn('IPN call failed:', e); 
        }
    }

    // Hiển thị kết quả
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultState').style.display  = 'block';

    const iconCircle  = document.getElementById('iconCircle');
    const titleText   = document.getElementById('titleText');
    const subtitleText= document.getElementById('subtitleText');
    const infoRows    = document.getElementById('infoRows');

    if (isSuccess) {
        iconCircle.className = 'icon-circle success';
        iconCircle.innerHTML = `<i data-lucide="check-circle-2" style="width: 44px; height: 44px; color: #10b981;"></i>`;
        titleText.textContent    = 'Thanh toán thành công!';
        titleText.style.color    = '#0f172a';
        subtitleText.textContent = 'Giao dịch VNPay của bạn đã được xác nhận. Cảm ơn bạn đã mua hàng!';
        infoRows.innerHTML = `
            <div class="info-row"><span class="info-label">Mã đơn hàng</span><span class="info-value">${txnRef}</span></div>
            <div class="info-row"><span class="info-label">Mã giao dịch VNPay</span><span class="info-value">${transNo}</span></div>
            <div class="info-row"><span class="info-label">Số tiền</span><span class="info-value" style="color:#e53e3e;">${fmtAmount}</span></div>
            <div class="info-row"><span class="info-label">Ngân hàng</span><span class="info-value">${bankCode}</span></div>
            <div class="info-row"><span class="info-label">Thời gian</span><span class="info-value">${fmtDate(payDate)}</span></div>
        `;
    } else {
        iconCircle.className = 'icon-circle fail';
        iconCircle.innerHTML = `<i data-lucide="x-circle" style="width: 44px; height: 44px; color: #ef4444;"></i>`;
        const codeMsg = {
            '07': 'Giao dịch bị nghi ngờ gian lận',
            '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
            '10': 'Xác thực thông tin không thành công quá 3 lần',
            '11': 'Đã hết hạn chờ thanh toán',
            '12': 'Thẻ/Tài khoản bị khóa',
            '13': 'Sai mật khẩu OTP',
            '24': 'Khách hàng hủy giao dịch',
            '51': 'Tài khoản không đủ số dư',
            '65': 'Tài khoản vượt hạn mức giao dịch trong ngày',
            '75': 'Ngân hàng đang bảo trì',
            '79': 'Sai mật khẩu thanh toán quá số lần quy định',
            '99': 'Lỗi không xác định',
        };
        const msg = ipnError || codeMsg[responseCode] || `Lỗi mã: ${responseCode}`;
        titleText.textContent    = 'Thanh toán không thành công';
        titleText.style.color    = '#ef4444';
        subtitleText.textContent = msg + '. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
        infoRows.innerHTML = `
            <div class="info-row"><span class="info-label">Mã đơn hàng</span><span class="info-value">${txnRef}</span></div>
            <div class="info-row"><span class="info-label">Chi tiết</span><span class="info-value" style="color:#ef4444;">${msg}</span></div>
        `;
    }

    if (window.lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch(e) {
            console.warn('Lucide icon init warning:', e);
        }
    }
})();
