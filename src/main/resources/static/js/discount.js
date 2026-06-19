// discount.js - Handles Discount Campaign logic

let allDiscounts = [];
let filteredDiscounts = [];
let currentPage = 0;
const pageSize = 8;
let currentSearch = "";
let currentStatus = ""; 
let isEditing = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize DOM Elements
    const modal = document.getElementById("discountModal");
    const btnAdd = document.getElementById("btnAddDiscount");
    const spanClose = document.getElementById("modalClose");
    const btnCancel = document.getElementById("btnCancel");
    const form = document.getElementById("discountForm");
    const searchInput = document.getElementById("searchInput");
    const filterStatus = document.getElementById("filterStatus");

    // 2. Initialize Toast Container
    const toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
    window.showToast = (message, type = "success") => {
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

    // 3. Open Modal
    btnAdd.onclick = () => {
        isEditing = false;
        document.getElementById("modalTitle").textContent = "Thêm Đợt Giảm Giá";
        form.reset();
        document.getElementById("discId").value = "";
        document.getElementById("discStatus").value = "1"; // Default active
        modal.style.display = "flex";
    };

    // 4. Close Modal
    const hideModal = () => {
        modal.style.display = "none";
    };
    spanClose.onclick = hideModal;
    btnCancel.onclick = hideModal;
    window.onclick = (e) => {
        if (e.target === modal) hideModal();
    };

    // 5. Search & Filter
    searchInput.addEventListener("input", (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        currentPage = 0;
        applyLocalFilter();
    });

    filterStatus.addEventListener("change", (e) => {
        currentStatus = e.target.value;
        currentPage = 0;
        applyLocalFilter();
    });

    // 6. Form Submit
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const id = document.getElementById("discId").value;
        const start = document.getElementById("discStart").value;
        const end = document.getElementById("discEnd").value;
        
        // Date validation
        if (new Date(start) >= new Date(end)) {
            showToast("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!", "error");
            return;
        }

        const payload = {
            maDotGiamGia: document.getElementById("discCode").value.trim().toUpperCase(),
            tenDotGiamGia: document.getElementById("discName").value.trim(),
            phanTramGiam: Number(document.getElementById("discPercent").value),
            ngayBatDau: start,
            ngayKetThuc: end,
            moTa: document.getElementById("discDesc").value.trim(),
            trangThai: Number(document.getElementById("discStatus").value)
        };

        let requestUrl = "/api/dot-giam-gia";
        let requestMethod = "POST";

        if (id) {
            payload.id = Number(id);
            requestUrl = `/api/dot-giam-gia/${id}`;
            requestMethod = "PUT";
        }

        Swal.fire({
            title: 'Xác nhận',
            text: id ? "Bạn có chắc chắn muốn cập nhật đợt giảm giá này?" : "Bạn có chắc chắn muốn thêm đợt giảm giá mới?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(requestUrl, {
                    method: requestMethod,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(async (res) => {
                    if (!res.ok) {
                        const errMsg = await res.text();
                        throw new Error(errMsg || "Lưu thông tin thất bại!");
                    }
                    return res.json();
                })
                .then(() => {
                    showToast(id ? "Cập nhật đợt giảm giá thành công!" : "Tạo đợt giảm giá thành công!");
                    hideModal();
                    loadDiscounts();
                })
                .catch((error) => {
                    showToast(error.message, "error");
                });
            }
        });
    };

    // Initial Load
    loadDiscounts();
});

// Load from server
function loadDiscounts() {
    fetch("/api/dot-giam-gia")
        .then(res => res.json())
        .then(data => {
            allDiscounts = data || [];
            applyLocalFilter();
        })
        .catch(err => {
            window.showToast("Không thể tải dữ liệu", "error");
        });
}

// Local Filter
function applyLocalFilter() {
    filteredDiscounts = allDiscounts.filter(d => {
        let matchesSearch = true;
        if (currentSearch) {
            const code = (d.maDotGiamGia || "").toLowerCase();
            const name = (d.tenDotGiamGia || "").toLowerCase();
            matchesSearch = code.includes(currentSearch) || name.includes(currentSearch);
        }

        let matchesStatus = true;
        if (currentStatus !== "") {
            matchesStatus = String(d.trangThai) === currentStatus;
        }

        return matchesSearch && matchesStatus;
    });
    renderTable();
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit'
    });
}

