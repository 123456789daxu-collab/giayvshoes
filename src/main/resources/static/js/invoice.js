// invoice.js - Handles Invoice Management logic

let allInvoices = [];
let filteredInvoices = [];
let currentPage = 0;
const pageSize = 5;

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // Initialize elements
    const searchKeyword = document.getElementById("searchKeyword");
    const dateRange = document.getElementById("dateRange");
    const filterStatus = document.getElementById("filterStatus");
    const radioOptions = document.querySelectorAll('input[name="loaiHoaDon"]');
    const minPrice = document.getElementById("minPrice");
    const maxPrice = document.getElementById("maxPrice");
    const btnReset = document.getElementById("btnReset");
    const priceDisplay = document.getElementById("priceDisplay");
    const btnAddInvoice = document.getElementById("btnAddInvoice");
    
    // Modal elements
    const modal = document.getElementById("invoiceModal");
    const modalClose = document.getElementById("modalClose");
    const btnCancelInv = document.getElementById("btnCancelInv");
    const invoiceForm = document.getElementById("invoiceForm");
    
    // Function to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    window.showToast = (message, type = "success") => {
        const toastContainer = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `premium-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${type === 'success' ? 'check' : 'alert-circle'}" style="width: 14px; height: 14px;"></i>
            </div>
            <span class="toast-message">${message}</span>
        `;
        toastContainer.appendChild(toast);
        lucide.createIcons({ attrs: { style: 'stroke-width: 2.5' } });
        setTimeout(() => {
            toast.classList.add("hide");
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    };

    // Range Slider Logic
    const updateSliderDisplay = () => {
        let minVal = parseInt(minPrice.value);
        let maxVal = parseInt(maxPrice.value);
        
        if (minVal > maxVal) {
            let tmp = minVal;
            minVal = maxVal;
            maxVal = tmp;
        }
        
        priceDisplay.textContent = `${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`;
        
        const sliderRange = document.getElementById("sliderRange");
        const maxLimit = parseInt(minPrice.max);
        const leftPercent = (minVal / maxLimit) * 100;
        const widthPercent = ((maxVal - minVal) / maxLimit) * 100;
        
        sliderRange.style.left = leftPercent + "%";
        sliderRange.style.width = widthPercent + "%";
    };

    minPrice.addEventListener("input", updateSliderDisplay);
    maxPrice.addEventListener("input", updateSliderDisplay);
    
    // Triggers for Filtering
    const triggerFilter = () => {
        currentPage = 0;
        fetchInvoices();
    };

    searchKeyword.addEventListener("input", debounce(triggerFilter, 500));
    filterStatus.addEventListener("change", triggerFilter);
    radioOptions.forEach(r => r.addEventListener("change", triggerFilter));
    minPrice.addEventListener("change", triggerFilter);
    maxPrice.addEventListener("change", triggerFilter);

    btnReset.addEventListener("click", () => {
        searchKeyword.value = "";
        dateRange.value = "";
        filterStatus.value = "";
        radioOptions[0].checked = true; // Set back to 'Tất cả'
        minPrice.value = "0";
        maxPrice.value = "70000000";
        updateSliderDisplay();
        triggerFilter();
    });

    // Modal Logic
    const hideModal = () => {
        modal.style.display = "none";
    };
    modalClose.onclick = hideModal;
    btnCancelInv.onclick = hideModal;
    window.onclick = (e) => {
        if (e.target === modal) hideModal();
    };

    btnAddInvoice.addEventListener("click", () => {
        document.getElementById("modalTitle").textContent = "Thêm Hóa Đơn";
        invoiceForm.reset();
        document.getElementById("invId").value = "";
        modal.style.display = "flex";
    });

    invoiceForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById("invId").value;
        const payload = {
            tenNguoiNhan: document.getElementById("invCustomerName").value.trim(),
            sdtNguoiNhan: document.getElementById("invCustomerPhone").value.trim(),
            loaiHoaDon: document.getElementById("invType").value,
            trangThai: parseInt(document.getElementById("invStatus").value),
            tongTienThanhToan: parseFloat(document.getElementById("invTotal").value),
            ghiChu: document.getElementById("invNote").value.trim()
        };

        const url = id ? `/api/hoa-don/${id}` : `/api/hoa-don`;
        const method = id ? "PUT" : "POST";

        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Lỗi khi lưu hóa đơn");
            return res.json();
        })
        .then(() => {
            showToast(id ? "Cập nhật hóa đơn thành công!" : "Thêm mới hóa đơn thành công!");
            hideModal();
            fetchInvoices();
        })
        .catch(err => showToast(err.message, "error"));
    };

    // Auto init data if empty
    fetch("/api/hoa-don/search")
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                // Initialize test data automatically
                fetch("/api/hoa-don/init-data", { method: "POST" })
                    .then(() => {
                        updateSliderDisplay();
                        fetchInvoices();
                    });
            } else {
                updateSliderDisplay();
                fetchInvoices();
            }
        });
});

