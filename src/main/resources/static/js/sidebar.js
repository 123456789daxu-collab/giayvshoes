// sidebar.js - Handles Lucide icons, sidebar active link highlighting, submenu toggles, and toast alerts
document.addEventListener("DOMContentLoaded", function() {
    if (typeof lucide !== 'undefined') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("Lỗi khi khởi tạo Lucide icons:", e);
        }
    }

    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll(".sidebar-menu a");
    
    let bestMatch = null;
    let bestMatchLength = 0;

    menuLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (!href || href === '#' || href === '/') return;
        
        if (currentPath === href || currentPath.startsWith(href + '/')) {
            if (href.length > bestMatchLength) {
                bestMatch = link;
                bestMatchLength = href.length;
            }
        }
    });

    if (bestMatch) {
        bestMatch.classList.add("active");
        const parentSubmenu = bestMatch.closest(".submenu");
        if (parentSubmenu) {
            parentSubmenu.classList.add("open");
            const parentMenuItem = parentSubmenu.previousElementSibling;
            if (parentMenuItem) {
                parentMenuItem.classList.add("open-parent");
            }
        }
    }

    const submenuToggles = document.querySelectorAll(".submenu-container > a");
    submenuToggles.forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            const submenu = btn.nextElementSibling;
            if (submenu && submenu.classList.contains("submenu")) {
                submenu.classList.toggle("open");
                btn.classList.toggle("open-parent");
            }
        });
    });
});

// Toast system & alert override
(function() {
    function ensureToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    window.showToast = function(title, message, type = 'success') {
        const container = ensureToastContainer();
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        
        let iconMarkup = '';
        if (type === 'success') {
            iconMarkup = `<div class="toast-icon success"><i data-lucide="check" style="width: 14px; height: 14px;"></i></div>`;
        } else if (type === 'error') {
            iconMarkup = `<div class="toast-icon error"><i data-lucide="x" style="width: 14px; height: 14px;"></i></div>`;
        } else if (type === 'warning') {
            iconMarkup = `<div class="toast-icon warning"><i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i></div>`;
        } else {
            iconMarkup = `<div class="toast-icon info"><i data-lucide="info" style="width: 14px; height: 14px;"></i></div>`;
        }
        
        toast.innerHTML = `
            ${iconMarkup}
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button type="button" class="toast-close-btn">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        
        toast.querySelector('.toast-close-btn').addEventListener('click', () => {
            toast.style.animation = 'toastFadeOut 0.3s forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        container.appendChild(toast);
        if (window.lucide && typeof lucide.createIcons === 'function') {
            try {
                lucide.createIcons({ root: toast });
            } catch(e) {
                console.warn('Lucide icon init warning:', e);
            }
        }
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastFadeOut 0.3s forwards';
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 4500);
    };

    window.alert = function(message) {
        if (!message) return;
        
        const msgStr = String(message);
        const lowerMsg = msgStr.toLowerCase();
        
        let type = 'success';
        let title = 'Thành công';
        
        if (lowerMsg.includes('lỗi') || lowerMsg.includes('thất bại') || lowerMsg.includes('không được') || lowerMsg.includes('yêu cầu') || lowerMsg.includes('phải') || lowerMsg.includes('chưa') || lowerMsg.includes('hủy') || lowerMsg.includes('trùng')) {
            type = 'error';
            title = 'Thất bại';
        } else if (lowerMsg.includes('cảnh báo') || lowerMsg.includes('chú ý') || lowerMsg.includes('xác nhận')) {
            type = 'warning';
            title = 'Cảnh báo';
        }
        
        window.showToast(title, msgStr, type);
    };
})();
