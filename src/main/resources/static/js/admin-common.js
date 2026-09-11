/**
 * VShoes Admin Common JavaScript Utilities (admin-common.js)
 * Module tập trung các hàm tiện ích và xử lý trạng thái chung cho Admin
 */

window.AdminStatus = {
    /**
     * Tra về chuỗi HTML Badge trạng thái được đồng bộ chuẩn
     * @param {number|string|boolean} status Giá trị trạng thái
     * @param {string} domain Loại quản lý ('dot-giam-gia', 'phieu-giam-gia', 'loai-giam', 'loai-phieu', 'tai-khoan', 'san-pham', 'hoa-don')
     * @returns {string} Chuỗi HTML <span class="app-badge ...">...</span>
     */
    renderBadge: function(status, domain = 'default') {
        const val = String(status).trim();
        
        // 1. Đợt giảm giá (Campaigns)
        if (domain === 'dot-giam-gia' || domain === 'campaign') {
            if (val === '1' || val === 'Diễn ra' || val === 'Đang diễn ra') {
                return '<span class="app-badge app-badge-success">Diễn ra</span>';
            } else if (val === '3' || val === 'Sắp diễn ra') {
                return '<span class="app-badge app-badge-warning">Sắp diễn ra</span>';
            } else if (val === '2' || val === '0' || val === 'Hết hạn' || val === 'Đã kết thúc') {
                return '<span class="app-badge app-badge-danger">Hết hạn</span>';
            }
        }
        
        // 2. Phiếu giảm giá (Vouchers)
        if (domain === 'phieu-giam-gia' || domain === 'voucher') {
            if (val === '1' || val === 'Đang diễn ra' || val === 'Hoạt động') {
                return '<span class="app-badge app-badge-success">Đang diễn ra</span>';
            } else if (val === '3' || val === 'Sắp diễn ra') {
                return '<span class="app-badge app-badge-warning">Sắp diễn ra</span>';
            } else if (val === '2' || val === '0' || val === 'Đã kết thúc' || val === 'Ngừng hoạt động' || val === 'Hết hạn') {
                return '<span class="app-badge app-badge-danger">Đã kết thúc</span>';
            }
        }

        // 3. Kiểu giảm
        if (domain === 'loai-giam') {
            if (val === 'Phần trăm' || val === '%') {
                return '<span class="app-badge badge-percent">% Phần trăm</span>';
            } else if (val === 'Tiền mặt' || val === 'VNĐ') {
                return '<span class="app-badge badge-cash">VNĐ Tiền mặt</span>';
            }
        }

        // 4. Đối tượng / Loại phiếu
        if (domain === 'loai-phieu') {
            if (val === 'Công khai') {
                return '<span class="app-badge badge-public">Công khai</span>';
            } else if (val === 'Cá nhân') {
                return '<span class="app-badge badge-individual">Cá nhân</span>';
            }
        }

        // 5. Trạng thái Hóa đơn
        if (domain === 'hoa-don') {
            if (val === '0' || val.includes('Chờ xác nhận')) return '<span class="app-badge app-badge-warning">Chờ xác nhận</span>';
            if (val === '1' || val.includes('Đã xác nhận')) return '<span class="app-badge app-badge-info">Đã xác nhận</span>';
            if (val === '2' || val.includes('Đang giao')) return '<span class="app-badge app-badge-info">Đang giao</span>';
            if (val === '3' || val.includes('Đã giao') || val.includes('Hoàn thành')) return '<span class="app-badge app-badge-success">Hoàn thành</span>';
            if (val === '4' || val.includes('Hủy') || val.includes('huỷ')) return '<span class="app-badge app-badge-danger">Đã hủy</span>';
        }

        // 6. Mặc định: Hoạt động / Ngừng hoạt động (Tài khoản, Sản phẩm)
        if (val === '1' || val === 'true' || val === 'Hoạt động' || val === 'ACTIVE') {
            return '<span class="app-badge app-badge-success">Hoạt động</span>';
        } else if (val === '0' || val === 'false' || val === 'Ngừng hoạt động' || val === 'INACTIVE') {
            return '<span class="app-badge app-badge-danger">Ngừng hoạt động</span>';
        }

        return `<span class="app-badge app-badge-secondary">${val}</span>`;
    },

    /**
     * Đồng bộ hiển thị popup xác nhận SweetAlert2 khi người dùng đổi trạng thái
     * @param {Object} options { entityName, title, text, isActivating, onConfirm, callback, targetUrl, event, checkboxEl }
     */
    confirmToggle: function(options = {}) {
        return window.AdminNotify.confirmToggle(options);
    }
};

