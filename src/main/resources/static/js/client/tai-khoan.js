/**
 * VHOES - Client Account Management JS (tai-khoan.js)
 * Supports Multi-Address Management with Default Selection
 */

let currentUserData = null;
let myOrdersList = [];
let myAddressesList = [];
let currentOrderFilterStatus = "";

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

    await loadAccountData();
    await loadMyAddresses();
    setupTabSwitching();
    setupProfileForm();
    setupAddressModal();
    setupPasswordForm();
    setupOrderFilterTabs();
    setupLogout();
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadAccountData() {
    try {
        const res = await fetch('/api/auth/current-user');
        if (!res.ok) {
            window.location.href = '/client/dang-nhap';
            return;
        }
        const data = await res.json();
        if (!data.loggedIn || !data.user) {
            window.location.href = '/client/dang-nhap';
            return;
        }

        currentUserData = data.user;
        renderAccountInfo(currentUserData);
        await loadMyOrders();

    } catch (e) {
        console.error("Error loading account data:", e);
    }
}

function renderAccountInfo(user) {
    const name = user.hoTen || 'Khách Hàng';
    const firstChar = name.charAt(0).toUpperCase();

    // Sidebar summary
    const avatarCircle = document.getElementById('userAvatarCircle');
    if (avatarCircle) avatarCircle.textContent = firstChar;

    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = name;

    const sidebarCode = document.getElementById('sidebarUserCode');
    if (sidebarCode) sidebarCode.textContent = user.maKhachHang || ('KH' + user.id);

    // Profile form
    if (document.getElementById('accHoTen')) document.getElementById('accHoTen').value = user.hoTen || '';
    if (document.getElementById('accSoDienThoai')) document.getElementById('accSoDienThoai').value = user.soDienThoai || '';
    if (document.getElementById('accEmail')) document.getElementById('accEmail').value = user.email || '';
    if (document.getElementById('accMaKhachHang')) document.getElementById('accMaKhachHang').value = user.maKhachHang || ('KH' + user.id);
    if (document.getElementById('accNgaySinh')) document.getElementById('accNgaySinh').value = user.ngaySinh || '';
    if (document.getElementById('accGioiTinh')) document.getElementById('accGioiTinh').value = String(user.gioiTinh !== false);
}

function setupTabSwitching() {
    const navBtns = document.querySelectorAll('.account-nav-btn[data-tab]');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            navBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) targetPane.classList.add('active');

            if (targetTab === 'tabAddress') {
                loadMyAddresses();
            } else if (targetTab === 'tabOrders') {
                loadMyOrders();
            }
        });
    });
}

function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            hoTen: document.getElementById('accHoTen').value.trim(),
            soDienThoai: document.getElementById('accSoDienThoai').value.trim(),
            email: document.getElementById('accEmail').value.trim(),
            ngaySinh: document.getElementById('accNgaySinh').value,
            gioiTinh: document.getElementById('accGioiTinh').value
        };

        try {
            const res = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert('🎉 Cập nhật thông tin cá nhân thành công!');
                loadAccountData();
            } else {
                alert(data.message || 'Cập nhật thông tin thất bại!');
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi kết nối máy chủ!');
        }
    });
}

/* ============================================================
   MULTI-ADDRESS MANAGEMENT
   ============================================================ */
async function loadMyAddresses() {
    try {
        const res = await fetch('/api/client/dia-chi/list');
        if (res.ok) {
            myAddressesList = await res.json();
        } else {
            console.warn("Failed to fetch address list, status:", res.status);
            myAddressesList = [];
        }
        renderMyAddresses();
    } catch (e) {
        console.error("Error loading addresses:", e);
        myAddressesList = [];
        renderMyAddresses();
    }
}

