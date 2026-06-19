// invoice.js - Handles Invoice Management logic

let allInvoices = [];
let filteredInvoices = [];
let currentPage = 0;
let pageSize = 5;
let activeStatus = "";

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // Filter card toggle (collapsible)
    const filterCardToggle = document.getElementById("filterCardToggle");
    const filterCardBody = document.getElementById("filterCardBody");
    if (filterCardToggle && filterCardBody) {
        filterCardToggle.addEventListener("click", () => {
            filterCardBody.classList.toggle("collapsed");
            const toggleIcon = filterCardToggle.querySelector(".toggle-icon");
            if (toggleIcon) {
                if (filterCardBody.classList.contains("collapsed")) {
                    toggleIcon.style.transform = "rotate(-90deg)";
                } else {
                    toggleIcon.style.transform = "rotate(0deg)";
                }
            }
        });
    }
    
    // Initialize elements
    const searchKeyword = document.getElementById("searchKeyword");
    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");
    const filterType = document.getElementById("filterType");
    const priceSlider = document.getElementById("priceSlider");
    const priceSliderValue = document.getElementById("priceSliderValue");
    const btnReset = document.getElementById("btnReset");
    const btnExport = document.getElementById("btnExport") || document.getElementById("btnExportTop");
    const btnAddInvoice = document.getElementById("btnAddInvoice");
    const pageSizeSelect = document.getElementById("pageSizeSelect");
    const statusTabs = document.querySelectorAll(".status-tab");
    
    // Modal elements
    const modal = document.getElementById("invoiceModal");
    const modalClose = document.getElementById("modalClose");
    const btnCancelInv = document.getElementById("btnCancelInv");
    const invoiceForm = document.getElementById("invoiceForm");
    
    // Set default date to today
    const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
    
    // Load saved filters if any
    const saved = sessionStorage.getItem("invoiceFilterState");
    if (saved) {
        try {
            const state = JSON.parse(saved);
            searchKeyword.value = state.keyword || "";
            startDate.value = state.startDate || todayStr;
            endDate.value = state.endDate || todayStr;
            filterType.value = state.filterType || "";
            if (priceSlider) {
                priceSlider.value = state.maxPrice !== undefined ? state.maxPrice : 3000000;
                if (priceSliderValue) {
                    priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(priceSlider.value) + " đ";
                }
            }
            activeStatus = state.activeStatus !== undefined ? state.activeStatus : "";
            pageSize = state.pageSize || 5;
            currentPage = state.currentPage || 0;
            
            // Set active class on status tab
            statusTabs.forEach(tab => {
                if (tab.getAttribute("data-status") === activeStatus) {
                    tab.classList.add("active");
                } else {
                    tab.classList.remove("active");
                }
            });
            // Update pageSizeSelect value
            if (pageSizeSelect) {
                pageSizeSelect.value = pageSize;
            }
        } catch (e) {
            console.error("Error loading filter state:", e);
            startDate.value = todayStr;
            endDate.value = todayStr;
        }
    } else {
        startDate.value = todayStr;
        endDate.value = todayStr;
    }

    // Sử dụng toast chung từ sidebar thay vì ghi đè, nay cập nhật thành SweetAlert2
    const showInvoiceToast = (message, type = "success") => {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type === "error" ? "error" : "success",
                title: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            let title = type === "success" ? "Thành công" : type === "error" ? "Thất bại" : "Thông báo";
            // Gọi window.showToast của sidebar.html (nhận 3 tham số: title, message, type)
            if (typeof window.showToast === "function") {
                window.showToast(title, message, type);
            } else {
                alert(message);
            }
        }
    };
    
    // Triggers for Filtering
    const triggerFilter = () => {
        currentPage = 0;
        fetchInvoices();
    };

    searchKeyword.addEventListener("input", debounce(triggerFilter, 500));
    startDate.addEventListener("change", triggerFilter);
    endDate.addEventListener("change", triggerFilter);
    filterType.addEventListener("change", triggerFilter);
    if (priceSlider) {
        priceSlider.addEventListener("input", () => {
            if (priceSliderValue) {
                priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(priceSlider.value) + " đ";
            }
            triggerFilter();
        });
    }
    
    // Page Size Selector
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", () => {
            pageSize = parseInt(pageSizeSelect.value) || 5;
            currentPage = 0;
            renderTable();
        });
    }

    // Status tabs click event listeners
    statusTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            statusTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeStatus = tab.getAttribute("data-status");
            filterAndRender();
        });
    });

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            searchKeyword.value = "";
            startDate.value = todayStr;
            endDate.value = todayStr;
            filterType.value = "";
            if (priceSlider) {
                priceSlider.value = 3000000;
                if (priceSliderValue) {
                    priceSliderValue.textContent = "3.000.000 đ";
                }
            }
            activeStatus = "";
            statusTabs.forEach(t => t.classList.remove("active"));
            statusTabs[0].classList.add("active");
            triggerFilter();
        });
    }

    // Excel Export
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            if (filteredInvoices.length === 0) {
                showInvoiceToast("Không có dữ liệu để xuất file!", "error");
                return;
            }
            
            const keyword = document.getElementById("searchKeyword").value.trim();
            const loaiHoaDon = document.getElementById("filterType").value;
            const startDateVal = document.getElementById("startDate").value;
            const endDateVal = document.getElementById("endDate").value;
            const maxPriceVal = document.getElementById("priceSlider") ? document.getElementById("priceSlider").value : "3000000";

            const params = new URLSearchParams();
            if (keyword) params.append("keyword", keyword);
            if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);
            if (startDateVal) params.append("startDate", startDateVal);
            if (endDateVal) params.append("endDate", endDateVal);
            if (maxPriceVal) params.append("maxTotal", maxPriceVal);
            if (activeStatus) {
                params.append("trangThai", activeStatus);
            }

            showInvoiceToast("Đang chuẩn bị tải file Excel cho các hóa đơn...");
            window.location.href = `/api/hoa-don/export?${params.toString()}`;
        });
    }

    // Modal Logic
    const detailModal = document.getElementById("invoiceDetailModal");
    const detailModalClose = document.getElementById("detailModalClose");
    const btnCloseDetail = document.getElementById("btnCloseDetail");

    const hideModal = () => {
        modal.style.display = "none";
    };
    const hideDetailModal = () => {
        detailModal.style.display = "none";
    };

    modalClose.onclick = hideModal;
    btnCancelInv.onclick = hideModal;
    detailModalClose.onclick = hideDetailModal;
    btnCloseDetail.onclick = hideDetailModal;

    window.onclick = (e) => {
        if (e.target === modal) hideModal();
        if (e.target === detailModal) hideDetailModal();
    };

    if (btnAddInvoice) {
        btnAddInvoice.addEventListener("click", () => {
            document.getElementById("modalTitle").textContent = "Thêm Mới Hóa Đơn";
            document.getElementById("invId").value = "";
            invoiceForm.reset();
            modal.style.display = "flex";
        });
    }

    invoiceForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById("invId").value;
        const payload = {
            tenNguoiNhan: document.getElementById("invCustomerName").value.trim(),
            sdtNguoiNhan: document.getElementById("invCustomerPhone").value.trim(),
            loaiHoaDon: document.getElementById("invType").value === "Online",
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
            showInvoiceToast(id ? "Cập nhật hóa đơn thành công!" : "Thêm mới hóa đơn thành công!");
            hideModal();
            fetchInvoices();
        })
        .catch(err => showInvoiceToast(err.message, "error"));
    };

    // Auto init data if empty
    fetch("/api/hoa-don/search")
        .then(res => {
            if (!res.ok) throw new Error("Không thể kiểm tra dữ liệu ban đầu");
            return res.json();
        })
        .then(data => {
            if (data && data.length === 0) {
                // Initialize test data automatically
                fetch("/api/hoa-don/init-data", { method: "POST" })
                    .then(() => {
                        fetchInvoices();
                    })
                    .catch(err => console.error("Error initializing data:", err));
            } else {
                fetchInvoices();
            }
        })
        .catch(err => {
            console.error("Initialization fetch failed, trying to load invoices anyway:", err);
            fetchInvoices();
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
    const loaiHoaDon = document.getElementById("filterType").value;
    const startDateVal = document.getElementById("startDate").value;
    const endDateVal = document.getElementById("endDate").value;
    const maxPriceVal = document.getElementById("priceSlider") ? document.getElementById("priceSlider").value : "3000000";

    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);
    if (startDateVal) params.append("startDate", startDateVal + "T00:00:00");
    if (endDateVal) params.append("endDate", endDateVal + "T23:59:59");
    if (maxPriceVal) params.append("maxPrice", maxPriceVal);

    fetch(`/api/hoa-don/search?${params.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("Máy chủ phản hồi lỗi. Hãy đảm bảo ứng dụng đã được khởi động lại!");
            return res.json();
        })
        .then(data => {
            allInvoices = data;
            updateStatusCounts();
            filterAndRender();
        })
        .catch(err => {
            console.error("Error fetching invoices:", err);
            if (typeof window.showToast === "function") {
                showInvoiceToast("Không thể tải danh sách hóa đơn. Vui lòng tắt và khởi động lại Spring Boot trong IDE!", "error");
            }
        });
}

function updateStatusCounts() {
    const counts = {
        all: allInvoices.length,
        "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0
    };
    
    allInvoices.forEach(inv => {
        const st = String(inv.trangThai);
        if (counts.hasOwnProperty(st)) {
            counts[st]++;
        }
    });
    
    const countAllEl = document.getElementById("count-all");
    if (countAllEl) {
        countAllEl.textContent = counts.all;
    }
    for (let i = 0; i <= 9; i++) {
        const el = document.getElementById("count-" + i);
        if (el) {
            el.textContent = counts[i];
        }
    }
}

function filterAndRender() {
    if (activeStatus === "") {
        filteredInvoices = allInvoices;
    } else {
        const stInt = parseInt(activeStatus);
        filteredInvoices = allInvoices.filter(inv => inv.trangThai === stInt);
    }
    currentPage = 0;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("invoiceTableBody");
    tbody.innerHTML = "";

    const totalElements = filteredInvoices.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;

    // Adjust currentPage if it goes out of range
    if (currentPage >= totalPages) {
        currentPage = Math.max(0, totalPages - 1);
    }

    if (totalElements === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:40px; color: #64748b;">Không tìm thấy hóa đơn nào</td></tr>`;
        document.getElementById("paginationInfo").textContent = "Hiển thị 0 / 0 hoá đơn";
        document.getElementById("currentPageBox").textContent = "1";
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
        switch (invoice.trangThai) {
            case 0:
                statusBadge = '<span class="badge badge-warning">Chờ xác nhận</span>';
                break;
            case 1:
                statusBadge = '<span class="badge badge-info">Đã xác nhận</span>';
                break;
            case 2:
                statusBadge = '<span class="badge badge-warning">Chờ lấy hàng</span>';
                break;
            case 3:
                statusBadge = '<span class="badge badge-info">Đang giao</span>';
                break;
            case 4:
                statusBadge = '<span class="badge badge-success">Đã giao</span>';
                break;
            case 5:
                statusBadge = '<span class="badge badge-danger">Giao hàng thất bại</span>';
                break;
            case 6:
                statusBadge = '<span class="badge badge-success">Hoàn thành</span>';
                break;
            case 7:
                statusBadge = '<span class="badge badge-danger">Đã huỷ</span>';
                break;
            case 8:
                statusBadge = '<span class="badge badge-warning">Yêu cầu huỷ</span>';
                break;
            case 9:
                statusBadge = '<span class="badge badge-danger">Đã hoàn tiền</span>';
                break;
            default:
                statusBadge = '<span class="badge badge-secondary">N/A</span>';
        }

        const nvName = invoice.nguoiTao || 'Admin TBT';
        const nvCode = invoice.maNhanVien || 'NV001';
        const nvDisplay = `
            <div class="employee-cell">
                <div class="emp-name">${nvName}</div>
                <div class="emp-code">${nvCode}</div>
            </div>
        `;

        const typeBadge = `<span class="loai-hd-badge">${invoice.loaiHoaDon || 'Tại quầy'}</span>`;
        const phoneDisplay = invoice.sdtKhachHang || '-';
        const customerDisplay = invoice.tenKhachHang || 'Khách lẻ';

        tr.innerHTML = `
            <td>${startIdx + index + 1}</td>
            <td style="font-weight: 600; color: #1e293b;">${invoice.maHoaDon || ''}</td>
            <td>${nvDisplay}</td>
            <td>${customerDisplay}</td>
            <td>${phoneDisplay}</td>
            <td>${typeBadge}</td>
            <td style="font-weight: 600; color: #ef4444;">${priceStr} đ</td>
            <td>${dateStr}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: center;">
                <div class="btn-actions-cell" style="justify-content: center;">
                    <button class="action-icon-btn view" onclick="viewInvoice(${invoice.id})" title="Xem chi tiết">
                        <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="action-icon-btn edit" onclick="printInvoice(${invoice.id})" title="In hoá đơn">
                        <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();

    document.getElementById("paginationInfo").textContent = `Tổng ${totalElements} hóa đơn`;
    
    const pageNumbersContainer = document.getElementById("page-numbers-container");
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = "";
        
        // Nút lùi
        const prev = document.createElement("button");
        prev.className = `page-btn ${currentPage === 0 ? 'disabled' : ''}`;
        prev.innerHTML = `<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>`;
        prev.onclick = () => { if (currentPage > 0) { currentPage--; renderTable(); } };
        pageNumbersContainer.appendChild(prev);

        // Các trang số
        for (let i = 0; i < totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i + 1;
            btn.onclick = () => { currentPage = i; renderTable(); };
            pageNumbersContainer.appendChild(btn);
        }
        
        // Nút tiến
        const next = document.createElement("button");
        next.className = `page-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`;
        next.innerHTML = `<i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>`;
        next.onclick = () => { if (currentPage < totalPages - 1) { currentPage++; renderTable(); } };
        pageNumbersContainer.appendChild(next);
    }

    saveFilterState();
}

function saveFilterState() {
    const keywordEl = document.getElementById("searchKeyword");
    const startDateEl = document.getElementById("startDate");
    const endDateEl = document.getElementById("endDate");
    const filterTypeEl = document.getElementById("filterType");
    const priceSliderEl = document.getElementById("priceSlider");
    
    const state = {
        keyword: keywordEl ? keywordEl.value : "",
        startDate: startDateEl ? startDateEl.value : "",
        endDate: endDateEl ? endDateEl.value : "",
        filterType: filterTypeEl ? filterTypeEl.value : "",
        maxPrice: priceSliderEl ? priceSliderEl.value : 3000000,
        activeStatus: activeStatus,
        pageSize: pageSize,
        currentPage: currentPage
    };
    sessionStorage.setItem("invoiceFilterState", JSON.stringify(state));
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
        .catch(err => showInvoiceToast("Không thể tải thông tin hóa đơn", "error"));
};

window.deleteInvoice = function(id) {
    if (confirm("Bạn có chắc chắn muốn xóa hóa đơn này không? Hành động này không thể hoàn tác.")) {
        fetch(`/api/hoa-don/${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error("Xóa thất bại");
                showInvoiceToast("Đã xóa hóa đơn thành công!");
                fetchInvoices();
            })
            .catch(err => showInvoiceToast(err.message, "error"));
    }
};

