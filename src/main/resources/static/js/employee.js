// employee.js - Premium, interactive frontend controller for datn (1) Employee Management

// Current local table state
let allEmployees = [];
let filteredEmployees = [];
let currentPage = 0;
const pageSize = 8;
let currentSearch = "";
let currentStatus = ""; // "" means all, "1" or "0" for active/inactive
let currentGender = "";
let currentDob = "";
let isEditing = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize DOM Elements
    const modal = document.getElementById("employeeModal");
    const btnAdd = document.getElementById("btnAddEmployee");
    const spanClose = document.getElementById("modalClose");
    const btnCancel = document.getElementById("btnCancel");
    const form = document.getElementById("employeeForm");
    const searchInput = document.getElementById("searchInput");
    const filterStatusRadios = document.querySelectorAll("input[name='filterStatus']");
    const filterGenderRadios = document.querySelectorAll("input[name='filterGender']");
    const filterDob = document.getElementById("filterDob");

    // QR Code Scanner elements
    const btnScanCCCD = document.getElementById("btnScanCCCD");
    const qrReaderContainer = document.getElementById("qrReaderContainer");
    const btnCancelScan = document.getElementById("btnCancelScan");
    let html5QrcodeScanner = null;

    const stopScanner = () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
            html5QrcodeScanner = null;
        }
        qrReaderContainer.style.display = "none";
    };

    btnScanCCCD.addEventListener("click", () => {
        if (qrReaderContainer.style.display === "block") {
            stopScanner();
            return;
        }
        qrReaderContainer.style.display = "block";
        
        // Initialize Scanner
        html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", { fps: 10, qrbox: 250 });
        
        html5QrcodeScanner.render((decodedText, decodedResult) => {
            // CCCD format: Số CCCD|Số CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ thường trú|Ngày cấp
            console.log(`Scan result: ${decodedText}`);
            const parts = decodedText.split('|');
            if (parts.length >= 6) {
                const fullName = parts[2];
                const dobRaw = parts[3]; // format ddmmyyyy
                const gender = parts[4]; // Nam / Nữ
                const address = parts[5];
                
                // Fill form
                document.getElementById("empName").value = fullName;
                
                // Format DOB from ddmmyyyy to yyyy-mm-dd
                if (dobRaw.length === 8) {
                    const dobFormatted = `${dobRaw.substring(4, 8)}-${dobRaw.substring(2, 4)}-${dobRaw.substring(0, 2)}`;
                    document.getElementById("empDob").value = dobFormatted;
                }
                
                if (gender === "Nam") {
                    document.getElementById("genderMale").checked = true;
                } else if (gender === "Nữ") {
                    document.getElementById("genderFemale").checked = true;
                }
                
                document.getElementById("empAddress").value = address;
                
                window.showToast("Đã quét và điền thông tin CCCD thành công!");
                stopScanner();
            } else {
                window.showToast("Mã QR không đúng định dạng CCCD Việt Nam!", "error");
            }
        }, (errorMessage) => {
            // parse error, ignore it.
        });
    });

    btnCancelScan.addEventListener("click", stopScanner);

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

    // 3. Open Modal for Adding Employee
    btnAdd.onclick = () => {
        isEditing = false;
        document.getElementById("modalTitle").textContent = "Thêm Nhân viên";
        form.reset();
        document.getElementById("empId").value = "";
        
        // Password is required for new employees
        const passInput = document.getElementById("empPassword");
        passInput.required = true;
        passInput.placeholder = "Nhập mật khẩu...";
        
        // Reset Avatar Preview
        document.getElementById("empAvatarImg").src = "/images/avatars/default.png";
        document.getElementById("empAvatar").value = "";
        
        // Set default gender (Male)
        document.getElementById("genderMale").checked = true;
        
        // Set default status (Active / 1)
        document.getElementById("empStatus").value = "1";

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

    // 5. Search & Filter Event Handlers (Instant local responses)
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 0; // reset to first page
            applyLocalFilter();
        });
    }

    filterStatusRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            currentStatus = e.target.value;
            currentPage = 0;
            applyLocalFilter();
        });
    });

    filterGenderRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            currentGender = e.target.value;
            currentPage = 0;
            applyLocalFilter();
        });
    });

    if (filterDob) {
        filterDob.addEventListener("change", (e) => {
            currentDob = e.target.value;
            currentPage = 0;
            applyLocalFilter();
        });
    }

    // 6. Drag and Drop Handling for Avatar Upload
    const dropZone = document.getElementById("avatarDropZone");
    const fileInput = document.getElementById("empAvatar");

    if (dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());

        // Highlight drag area on dragover
        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add("dragover");
            }, false);
        });

        // Remove highlight on dragleave
        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove("dragover");
            }, false);
        });

        // Handle dropped files
        dropZone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleAvatarPreview(files[0]);
            }
        });

        // Handle file select
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleAvatarPreview(e.target.files[0]);
            }
        });
    }

    // Avatar preview display & basic validation
    function handleAvatarPreview(file) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
            showToast("Vui lòng chọn tệp tin hình ảnh hợp lệ!", "error");
            fileInput.value = "";
            return;
        }
        // Validate file size (max 3MB)
        if (file.size > 3 * 1024 * 1024) {
            showToast("Kích thước ảnh không được vượt quá 3MB!", "error");
            fileInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById("empAvatarImg").src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 7. Form Submission Handler
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const id = document.getElementById("empId").value;
        const password = document.getElementById("empPassword").value;
        
        // Advanced validation
        const phone = document.getElementById("empPhone").value.trim();
        const email = document.getElementById("empEmail").value.trim();
        
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        if (!phoneRegex.test(phone)) {
            showToast("Số điện thoại không đúng định dạng Việt Nam!", "error");
            return;
        }

        // Get gender radio selection
        const gioiTinh = document.getElementById("genderMale").checked;

        // Build request payload matching NhanVien entity
        const payload = {
            hoTen: document.getElementById("empName").value.trim(),
            email: email,
            soDienThoai: phone,
            matKhau: password || null,
            chucVu: document.getElementById("empRole").value,
            trangThai: Number(document.getElementById("empStatus").value),
            gioiTinh: gioiTinh,
            ngaySinh: document.getElementById("empDob").value || null,
            diaChi: document.getElementById("empAddress").value.trim()
        };

        let requestUrl = "/api/nhan-vien";
        let requestMethod = "POST";

        if (id) {
            payload.id = Number(id);
            requestUrl = `/api/nhan-vien/${id}`;
            requestMethod = "PUT";
        }

        // Post/Put to backend
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
        .then((savedEmployee) => {
            // Upload avatar if a new one is selected
            if (fileInput && fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append("file", fileInput.files[0]);

                return fetch(`/api/nhan-vien/${savedEmployee.id}/avatar`, {
                    method: "POST",
                    body: formData
                }).then(res => {
                    if (!res.ok) throw new Error("Không thể tải lên ảnh đại diện!");
                    return savedEmployee;
                });
            }
            return savedEmployee;
        })
        .then(() => {
            showToast(id ? "Cập nhật tài khoản nhân viên thành công!" : "Tạo tài khoản nhân viên thành công!");
            hideModal();
            loadEmployees();
        })
        .catch((error) => {
            showToast(error.message, "error");
        });
    };

    // 8. Initial Load
    loadEmployees();
});

