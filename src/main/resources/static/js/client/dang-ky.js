/**
 * VHOES - Customer Registration Form Handling
 */

let provinceListReg = [];
let districtListReg = [];
let wardListReg = [];

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegistration);
} else {
    initRegistration();
}

function initRegistration() {
    const btnSubmit = document.getElementById('btnRegisterSubmit');
    if (btnSubmit && !btnSubmit.dataset.bound) {
        btnSubmit.dataset.bound = 'true';
        btnSubmit.addEventListener('click', handleRegister);
    }
    
    // Add input listeners to clear errors on type
    ['inputHoTen', 'inputEmail', 'inputPhone', 'inputDob', 'inputPassword', 'inputConfirmPassword'].forEach(id => {
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

    // Load locations for registration
    loadProvincesReg();

    const selProv = document.getElementById('selectProvince');
    const selDist = document.getElementById('selectDistrict');

    if (selProv && !selProv.dataset.bound) {
        selProv.dataset.bound = 'true';
        selProv.addEventListener('change', async (e) => {
            await loadDistrictsReg(e.target.value);
        });
    }

    if (selDist && !selDist.dataset.bound) {
        selDist.dataset.bound = 'true';
        selDist.addEventListener('change', async (e) => {
            await loadWardsReg(e.target.value);
        });
    }
}

async function loadProvincesReg() {
    try {
        const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
        if (!res.ok) return;
        provinceListReg = await res.json();
        const sel = document.getElementById('selectProvince');
        if (sel) {
            sel.innerHTML = '<option value="">Chọn Tỉnh/Thành phố</option>' + 
                provinceListReg.map(p => `<option value="${p.code}">${p.name}</option>`).join('');
        }
    } catch (e) {
        console.warn('Failed to load provinces in registration', e);
    }
}

async function loadDistrictsReg(provCode) {
    const selDist = document.getElementById('selectDistrict');
    const selWard = document.getElementById('selectWard');
    if (selDist) selDist.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
    if (selWard) selWard.innerHTML = '<option value="">Chọn Xã/Phường</option>';
    districtListReg = [];
    wardListReg = [];
    if (!provCode) return;

    try {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${provCode}?depth=2`);
        if (!res.ok) return;
        const data = await res.json();
        districtListReg = data.districts || [];
        if (selDist) {
            selDist.innerHTML = '<option value="">Chọn Quận/Huyện</option>' + 
                districtListReg.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
        }
    } catch (e) {
        console.warn('Failed to load districts in registration', e);
    }
}

async function loadWardsReg(distCode) {
    const selWard = document.getElementById('selectWard');
    if (selWard) selWard.innerHTML = '<option value="">Chọn Xã/Phường</option>';
    wardListReg = [];
    if (!distCode) return;

    try {
        const res = await fetch(`https://provinces.open-api.vn/api/d/${distCode}?depth=2`);
        if (!res.ok) return;
        const data = await res.json();
        wardListReg = data.wards || [];
        if (selWard) {
            selWard.innerHTML = '<option value="">Chọn Xã/Phường</option>' + 
                wardListReg.map(w => `<option value="${w.code}">${w.name}</option>`).join('');
        }
    } catch (e) {
        console.warn('Failed to load wards in registration', e);
    }
}

async function handleRegister() {
    const hoTen = document.getElementById('inputHoTen');
    const email = document.getElementById('inputEmail');
    const phone = document.getElementById('inputPhone');
    const dob = document.getElementById('inputDob');
    const password = document.getElementById('inputPassword');
    const confirmPassword = document.getElementById('inputConfirmPassword');
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const genderVal = genderEl ? genderEl.value : 'true';
    
    let hasError = false;
    
    // Clear previous states
    [hoTen, email, phone, dob, password, confirmPassword].forEach(el => el.classList.remove('invalid'));
    ['errorHoTen', 'errorEmail', 'errorPhone', 'errorDob', 'errorPassword', 'errorConfirmPassword'].forEach(id => {
        const err = document.getElementById(id);
        err.style.display = 'none';
        err.textContent = '';
    });
    
    // 1. Validate Ho Ten
    if (!hoTen.value.trim()) {
        showInputError('HoTen', 'Họ và tên không được để trống!');
        hasError = true;
    } else if (hoTen.value.trim().length < 2) {
        showInputError('HoTen', 'Họ và tên phải dài từ 2 ký tự trở lên!');
    }
    
    // 2. Validate Email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
    if (!email.value.trim()) {
        showInputError('Email', 'Email không được để trống!');
        hasError = true;
    } else if (!email.value.trim().match(emailRegex)) {
        showInputError('Email', 'Email không đúng định dạng!');
        hasError = true;
    }
    
    // 3. Validate Phone
    const phoneRegex = /^(0[35789])[0-9]{8}$/;
    if (!phone.value.trim()) {
        showInputError('Phone', 'Số điện thoại không được để trống!');
        hasError = true;
    } else if (!phone.value.trim().match(phoneRegex)) {
        showInputError('Phone', 'Số điện thoại phải đúng 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09!');
        hasError = true;
    }
    
    // 4. Validate DOB
    if (dob.value.trim()) {
        const dobDate = new Date(dob.value.trim());
        const today = new Date();
        if (dobDate > today) {
            showInputError('Dob', 'Ngày sinh không được vượt quá ngày hiện tại!');
            hasError = true;
        }
    }
    
    // 5. Validate Password
    if (!password.value.trim()) {
        showInputError('Password', 'Mật khẩu không được để trống!');
        hasError = true;
    } else if (password.value.trim().length < 6) {
        showInputError('Password', 'Mật khẩu phải chứa ít nhất 6 ký tự!');
        hasError = true;
    }
    
    // 6. Validate Confirm Password
    if (!confirmPassword.value.trim()) {
        showInputError('ConfirmPassword', 'Vui lòng xác nhận mật khẩu!');
        hasError = true;
    } else if (confirmPassword.value.trim() !== password.value.trim()) {
        showInputError('ConfirmPassword', 'Mật khẩu xác nhận không trùng khớp!');
        hasError = true;
    }
    
    if (hasError) return;
    
    // Construct address string
    const specificAddr = (document.getElementById('inputAddress')?.value || '').trim();
    const selP = document.getElementById('selectProvince');
    const selD = document.getElementById('selectDistrict');
    const selW = document.getElementById('selectWard');

    const pName = selP && selP.selectedIndex > 0 ? selP.options[selP.selectedIndex].text : '';
    const dName = selD && selD.selectedIndex > 0 ? selD.options[selD.selectedIndex].text : '';
    const wName = selW && selW.selectedIndex > 0 ? selW.options[selW.selectedIndex].text : '';

    let fullAddress = [specificAddr, wName, dName, pName].filter(Boolean).join(', ');

    const btnSubmit = document.getElementById('btnRegisterSubmit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Đang xử lý đăng ký...';
    
    try {
        const res = await fetch('/api/auth/dang-ky', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hoTen: hoTen.value.trim(),
                email: email.value.trim(),
                soDienThoai: phone.value.trim(),
                ngaySinh: dob.value.trim(),
                matKhau: password.value.trim(),
                gioiTinh: genderVal,
                diaChi: fullAddress
            })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('Đăng ký tài khoản thành công!', 'success');
            
            setTimeout(() => {
                window.location.href = '/trang-chu';
            }, 1000);
        } else {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Đăng Ký Tài Khoản';
            
            const fieldMap = {
                hoTen: 'HoTen',
                email: 'Email',
                soDienThoai: 'Phone',
                matKhau: 'Password',
                ngaySinh: 'Dob'
            };
            
            let firstErrMsg = data.message || '';
            
            // Show backend validations under input fields
            if (data.errors) {
                const errMsgs = [];
                Object.keys(data.errors).forEach(field => {
                    const targetId = fieldMap[field] || (field.charAt(0).toUpperCase() + field.slice(1));
                    showInputError(targetId, data.errors[field]);
                    errMsgs.push(data.errors[field]);
                });
                if (!firstErrMsg && errMsgs.length > 0) {
                    firstErrMsg = errMsgs.join('. ');
                }
            }
            
            showToast(firstErrMsg || 'Đăng ký thất bại. Vui lòng kiểm tra lại!', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Không thể kết nối máy chủ!', 'error');
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Đăng Ký Tài Khoản';
    }
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
