/**
 * VHOES - Customer Login Form Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'inactive') {
        showToast('Trạng thái đăng nhập đã hết hạn hoặc tài khoản bị khóa!', 'error');
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    const btnSubmit = document.getElementById('btnLoginSubmit');
    if (btnSubmit && !loginForm) {
        btnSubmit.addEventListener('click', handleLogin);
    }
    
    // Add input listeners to clear errors on type
    ['inputEmailOrPhone', 'inputPassword'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                input.classList.remove('invalid');
                const errText = document.getElementById('error' + id.substring(5));
                if (errText) {
                    errText.style.display = 'none';
                    errText.textContent = '';
                }
            });
        }
    });
});

async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const emailOrPhone = document.getElementById('inputEmailOrPhone');
    const password = document.getElementById('inputPassword');
    
    let hasError = false;
    
    // Clear previous states
    [emailOrPhone, password].forEach(el => el.classList.remove('invalid'));
    ['errorEmailOrPhone', 'errorPassword'].forEach(id => {
        const err = document.getElementById(id);
        if (err) {
            err.style.display = 'none';
            err.textContent = '';
        }
    });
    
    // Validate
    if (!emailOrPhone.value.trim()) {
        showInputError('EmailOrPhone', 'Email hoặc Số điện thoại không được để trống!');
        hasError = true;
    }
    
    if (!password.value.trim()) {
        showInputError('Password', 'Mật khẩu không được để trống!');
        hasError = true;
    }
    
    if (hasError) return false;
    
    const btnSubmit = document.getElementById('btnLoginSubmit');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang xử lý đăng nhập...';
    }
    
    try {
        const res = await fetch('/api/auth/dang-nhap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailOrPhone: emailOrPhone.value.trim(),
                matKhau: password.value.trim()
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('🎉 Đăng nhập thành công!', 'success');
            
            setTimeout(() => {
                const ref = document.referrer;
                if (ref && (ref.includes('/client/checkout') || ref.includes('/client/cart') || ref.includes('/client/san-pham'))) {
                    window.location.href = ref;
                } else {
                    window.location.href = '/trang-chu';
                }
            }, 1000);
        } else {
            showToast(data.message || 'Đăng nhập thất bại. Vui lòng thử lại!', 'error');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Đăng Nhập';
            }
            
            if (data.message && data.message.includes('Mật khẩu')) {
                showInputError('Password', data.message);
            } else {
                showInputError('EmailOrPhone', data.message || 'Tài khoản không chính xác');
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Không thể kết nối máy chủ!', 'error');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Đăng Nhập';
        }
    }
    return false;
}

function showInputError(field, message) {
    const input = document.getElementById('input' + field);
    const errText = document.getElementById('error' + field);
    if (input) input.classList.add('invalid');
    if (errText) {
        errText.textContent = message;
        errText.style.display = 'block';
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