// Load employees from server
function loadEmployees() {
    fetch("/api/nhan-vien")
        .then(res => {
            if (!res.ok) throw new Error("Tải danh sách nhân viên thất bại!");
            return res.json();
        })
        .then(data => {
            allEmployees = data || [];
            applyLocalFilter();
        })
        .catch(err => {
            window.showToast(err.message, "error");
        });
}

// Perform instant client-side filtering and search
function applyLocalFilter() {
    filteredEmployees = allEmployees.filter(nv => {
        // 1. Search keyword matching
        let matchesSearch = true;
        if (currentSearch) {
            const code = (nv.maNhanVien || "").toLowerCase();
            const name = (nv.hoTen || "").toLowerCase();
            const email = (nv.email || "").toLowerCase();
            const phone = (nv.soDienThoai || "").toLowerCase();
            matchesSearch = code.includes(currentSearch) || 
                            name.includes(currentSearch) || 
                            email.includes(currentSearch) || 
                            phone.includes(currentSearch);
        }

        // 2. Status matching
        let matchesStatus = true;
        if (currentStatus !== "") {
            matchesStatus = String(nv.trangThai) === currentStatus;
        }

        // 3. Gender matching
        let matchesGender = true;
        if (currentGender !== "") {
            matchesGender = String(nv.gioiTinh) === currentGender;
        }

        // 4. DOB matching
        let matchesDob = true;
        if (currentDob !== "") {
            matchesDob = nv.ngaySinh === currentDob;
        }

        return matchesSearch && matchesStatus && matchesGender && matchesDob;
    });

    renderTable();
}

