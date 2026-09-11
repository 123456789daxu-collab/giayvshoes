// admin-breadcrumb.js - Automatic, dynamic breadcrumb navigation for VShoes Admin
(function() {
    function generateDefaultBreadcrumb() {
        const path = window.location.pathname;
        const items = [
            { label: 'Trang chủ', url: '/thong-ke', icon: 'home' }
        ];

        if (path.startsWith('/san-pham')) {
            items.push({ label: 'Sản phẩm', url: '/san-pham', icon: 'package' });
            if (path.includes('/create')) {
                items.push({ label: 'Thêm sản phẩm mới', active: true });
            } else if (path.includes('/edit/')) {
                items.push({ label: 'Chi tiết biến thể', active: true });
            } else if (path.includes('/chi-tiet-global')) {
                items.push({ label: 'Tất cả biến thể', active: true });
            } else {
                items.push({ label: 'Danh sách sản phẩm', active: true });
            }
        } else if (path.startsWith('/tai-khoan/khach-hang') || path.startsWith('/tai-khoan-khach-hang')) {
            items.push({ label: 'Tài khoản', icon: 'users' });
            const formPanel = document.getElementById('form-panel');
            if (formPanel && (formPanel.classList.contains('active') || formPanel.style.display === 'block')) {
                items.push({ label: 'Khách hàng', url: '/tai-khoan/khach-hang' });
                const formTitle = document.getElementById('customer-modal-title');
                const titleText = formTitle ? formTitle.textContent.trim() : 'Thêm mới khách hàng';
                items.push({ label: titleText, active: true });
            } else {
                items.push({ label: 'Khách hàng', active: true });
            }
        } else if (path.startsWith('/tai-khoan/nhan-vien') || path.startsWith('/tai-khoan-nhan-vien')) {
            items.push({ label: 'Tài khoản', icon: 'user-cog' });
            const formPanel = document.getElementById('form-panel');
            if (formPanel && (formPanel.classList.contains('active') || formPanel.style.display === 'block')) {
                items.push({ label: 'Nhân viên', url: '/tai-khoan/nhan-vien' });
                const formTitle = document.getElementById('formTitle');
                const titleText = formTitle ? formTitle.textContent.trim() : 'Thêm nhân viên mới';
                items.push({ label: titleText, active: true });
            } else {
                items.push({ label: 'Nhân viên', active: true });
            }
        } else if (path.startsWith('/phieu-giam-gia')) {
            items.push({ label: 'Giảm giá', icon: 'ticket' });
            const formPanel = document.getElementById('form-panel');
            if (formPanel && formPanel.classList.contains('active')) {
                items.push({ label: 'Phiếu giảm giá', url: '/phieu-giam-gia' });
                const formTitle = document.getElementById('form-panel-title');
                const titleText = formTitle ? formTitle.textContent.trim() : 'Thêm mới phiếu giảm giá';
                items.push({ label: titleText, active: true });
            } else {
                items.push({ label: 'Phiếu giảm giá', active: true });
            }
        } else if (path.startsWith('/dot-giam-gia')) {
            items.push({ label: 'Giảm giá', icon: 'percent' });
            const formPanel = document.getElementById('form-panel');
            if (formPanel && formPanel.classList.contains('active')) {
                items.push({ label: 'Đợt giảm giá', url: '/dot-giam-gia' });
                const formTitle = document.getElementById('form-panel-title');
                const titleText = formTitle ? formTitle.textContent.trim() : 'Tạo đợt giảm giá';
                items.push({ label: titleText, active: true });
            } else {
                items.push({ label: 'Đợt giảm giá', active: true });
            }
        } else if (path.startsWith('/hoa-don')) {
            items.push({ label: 'Bán hàng', icon: 'shopping-cart' });
            if (path.length > '/hoa-don'.length && path !== '/hoa-don/') {
                items.push({ label: 'Quản lý hóa đơn', url: '/hoa-don' });
                items.push({ label: 'Chi tiết hóa đơn', active: true });
            } else {
                items.push({ label: 'Quản lý hóa đơn', active: true });
            }
        } else if (path.startsWith('/ban-hang')) {
            items.push({ label: 'Bán hàng', icon: 'shopping-cart' });
            items.push({ label: 'Bán hàng tại quầy', active: true });
        } else if (path.startsWith('/thong-ke')) {
            items.push({ label: 'Thống kê & Báo cáo', active: true, icon: 'bar-chart-3' });
        } else if (path.startsWith('/giao-ca')) {
            items.push({ label: 'Nhân sự', icon: 'clock' });
            items.push({ label: 'Giao ca', active: true });
        } else if (path.startsWith('/lich-lam-viec')) {
            items.push({ label: 'Nhân sự', icon: 'calendar' });
            items.push({ label: 'Lịch làm việc', active: true });
        } else if (path.startsWith('/chat')) {
            items.push({ label: 'Khách hàng', icon: 'message-square' });
            items.push({ label: 'Chăm sóc khách hàng', active: true });
        } else if (path.startsWith('/danh-gia')) {
            items.push({ label: 'Sản phẩm', icon: 'star' });
            items.push({ label: 'Quản lý đánh giá', active: true });
        } else if (path.startsWith('/thuong-hieu')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Thương hiệu', active: true });
        } else if (path.startsWith('/chat-lieu')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Chất liệu', active: true });
        } else if (path.startsWith('/de-giay')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Loại giày', active: true });
        } else if (path.startsWith('/the-loai')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Danh mục', active: true });
        } else if (path.startsWith('/mau-sac')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Màu sắc', active: true });
        } else if (path.startsWith('/kich-thuoc')) {
            items.push({ label: 'Thuộc tính', icon: 'layers' });
            items.push({ label: 'Kích thước', active: true });
        } else if (path.startsWith('/ho-so-ca-nhan')) {
            items.push({ label: 'Tài khoản', icon: 'user' });
            items.push({ label: 'Thông tin cá nhân', active: true });
        } else {
            items.push({ label: 'Quản lý', active: true });
        }

        renderBreadcrumb(items);
    }

    function renderBreadcrumb(items) {
        const container = document.getElementById('adminBreadcrumb');
        if (!container) return;

        let html = '';
        items.forEach((item, index) => {
            const isLast = index === items.length - 1;
            const iconHtml = item.icon ? `<i data-lucide="${item.icon}" style="width: 15px; height: 15px; margin-right: 4px;"></i>` : '';

            if (isLast || item.active) {
                html += `<li class="breadcrumb-item active" aria-current="page">${iconHtml}<span>${item.label}</span></li>`;
            } else if (item.url) {
                html += `<li class="breadcrumb-item"><a href="${item.url}">${iconHtml}<span>${item.label}</span></a></li>`;
            } else {
                html += `<li class="breadcrumb-item">${iconHtml}<span>${item.label}</span></li>`;
            }

            if (!isLast) {
                html += `<li class="breadcrumb-separator"><i data-lucide="chevron-right" style="width: 13px; height: 13px;"></i></li>`;
            }
        });

        container.innerHTML = html;

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    window.AdminBreadcrumb = {
        init: generateDefaultBreadcrumb,
        set: renderBreadcrumb
    };

    document.addEventListener('DOMContentLoaded', function() {
        generateDefaultBreadcrumb();

        // Tự động lắng nghe thay đổi tab ở các màn hình thêm/sửa nhân viên, voucher, đợt giảm giá
        const formPanel = document.getElementById('form-panel');
        const listPanel = document.getElementById('list-panel');

        if (formPanel) {
            const observer = new MutationObserver(function() {
                generateDefaultBreadcrumb();
            });
            observer.observe(formPanel, { attributes: true, attributeFilter: ['class', 'style'] });
            if (listPanel) {
                observer.observe(listPanel, { attributes: true, attributeFilter: ['class', 'style'] });
            }
        }
    });
})();