function renderMyAddresses() {
    const container = document.getElementById('addressListContainer');
    if (!container) return;

    if (!myAddressesList || myAddressesList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 12px; border: 1px dashed var(--border);">
                <i data-lucide="map-pin-off" style="width: 40px; height: 40px; color: #94a3b8; margin-bottom: 10px;"></i>
                <div style="font-weight: 700; color: #475569; font-size: 15px;">Chưa có địa chỉ nhận hàng nào</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px; margin-bottom: 16px;">Vui lòng thêm địa chỉ để thuận tiện nhận hàng</div>
                <button class="btn-acc-primary" onclick="openAddressModal()" style="width: auto; padding: 8px 18px; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; border-radius: 8px;">
                    <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i> Thêm địa chỉ mới
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    container.innerHTML = myAddressesList.map(addr => {
        const isDefault = Boolean(addr.macDinh);
        const name = escapeHtml(addr.tenNguoiNhan || (currentUserData ? currentUserData.hoTen : '') || 'Người nhận');
        const phone = escapeHtml(addr.sdt || (currentUserData ? currentUserData.soDienThoai : '') || '');
        const loai = escapeHtml(addr.loaiDiaChi || 'Nhà riêng');

        const parts = [];
        if (addr.diaChiChiTiet && addr.diaChiChiTiet.trim()) parts.push(addr.diaChiChiTiet.trim());
        if (addr.phuongXa && addr.phuongXa.trim()) parts.push(addr.phuongXa.trim());
        if (addr.quanHuyen && addr.quanHuyen.trim()) parts.push(addr.quanHuyen.trim());
        if (addr.tinhThanh && addr.tinhThanh.trim()) parts.push(addr.tinhThanh.trim());

        const fullAddrStr = escapeHtml(parts.length > 0 ? parts.join(', ') : 'Chưa có địa chỉ');

        return `
            <div style="background: white; border: 1.5px solid ${isDefault ? '#0284c7' : 'var(--border)'}; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); position: relative; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <strong style="font-size: 15px; color: #0f172a;">${name}</strong>
                        ${phone ? `<span style="color: #64748b; font-size: 13px; font-weight: 600;">(${phone})</span>` : ''}
                        <span style="font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px;">${loai === 'Văn phòng' ? '🏢 Văn phòng' : '🏠 Nhà riêng'}</span>
                        ${isDefault ? `<span style="font-size: 11px; font-weight: 800; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; padding: 3px 10px; border-radius: 4px;">✓ Địa chỉ mặc định</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editAddress(${addr.id})" style="background: none; border: none; color: #0284c7; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='none'">
                            ✏️ Sửa
                        </button>
                        ${!isDefault ? `
                            <button onclick="deleteAddress(${addr.id})" style="background: none; border: none; color: #ef4444; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                                🗑️ Xóa
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 12px;">
                    📍 ${fullAddrStr}
                </div>
                ${!isDefault ? `
                    <div style="display: flex; justify-content: flex-end;">
                        <button onclick="setDefaultAddress(${addr.id})" style="background: white; border: 1px solid #cbd5e1; color: #475569; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0284c7'; this.style.color='#0284c7'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#475569'">
                            Đặt làm mặc định
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

let provincesCache = null;

window.handleProvinceChange = function() {
    const provSelect = document.getElementById('addrTinhThanh');
    if (!provSelect) return;
    const selectedOpt = provSelect.options[provSelect.selectedIndex];
    let provCode = selectedOpt ? selectedOpt.dataset.code : null;
    if (!provCode && selectedOpt && selectedOpt.value && provincesCache) {
        const found = provincesCache.find(p => p.name === selectedOpt.value || String(p.code) === selectedOpt.value);
        if (found) provCode = found.code;
    }
    loadDistrictsForModal(provCode);
};

window.handleDistrictChange = function() {
    const distSelect = document.getElementById('addrQuanHuyen');
    if (!distSelect) return;
    const selectedOpt = distSelect.options[distSelect.selectedIndex];
    const distCode = selectedOpt ? selectedOpt.dataset.code : null;
    loadWardsForModal(distCode);
};

async function fetchProvincesForModal() {
    const provSelect = document.getElementById('addrTinhThanh');
    if (!provSelect) return;

    if (provincesCache && provincesCache.length > 0) {
        populateProvinceSelect(provSelect, provincesCache);
        return;
    }

    try {
        let data = null;
        try {
            const res = await fetch('https://provinces.open-api.vn/api/v1/p/');
            if (res.ok) data = await res.json();
        } catch (e) {}

        if (!Array.isArray(data) || data.length === 0) {
            try {
                const res = await fetch('/api/address/provinces');
                if (res.ok) data = await res.json();
            } catch (e) {}
        }

        if (!Array.isArray(data) || data.length === 0) {
            try {
                const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
                if (res.ok) data = await res.json();
            } catch (e) {}
        }

        if (Array.isArray(data) && data.length > 0) {
            provincesCache = data;
            populateProvinceSelect(provSelect, data);
        }
    } catch (e) {
        console.error("Failed to load provinces:", e);
    }
}

function populateProvinceSelect(selectEl, provinces) {
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">Chọn Tỉnh / Thành phố</option>';
    provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.dataset.code = p.code;
        opt.textContent = p.name;
        selectEl.appendChild(opt);
    });
    if (currentVal) selectEl.value = currentVal;
}

async function loadDistrictsForModal(provinceCode, selectedDistrictName = null, selectedWardName = null) {
    const distSelect = document.getElementById('addrQuanHuyen');
    const wardSelect = document.getElementById('addrPhuongXa');
    if (!distSelect || !wardSelect) return;

    distSelect.innerHTML = '<option value="">Chọn Quận / Huyện</option>';
    distSelect.disabled = true;
    wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
    wardSelect.disabled = true;

    if (!provinceCode) return;

    try {
        let data = null;
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/v1/p/${provinceCode}?depth=2`);
            if (res.ok) data = await res.json();
        } catch (err) {}

        if (!data || !data.districts || data.districts.length === 0) {
            try {
                const res = await fetch(`/api/address/districts/${provinceCode}`);
                if (res.ok) data = await res.json();
            } catch (err) {}
        }

        if (!data || !data.districts || data.districts.length === 0) {
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
                if (res.ok) data = await res.json();
            } catch (err) {}
        }

        if (data && Array.isArray(data.districts) && data.districts.length > 0) {
            distSelect.innerHTML = '<option value="">Chọn Quận / Huyện</option>';
            data.districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.dataset.code = d.code;
                opt.textContent = d.name;
                distSelect.appendChild(opt);
            });
            distSelect.disabled = false;

            if (selectedDistrictName) {
                distSelect.value = selectedDistrictName;
                const matchedOption = Array.from(distSelect.options).find(o => o.value === selectedDistrictName || o.textContent === selectedDistrictName);
                if (matchedOption && matchedOption.dataset.code) {
                    await loadWardsForModal(matchedOption.dataset.code, selectedWardName);
                }
            }
        }
    } catch (e) {
        console.error("Failed to load districts:", e);
    }
}

async function loadWardsForModal(districtCode, selectedWardName = null) {
    const wardSelect = document.getElementById('addrPhuongXa');
    if (!wardSelect) return;

    wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
    wardSelect.disabled = true;

    if (!districtCode) return;

    try {
        let data = null;
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/v1/d/${districtCode}?depth=2`);
            if (res.ok) data = await res.json();
        } catch (err) {}

        if (!data || !data.wards || data.wards.length === 0) {
            try {
                const res = await fetch(`/api/address/wards/${districtCode}`);
                if (res.ok) data = await res.json();
            } catch (err) {}
        }

        if (!data || !data.wards || data.wards.length === 0) {
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
                if (res.ok) data = await res.json();
            } catch (err) {}
        }

        if (data && Array.isArray(data.wards) && data.wards.length > 0) {
            wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
            data.wards.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.name;
                opt.dataset.code = w.code;
                opt.textContent = w.name;
                wardSelect.appendChild(opt);
            });
            wardSelect.disabled = false;

            if (selectedWardName) {
                wardSelect.value = selectedWardName;
            }
        }
    } catch (e) {
        console.error("Failed to load wards:", e);
    }
}

