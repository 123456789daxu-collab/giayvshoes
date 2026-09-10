// employee.js - Premium, interactive frontend controller for datn (1) Employee Management

// Current local table state
let allEmployees = [];
let filteredEmployees = [];
let currentPage = 0;
let pageSize = 10;
let currentSearch = "";
let currentStatus = ""; // "" means all, "1" or "0" for active/inactive
let currentGender = "";
let currentDob = "";
let isEditing = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize DOM Elements
    const listPanel = document.getElementById("list-panel");
    const formPanel = document.getElementById("form-panel");
    const btnAdd = document.getElementById("btnAddEmployee");
    const btnCancel = document.getElementById("btnCancel");
    const btnBackToList = document.getElementById("btnBackToList");
    const form = document.getElementById("employeeForm");
    const searchInput = document.getElementById("searchInput");
    const filterStatusSelect = document.getElementById("filterStatus");
    const filterGenderSelect = document.getElementById("filterGender");
    const btnExportExcel = document.getElementById("btnExportExcel");

    const showFormPanel = () => {
        listPanel.classList.remove("active");
        formPanel.classList.add("active");
    };

    const hideFormPanel = () => {
        formPanel.classList.remove("active");
        listPanel.classList.add("active");
    };

    if (btnExportExcel) {
        btnExportExcel.onclick = () => {
            if (filteredEmployees.length === 0) {
                window.showToast("Không có dữ liệu để xuất!", "error");
                return;
            }
            window.showToast("Đang tải xuống file Excel...", "success");
            
            let csvContent = "\uFEFF"; // BOM for UTF-8
            csvContent += "STT,Mã nhân viên,Họ và tên,Vai trò,Giới tính,Ngày sinh,Số điện thoại,Email,Địa chỉ,Trạng thái\n";
            
            filteredEmployees.forEach((nv, index) => {
                const stt = index + 1;
                const gender = nv.gioiTinh ? "Nam" : "Nữ";
                const status = nv.trangThai === 1 ? "Đang áp dụng" : "Ngưng áp dụng";
                let roleCsv = nv.chucVu || "Nhân viên";
                if (roleCsv === "Quản trị viên" || roleCsv === "admin" || roleCsv === "ADMIN") {
                    roleCsv = "Quản lý";
                } else {
                    roleCsv = "Nhân viên";
                }
                const row = [
                    stt,
                    nv.maNhanVien || '',
                    `"${(nv.hoTen || '').replace(/"/g, '""')}"`,
                    `"${roleCsv.replace(/"/g, '""')}"`,
                    gender,
                    nv.ngaySinh || '',
                    `="${nv.soDienThoai || ''}"`, // Force as string in excel
                    `"${(nv.email || '').replace(/"/g, '""')}"`,
                    `"${(nv.diaChi || '').replace(/"/g, '""')}"`,
                    status
                ].join(",");
                csvContent += row + "\n";
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Danh_sach_nhan_vien_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
    const filterDob = document.getElementById("filterDob");

    // QR Code Scanner elements
    const btnScanCCCD = document.getElementById("btnScanCCCD");
    const qrReaderModal = document.getElementById("qrReaderModal");
    const btnCancelScanModal = document.getElementById("btnCancelScanModal");
    let html5QrCode = null;

    const stopScanner = () => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
            }).catch(error => {
                console.error("Failed to stop scanner. ", error);
                html5QrCode = null;
            });
        }
        qrReaderModal.style.display = "none";
        const laser = document.getElementById("qr-laser");
        if(laser) laser.style.animationPlayState = "paused";
    };

    const btnDeleteEmployee = document.getElementById("btnDeleteEmployee");
    if (btnDeleteEmployee) {
        btnDeleteEmployee.addEventListener("click", () => {
            const id = document.getElementById("empId").value;
            if (!id) return;
            Swal.fire({
                title: 'Xóa nhân viên?',
                text: "Bạn có chắc chắn muốn xóa nhân viên này không? Thao tác này không thể hoàn tác.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Có, Xóa!',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/api/nhan-vien/${id}`, { method: 'DELETE' })
                        .then(async (res) => {
                            if (!res.ok) {
                                const errMsg = await res.text();
                                throw new Error(errMsg || "Không thể xóa nhân viên này (có thể do đang có dữ liệu ràng buộc)!");
                            }
                            window.showToast("Đã xóa nhân viên thành công!");
                            hideFormPanel();
                            loadEmployees();
                        })
                        .catch(err => {
                            Swal.fire('Lỗi', err.message, 'error');
                        });
                }
            });
        });
    }

    function processCCCDQR(decodedText) {
        const parts = decodedText.split('|');
        if (parts.length >= 6) {
            const cccdNumber = parts[0];
            const fullNameRaw = parts[2];
            const fullName = fullNameRaw.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const dobRaw = parts[3];
            const gender = parts[4];
            const address = parts[5];
            
            document.getElementById("empCccd").value = cccdNumber;
            document.getElementById("empName").value = fullName;
            let year = "";
            if (dobRaw.length === 8) {
                year = dobRaw.substring(4, 8);
                const dobFormatted = `${year}-${dobRaw.substring(2, 4)}-${dobRaw.substring(0, 2)}`;
                document.getElementById("empDob").value = dobFormatted;
            }
            if (gender === "Nam") {
                document.getElementById("genderMale").checked = true;
                document.getElementById("empGenderSelect").value = "true";
            } else if (gender === "Nữ") {
                document.getElementById("genderFemale").checked = true;
                document.getElementById("empGenderSelect").value = "false";
            }
            document.getElementById("empAddress").value = address;
            // Also fill the street input for the new cascade address UI
            const addrStreet = document.getElementById("addrStreet");
            if (addrStreet) {
                addrStreet.value = address;
                if (window.addressHelper) window.addressHelper.updateHiddenAddress();
            }

            const removeTones = (str) => {
                str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ|À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "a");
                str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ|È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "e");
                str = str.replace(/ì|í|ị|ỉ|ĩ|Ì|Í|Ị|Ỉ|Ĩ/g, "i");
                str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ|Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "o");
                str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ|Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "u");
                str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ|Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "y");
                str = str.replace(/đ|Đ/g, "d");
                return str.toLowerCase().replace(/\s/g, "");
            };
            if (!document.getElementById("empPhone").value) {
                document.getElementById("empPhone").value = "0987654321";
            }
            
            document.getElementById("avatarEmployeeName").textContent = fullName;

            window.showToast("Đã tự động điền thông tin CCCD thành công!");
            stopScanner();
        } else {
            window.showToast("Mã QR không đúng định dạng CCCD Việt Nam!", "error");
        }
    }

    if (btnScanCCCD) {
        btnScanCCCD.addEventListener("click", () => {
            qrReaderModal.style.display = "flex";
            const laser = document.getElementById("qr-laser");
            if(laser) laser.style.animationPlayState = "running";
            
            // Initialize Scanner directly without UI
            html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCode.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: { width: 300, height: 300 } },
                (decodedText) => {
                    processCCCDQR(decodedText);
                },
                (errorMessage) => {
                    // parse error, ignore it.
                }
            ).catch((err) => {
                console.error("Camera access error:", err);
                window.showToast("Không thể truy cập máy ảnh. V vui lòng cấp quyền!", "error");
                stopScanner();
            });
        });
    }

    if (btnCancelScanModal) {
        btnCancelScanModal.addEventListener("click", stopScanner);
    }

    window.showToast = (message, type = "success") => {
        if (type === "success") {
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: message,
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
        } else {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type,
                title: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        }
    };

    function getNextEmployeeCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'NV';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 3. Open Form for Adding Employee
    btnAdd.onclick = () => {
        isEditing = false;
        document.getElementById("formTitle").textContent = "Thêm mới Nhân viên";
        form.reset();
        document.getElementById("empId").value = "";
        document.getElementById("empCode").value = getNextEmployeeCode();
        fetch("/api/nhan-vien/next-code")
            .then(res => res.json())
            .then(data => {
                if (data && (data.code || data.maNhanVien)) {
                    document.getElementById("empCode").value = data.code || data.maNhanVien;
                }
            })
            .catch(() => {});
        
        // Hide status field when adding new employee
        document.getElementById("statusGroup").style.display = "none";
        const btnDel = document.getElementById("btnDeleteEmployee");
        if (btnDel) btnDel.style.display = "none";
        
        // Reset address dropdowns
        if (window.addressHelper) window.addressHelper.resetAddressFields();
        
        // Password is automatically generated by backend if not provided
        const passInput = document.getElementById("empPassword");
        passInput.required = false;
        
        document.getElementById("empId").value = "";
        document.getElementById("empAvatarImg").src = "https://ui-avatars.com/api/?name=NV&background=f1f5f9&color=64748b&size=128";
        document.getElementById("empAvatar").value = "";
        document.getElementById("empRole").value = "Nhân viên";
        document.getElementById("empCccd").value = "";
        document.getElementById("avatarEmployeeName").textContent = "Nhân viên mới";
        document.getElementById("avatarEmployeeEmail").textContent = "Chưa cập nhật email";
        
        // Set default gender (Male)
        document.getElementById("genderMale").checked = true;
        document.getElementById("empGenderSelect").value = "true";
        
        // Set default status (Active / 1)
        document.getElementById("empStatus").value = "1";

        // Chỉ hiển thị nút quét CCCD khi thêm mới
        if (btnScanCCCD) btnScanCCCD.style.display = "inline-flex";

        showFormPanel();
    };

    // 4. Close Form
    btnCancel.onclick = hideFormPanel;
    btnBackToList.onclick = hideFormPanel;

    // 5. Search & Filter Event Handlers (Instant local responses)
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 0; // reset to first page
            applyLocalFilter();
        });
    }

    if (filterStatusSelect) {
        filterStatusSelect.addEventListener("change", (e) => {
            currentStatus = e.target.value;
            currentPage = 0;
            applyLocalFilter();
        });
    }

    const filterRole = document.getElementById("filterRole");
    if (filterRole) {
        filterRole.addEventListener("change", (e) => {
            // we can filter by role too
            applyLocalFilter();
        });
    }

    if (filterGenderSelect) {
        filterGenderSelect.addEventListener("change", (e) => {
            currentGender = e.target.value;
            currentPage = 0;
            applyLocalFilter();
        });
    }

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
        dropZone.addEventListener("click", (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

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
            window.showToast("Vui lòng chọn tệp tin hình ảnh hợp lệ!", "error");
            fileInput.value = "";
            return;
        }
        // Validate file size (max 3MB)
        if (file.size > 3 * 1024 * 1024) {
            window.showToast("Kích thước ảnh không được vượt quá 3MB!", "error");
            fileInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById("empAvatarImg").src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Sync avatar texts
    const empNameInput = document.getElementById("empName");
    const empEmailInput = document.getElementById("empEmail");
    if(empNameInput) empNameInput.addEventListener("input", (e) => {
        document.getElementById("avatarEmployeeName").textContent = e.target.value || "Nhân viên mới";
    });
    if(empEmailInput) empEmailInput.addEventListener("input", (e) => {
        document.getElementById("avatarEmployeeEmail").textContent = e.target.value || "Chưa cập nhật email";
    });

    // 7. Form Submission Handler
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const id = document.getElementById("empId").value;
        const password = document.getElementById("empPassword").value;
        
        // Advanced validation
        const hoTen = document.getElementById("empName").value.trim();
        const phone = document.getElementById("empPhone").value.trim();
        const email = document.getElementById("empEmail").value.trim();
        const dob = document.getElementById("empDob").value;
        const cccd = document.getElementById("empCccd").value.trim();

        if (!hoTen) {
            window.showToast("Vui lòng không để trống Họ và tên!", "warning");
            return;
        }
        
        if (!phone) {
            window.showToast("Vui lòng không để trống Số điện thoại!", "warning");
            return;
        }
        const phoneRegex = /^(0)[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            window.showToast("Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số!", "warning");
            return;
        }
        const isDuplicatePhone = allEmployees.some(emp => emp.soDienThoai === phone && String(emp.id) !== String(id));
        if (isDuplicatePhone) {
            window.showToast("Số điện thoại này đã được sử dụng bởi nhân viên khác!", "warning");
            return;
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                window.showToast("Email không đúng định dạng hợp lệ!", "warning");
                return;
            }
            const isDuplicateEmail = allEmployees.some(emp => emp.email === email && String(emp.id) !== String(id));
            if (isDuplicateEmail) {
                window.showToast("Email này đã được sử dụng bởi nhân viên khác!", "warning");
                return;
            }
        }
        
        // CCCD is optional and does not block employee creation
        const validCccd = (cccd && /^[0-9]{12}$/.test(cccd)) ? cccd : null;

        if (!dob) {
            window.showToast("Vui lòng không để trống Ngày sinh!", "warning");
            return;
        }
        const birthDate = new Date(dob);
        const today = new Date();
        
        if (birthDate > today) {
            window.showToast("Ngày sinh không được ở trong tương lai!", "warning");
            return;
        }
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 18) {
            window.showToast("Nhân viên phải từ đủ 18 tuổi trở lên!", "warning");
            return;
        }

        // Get gender radio selection
        const gioiTinh = document.getElementById("genderMale").checked;

        let roleValue = document.getElementById("empRole").value || "Nhân viên";
        if (roleValue !== "Quản lý" && roleValue !== "Nhân viên") {
            roleValue = "Nhân viên";
        }
        
        // Build request payload matching NhanVien entity
        const payload = {
            maNhanVien: document.getElementById("empCode").value.trim() || null,
            hoTen: document.getElementById("empName").value.trim(),
            email: email,
            soDienThoai: phone,
            matKhau: password || null,
            chucVu: roleValue,
            cccd: validCccd,
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

        Swal.fire({
            title: 'Xác nhận lưu',
            text: 'Bạn có chắc chắn muốn lưu thông tin này?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                // Show loading state
                Swal.fire({
                    title: 'Đang xử lý...',
                    text: 'Vui lòng chờ trong giây lát',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
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
                    const avatarFile = document.getElementById("empAvatar").files[0];
                    if (avatarFile) {
                        const formData = new FormData();
                        formData.append("file", avatarFile);
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
                .then((savedEmployee) => {
                    if (!id && savedEmployee) {
                        Swal.fire({
                            title: 'Thêm mới thành công!',
                            text: 'Tài khoản nhân viên đã được tạo. Mật khẩu đăng nhập đã được gửi vào email của nhân viên.',
                            icon: 'success',
                            confirmButtonText: 'Đã hiểu'
                        });
                    } else {
                        window.showToast(id ? "Cập nhật nhân viên thành công!" : "Tạo nhân viên thành công!");
                    }
                    hideFormPanel();
                    loadEmployees();
                })
                .catch((error) => {
                    Swal.fire({
                        title: 'Lỗi!',
                        text: error.message,
                        icon: 'error',
                        confirmButtonText: 'Đóng',
                        confirmButtonColor: '#ef4444'
                    });
                });
            }
        });
    };

    // 8. Initial Load
    loadEmployees();

    window.editEmployee = function(id) {
        isEditing = true;
        fetch(`/api/nhan-vien/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Không thể tải thông tin chi tiết nhân viên!");
                return res.json();
            })
            .then(nv => {
                if (nv) {
                    const code = nv.maNhanVien || "";
                    document.getElementById("formTitle").textContent = "Chỉnh sửa Nhân viên" + (code ? " - Mã: " + code : "");
                    document.getElementById("empId").value = nv.id;
                    document.getElementById("empCode").value = code;
                    document.getElementById("empName").value = nv.hoTen || "";
                    document.getElementById("empEmail").value = nv.email || "";
                    document.getElementById("empPhone").value = nv.soDienThoai || "";
                    
                    document.getElementById("avatarEmployeeName").textContent = nv.hoTen || "";
                    document.getElementById("avatarEmployeeEmail").textContent = nv.email || "";
                    
                    // Password is optional during edit
                    const passInput = document.getElementById("empPassword");
                    passInput.value = "";
                    passInput.required = false;
    
                    let roleDisplay = nv.chucVu || "Nhân viên";
                    if (roleDisplay === "Quản trị viên" || roleDisplay === "admin" || roleDisplay === "ADMIN") {
                        roleDisplay = "Quản lý";
                    } else {
                        roleDisplay = "Nhân viên";
                    }
                    document.getElementById("empRole").value = roleDisplay;
                    
                    document.getElementById("empCccd").value = nv.cccd || "";
                    // Fill address: put full diaChi string into the street field for editing
                    document.getElementById("empAddress").value = nv.diaChi || "";
                    const addrStreet = document.getElementById("addrStreet");
                    if (addrStreet) {
                        addrStreet.value = nv.diaChi || "";
                        if (window.addressHelper) window.addressHelper.updateHiddenAddress();
                    }
                    
                    // Hide status field when editing (status is toggled via switch outside)
                    document.getElementById("statusGroup").style.display = "none";
                    const btnDel = document.getElementById("btnDeleteEmployee");
                    if (btnDel) btnDel.style.display = "inline-flex";
                    document.getElementById("empStatus").value = String(nv.trangThai != null ? nv.trangThai : 1);
                    
                    // Set Gender
                    if (nv.gioiTinh === false) {
                        document.getElementById("genderFemale").checked = true;
                        document.getElementById("empGenderSelect").value = "false";
                    } else {
                        document.getElementById("genderMale").checked = true;
                        document.getElementById("empGenderSelect").value = "true";
                    }
    
                    // Set Birthdate
                    document.getElementById("empDob").value = nv.ngaySinh || "";
                    
                    // Set avatar preview
                    const avatarImg = document.getElementById("empAvatarImg");
                    const fallbackUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(nv.hoTen || "NV") + "&background=f1f5f9&color=64748b&size=128";
                    avatarImg.src = nv.anhDaiDien || fallbackUrl;
                    avatarImg.onerror = function() { this.onerror=null; this.src = fallbackUrl; };
                    
                    // Reset file selector
                    document.getElementById("empAvatar").value = "";
    
                    // Ẩn nút quét CCCD khi đang chỉnh sửa
                    const btnScanCCCD = document.getElementById("btnScanCCCD");
                    if (btnScanCCCD) btnScanCCCD.style.display = "none";
    
                    showFormPanel();
                }
            })
            .catch(err => {
                window.showToast(err.message, "error");
            });
    }
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
        
        // 5. Role matching
        const filterRole = document.getElementById("filterRole");
        let matchesRole = true;
        if(filterRole && filterRole.value) {
            let selectedRole = filterRole.value;
            let nvRole = nv.chucVu || "Nhân viên";
            if (nvRole === "Quản trị viên" || nvRole === "admin" || nvRole === "ADMIN") {
                nvRole = "Quản lý";
            } else {
                nvRole = "Nhân viên";
            }
            matchesRole = (nvRole === selectedRole);
        }

        return matchesSearch && matchesStatus && matchesGender && matchesDob && matchesRole;
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
                <td colspan="11" style="text-align: center; padding: 40px; color: #64748b; font-weight: 500;">
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
        const statusBadge = (nv.trangThai === 1) 
            ? `<span class="status-badge active">Hoạt động</span>` 
            : `<span class="status-badge inactive">Ngừng hoạt động</span>`;

        let displayRole = nv.chucVu || "Nhân viên";
        if (displayRole === "Quản trị viên" || displayRole === "admin" || displayRole === "ADMIN") {
            displayRole = "Quản lý";
        } else {
            displayRole = "Nhân viên";
        }

        tr.innerHTML = `
            <td style="color: #555; text-align: center;">${stt}</td>
            <td class="avatar-td" style="padding: 10px;">
                <div class="avatar-wrapper" style="width: 36px; height: 36px; margin: 0 auto; border-radius: 50%; border: none; background: #f1f5f9; overflow: hidden;">
                    <img src="${nv.anhDaiDien || ''}" class="avatar-img" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${nv.hoTen || "NV"}') + '&background=f1f5f9&color=64748b&size=128'" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"/>
                </div>
            </td>
            <td style="color: #555;">${nv.maNhanVien || ''}</td>
            <td>
                <div style="font-weight: 500; color: #333;">${nv.hoTen || ''}</div>
            </td>
            <td style="color: #555;">${nv.email || ''}</td>
            <td style="color: #555;">${genderText}</td>
            <td style="color: #555;">${nv.soDienThoai || ''}</td>
            <td style="color: #555;">${nv.diaChi || ''}</td>
            <td style="color: #555;">${displayRole}</td>
            <td style="text-align: center;">
                ${statusBadge}
            </td>
            <td style="text-align: center;">
                <div class="btn-actions-cell" style="justify-content: center;">
                    <button type="button" class="action-icon-btn edit" onclick="editEmployee(${nv.id})" title="Chỉnh sửa nhân viên">
                        <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                    <label class="switch-control" title="Thay đổi trạng thái">
                        <input type="checkbox" ${nv.trangThai === 1 ? 'checked' : ''} onchange="toggleEmployeeStatus(${nv.id}, this)">
                        <span class="switch-slider"></span>
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
    
    let paginationInfoEl = document.getElementById("paginationInfo");
    if (!paginationInfoEl) {
        paginationInfoEl = document.createElement("div");
        paginationInfoEl.id = "paginationInfo";
        paginationInfoEl.style.fontSize = "13px";
        paginationInfoEl.style.color = "#64748b";
        document.getElementById("paginationWrapper").prepend(paginationInfoEl);
    }
    paginationInfoEl.textContent = `Hiển thị ${fromElement}-${toElement} trong tổng số ${totalElements} nhân viên`;

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    // Prev Page trigger
    const btnPrev = document.createElement("button");
    btnPrev.disabled = currentPage === 0;
    btnPrev.innerHTML = '<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>';
    btnPrev.style.cssText = "background: white; border: 1px solid #e2e8f0; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #64748b; margin: 0 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
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
            btnPage.textContent = i + 1;
            btnPage.style.cssText = i === currentPage 
                ? "background: linear-gradient(135deg, #0f2d4a 0%, #00adef 100%); color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin: 0 4px; box-shadow: 0 4px 10px rgba(0, 173, 239, 0.2);"
                : "background: white; border: 1px solid #e2e8f0; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #64748b; margin: 0 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
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
    btnNext.disabled = currentPage + 1 >= totalPages;
    btnNext.innerHTML = '<i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>';
    btnNext.style.cssText = "background: white; border: 1px solid #e2e8f0; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #64748b; margin: 0 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
    btnNext.onclick = () => {
        currentPage++;
        renderTable();
    };
    controls.appendChild(btnNext);
}

// Thay đổi số lượng hiển thị trên trang
window.changePageSize = function(size) {
    pageSize = parseInt(size);
    currentPage = 0;
    renderTable();
}

// Toggle employee status with interactive instant click & confirmation
window.toggleEmployeeStatus = function(id, checkboxEl) {
    AdminStatus.confirmToggle({
        entityName: 'Nhân viên',
        checkboxEl: checkboxEl,
        onConfirm: () => {
            fetch(`/api/nhan-vien/${id}/toggle-trang-thai`, { method: "PUT" })
                .then(res => {
                    if (!res.ok) throw new Error("Thay đổi trạng thái thất bại!");
                    window.showToast("Thay đổi trạng thái làm việc thành công!");
                    loadEmployees();
                })
                .catch(err => {
                    if (checkboxEl) checkboxEl.checked = !checkboxEl.checked;
                    window.showToast(err.message, "error");
                    loadEmployees();
                });
        }
    });
};

// Delete employee operation with safe prompt (not exposed in the new UI as power button is used for toggle, but kept for fallback)
window.deleteEmployee = function(id) {
    fetch(`/api/nhan-vien/${id}`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Xóa nhân viên thất bại!");
            window.showToast("Xóa nhân viên thành công!", "success");
            loadEmployees();
        })
        .catch(err => {
            window.showToast("Lỗi hệ thống khi tải dữ liệu nhân viên!", "error");
        });
};

// ================= ADDRESS CASCADE HELPER =================
(function() {
    function updateHiddenAddress() {
        const province = document.getElementById('addrProvince');
        const district = document.getElementById('addrDistrict');
        const ward = document.getElementById('addrWard');
        const street = document.getElementById('addrStreet');
        const hidden = document.getElementById('empAddress');
        if (!hidden) return;
        const parts = [];
        if (street && street.value.trim()) parts.push(street.value.trim());
        if (ward && ward.value) parts.push(ward.options[ward.selectedIndex].textContent);
        if (district && district.value) parts.push(district.options[district.selectedIndex].textContent);
        if (province && province.value) parts.push(province.options[province.selectedIndex].textContent);
        hidden.value = parts.join(', ');
    }

    async function loadProvinces() {
        const sel = document.getElementById('addrProvince');
        if (!sel) return;
        try {
            const res = await fetch('/api/address/provinces');
            const data = await res.json();
            data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.code;
                opt.textContent = p.name;
                sel.appendChild(opt);
            });
        } catch(e) { console.error('Lỗi tải tỉnh/TP:', e); }
    }

    async function loadDistricts(provinceCode) {
        const sel = document.getElementById('addrDistrict');
        const wardSel = document.getElementById('addrWard');
        sel.innerHTML = '<option value="">Chọn quận huyện</option>';
        wardSel.innerHTML = '<option value="">Chọn xã phường</option>';
        if (!provinceCode) { updateHiddenAddress(); return; }
        try {
            const res = await fetch('/api/address/districts/' + provinceCode);
            const data = await res.json();
            (data.districts || []).forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.code;
                opt.textContent = d.name;
                sel.appendChild(opt);
            });
        } catch(e) { console.error('Lỗi tải quận/huyện:', e); }
        updateHiddenAddress();
    }

    async function loadWards(districtCode) {
        const sel = document.getElementById('addrWard');
        sel.innerHTML = '<option value="">Chọn xã phường</option>';
        if (!districtCode) { updateHiddenAddress(); return; }
        try {
            const res = await fetch('/api/address/wards/' + districtCode);
            const data = await res.json();
            (data.wards || []).forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.code;
                opt.textContent = w.name;
                sel.appendChild(opt);
            });
        } catch(e) { console.error('Lỗi tải phường/xã:', e); }
        updateHiddenAddress();
    }

    function resetAddressFields() {
        const p = document.getElementById('addrProvince');
        const d = document.getElementById('addrDistrict');
        const w = document.getElementById('addrWard');
        const s = document.getElementById('addrStreet');
        const h = document.getElementById('empAddress');
        if (p) p.value = '';
        if (d) { d.innerHTML = '<option value="">Chọn quận huyện</option>'; }
        if (w) { w.innerHTML = '<option value="">Chọn xã phường</option>'; }
        if (s) s.value = '';
        if (h) h.value = '';
    }

    window.addressHelper = { resetAddressFields, updateHiddenAddress, loadProvinces, loadDistricts, loadWards };

    document.addEventListener('DOMContentLoaded', function() {
        loadProvinces();
        const pSel = document.getElementById('addrProvince');
        const dSel = document.getElementById('addrDistrict');
        const wSel = document.getElementById('addrWard');
        const street = document.getElementById('addrStreet');
        if (pSel) pSel.addEventListener('change', () => loadDistricts(pSel.value));
        if (dSel) dSel.addEventListener('change', () => loadWards(dSel.value));
        if (wSel) wSel.addEventListener('change', updateHiddenAddress);
        if (street) street.addEventListener('input', updateHiddenAddress);
    });
})();