// Debounce helper for search input
function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

function fetchInvoices() {
    const keyword = document.getElementById("searchKeyword").value.trim();
    const status = document.getElementById("filterStatus").value;
    const loaiHoaDon = document.querySelector('input[name="loaiHoaDon"]:checked').value;
    
    let minVal = document.getElementById("minPrice").value;
    let maxVal = document.getElementById("maxPrice").value;
    if (parseInt(minVal) > parseInt(maxVal)) {
        let tmp = minVal; minVal = maxVal; maxVal = tmp;
    }

    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (status) params.append("trangThai", status);
    if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);
    params.append("minPrice", minVal);
    params.append("maxPrice", maxVal);

    fetch(`/api/hoa-don/search?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            filteredInvoices = data;
            renderTable();
        })
        .catch(err => console.error("Error fetching invoices:", err));
}

function renderTable() {
    const tbody = document.getElementById("invoiceTableBody");
    tbody.innerHTML = "";

    const totalElements = filteredInvoices.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;

    if (totalElements === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:40px; color: #64748b;">Không tìm thấy hóa đơn nào</td></tr>`;
        document.getElementById("paginationInfo").textContent = "Hiển thị 0 / 0 hóa đơn";
        document.getElementById("paginationControls").innerHTML = "";
        return;
    }

    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalElements);
    const pageData = filteredInvoices.slice(startIdx, endIdx);

    pageData.forEach((invoice, index) => {
        const tr = document.createElement("tr");
        
        const dateStr = invoice.ngayTao ? new Date(invoice.ngayTao).toLocaleDateString('vi-VN') : '';
        const priceStr = new Intl.NumberFormat('vi-VN').format(invoice.tongTien || 0);
        
        let statusBadge = '';
        if (invoice.trangThai === 1) statusBadge = '<span class="badge badge-active">Hoàn thành</span>';
        else if (invoice.trangThai === 0) statusBadge = '<span class="badge badge-inactive">Hủy</span>';
        else statusBadge = '<span class="badge badge-pending">Đang xử lý</span>';

        tr.innerHTML = `
            <td>${startIdx + index + 1}</td>
            <td style="font-weight: 600; color: #1e293b;">${invoice.maHoaDon || ''}</td>
            <td>${invoice.nguoiTao || 'N/A'}</td>
            <td>${invoice.tenKhachHang || 'N/A'}</td>
            <td>${invoice.sdtKhachHang || 'N/A'}</td>
            <td style="text-align: center;">${invoice.soLuong || 0}</td>
            <td>${dateStr}</td>
            <td style="font-weight: 600; color: #3b82f6;">${priceStr} đ</td>
            <td>${invoice.loaiHoaDon || 'N/A'}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td>
                <div class="action-icons">
                    <i data-lucide="edit-2" class="action-icon" style="color: #f59e0b;" onclick="editInvoice(${invoice.id})"></i>
                    <i data-lucide="trash-2" class="action-icon" style="color: #ef4444;" onclick="deleteInvoice(${invoice.id})"></i>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();

    document.getElementById("paginationInfo").textContent = `Hiển thị ${startIdx + 1}-${endIdx} / ${totalElements} hóa đơn`;
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    for (let i = 0; i < totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `btn-page ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i + 1;
        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        controls.appendChild(btn);
    }
}

window.editInvoice = function(id) {
    fetch(`/api/hoa-don/${id}`)
        .then(res => res.json())
        .then(inv => {
            document.getElementById("modalTitle").textContent = "Sửa Hóa Đơn";
            document.getElementById("invId").value = inv.id;
            document.getElementById("invCustomerName").value = inv.tenKhachHang || "";
            document.getElementById("invCustomerPhone").value = inv.sdtKhachHang || "";
            document.getElementById("invType").value = inv.loaiHoaDon || "Tại quầy";
            document.getElementById("invStatus").value = inv.trangThai;
            document.getElementById("invTotal").value = inv.tongTien || 0;
            document.getElementById("invNote").value = "";
            document.getElementById("invoiceModal").style.display = "flex";
        })
        .catch(err => window.showToast("Không thể tải thông tin hóa đơn", "error"));
};

window.deleteInvoice = function(id) {
    if (confirm("Bạn có chắc chắn muốn xóa hóa đơn này không? Hành động này không thể hoàn tác.")) {
        fetch(`/api/hoa-don/${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error("Xóa thất bại");
                window.showToast("Đã xóa hóa đơn thành công!");
                fetchInvoices();
            })
            .catch(err => window.showToast(err.message, "error"));
    }
};