function setupAddressModal() {
    const btnOpen = document.getElementById('btnOpenAddAddressModal');
    const modal = document.getElementById('modalAddress');
    const btnClose = document.getElementById('btnCloseAddressModal');
    const btnCancel = document.getElementById('btnCancelAddressModal');
    const form = document.getElementById('addressForm');
    const provSelect = document.getElementById('addrTinhThanh');
    const distSelect = document.getElementById('addrQuanHuyen');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            openAddressModal();
        });
    }

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (provSelect) {
        provSelect.addEventListener('change', window.handleProvinceChange);
    }

    if (distSelect) {
        distSelect.addEventListener('change', window.handleDistrictChange);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('addrId').value;
            const tenNguoiNhan = document.getElementById('addrTenNguoiNhan').value.trim();
            const sdt = document.getElementById('addrSdt').value.trim();
            const tinhThanh = document.getElementById('addrTinhThanh') ? document.getElementById('addrTinhThanh').value.trim() : '';
            const quanHuyen = document.getElementById('addrQuanHuyen') ? document.getElementById('addrQuanHuyen').value.trim() : '';
            const phuongXa = document.getElementById('addrPhuongXa') ? document.getElementById('addrPhuongXa').value.trim() : '';
            const diaChiChiTiet = document.getElementById('accDiaChiChiTiet').value.trim();
            const loaiRadio = document.querySelector('input[name="addrLoai"]:checked');
            const loaiDiaChi = loaiRadio ? loaiRadio.value : 'Nhà riêng';
            const macDinh = document.getElementById('addrMacDinh').checked;

            if (!tinhThanh) {
                alert('Vui lòng chọn Tỉnh / Thành phố!');
                return;
            }
            if (!quanHuyen) {
                alert('Vui lòng chọn Quận / Huyện!');
                return;
            }
            if (!phuongXa) {
                alert('Vui lòng chọn Phường / Xã!');
                return;
            }
            if (!diaChiChiTiet) {
                alert('Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường...)!');
                return;
            }

            const payload = {
                id: id ? parseInt(id) : null,
                tenNguoiNhan: tenNguoiNhan,
                sdt: sdt,
                tinhThanh: tinhThanh,
                quanHuyen: quanHuyen,
                phuongXa: phuongXa,
                diaChiChiTiet: diaChiChiTiet,
                loaiDiaChi: loaiDiaChi,
                macDinh: macDinh
            };

            try {
                const res = await fetch('/api/client/dia-chi/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert('🎉 ' + data.message);
                    closeModal();
                    await loadMyAddresses();
                } else {
                    alert(data.message || 'Lưu địa chỉ thất bại!');
                }
            } catch (err) {
                console.error(err);
                alert('Lỗi kết nối máy chủ!');
            }
        });
    }
}

