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
    const btnExport = document.getElementById("btnExport");
    const btnAddInvoice = document.getElementById("btnAddInvoice");
    const pageSizeSelect = document.getElementById("pageSizeSelect");
    const statusTabs = document.querySelectorAll(".status-tab");
    
    // Modal elements
    const modal = document.getElementById("invoiceModal");
    const modalClose = document.getElementById("modalClose");
    const btnCancelInv = document.getElementById("btnCancelInv");
    const invoiceForm = document.getElementById("invoiceForm");
    
    // Set default date range: today
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
                // Tự động lấy giá cao nhất từ backend
                fetch("/api/hoa-don/max-price")
                    .then(res => res.ok ? res.json() : 100000000)
                    .then(maxPrice => {
                        const dynamicMax = Math.max(parseFloat(maxPrice) || 0, 10000000);
                        priceSlider.max = dynamicMax;
                        if (state.maxPrice !== undefined) {
                            priceSlider.value = state.maxPrice;
                        } else {
                            priceSlider.value = dynamicMax;
                        }
                        if (priceSliderValue) {
                            priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(priceSlider.value) + " đ";
                        }
                    })
                    .catch(err => {
                        priceSlider.value = state.maxPrice !== undefined ? state.maxPrice : 100000000;
                        if (priceSliderValue) {
                            priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(priceSlider.value) + " đ";
                        }
                    });
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
        if (priceSlider) {
            fetch("/api/hoa-don/max-price")
                .then(res => res.ok ? res.json() : 100000000)
                .then(maxPrice => {
                    const dynamicMax = Math.max(parseFloat(maxPrice) || 0, 10000000);
                    priceSlider.max = dynamicMax;
                    priceSlider.value = dynamicMax;
                    if (priceSliderValue) {
                        priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(dynamicMax) + " đ";
                    }
                })
                .catch(() => {});
        }
    }

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
    
    // Triggers for Filtering
    const triggerFilter = () => {
        currentPage = 0;
        const isValid = validateFilters();
        if (isValid) {
            fetchInvoices();
        } else {
            // Clear the table when validation fails so old results don't remain visible
            allInvoices = [];
            filteredInvoices = [];
            renderTable();
        }
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
    pageSizeSelect.addEventListener("change", () => {
        pageSize = parseInt(pageSizeSelect.value) || 5;
        currentPage = 0;
        renderTable();
    });

    // Status tabs click event listeners
    statusTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            statusTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeStatus = tab.getAttribute("data-status");
            filterAndRender();
        });
    });

    btnReset.addEventListener("click", () => {
        searchKeyword.value = "";
        startDate.value = todayStr;
        endDate.value = todayStr;
        filterType.value = "";
        if (priceSlider) {
            const currentMax = priceSlider.max || 100000000;
            priceSlider.value = currentMax;
            if (priceSliderValue) {
                priceSliderValue.textContent = new Intl.NumberFormat('vi-VN').format(currentMax) + " đ";
            }
        }
        activeStatus = "";
        statusTabs.forEach(t => t.classList.remove("active"));
        statusTabs[0].classList.add("active");
        // Clear validation states
        validateFilters();
        triggerFilter();
    });

    // Excel Export
    btnExport.addEventListener("click", () => {
        if (filteredInvoices.length === 0) {
            showToast("Không có dữ liệu để xuất file!", "error");
            return;
        }
        
        const keyword = document.getElementById("searchKeyword").value.trim();
        const loaiHoaDon = document.getElementById("filterType").value;
        const startDateVal = document.getElementById("startDate").value;
        const endDateVal = document.getElementById("endDate").value;
        const maxPriceVal = document.getElementById("priceSlider") ? document.getElementById("priceSlider").value : "100000000";

        const params = new URLSearchParams();
        if (keyword) params.append("keyword", keyword);
        if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);
        if (startDateVal) params.append("startDate", startDateVal + "T00:00:00");
        if (endDateVal) params.append("endDate", endDateVal + "T23:59:59");
        if (maxPriceVal) params.append("maxPrice", maxPriceVal);
        
        if (activeStatus !== "") {
            params.append("trangThai", activeStatus);
        }

        showToast("Đang chuẩn bị tải file Excel cho các hóa đơn...");
        window.location.href = `/api/hoa-don/export?${params.toString()}`;
    });

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
            document.getElementById("modalTitle").textContent = "Thêm Hóa Đơn";
            invoiceForm.reset();
            document.getElementById("invId").value = "";
            modal.style.display = "flex";
        });
    }

    if (invoiceForm) {
        invoiceForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById("invId").value;
            const payload = {
                tenNguoiNhan: document.getElementById("invCustomerName").value.trim(),
                sdtNguoiNhan: document.getElementById("invCustomerPhone").value.trim(),
                loaiHoaDon: document.getElementById("invType").value === "Trực tuyến",
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
    }

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

    // Tự động làm mới danh sách hóa đơn mỗi 3 giây để cập nhật đơn hàng mới từ cổng 8080
    setInterval(() => {
        // Chỉ tự động fetch nếu các modal thêm/sửa hoặc chi tiết không mở
        const modal = document.getElementById("invoiceModal");
        const detailModal = document.getElementById("invoiceDetailModal");
        const isModalOpen = (modal && modal.style.display === "flex") || (detailModal && detailModal.style.display === "flex");
        
        if (!isModalOpen) {
            const keyword = document.getElementById("searchKeyword").value.trim();
            const loaiHoaDon = document.getElementById("filterType").value;
            const startDateVal = document.getElementById("startDate").value;
            const endDateVal = document.getElementById("endDate").value;
            const maxPriceVal = document.getElementById("priceSlider") ? document.getElementById("priceSlider").value : "100000000";

            // Mở rộng endDate sang ngày mai để bắt đơn hàng tạo sát nửa đêm
            let effectiveEndDate = endDateVal;
            if (endDateVal) {
                const endDt = new Date(endDateVal);
                endDt.setDate(endDt.getDate() + 1);
                effectiveEndDate = endDt.toLocaleDateString('en-CA');
            }

            const params = new URLSearchParams();
            if (keyword) params.append("keyword", keyword);
            if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);
            if (!keyword) {
                if (startDateVal) params.append("startDate", startDateVal + "T00:00:00");
                if (effectiveEndDate) params.append("endDate", effectiveEndDate + "T23:59:59");
            }
            if (maxPriceVal) params.append("maxPrice", maxPriceVal);

            fetch(`/api/hoa-don/search?${params.toString()}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Lỗi fetch");
                })
                .then(data => {
                    // Nếu phát hiện số lượng hóa đơn tăng lên, thông báo và reset về trang 1
                    if (allInvoices.length > 0 && data.length > allInvoices.length) {
                        const diff = data.length - allInvoices.length;
                        if (typeof window.showToast === "function") {
                            window.showToast(`Có ${diff} đơn hàng mới vừa được đặt trực tuyến!`, "success");
                        }
                        // Reset về trang 1 để hiển thị đơn mới nhất
                        currentPage = 0;
                        allInvoices = data;
                        updateStatusCounts();
                        filterAndRender();
                    } else {
                        allInvoices = data;
                        updateStatusCounts();
                        // Lưu trang hiện tại để tránh bị nhảy trang khi người dùng đang xem trang khác
                        const prevPage = currentPage;
                        filterAndRender();
                        currentPage = prevPage;
                        renderTable();
                    }
                })
                .catch(err => console.debug("Silent polling error:", err));
        }
    }, 3000);
});


// Debounce helper for search input
function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// =============================================================
// FILTER VALIDATION
// =============================================================
function validateFilters() {
    const validationBox = document.getElementById("filterValidationBox");
    const searchKeyword = document.getElementById("searchKeyword");
    const startDate    = document.getElementById("startDate");
    const endDate      = document.getElementById("endDate");
    const priceSlider  = document.getElementById("priceSlider");

    // Clear previous states
    validationBox.innerHTML = "";
    validationBox.style.display = "none";
    [searchKeyword, startDate, endDate].forEach(el => {
        if (el) {
            el.classList.remove("input-error", "input-warning");
        }
    });

    const messages = []; // { type: 'error'|'warning'|'info', icon, text }
    let hasError = false;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // ── 1. Validate keyword ──────────────────────────────────
    if (searchKeyword) {
        const kw = searchKeyword.value.trim();
        const specialCharRegex = /[<>{}[\]\\|^~`!@#$%]/;
        if (kw.length > 0 && specialCharRegex.test(kw)) {
            messages.push({
                type: "error",
                icon: "x-circle",
                text: "Từ khóa tìm kiếm chứa ký tự đặc biệt không được phép. Vui lòng chỉ nhập chữ, số, khoảng trắng hoặc dấu gạch ngang."
            });
            searchKeyword.classList.add("input-error");
            hasError = true;
        } else if (kw.length > 100) {
            messages.push({
                type: "warning",
                icon: "alert-triangle",
                text: "Từ khóa tìm kiếm quá dài (tối đa 100 ký tự). Vui lòng rút ngắn để tìm kiếm chính xác hơn."
            });
            searchKeyword.classList.add("input-warning");
        }
    }

    // ── 2. Validate dates ────────────────────────────────────
    const startVal = startDate ? startDate.value : "";
    const endVal   = endDate   ? endDate.value   : "";

    if (startVal && endVal) {
        const startDt = new Date(startVal);
        const endDt   = new Date(endVal);

        // Từ ngày > Đến ngày
        if (startDt > endDt) {
            messages.push({
                type: "error",
                icon: "x-circle",
                text: "\"Từ ngày\" không được lớn hơn \"Đến ngày\". Vui lòng chọn lại khoảng thời gian hợp lệ."
            });
            startDate.classList.add("input-error");
            endDate.classList.add("input-error");
            hasError = true;
        }
    }

    // Ngày trong tương lai → cho phép tìm kiếm bình thường,
    // API sẽ không trả về hóa đơn nào vì không có dữ liệu trong tương lai

    // ── 3. Validate price slider ──────────────────────────────
    if (priceSlider && parseInt(priceSlider.value) === 0) {
        messages.push({
            type: "warning",
            icon: "alert-triangle",
            text: "Tổng tiền tối đa đang được đặt là 0 đ. Kết quả tìm kiếm sẽ trống vì không có hóa đơn nào có tổng tiền bằng 0."
        });
    }

    // ── Render messages ──────────────────────────────────────
    if (messages.length > 0) {
        validationBox.style.display = "flex";
        messages.forEach(msg => {
            const item = document.createElement("div");
            item.className = `filter-validation-item v-${msg.type}`;
            item.innerHTML = `
                <i data-lucide="${msg.icon}" class="v-icon"></i>
                <span>${msg.text}</span>
            `;
            validationBox.appendChild(item);
        });
        lucide.createIcons();
    }

    return !hasError;
}

function parseSearchDate(str) {
    if (!str) return null;
    str = str.trim();
    let m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    m = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
        const year = new Date().getFullYear();
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return null;
}

function fetchInvoices() {
    const keywordInput = document.getElementById("searchKeyword");
    const keyword = keywordInput ? keywordInput.value.trim() : "";
    const loaiHoaDon = document.getElementById("filterType").value;
    let startDateVal = document.getElementById("startDate").value;
    let endDateVal = document.getElementById("endDate").value;
    const maxPriceVal = document.getElementById("priceSlider") ? document.getElementById("priceSlider").value : "100000000";

    // Tự động nhận diện nếu từ khóa nhập vào là ngày (ví dụ: 21/07/2026, 21/7, 2026-07-21)
    const parsedDate = parseSearchDate(keyword);
    if (parsedDate) {
        document.getElementById("startDate").value = parsedDate;
        document.getElementById("endDate").value = parsedDate;
        startDateVal = parsedDate;
        endDateVal = parsedDate;
    }

    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (loaiHoaDon) params.append("loaiHoaDon", loaiHoaDon);

    // Khi tìm kiếm bằng từ khóa (và không phải dạng chọn ngày cụ thể),
    // bỏ giới hạn khoảng ngày để backend trả về tất cả hóa đơn từ quá khứ
    if (!keyword || parsedDate) {
        if (startDateVal) params.append("startDate", startDateVal + "T00:00:00");
        if (endDateVal) {
            const endDt = new Date(endDateVal);
            endDt.setDate(endDt.getDate() + 1);
            const effectiveEnd = endDt.toLocaleDateString('en-CA');
            params.append("endDate", effectiveEnd + "T23:59:59");
        }
    }

    if (maxPriceVal) params.append("maxPrice", maxPriceVal);

    fetch(`/api/hoa-don/search?${params.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("Máy chủ phản hồi lỗi. Hãy đảm bảo ứng dụng đã được khởi động lại!");
            return res.json();
        })
        .then(data => {
            allInvoices = data;

            // Nếu tìm kiếm từ khóa và có kết quả hóa đơn:
            // Tự động chuyển bộ lọc ngày trên giao diện về ngày tạo của hóa đơn tìm thấy!
            if (keyword && data && data.length > 0) {
                const dates = data.map(inv => inv.ngayTao).filter(Boolean).map(d => new Date(d));
                if (dates.length > 0) {
                    const minDate = new Date(Math.min(...dates));
                    const maxDate = new Date(Math.max(...dates));

                    const minStr = minDate.toLocaleDateString('en-CA');
                    const maxStr = maxDate.toLocaleDateString('en-CA');

                    document.getElementById("startDate").value = minStr;
                    document.getElementById("endDate").value = maxStr;
                }
            }

            updateStatusCounts();
            filterAndRender();
        })
        .catch(err => {
            console.error("Error fetching invoices:", err);
            if (typeof window.showToast === "function") {
                window.showToast("Không thể tải danh sách hóa đơn. Vui lòng tắt và khởi động lại Spring Boot trong IDE!", "error");
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
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:40px; color: #64748b;">Không tìm thấy hóa đơn nào</td></tr>`;
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

        // Phát hiện đơn hàng khách xác nhận đã thanh toán online nhưng admin chưa xác nhận
        const ghiChuUpper = (invoice.ghiChu || '').toUpperCase();
        const khachDaXacNhan = ghiChuUpper.includes('KHÁCH XÁC NHẬN ĐÃ THANH TOÁN') || ghiChuUpper.includes('KHACH XAC NHAN DA THANH TOAN');
        const paymentAlertBadge = (khachDaXacNhan && invoice.trangThai === 0)
            ? `<br><span style="font-size:10px;font-weight:700;background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;margin-top:3px;display:inline-block;">💳 Chờ kiểm tra TT</span>`
            : '';

        tr.innerHTML = `
            <td>${startIdx + index + 1}</td>
            <td style="font-weight: 600; color: #1e293b;">${invoice.maHoaDon || ''}</td>
            <td>${nvDisplay}</td>
            <td>${customerDisplay}</td>
            <td>${phoneDisplay}</td>
            <td>${typeBadge}</td>
            <td style="font-weight: 600; color: #ef4444;">${priceStr} đ</td>
            <td>${invoice.soLuong != null ? '<span class="quantity-badge">'+invoice.soLuong+'</span>' : ''}</td>
            <td>${dateStr}</td>
            <td style="text-align: center;">${statusBadge}${paymentAlertBadge}</td>
            <td style="text-align: center;">
                <div class="btn-actions-cell" style="justify-content: center;">
                    <button class="btn-brown-outline-sm" onclick="viewInvoice(${invoice.id})" title="Chi tiết">
                        <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();

    document.getElementById("paginationInfo").textContent = `Hiển thị ${startIdx + 1}-${endIdx} / tổng ${totalElements} bản ghi`;
    document.getElementById("currentPageBox").textContent = currentPage + 1;
    
    // Setup Prev/Next button states and listeners
    const btnPrev = document.getElementById("btnPrevPage");
    const btnNext = document.getElementById("btnNextPage");

    if (btnPrev && btnNext) {
        btnPrev.disabled = currentPage === 0;
        btnNext.disabled = currentPage >= totalPages - 1;
        
        btnPrev.onclick = () => {
            if (currentPage > 0) {
                currentPage--;
                renderTable();
            }
        };
        btnNext.onclick = () => {
            if (currentPage < totalPages - 1) {
                currentPage++;
                renderTable();
            }
        };
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
        maxPrice: priceSliderEl ? priceSliderEl.value : 100000000,
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

window.viewInvoice = function(id) {
    window.location.href = `/hoa-don/${id}`;
};


