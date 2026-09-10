let allCaLams = [];

function loadCaLam() {
    fetch('/api/ca-lam')
        .then(res => res.json())
        .then(data => {
            allCaLams = data;
            renderCaLamTable(data);
        })
        .catch(err => {
            document.getElementById('caLamTableBody').innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">Lỗi tải dữ liệu</td></tr>';
        });
}

function renderCaLamTable(data) {
    const tbody = document.getElementById('caLamTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">Chưa có dữ liệu ca làm</td></tr>';
        return;
    }
    
    let html = '';
    data.forEach((item, index) => {
        const startTime = item.thoiGianBatDau ? item.thoiGianBatDau.substring(0, 5) : '--:--';
        const endTime = item.thoiGianKetThuc ? item.thoiGianKetThuc.substring(0, 5) : '--:--';
        
        html += `
            <tr>
                <td style="text-align: center; color: #64748b; font-weight: 500;">${index + 1}</td>
                <td>
                    <div class="shift-info">
                        <div class="shift-icon">
                            <i data-lucide="clock" style="width: 18px; height: 18px;"></i>
                        </div>
                        <div class="shift-details">
                            <span class="shift-name">${item.tenCa}</span>
                            <span class="shift-code">${item.maCa}</span>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <span class="time-badge badge-start">${startTime}</span>
                </td>
                <td style="text-align: center;">
                    <span class="time-badge badge-end">${endTime}</span>
                </td>
                <td style="text-align: center;">
                    <label class="toggle-switch">
                        <input type="checkbox" ${item.trangThai === 1 ? 'checked' : ''} onchange="toggleCaLamStatus(${item.id}, ${item.trangThai})">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button class="action-btn" onclick="editCaLam(${item.id})" title="Chỉnh sửa ca làm việc">
                            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    lucide.createIcons();
}

function filterCaLam() {
    const searchVal = document.getElementById('searchCaLam').value.toLowerCase();
    const timeStart = document.getElementById('searchTimeStart').value;
    const timeEnd = document.getElementById('searchTimeEnd').value;
    const statusFilter = document.querySelector('input[name="filterStatus"]:checked').value;

    const filtered = allCaLams.filter(item => {
        let matchSearch = true;
        if (searchVal) {
            matchSearch = (item.tenCa && item.tenCa.toLowerCase().includes(searchVal)) || 
                          (item.maCa && item.maCa.toLowerCase().includes(searchVal));
        }

        let matchStatus = true;
        if (statusFilter !== 'ALL') {
            matchStatus = item.trangThai === parseInt(statusFilter);
        }

        let matchStart = true;
        if (timeStart && item.thoiGianBatDau) {
            matchStart = item.thoiGianBatDau.startsWith(timeStart);
        }

        let matchEnd = true;
        if (timeEnd && item.thoiGianKetThuc) {
            matchEnd = item.thoiGianKetThuc.startsWith(timeEnd);
        }

        return matchSearch && matchStatus && matchStart && matchEnd;
    });

    renderCaLamTable(filtered);
}

window.editCaLam = function(id) {
    const item = allCaLams.find(c => c.id === id);
    if (item) {
        const titleEl = document.getElementById('modalCaLamTitleText');
        if (titleEl) titleEl.innerText = "Chỉnh sửa Ca làm việc" + (item.maCa ? " - Mã: " + item.maCa : "");
        document.getElementById('caLamId').value = item.id;
        document.getElementById('maCa').value = item.maCa;
        document.getElementById('tenCa').value = item.tenCa;
        document.getElementById('thoiGianBatDau').value = item.thoiGianBatDau;
        document.getElementById('thoiGianKetThuc').value = item.thoiGianKetThuc;
        document.getElementById('trangThai').value = item.trangThai;
        document.getElementById('modalCaLam').style.display = 'flex';
    }
};

window.toggleCaLamStatus = function(id, currentStatus) {
    const item = allCaLams.find(c => c.id === id);
    if (item) {
        item.trangThai = currentStatus === 1 ? 0 : 1;
        fetch('/api/ca-lam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(() => loadCaLam());
    }
};

function getNextCaCodeLocal() {
    let maxNum = 0;
    if (allCaLams && allCaLams.length > 0) {
        allCaLams.forEach(c => {
            if (c && c.maCa) {
                const digits = String(c.maCa).replace(/\D+/g, '');
                if (digits) {
                    const num = parseInt(digits, 10);
                    if (num < 1000000 && num > maxNum) maxNum = num;
                }
            }
        });
    }
    return 'CA' + String(maxNum + 1).padStart(3, '0');
}

document.addEventListener("DOMContentLoaded", function() {
    lucide.createIcons();
    loadCaLam();

    // Bind filters
    document.getElementById('searchCaLam').addEventListener('input', filterCaLam);
    document.getElementById('searchTimeStart').addEventListener('change', filterCaLam);
    document.getElementById('searchTimeEnd').addEventListener('change', filterCaLam);
    document.querySelectorAll('input[name="filterStatus"]').forEach(radio => {
        radio.addEventListener('change', filterCaLam);
    });

    // Add button
    document.getElementById('btnThemCa').addEventListener('click', () => {
        const titleEl = document.getElementById('modalCaLamTitleText');
        if (titleEl) titleEl.innerText = "Thêm mới Ca làm việc";
        document.getElementById('modalCaLam').style.display = 'flex';
        document.getElementById('formCaLam').reset();
        document.getElementById('caLamId').value = '';
        document.getElementById('maCa').value = getNextCaCodeLocal();
        fetch('/api/ca-lam/next-code')
            .then(res => res.json())
            .then(data => {
                if (data && data.code) {
                    document.getElementById('maCa').value = data.code;
                }
            })
            .catch(() => {});
    });

    // Form Submit
    document.getElementById('formCaLam').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('caLamId').value;
        const payload = {
            maCa: document.getElementById('maCa').value,
            tenCa: document.getElementById('tenCa').value,
            thoiGianBatDau: document.getElementById('thoiGianBatDau').value,
            thoiGianKetThuc: document.getElementById('thoiGianKetThuc').value,
            trangThai: parseInt(document.getElementById('trangThai').value)
        };
        if (id) {
            payload.id = parseInt(id);
        }

        fetch('/api/ca-lam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Đã lưu ca làm việc',
                showConfirmButton: false,
                timer: 2000
            });
            document.getElementById('modalCaLam').style.display = 'none';
            this.reset();
            loadCaLam();
        })
        .catch(err => {
            Swal.fire('Lỗi', 'Không thể lưu ca làm việc', 'error');
        });
    });
});