window.openAddressModal = async function(addr = null) {
    const modal = document.getElementById('modalAddress');
    if (!modal) return;

    await fetchProvincesForModal();

    const title = document.getElementById('modalAddressTitle');
    const idInput = document.getElementById('addrId');
    const nameInput = document.getElementById('addrTenNguoiNhan');
    const phoneInput = document.getElementById('addrSdt');
    const provSelect = document.getElementById('addrTinhThanh');
    const distSelect = document.getElementById('addrQuanHuyen');
    const wardSelect = document.getElementById('addrPhuongXa');
    const detailInput = document.getElementById('accDiaChiChiTiet');
    const macDinhCheckbox = document.getElementById('addrMacDinh');

    if (addr) {
        if (title) title.innerHTML = '<i data-lucide="edit" style="color: #0284c7; width: 20px; height: 20px;"></i> Chỉnh sửa địa chỉ';
        if (idInput) idInput.value = addr.id || '';
        if (nameInput) nameInput.value = addr.tenNguoiNhan || (currentUserData ? currentUserData.hoTen || '' : '');
        if (phoneInput) phoneInput.value = addr.sdt || (currentUserData ? currentUserData.soDienThoai || '' : '');
        if (detailInput) detailInput.value = addr.diaChiChiTiet || '';
        if (macDinhCheckbox) macDinhCheckbox.checked = Boolean(addr.macDinh);

        const radios = document.querySelectorAll('input[name="addrLoai"]');
        radios.forEach(r => {
            r.checked = (r.value === (addr.loaiDiaChi || 'Nhà riêng'));
        });

        // Populate province / district / ward
        if (addr.tinhThanh && provSelect) {
            provSelect.value = addr.tinhThanh;
            const matchedProvOpt = Array.from(provSelect.options).find(o => o.value === addr.tinhThanh || o.textContent === addr.tinhThanh);
            if (matchedProvOpt && matchedProvOpt.dataset.code) {
                await loadDistrictsForModal(matchedProvOpt.dataset.code, addr.quanHuyen, addr.phuongXa);
            } else {
                if (distSelect) {
                    distSelect.innerHTML = '<option value="">Chọn Quận / Huyện</option>';
                    distSelect.disabled = true;
                }
                if (wardSelect) {
                    wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
                    wardSelect.disabled = true;
                }
            }
        } else {
            if (provSelect) provSelect.value = '';
            if (distSelect) {
                distSelect.innerHTML = '<option value="">Chọn Quận / Huyện</option>';
                distSelect.disabled = true;
            }
            if (wardSelect) {
                wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
                wardSelect.disabled = true;
            }
        }
    } else {
        if (title) title.innerHTML = '<i data-lucide="plus-circle" style="color: #0284c7; width: 20px; height: 20px;"></i> Thêm địa chỉ mới';
        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = currentUserData ? currentUserData.hoTen || '' : '';
        if (phoneInput) phoneInput.value = currentUserData ? currentUserData.soDienThoai || '' : '';
        if (provSelect) provSelect.value = '';
        if (distSelect) {
            distSelect.innerHTML = '<option value="">Chọn Quận / Huyện</option>';
            distSelect.disabled = true;
        }
        if (wardSelect) {
            wardSelect.innerHTML = '<option value="">Chọn Phường / Xã</option>';
            wardSelect.disabled = true;
        }
        if (detailInput) detailInput.value = '';
        if (macDinhCheckbox) macDinhCheckbox.checked = (!myAddressesList || myAddressesList.length === 0);

        const radios = document.querySelectorAll('input[name="addrLoai"]');
        radios.forEach(r => {
            r.checked = (r.value === 'Nhà riêng');
        });
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    modal.style.display = 'flex';
};

window.editAddress = function(id) {
    const addr = myAddressesList.find(a => a.id === id);
    if (addr) {
        openAddressModal(addr);
    }
};

window.setDefaultAddress = async function(id) {
    try {
        const res = await fetch(`/api/client/dia-chi/set-default/${id}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert('🎉 ' + data.message);
            await loadMyAddresses();
        } else {
            alert(data.message || 'Thao tác thất bại!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối!');
    }
};

window.deleteAddress = async function(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
        const res = await fetch(`/api/client/dia-chi/delete/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert('🗑️ ' + data.message);
            await loadMyAddresses();
        } else {
            alert(data.message || 'Xóa thất bại!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối!');
    }
};

function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('accOldPassword').value.trim();
        const newPassword = document.getElementById('accNewPassword').value.trim();
        const confirmPassword = document.getElementById('accConfirmPassword').value.trim();

        if (newPassword !== confirmPassword) {
            alert('Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!');
            return;
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert('🔒 Đổi mật khẩu thành công!');
                form.reset();
            } else {
                alert(data.message || 'Đổi mật khẩu thất bại!');
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi kết nối máy chủ!');
        }
    });
}