// Render dynamic rows with round avatars and client-side pagination
function renderTable() {
    const tbody = document.getElementById("employeeTableBody");
    tbody.innerHTML = "";

    const totalElements = filteredEmployees.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    if (totalElements === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b; font-weight: 500;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <i data-lucide="inbox" style="width: 32px; height: 32px; stroke-width: 1.5;"></i>
                        Không tìm thấy nhân viên nào phù hợp
                    </div>
                </td>
            </tr>
        `;
        document.getElementById("paginationWrapper").style.display = "none";
        lucide.createIcons();
        return;
    }

    document.getElementById("paginationWrapper").style.display = "flex";

    // Slice for current page
    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalElements);
    const pageEmployees = filteredEmployees.slice(startIdx, endIdx);

    pageEmployees.forEach((nv, index) => {
        const tr = document.createElement("tr");
        const stt = startIdx + index + 1;
        
        // Gender Display
        const genderText = nv.gioiTinh ? "Nam" : "Nữ";

        // Status Badge styling
        const statusClass = (nv.trangThai === 1) ? "badge-success" : "badge-danger";
        const statusText = (nv.trangThai === 1) ? "Hoạt động" : "Ngưng hoạt động";

        tr.innerHTML = `
            <td style="color: #555;">${stt}</td>
            <td class="avatar-td" style="padding: 10px;">
                <div class="avatar-wrapper" style="width: 36px; height: 36px; margin: 0 auto; border-radius: 50%; border: none; background: #f1f5f9;">
                    <img src="${nv.anhDaiDien || '/images/avatars/default.png'}" class="avatar-img" onerror="this.src='/images/avatars/default.png'" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"/>
                </div>
            </td>
            <td>
                <div style="font-weight: 500; color: #333;">${nv.hoTen}</div>
            </td>
            <td style="color: #555;">${nv.chucVu}</td>
            <td style="color: #555;">${genderText}</td>
            <td style="color: #555;">${nv.ngaySinh || ''}</td>
            <td>
                <div style="color: #555; text-align: left; display: inline-block;">
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;"><i data-lucide="phone" style="width: 12px; height: 12px; color: #d92d20;"></i> ${nv.soDienThoai || ''}</div>
                    <div style="display: flex; align-items: center; gap: 4px;"><i data-lucide="mail" style="width: 12px; height: 12px; color: #026aa2;"></i> ${nv.email || ''}</div>
                </div>
            </td>
            <td style="color: #555; text-align: left; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nv.diaChi || ''}">
                <div style="display: flex; align-items: center; gap: 4px;"><i data-lucide="map-pin" style="width: 12px; height: 12px; color: #1570ef;"></i> ${nv.diaChi || ''}</div>
            </td>
            <td>
                <span class="badge ${statusClass}" style="background: ${nv.trangThai === 1 ? '#ecfdf3' : '#fef3f2'}; color: ${nv.trangThai === 1 ? '#027a48' : '#b42318'}; border: 1px solid ${nv.trangThai === 1 ? '#abefc6' : '#fecdca'}; padding: 4px 10px; font-weight: 500;">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="btn-action-group">
                    <button class="btn-brown-outline-sm" onclick="editEmployee(${nv.id})" title="Sửa"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i></button>
                    <label class="toggle-switch" title="Thay đổi trạng thái">
                        <input type="checkbox" ${nv.trangThai === 1 ? 'checked' : ''} onchange="toggleEmployeeStatus(${nv.id})">
                        <span class="slider"></span>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Render pagination controls
    renderPagination(totalElements, totalPages);
    lucide.createIcons();
}

// Generate premium pagination controls dynamically
function renderPagination(totalElements, totalPages) {
    const fromElement = currentPage * pageSize + 1;
    const toElement = Math.min((currentPage + 1) * pageSize, totalElements);
    
    document.getElementById("paginationInfo").textContent = 
        `Hiển thị ${fromElement}-${toElement} trong tổng số ${totalElements} nhân viên`;

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    // Prev Page trigger
    const btnPrev = document.createElement("button");
    btnPrev.className = "btn-page";
    btnPrev.disabled = currentPage === 0;
    btnPrev.innerHTML = '<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>';
    btnPrev.onclick = () => {
        currentPage--;
        renderTable();
    };
    controls.appendChild(btnPrev);

    // Numbered pages (with dynamic ellipsis for large page count)
    const range = 2; // how many pages to show around current page
    for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= currentPage - range && i <= currentPage + range)) {
            const btnPage = document.createElement("button");
            btnPage.className = `btn-page ${i === currentPage ? 'active' : ''}`;
            btnPage.textContent = i + 1;
            btnPage.onclick = () => {
                currentPage = i;
                renderTable();
            };
            controls.appendChild(btnPage);
        } else if (i === 1 || i === totalPages - 2) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.style.margin = "0 6px";
            ellipsis.style.color = "#94a3b8";
            controls.appendChild(ellipsis);
        }
    }

    // Next Page trigger
    const btnNext = document.createElement("button");
    btnNext.className = "btn-page";
    btnNext.disabled = currentPage + 1 >= totalPages;
    btnNext.innerHTML = '<i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>';
    btnNext.onclick = () => {
        currentPage++;
        renderTable();
    };
    controls.appendChild(btnNext);
}

