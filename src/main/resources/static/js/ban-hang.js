// ban-hang.js - Xử lý logic nghiệp vụ Bán hàng tại quầy

let currentHoaDonId = null;
let currentHoaDon = null;

// --- Khởi tạo ---
document.addEventListener("DOMContentLoaded", () => {
    loadHoaDonCho();
    loadProducts();
    
    // Thêm event listener cho nút tạo hóa đơn
    document.getElementById("btnAddInvoice").addEventListener("click", taoHoaDon);
});

// --- Utils Format ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// --- 1. Quản lý Hóa đơn chờ ---

async function loadHoaDonCho() {
    try {
        const res = await fetch('/api/ban-hang/hoa-don-cho');
        const data = await res.json();
        renderTabs(data);
        
        if (data.length > 0) {
            // Tự động chọn hóa đơn đầu tiên nếu chưa chọn
            if (!currentHoaDonId || !data.find(h => h.id === currentHoaDonId)) {
                selectHoaDon(data[0].id);
            } else {
                selectHoaDon(currentHoaDonId); // refresh
            }
        } else {
            currentHoaDonId = null;
            currentHoaDon = null;
            renderCart([]);
            updateSummaryInfo(null);
        }
    } catch (err) {
        showToast('Lỗi tải danh sách hóa đơn chờ', 'error');
    }
}

function renderTabs(hoaDons) {
    const tabsContainer = document.getElementById("invoiceTabs");
    // Giữ lại nút +
    const btnAdd = document.getElementById("btnAddInvoice");
    tabsContainer.innerHTML = '';
    
    hoaDons.forEach(hd => {
        const tab = document.createElement("div");
        tab.className = `pos-tab ${hd.id === currentHoaDonId ? 'active' : ''}`;
        tab.onclick = () => selectHoaDon(hd.id);
        
        const title = document.createElement("span");
        title.textContent = hd.maHoaDon;
        
        const closeBtn = document.createElement("div");
        closeBtn.className = "close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            huyHoaDon(hd.id);
        };
        
        tab.appendChild(title);
        tab.appendChild(closeBtn);
        tabsContainer.appendChild(tab);
    });
    
    tabsContainer.appendChild(btnAdd);
}

async function taoHoaDon() {
    // Check max tabs (optional, e.g., 5)
    const currentTabs = document.querySelectorAll('.pos-tab').length;
    if (currentTabs >= 5) {
        showToast('Chỉ được tạo tối đa 5 hóa đơn chờ', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/ban-hang/tao-hoa-don', { method: 'POST' });
        if (res.ok) {
            const hd = await res.json();
            currentHoaDonId = hd.id;
            showToast('Đã tạo hóa đơn ' + hd.maHoaDon);
            loadHoaDonCho();
        }
    } catch (err) {
        showToast('Lỗi tạo hóa đơn', 'error');
    }
}

async function huyHoaDon(id) {
    Swal.fire({
        title: 'Xác nhận hủy',
        text: "Bạn có chắc chắn muốn hủy hóa đơn này? Các sản phẩm sẽ được trả lại kho.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/ban-hang/hoa-don/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('Đã hủy hóa đơn');
                    loadHoaDonCho();
                    loadProducts();
                }
            } catch (err) {
                showToast('Lỗi hủy hóa đơn', 'error');
            }
        }
    });
}

async function selectHoaDon(id) {
    currentHoaDonId = id;
    
    // Highlight tab
    document.querySelectorAll('.pos-tab').forEach(t => t.classList.remove('active'));
    // loadHoaDonCho() already handles UI re-render, but to be fast we can just fetch details
    
    try {
        // Lấy lại danh sách để lấy thông tin mới nhất của hóa đơn này (tổng tiền, kh, voucher)
        const resHd = await fetch('/api/ban-hang/hoa-don-cho');
        const hoaDons = await resHd.json();
        currentHoaDon = hoaDons.find(h => h.id === id);
        
        renderTabs(hoaDons); // Re-render to show active
        
        // Load giỏ hàng
        const resCt = await fetch(`/api/ban-hang/hoa-don/${id}/chi-tiet`);
        const chiTiets = await resCt.json();
        
        renderCart(chiTiets);
        updateSummaryInfo(currentHoaDon);
        
    } catch (err) {
        console.error(err);
    }
}

// --- 2. Quản lý Sản phẩm ---