window.viewInvoice = function(id) {
    window.location.href = `/hoa-don/${id}`;
};

window.printInvoice = function(id) {
    fetch(`/api/hoa-don/${id}`)
        .then(res => res.json())
        .then(inv => {
            const dateStr = inv.ngayTao ? new Date(inv.ngayTao).toLocaleString('vi-VN') : '';
            const priceStr = new Intl.NumberFormat('vi-VN').format(inv.tongTien || 0);
            
            let statusText = '';
            switch (inv.trangThai) {
                case 0: statusText = "Chờ xác nhận"; break;
                case 1: statusText = "Đã xác nhận"; break;
                case 2: statusText = "Chờ lấy hàng"; break;
                case 3: statusText = "Chờ giao hàng"; break;
                case 4: statusText = "Đã giao hàng"; break;
                case 5: statusText = "Giao hàng thất bại"; break;
                case 6: statusText = "Hoàn thành"; break;
                case 7: statusText = "Hủy"; break;
                case 8: statusText = "Yêu cầu hủy"; break;
                case 9: statusText = "Cần hoàn tiền"; break;
                default: statusText = "N/A";
            }

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <html>
                <head>
                    <title>In hóa đơn ${inv.maHoaDon || ''}</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                        .receipt-container { max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
                        .store-header { text-align: center; margin-bottom: 20px; }
                        .store-name { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; color: #0284c7; }
                        .store-subtitle { font-size: 12px; color: #666; margin: 5px 0 0 0; }
                        .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
                        .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 15px; }
                        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
                        .row .label { color: #666; }
                        .row .value { font-weight: bold; }
                        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #0284c7; border-top: 1px dashed #ddd; padding-top: 10px; margin-top: 15px; }
                        .footer { text-align: center; font-size: 11px; color: #888; margin-top: 25px; }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="store-header">
                            <h1 class="store-name">VShoes Store</h1>
                            <p class="store-subtitle">Bán giày chạy bộ cao cấp</p>
                            <p style="font-size: 11px; color: #888; margin: 2px 0 0 0;">Địa chỉ: Hà Nội, Việt Nam</p>
                        </div>
                        <div class="divider"></div>
                        <h2 class="receipt-title">HÓA ĐƠN MUA HÀNG</h2>
                        <div class="row"><span class="label">Mã hóa đơn:</span><span class="value">${inv.maHoaDon || ''}</span></div>
                        <div class="row"><span class="label">Ngày tạo:</span><span class="value">${dateStr}</span></div>
                        <div class="row"><span class="label">Khách hàng:</span><span class="value">${inv.tenKhachHang || 'Khách vãng lai'}</span></div>
                        <div class="row"><span class="label">Số điện thoại:</span><span class="value">${inv.sdtKhachHang || 'N/A'}</span></div>
                        <div class="row"><span class="label">Người tạo:</span><span class="value">${inv.nguoiTao || 'NV_AUTO'}</span></div>
                        <div class="row"><span class="label">Loại đơn:</span><span class="value">${inv.loaiHoaDon || 'N/A'}</span></div>
                        <div class="row"><span class="label">Trạng thái:</span><span class="value">${statusText}</span></div>
                        <div class="divider"></div>
                        <div class="row"><span class="label">Tổng số lượng:</span><span class="value">${inv.soLuong || 0}</span></div>
                        <div class="total-row"><span>TỔNG TIỀN:</span><span>${priceStr} đ</span></div>
                        <div class="footer">
                            <p>Cảm ơn quý khách đã mua sắm!</p>
                            <p>Hẹn gặp lại quý khách!</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        })
        .catch(err => showInvoiceToast("Không thể in hóa đơn", "error"));
};