// Edit employee: Fetch individual data and populate modal fields
function editEmployee(id) {
    isEditing = true;
    fetch(`/api/nhan-vien/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("Không thể tải thông tin chi tiết nhân viên!");
            return res.json();
        })
        .then(nv => {
            if (nv) {
                document.getElementById("modalTitle").textContent = "Sửa Nhân viên";
                document.getElementById("empId").value = nv.id;
                document.getElementById("empName").value = nv.hoTen || "";
                document.getElementById("empEmail").value = nv.email || "";
                document.getElementById("empPhone").value = nv.soDienThoai || "";
                
                // Password is optional during edit
                const passInput = document.getElementById("empPassword");
                passInput.value = "";
                passInput.required = false;
                passInput.placeholder = "Bỏ trống nếu giữ nguyên mật khẩu cũ";

                document.getElementById("empRole").value = nv.chucVu || "Nhân viên bán hàng";
                document.getElementById("empAddress").value = nv.diaChi || "";
                document.getElementById("empStatus").value = String(nv.trangThai);
                
                // Set Gender
                if (nv.gioiTinh === false) {
                    document.getElementById("genderFemale").checked = true;
                } else {
                    document.getElementById("genderMale").checked = true;
                }

                // Set Birthdate
                document.getElementById("empDob").value = nv.ngaySinh || "";
                
                // Set avatar preview
                const avatarImg = document.getElementById("empAvatarImg");
                avatarImg.src = nv.anhDaiDien || "/images/avatars/default.png";
                
                // Reset file selector
                document.getElementById("empAvatar").value = "";

                document.getElementById("employeeModal").style.display = "flex";
            }
        })
        .catch(err => {
            window.showToast(err.message, "error");
        });
}

// Toggle employee status with interactive instant click
function toggleEmployeeStatus(id) {
    fetch(`/api/nhan-vien/${id}/toggle-trang-thai`, { method: "PUT" })
        .then(res => {
            if (!res.ok) throw new Error("Thay đổi trạng thái thất bại!");
            window.showToast("Thay đổi trạng thái làm việc thành công!");
            loadEmployees();
        })
        .catch(err => {
            window.showToast(err.message, "error");
        });
}

// Delete employee operation with safe prompt
function deleteEmployee(id) {
    if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản nhân viên này khỏi hệ thống?")) {
        fetch(`/api/nhan-vien/${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error("Xóa tài khoản nhân viên thất bại!");
                window.showToast("Xóa tài khoản nhân viên thành công!");
                loadEmployees();
            })
            .catch(err => {
                window.showToast(err.message, "error");
            });
    }
}