async function loadProducts() {
    const keyword = document.getElementById("searchProduct").value;
    try {
        const res = await fetch(`/api/ban-hang/san-pham?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        renderProducts(data);
    } catch (err) {
        console.error(err);
    }
}

document.getElementById("searchProduct").addEventListener("keypress", function(e) {
    if (e.key === "Enter") loadProducts();
});

function renderProducts(products) {
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Không tìm thấy sản phẩm</td></tr>';
        return;
    }
    
    products.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.ma}</td>
            <td><strong>${p.tenSanPham}</strong></td>
            <td>${p.mauSac}</td>
            <td>${p.size}</td>
            <td>${p.soLuongTon}</td>
            <td style="color:#ea580c; font-weight:600">${formatCurrency(p.giaBan)}</td>
            <td>
                <button class="btn-add" onclick="themVaoGio(${p.id})">Thêm</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 3. Giỏ hàng (Chi tiết hóa đơn) ---

async function themVaoGio(idSanPhamChiTiet) {
    if (!currentHoaDonId) {
        showToast('Vui lòng chọn hoặc tạo hóa đơn trước', 'error');
        return;
    }
    
    // Check if we need to prompt for quantity, default to 1 for quick POS
    const soLuong = 1; 
    
    try {
        const res = await fetch(`/api/ban-hang/hoa-don/${currentHoaDonId}/san-pham`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idSanPhamChiTiet, soLuong })
        });
        
        if (res.ok) {
            selectHoaDon(currentHoaDonId); // Refresh cart and summary
            loadProducts(); // Refresh stock
        } else {
            const err = await res.text();
            showToast(err, 'error');
        }
    } catch (err) {
        showToast('Lỗi thêm sản phẩm', 'error');
    }
}

async function capNhatSoLuong(idChiTiet, currentQty, change) {
    const newQty = currentQty + change;
    if (newQty <= 0) {
        xoaChiTiet(idChiTiet);
        return;
    }
    
    try {
        const res = await fetch(`/api/ban-hang/chi-tiet/${idChiTiet}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soLuong: newQty })
        });
        
        if (res.ok) {
            selectHoaDon(currentHoaDonId);
            loadProducts();
        } else {
            const err = await res.text();
            showToast(err, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật', 'error');
    }
}

async function xoaChiTiet(idChiTiet) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: "Xóa sản phẩm này khỏi giỏ hàng?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/ban-hang/chi-tiet/${idChiTiet}`, { method: 'DELETE' });
                if (res.ok) {
                    selectHoaDon(currentHoaDonId);
                    loadProducts();
                }
            } catch (err) {
                showToast('Lỗi xóa sản phẩm', 'error');
            }
        }
    });
}

