// attribute-crud.js - Shared helper for shoe attribute CRUD screens (Thương hiệu, Màu sắc, Chất liệu, Đế giày, Kích thước, Thể loại)

document.addEventListener("DOMContentLoaded", function() {
    // Handle flash messages via centralized AdminNotify
    if (typeof successMsg !== 'undefined' || typeof errorMsg !== 'undefined') {
        if (window.AdminNotify) {
            AdminNotify.handleFlashMessages(
                typeof successMsg !== 'undefined' ? successMsg : null,
                typeof errorMsg !== 'undefined' ? errorMsg : null
            );
        }
    }

    // Input validation for attribute add/edit forms
    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", function(e) {
            const attrInputs = form.querySelectorAll("input[name='tenChatLieu'], input[name='tenDeGiay'], input[name='tenMauSac'], input[name='tenTheLoai'], input[name='tenThuongHieu'], input[name='giaTri'], input[name='tenDanhMuc']");
            for (let input of attrInputs) {
                if (input.value.trim() === '') {
                    e.preventDefault();
                    if (window.AdminNotify) {
                        AdminNotify.warning('Thông tin thuộc tính không được để trống!');
                    } else {
                        alert('Thông tin thuộc tính không được để trống!');
                    }
                    input.focus();
                    return;
                }
            }
        });
    });
});

/**
 * Standardized status toggle confirmation for attributes
 * @param {string} url - Target URL to redirect or submit
 * @param {HTMLInputElement} [checkboxEl] - Optional switch element
 */
function confirmToggleStatus(url, checkboxEl) {
    if (window.AdminStatus && typeof AdminStatus.confirmToggle === 'function') {
        AdminStatus.confirmToggle({
            entityName: 'Thuộc tính',
            checkboxEl: checkboxEl,
            targetUrl: url
        });
    } else if (window.AdminNotify && typeof AdminNotify.confirmToggle === 'function') {
        AdminNotify.confirmToggle('thuộc tính', () => {
            window.location.href = url;
        }, () => {
            if (checkboxEl) checkboxEl.checked = !checkboxEl.checked;
        });
    } else {
        if (confirm('Bạn có chắc chắn muốn thay đổi trạng thái?')) {
            window.location.href = url;
        } else if (checkboxEl) {
            checkboxEl.checked = !checkboxEl.checked;
        }
    }
}