/**
 * Hệ thống Thông Báo & Xác Nhận Đồng Bộ VShoes (AdminNotify)
 */
window.AdminNotify = {
    /**
     * Hiển thị Toast thông báo góc phải màn hình
     * @param {string} message Nội dung thông báo
     * @param {string} type 'success' | 'error' | 'warning' | 'info'
     * @param {string} title Tiêu đề (tùy chọn)
     */
    toast: function(message, type = 'success', title = '') {
        if (!message) return;
        
        let defaultTitle = title;
        if (!defaultTitle) {
            if (type === 'success') defaultTitle = 'Thành công';
            else if (type === 'error') defaultTitle = 'Lỗi';
            else if (type === 'warning') defaultTitle = 'Cảnh báo';
            else defaultTitle = 'Thông báo';
        }

        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type,
                title: defaultTitle,
                text: (message !== defaultTitle) ? message : undefined,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else if (typeof window.showCustomToast === 'function') {
            window.showCustomToast(defaultTitle, message, type);
        } else {
            alert(message);
        }
    },

    success: function(message, title = 'Thành công') {
        return this.toast(message, 'success', title);
    },

    error: function(message, title = 'Lỗi') {
        return this.toast(message, 'error', title);
    },

    warning: function(message, title = 'Cảnh báo') {
        return this.toast(message, 'warning', title);
    },

    info: function(message, title = 'Thông báo') {
        return this.toast(message, 'info', title);
    },

    /**
     * Popup xác nhận hành động chung
     */
    confirm: function(options = {}) {
        const title = options.title || 'Xác nhận thao tác?';
        const text = options.text || 'Bạn có chắc chắn muốn thực hiện thao tác này?';
        const icon = options.icon || 'question';
        const confirmText = options.confirmText || 'Đồng ý';
        const cancelText = options.cancelText || 'Hủy';
        const confirmColor = options.confirmColor || '#0ea5e9';

        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                title: title,
                text: text,
                icon: icon,
                showCancelButton: true,
                confirmButtonColor: confirmColor,
                cancelButtonColor: '#94a3b8',
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                borderRadius: '12px'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (options.onConfirm) options.onConfirm();
                } else {
                    if (options.onCancel) options.onCancel();
                }
                return result;
            });
        } else {
            if (confirm(text)) {
                if (options.onConfirm) options.onConfirm();
                return Promise.resolve({ isConfirmed: true });
            } else {
                if (options.onCancel) options.onCancel();
                return Promise.resolve({ isConfirmed: false });
            }
        }
    },

    /**
     * Popup xác nhận đổi/tắt/bật trạng thái đồng bộ
     */
    confirmToggle: function(options = {}) {
        let entityName = options.entityName || 'bản ghi';
        let isActivating = options.isActivating !== undefined ? options.isActivating : null;
        let actionWord = isActivating === true ? 'kích hoạt / mở bán' : (isActivating === false ? 'tắt hoạt động / ngừng kinh doanh' : 'thay đổi trạng thái');
        let title = options.title || `Xác nhận ${actionWord}?`;
        let text = options.text || `Bạn có chắc chắn muốn ${actionWord} cho ${entityName} này?`;
        let onConfirm = options.onConfirm || options.callback || null;
        let targetUrl = options.targetUrl || null;
        let checkboxEl = options.checkboxEl || null;

        if (options.event && options.event.preventDefault) {
            options.event.preventDefault();
        }

        return this.confirm({
            title: title,
            text: text,
            icon: 'question',
            confirmColor: isActivating === false ? '#f59e0b' : '#0ea5e9',
            confirmText: 'Đồng ý',
            cancelText: 'Hủy',
            onConfirm: () => {
                if (onConfirm) onConfirm();
                else if (targetUrl) window.location.href = targetUrl;
            },
            onCancel: () => {
                if (checkboxEl) checkboxEl.checked = !checkboxEl.checked;
                if (options.onCancel) options.onCancel();
            }
        });
    },

    /**
     * Tự động hiển thị Flash Message khi load trang
     */
    handleFlashMessages: function(successMsg, errorMsg) {
        if (successMsg && String(successMsg).trim() !== '' && successMsg !== 'null') {
            this.success(successMsg);
        }
        if (errorMsg && String(errorMsg).trim() !== '' && errorMsg !== 'null') {
            this.error(errorMsg);
        }
    }
};