async function loadMyOrders() {
    try {
        const res = await fetch('/api/auth/my-orders');
        if (!res.ok) return;
        myOrdersList = await res.json();
        renderMyOrders();
    } catch (e) {
        console.error("Error loading my orders:", e);
    }
}

function setupOrderFilterTabs() {
    const tabs = document.querySelectorAll('.order-tab-item');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            t.classList.add('active');
            currentOrderFilterStatus = t.getAttribute('data-st');
            renderMyOrders();
        });
    });
}

function renderMyOrders() {
    const container = document.getElementById('myOrdersContainer');
    if (!container) return;

    let filtered = myOrdersList;
    if (currentOrderFilterStatus !== "") {
        const st = parseInt(currentOrderFilterStatus);
        filtered = myOrdersList.filter(o => o.trangThai === st);
    }

    if (!filtered || filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 50px 20px; color: #94a3b8;">
                <i data-lucide="package-open" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                <div style="font-weight: 700; font-size: 15px; color: #64748b;">Bạn chưa có đơn hàng nào trong mục này</div>
                <a href="/client/san-pham" style="margin-top: 15px; display: inline-block; color: #00adef; font-weight: 800; text-decoration: none;">Khám phá sản phẩm ngay →</a>
            </div>
        `;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map(order => {
        const dateStr = order.ngayTao ? new Date(order.ngayTao).toLocaleString('vi-VN') : '';
        const priceStr = order.tongTien ? order.tongTien.toLocaleString('vi-VN') + ' đ' : '0 đ';
        
        let badgeHtml = '';
        let showCancelBtn = false;
        switch (order.trangThai) {
            case 0:
                badgeHtml = '<span class="badge-st-0">Chờ xác nhận</span>';
                showCancelBtn = true;
                break;
            case 1:
                badgeHtml = '<span class="badge-st-1">Đã xác nhận</span>';
                break;
            case 3:
                badgeHtml = '<span class="badge-st-3">Đang giao</span>';
                break;
            case 4:
            case 6:
                badgeHtml = '<span class="badge-st-4">Hoàn thành</span>';
                break;
            case 7:
                badgeHtml = '<span class="badge-st-7">Đã hủy</span>';
                break;
            default:
                badgeHtml = '<span class="badge-st-1">N/A</span>';
        }

        return `
            <div class="order-card-item">
                <div class="order-card-header">
                    <div>
                        <span class="order-code-text">${order.maHoaDon || ('HD' + order.id)}</span>
                        <span class="order-date-text" style="margin-left: 12px;">📅 ${dateStr}</span>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
                <div class="order-card-body">
                    <div>
                        <span style="font-size: 13px; color: #64748b;">Hình thức: <strong>${order.loaiHoaDon || 'Trực tuyến'}</strong></span>
                        ${order.diaChiGiao ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">📍 Giao đến: ${escapeHtml(order.diaChiGiao)}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span class="order-price-badge">${priceStr}</span>
                        <a href="/client/tra-cuu?code=${order.maHoaDon}" class="btn-acc-primary" style="padding: 6px 16px; font-size: 13px; text-decoration: none;">Xem chi tiết</a>
                        ${showCancelBtn ? `<button class="btn-order-cancel" onclick="cancelCustomerOrder(${order.id}, '${escapeHtml(order.maHoaDon || ('HD' + order.id))}')">Hủy đơn</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

window.cancelCustomerOrder = function(orderId, orderCode) {
    openCancelOrderModal(orderId, orderCode || ('HD' + orderId), () => {
        loadMyOrders();
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
        const res = await fetch(`/api/auth/cancel-order/${id}`, {
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

function setupLogout() {
    const btn = document.getElementById('btnAccLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
            await performLogout();
        }
    });
}

function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: #ffffff; padding: 12px 20px; border-radius: 10px;
        font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15); pointer-events: auto;
        animation: slideInToast 0.3s ease forwards;
    `;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