// Render Table
function renderTable() {
    const tbody = document.getElementById("discountTableBody");
    tbody.innerHTML = "";

    const totalElements = filteredDiscounts.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    if (totalElements === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #64748b; font-weight: 500;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <i data-lucide="inbox" style="width: 32px; height: 32px; stroke-width: 1.5;"></i>
                        Không tìm thấy đợt giảm giá nào
                    </div>
                </td>
            </tr>
        `;
        document.getElementById("paginationWrapper").style.display = "none";
        lucide.createIcons();
        return;
    }

    document.getElementById("paginationWrapper").style.display = "flex";

    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalElements);
    const pageData = filteredDiscounts.slice(startIdx, endIdx);

    pageData.forEach(d => {
        const tr = document.createElement("tr");
        
        const statusClass = (d.trangThai === 1) ? "badge-success" : "badge-danger";
        const statusText = (d.trangThai === 1) ? "Đang diễn ra" : "Đã kết thúc";
        const statusIcon = (d.trangThai === 1) ? "play-circle" : "pause-circle";

        tr.innerHTML = `
            <td style="font-weight: 700; color: #1e293b;">${d.maDotGiamGia}</td>
            <td style="font-weight: 600; color: #0f172a;">${d.tenDotGiamGia}</td>
            <td style="text-align: center;">
                <span class="glass-tag" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                    <i data-lucide="trending-down" style="width: 12px; height: 12px;"></i> ${d.phanTramGiam}%
                </span>
            </td>
            <td>
                <div style="font-size: 13px; color: #475569;">
                    <div><strong>Từ:</strong> ${formatDate(d.ngayBatDau)}</div>
                    <div style="margin-top: 4px;"><strong>Đến:</strong> ${formatDate(d.ngayKetThuc)}</div>
                </div>
            </td>
            <td>
                <span class="badge ${statusClass}" style="background: ${d.trangThai === 1 ? '#ecfdf3' : '#fef3f2'}; color: ${d.trangThai === 1 ? '#027a48' : '#b42318'}; border: 1px solid ${d.trangThai === 1 ? '#abefc6' : '#fecdca'}; padding: 4px 10px; font-weight: 500;">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="btn-action-group">
                    <button class="btn-brown-outline-sm" onclick="editDiscount(${d.id})" title="Sửa"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i></button>
                    <label class="toggle-switch" title="Thay đổi trạng thái">
                        <input type="checkbox" ${d.trangThai === 1 ? 'checked' : ''} onchange="toggleStatus(${d.id})">
                        <span class="slider"></span>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(totalElements, totalPages);
    lucide.createIcons();
}

// Pagination logic
function renderPagination(totalElements, totalPages) {
    const fromElement = currentPage * pageSize + 1;
    const toElement = Math.min((currentPage + 1) * pageSize, totalElements);
    document.getElementById("paginationInfo").textContent = `Hiển thị ${fromElement}-${toElement} trong tổng số ${totalElements} đợt`;

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    const btnPrev = document.createElement("button");
    btnPrev.className = "btn-page";
    btnPrev.disabled = currentPage === 0;
    btnPrev.innerHTML = '<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>';
    btnPrev.onclick = () => { currentPage--; renderTable(); };
    controls.appendChild(btnPrev);

    for (let i = 0; i < totalPages; i++) {
        const btnPage = document.createElement("button");
        btnPage.className = `btn-page ${i === currentPage ? 'active' : ''}`;
        btnPage.textContent = i + 1;
        btnPage.onclick = () => { currentPage = i; renderTable(); };
        controls.appendChild(btnPage);
    }

    const btnNext = document.createElement("button");
    btnNext.className = "btn-page";
    btnNext.disabled = currentPage + 1 >= totalPages;
    btnNext.innerHTML = '<i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>';
    btnNext.onclick = () => { currentPage++; renderTable(); };
    controls.appendChild(btnNext);
}

// Edit function
function editDiscount(id) {
    fetch(`/api/dot-giam-gia/${id}`)
        .then(res => res.json())
        .then(d => {
            document.getElementById("modalTitle").textContent = "Sửa Đợt Giảm Giá";
            document.getElementById("discId").value = d.id;
            document.getElementById("discCode").value = d.maDotGiamGia || "";
            document.getElementById("discName").value = d.tenDotGiamGia || "";
            document.getElementById("discPercent").value = d.phanTramGiam || "";
            document.getElementById("discStart").value = d.ngayBatDau || "";
            document.getElementById("discEnd").value = d.ngayKetThuc || "";
            document.getElementById("discDesc").value = d.moTa || "";
            document.getElementById("discStatus").value = String(d.trangThai);
            
            document.getElementById("discountModal").style.display = "flex";
        })
        .catch(err => showToast("Không thể tải dữ liệu", "error"));
}

function toggleStatus(id) {
    Swal.fire({
        title: 'Xác nhận',
        text: "Bạn có chắc chắn muốn thay đổi trạng thái của đợt giảm giá này?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/api/dot-giam-gia/${id}/toggle-trang-thai`, { method: "PUT" })
                .then(res => {
                    if (!res.ok) throw new Error("Thay đổi thất bại");
                    showToast("Đã đổi trạng thái!");
                    loadDiscounts();
                })
                .catch(err => showToast(err.message, "error"));
        } else {
            loadDiscounts();
        }
    });
}

function deleteDiscount(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: "Bạn có chắc chắn muốn xóa vĩnh viễn đợt giảm giá này?",
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/api/dot-giam-gia/${id}`, { method: "DELETE" })
                .then(res => {
                    if (!res.ok) throw new Error("Xóa thất bại");
                    showToast("Xóa thành công!");
                    loadDiscounts();
                })
                .catch(err => showToast(err.message, "error"));
        }
    });
}