/**
 * Đảm bảo window.showToast tương thích hoàn toàn
 */
window.showToast = function(titleOrMsg, msgOrType, maybeType) {
    if (maybeType) {
        window.AdminNotify.toast(msgOrType, maybeType, titleOrMsg);
    } else if (msgOrType === 'error' || msgOrType === 'warning' || msgOrType === 'info' || msgOrType === 'success') {
        window.AdminNotify.toast(titleOrMsg, msgOrType);
    } else if (msgOrType) {
        window.AdminNotify.toast(msgOrType, 'success', titleOrMsg);
    } else {
        window.AdminNotify.toast(titleOrMsg, 'success');
    }
};

/**
 * Hàm tiện ích gọi trực tiếp từ thẻ HTML link:
 * onclick="return confirmAdminStatusToggle(event, this.href, 'Tên đối tượng')"
 */
window.confirmAdminStatusToggle = function(event, targetUrl, entityName = 'bản ghi') {
    if (event) event.preventDefault();
    AdminNotify.confirmToggle({
        entityName: entityName,
        targetUrl: targetUrl
    });
    return false;
};

window.AdminUtils = {
    /**
     * Format số tiền dạng Currency VND
     */
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },

    /**
     * Format ngày dạng DD/MM/YYYY
     */
    formatDate: function(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    /**
     * Format ngày giờ dạng HH:mm DD/MM/YYYY
     */
    formatDateTime: function(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${mins} ${day}/${month}/${year}`;
    },

    /**
     * Sinh mã ngẫu nhiên dạng chuỗi hoa + số
     */
    generateRandomCode: function(prefix = 'CODE', length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Dựng giao diện thanh Phân trang chung
     */
    renderPagination: function(containerId, currentPage, totalPages, onPageChange) {
        const nav = document.getElementById(containerId);
        if (!nav) return;
        nav.innerHTML = '';

        if (totalPages <= 1) return;

        // Nút Previous
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = `page-btn ${currentPage === 0 ? 'disabled' : ''}`;
        prev.innerHTML = `<i data-lucide="chevron-left" style="width:14px;height:14px;"></i>`;
        prev.onclick = () => { if (currentPage > 0) onPageChange(currentPage - 1); };
        nav.appendChild(prev);

        // Các nút số trang
        for (let i = 0; i < totalPages; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i + 1;
            btn.onclick = () => onPageChange(i);
            nav.appendChild(btn);
        }

        // Nút Next
        const next = document.createElement('button');
        next.type = 'button';
        next.className = `page-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`;
        next.innerHTML = `<i data-lucide="chevron-right" style="width:14px;height:14px;"></i>`;
        next.onclick = () => { if (currentPage < totalPages - 1) onPageChange(currentPage + 1); };
        nav.appendChild(next);

        this.refreshIcons();
    },

    /**
     * Refresh Lucide Icons an toàn
     */
    refreshIcons: function() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
};

// Gọi refresh icon khi DOM hoàn tất
document.addEventListener('DOMContentLoaded', () => {
    AdminUtils.refreshIcons();
});