function renderCart(chiTiets) {
    const container = document.getElementById("cartItems");
    container.innerHTML = '';
    
    if (!currentHoaDonId) {
        container.innerHTML = '<div class="empty-state">Vui lòng chọn hoặc tạo hóa đơn</div>';
        return;
    }
    
    if (chiTiets.length === 0) {
        container.innerHTML = '<div class="empty-state">Giỏ hàng trống</div>';
        return;
    }
    
    chiTiets.forEach(ct => {
        const item = document.createElement("div");
        item.className = "cart-item";
        item.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${ct.tenSanPham}</div>
                <div class="cart-item-variant">${ct.mauSac} | Size ${ct.size} | ${formatCurrency(ct.donGia)}</div>
            </div>
            <div class="cart-item-actions">
                <div class="qty-control">
                    <button class="qty-btn" onclick="capNhatSoLuong(${ct.id}, ${ct.soLuong}, -1)">-</button>
                    <input type="text" class="qty-input" value="${ct.soLuong}" readonly>
                    <button class="qty-btn" onclick="capNhatSoLuong(${ct.id}, ${ct.soLuong}, 1)">+</button>
                </div>
                <div class="cart-item-price">${formatCurrency(ct.thanhTien)}</div>
                <button class="btn-remove" onclick="xoaChiTiet(${ct.id})">&times;</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// --- 4. Cập nhật thông tin Tổng quan ---

function updateSummaryInfo(hd) {
    if (!hd) {
        document.getElementById("lblTongTienHang").textContent = '0 đ';
        document.getElementById("lblTienGiamGia").textContent = '0 đ';
        document.getElementById("lblTongThanhToan").textContent = '0 đ';
        document.getElementById("customerInfo").innerHTML = 'Khách lẻ (Không lưu thông tin)';
        document.getElementById("voucherInfo").innerHTML = 'Chưa áp dụng';
        return;
    }
    
    document.getElementById("lblTongTienHang").textContent = formatCurrency(hd.tongTienHang);
    document.getElementById("lblTienGiamGia").textContent = formatCurrency(hd.tienGiamGia);
    document.getElementById("lblTongThanhToan").textContent = formatCurrency(hd.tongTienThanhToan);
    
    if (hd.khachHang) {
        document.getElementById("customerInfo").innerHTML = `
            <strong>${hd.khachHang.hoTen}</strong><br>
            SĐT: ${hd.khachHang.soDienThoai}
        `;
    } else {
        document.getElementById("customerInfo").innerHTML = 'Khách lẻ (Không lưu thông tin)';
    }
    
    if (hd.phieuGiamGia) {
        const giam = hd.phieuGiamGia.loaiGiamGia === '%' ? 
            `${hd.phieuGiamGia.giaTriGiam}%` : formatCurrency(hd.phieuGiamGia.giaTriGiam);
        document.getElementById("voucherInfo").innerHTML = `
            <strong>${hd.phieuGiamGia.maVoucher}</strong><br>
            Giảm: <span style="color:#10b981">${giam}</span>
        `;
    } else {
        document.getElementById("voucherInfo").innerHTML = 'Chưa áp dụng';
    }
}

// --- 5. Khách hàng & Voucher Modals ---

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function openCustomerModal() {
    if (!currentHoaDonId) return showToast('Chưa chọn hóa đơn', 'error');
    openModal('customerModal');
    loadCustomers();
}

async function loadCustomers() {
    const keyword = document.getElementById("searchCustomer").value;
    const res = await fetch(`/api/ban-hang/khach-hang?keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    
    const tbody = document.getElementById("customerTableBody");
    tbody.innerHTML = '';
    data.forEach(kh => {
        tbody.innerHTML += `
            <tr>
                <td>${kh.hoTen}</td>
                <td>${kh.soDienThoai}</td>
                <td style="text-align:right">
                    <button class="btn-add" onclick="chonKhachHang(${kh.id})">Chọn</button>
                </td>
            </tr>
        `;
    });
}

async function chonKhachHang(idKhachHang) {
    try {
        const res = await fetch(`/api/ban-hang/hoa-don/${currentHoaDonId}/khach-hang`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idKhachHang })
        });
        if (res.ok) {
            closeModal('customerModal');
            selectHoaDon(currentHoaDonId);
        }
    } catch (err) {
        showToast('Lỗi cập nhật khách hàng', 'error');
    }
}

async function openVoucherModal() {
    if (!currentHoaDonId) return showToast('Chưa chọn hóa đơn', 'error');
    openModal('voucherModal');
    loadVouchers();
}

async function loadVouchers() {
    const res = await fetch(`/api/ban-hang/phieu-giam-gia`);
    const data = await res.json();
    
    const tbody = document.getElementById("voucherTableBody");
    tbody.innerHTML = '';
    
    // Lọc voucher đủ điều kiện (frontend visual only)
    const tongTien = currentHoaDon.tongTienHang;
    
    data.forEach(v => {
        const isEligible = tongTien >= v.donToiThieu;
        const color = isEligible ? '#0f172a' : '#94a3b8';
        const btn = isEligible ? `<button class="btn-add" onclick="chonVoucher(${v.id})">Áp dụng</button>` : `<span style="font-size:12px;color:#ef4444">Chưa đủ ĐK</span>`;
        
        tbody.innerHTML += `
            <tr style="color:${color}">
                <td><strong>${v.maVoucher}</strong></td>
                <td>${v.tenVoucher}</td>
                <td>${v.loaiGiamGia === '%' ? v.giaTriGiam + '%' : formatCurrency(v.giaTriGiam)}</td>
                <td>${formatCurrency(v.donToiThieu)}</td>
                <td style="text-align:right">${btn}</td>
            </tr>
        `;
    });
}

async function chonVoucher(idPhieuGiamGia) {
    try {
        const res = await fetch(`/api/ban-hang/hoa-don/${currentHoaDonId}/phieu-giam-gia`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idPhieuGiamGia })
        });
        if (res.ok) {
            closeModal('voucherModal');
            selectHoaDon(currentHoaDonId);
            showToast('Đã cập nhật phiếu giảm giá');
        } else {
            const err = await res.text();
            showToast(err, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật phiếu giảm giá', 'error');
    }
}

// --- 6. Thanh toán ---

async function thanhToan() {
    if (!currentHoaDonId || !currentHoaDon) {
        return showToast('Chưa có hóa đơn nào', 'error');
    }
    
    if (currentHoaDon.tongTienHang === 0) {
        return showToast('Giỏ hàng trống', 'error');
    }
    
    const ghiChu = document.getElementById("txtGhiChu").value;
    
    Swal.fire({
        title: 'Xác nhận thanh toán',
        text: `Xác nhận thanh toán hóa đơn ${currentHoaDon.maHoaDon} với số tiền ${formatCurrency(currentHoaDon.tongTienThanhToan)}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Thanh toán',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#d33'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const payload = {
                tongTienHang: currentHoaDon.tongTienHang,
                tienGiamGia: currentHoaDon.tienGiamGia,
                tongTienThanhToan: currentHoaDon.tongTienThanhToan,
                ghiChu: ghiChu
            };
            
            try {
                const res = await fetch(`/api/ban-hang/hoa-don/${currentHoaDonId}/thanh-toan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    showToast('Thanh toán thành công hóa đơn ' + currentHoaDon.maHoaDon);
                    document.getElementById("txtGhiChu").value = '';
                    
                    currentHoaDonId = null;
                    currentHoaDon = null;
                    loadHoaDonCho();
                    loadProducts();
                } else {
                    const err = await res.text();
                    showToast(err, 'error');
                }
            } catch (err) {
                showToast('Lỗi thanh toán', 'error');
            }
        }
    });
}
