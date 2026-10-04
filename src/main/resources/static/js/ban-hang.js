// ban-hang.js
const posApp = {
    orders: [], 
    currentOrderId: null,
    products: [],
    productCurrentPage: 1,
    productPageSize: 5,
    customers: [],
    customerCurrentPage: 1,
    customerPageSize: 5,

    init: function() {
        this.fetchOrders();
        this.fetchVouchers();
        this.fetchCustomers();
        this.fetchProducts();
        
        const btnCreate = document.getElementById('btnCreateOrder');
        if (btnCreate) {
            btnCreate.onclick = () => { this.createOrder(); };
        }

        const getModal = (id) => {
            const el = document.getElementById(id);
            return el ? new bootstrap.Modal(el) : null;
        };
        this.productModal = getModal('productModal');
        this.voucherModal = getModal('voucherModal');
        this.customerModal = getModal('customerModal');
        this.editShippingModal = getModal('editShippingModal');
        this.quickAddCustomerModal = getModal('quickAddCustomerModal');
        this.addToCartModal = getModal('addToCartModal');
        // Xử lý z-index và backdrop động khi mở modal hoặc nhiều modal lồng nhau (multi-modal)
        document.addEventListener('show.bs.modal', (e) => {
            const openModals = document.querySelectorAll('.modal.show');
            const zIndex = 1055 + (20 * openModals.length);
            e.target.style.zIndex = zIndex;
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                if (backdrops.length > 0) {
                    const currentBackdrop = backdrops[backdrops.length - 1];
                    currentBackdrop.style.zIndex = zIndex - 10;
                }
            }, 0);
        });

        document.addEventListener('hidden.bs.modal', (e) => {
            if (e.target && e.target.style) {
                e.target.style.removeProperty('z-index');
            }
            setTimeout(() => {
                const remainingModals = document.querySelectorAll('.modal.show');
                if (remainingModals.length > 0) {
                    document.body.classList.add('modal-open');
                } else {
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.removeProperty('padding-right');
                    document.body.style.removeProperty('overflow');
                }
            }, 50);
        });

        // Tự động đồng bộ hóa đơn, sản phẩm và phiếu giảm giá khi có thay đổi từ tab khác
        const handleSync = async () => {
            await this.fetchVouchers();
            await this.fetchProducts();
            if (this.currentOrderId) {
                await this.loadOrderDetails(this.currentOrderId);
            }
            const modalEl = document.getElementById('productModal');
            if (modalEl && modalEl.classList.contains('show')) {
                this.filterProducts();
            }
        };

        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('vshoes_sync_channel');
            bc.onmessage = () => handleSync();
        }
        window.addEventListener('storage', (e) => {
            if (e.key === 'vshoes_sync_trigger') {
                handleSync();
            }
        });

        window.addEventListener('focus', () => handleSync());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                handleSync();
            }
        });
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                handleSync();
            }
        }, 3000);
    },

    fetchVouchers: async function() {
        try {
            const res = await fetch('/api/pos/phieu-giam-gia');
            if(res.ok) {
                this.vouchers = await res.json();


            }
        } catch(e) { console.error(e); }
    },

    // --- 1. Order Management ---
    fetchOrders: async function() {
        try {
            const res = await fetch('/api/pos/hoa-don-cho');
            if(res.ok) {
                const data = await res.json();
                this.orders = data;
                this.renderOrderTabs();
                if(this.orders.length > 0) {
                    // Preserve current order if it still exists, otherwise select first
                    const currentExists = this.orders.some(o => o.id == this.currentOrderId);
                    if (currentExists) {
                        this.switchOrder(this.currentOrderId);
                    } else {
                        this.switchOrder(this.orders[0].id);
                    }
                } else {
                    this.currentOrderId = null;
                    this.showNoOrder();
                }
            } else {
                this.orders = [];
                this.currentOrderId = null;
                this.showNoOrder();
            }
        } catch (error) {
            console.error(error);
            this.showNoOrder();
        }
    },

    createOrder: async function() {
        if(this.orders.length >= 5) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'Giới hạn hóa đơn chờ', 
                text: 'Chỉ được tạo tối đa 5 hóa đơn chờ cùng lúc! Vui lòng hoàn thành hoặc hủy bớt hóa đơn chờ cũ trước khi tạo mới.' 
            });
            return;
        }
        
        try {
            const res = await fetch('/api/pos/tao-hoa-don', { method: 'POST' });
            if(res.ok) {
                const newOrder = await res.json();
                newOrder.cart = [];
                this.orders.push(newOrder);
                this.renderOrderTabs();
                this.switchOrder(newOrder.id);
            } else {
                let errorMsg = 'Không thể tạo hóa đơn mới';
                try {
                    const text = await res.text();
                    if (text) errorMsg = text;
                } catch(e) {}
                Swal.fire('Lỗi', errorMsg, 'error');
            }
        } catch (error) {
            console.error('Lỗi tạo hóa đơn:', error);
            Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
        }
    },

    switchOrder: function(orderId) {
        this.currentOrderId = orderId;
        this.renderOrderTabs();
        this.loadOrderDetails(orderId);
    },

    closeOrder: async function(orderId, event) {
        if(event) event.stopPropagation();
        if(!orderId) return;
        
        const result = await Swal.fire({
            title: 'Hủy hóa đơn?',
            text: "Hóa đơn này sẽ bị hủy bỏ!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Không'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/pos/hoa-don/${orderId}`, { method: 'DELETE' });
                if(res.ok) {
                    if ('BroadcastChannel' in window) {
                        const bc = new BroadcastChannel('vshoes_sync_channel');
                        bc.postMessage({ type: 'order_canceled', id: orderId });
                    }
                    localStorage.setItem('vshoes_sync_trigger', Date.now().toString());

                    this.orders = this.orders.filter(o => o.id !== orderId);
                    this.renderOrderTabs();
                    
                    if(this.currentOrderId === orderId) {
                        if(this.orders.length > 0) {
                            this.switchOrder(this.orders[this.orders.length - 1].id);
                        } else {
                            this.currentOrderId = null;
                            this.showNoOrder();
                        }
                    }
                } else {
                    const errorMsg = await res.text();
                    Swal.fire('Lỗi', errorMsg || 'Không thể hủy hóa đơn', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
            }
        }
    },

    showNoOrder: function() {
        document.getElementById('cartTable').style.display = 'none';
        const emptyCart = document.getElementById('emptyCart');
        emptyCart.classList.remove('d-none');
        emptyCart.classList.add('d-flex');
        this.currentOrderId = null;
        this.updateSummary(null);
    },

    renderOrderTabs: function() {
        const tabsContainer = document.getElementById('orderTabs');
        tabsContainer.innerHTML = '';
        
        const orderCountEl = document.getElementById('orderCount');
        if (orderCountEl) {
            orderCountEl.innerText = `${this.orders.length}/5 hóa đơn`;
        }
        
        this.orders.forEach((order, index) => {
            const isActive = order.id === this.currentOrderId ? 'active' : '';
            
            // Friendly display name for the tab
            let displayName = order.maHoaDon || 'HD Mới';
            if (order.khachHang && order.khachHang.hoTen) {
                let nameParts = order.khachHang.hoTen.trim().split(' ');
                if (nameParts.length > 2) {
                    // Show first name and last name to keep it short
                    displayName = nameParts[0] + ' ' + nameParts[nameParts.length - 1];
                } else {
                    displayName = order.khachHang.hoTen;
                }
            } else if (order.maHoaDon) {
                // Khách lẻ + last 4 digits of invoice code
                const last4 = order.maHoaDon.length >= 4 ? order.maHoaDon.substring(order.maHoaDon.length - 4) : order.maHoaDon;
                displayName = 'Khách lẻ - ' + last4;
            }

            // Calculate item count for this order
            let itemCount = 0;
            if (order.cart && Array.isArray(order.cart)) {
                itemCount = order.cart.reduce((sum, item) => sum + (Number(item.soLuong) || 1), 0);
            } else if (order.soLuongSanPham != null) {
                itemCount = Number(order.soLuongSanPham) || 0;
            }

            const badgeHtml = itemCount > 0 
                ? `<span class="tab-item-count-badge">${itemCount}</span>` 
                : '';

            const html = `
                <li class="nav-item" role="presentation" title="${order.maHoaDon}">
                    <button class="nav-link ${isActive}" onclick="posApp.switchOrder(${order.id})">
                        <span>${displayName}</span>
                        ${badgeHtml}
                        <i class="fa-solid fa-xmark close-tab ms-1" onclick="posApp.closeOrder(${order.id}, event)"></i>
                    </button>
                </li>
            `;
            tabsContainer.insertAdjacentHTML('beforeend', html);
        });
    },

    // --- 1.5 Customers ---
    fetchCustomers: async function() {
        try {
            const res = await fetch('/api/ban-hang/khach-hang');
            if(res.ok) {
                this.customers = await res.json();
            }
        } catch (e) { console.error(e); }
    },

    searchCustomer: function() {
        const input = document.getElementById('searchCustomerInput').value.toLowerCase().trim();
        const dropdown = document.getElementById('customerDropdown');
        
        if (!input) {
            dropdown.style.display = 'none';
            return;
        }

        const filtered = this.customers.filter(c => 
            (c.hoTen && c.hoTen.toLowerCase().includes(input)) || 
            (c.soDienThoai && c.soDienThoai.includes(input))
        );

        let html = `
            <div class="p-2 border-bottom dropdown-item d-flex align-items-center justify-content-between" style="cursor:pointer; background-color: #f8fafc;" onclick="posApp.selectWalkInCustomer()">
                <div>
                    <div class="fw-bold text-secondary"><i class="fa-solid fa-user-xmark me-1"></i> Khách hàng vãng lai</div>
                    <small class="text-muted">Không lưu thông tin khách (Khách lẻ)</small>
                </div>
                <span class="badge bg-secondary-subtle text-secondary border">Mặc định</span>
            </div>
        `;

        if (filtered.length === 0) {
            html += `<div class="p-2 text-muted small text-center">Không tìm thấy khách hàng thành viên</div>`;
        } else {
            html += filtered.map(c => `
                <div class="p-2 border-bottom dropdown-item" style="cursor:pointer;" onclick="posApp.selectCustomer(${c.id})">
                    <div class="fw-bold text-dark">${c.hoTen || 'Khách lẻ'}</div>
                    <small class="text-muted">${c.soDienThoai || ''}</small>
                </div>
            `).join('');
        }
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    },

    selectCustomer: async function(idKhachHang) {
        if (!this.currentOrderId) return;
        
        try {
            const res = await fetch(`/api/ban-hang/hoa-don/${this.currentOrderId}/khach-hang`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idKhachHang: idKhachHang })
            });
            if(res.ok) {
                document.getElementById('customerDropdown').style.display = 'none';
                document.getElementById('searchCustomerInput').value = '';
                if(this.customerModal) this.customerModal.hide();
                // Since this endpoint returns HoaDon, we should fetch orders again to update the local store
                this.fetchOrders();
            }
        } catch (e) { console.error(e); }
    },

    selectWalkInCustomer: async function() {
        if (!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }
        try {
            const res = await fetch(`/api/ban-hang/hoa-don/${this.currentOrderId}/khach-hang`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idKhachHang: null })
            });
            if(res.ok) {
                document.getElementById('customerDropdown').style.display = 'none';
                document.getElementById('searchCustomerInput').value = '';
                if(this.customerModal) this.customerModal.hide();

                // Clear shipping inputs & disable delivery switch
                document.getElementById('tenNguoiNhan').value = '';
                document.getElementById('sdtNhan').value = '';
                document.getElementById('diaChiGiao').value = '';
                document.getElementById('phiShip').value = '0';
                document.getElementById('giaoHangSwitch').checked = false;
                document.getElementById('shippingFieldsGroup').style.display = 'none';

                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Đã chọn khách hàng vãng lai' });

                this.fetchOrders();
            } else {
                Swal.fire('Lỗi', 'Không thể đổi khách hàng', 'error');
            }
        } catch(e) { console.error(e); }
    },

    openQuickAddCustomerModal: async function() {
        if (!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }

        document.getElementById('quickCustName').value = '';
        document.getElementById('quickCustPhone').value = '';
        document.getElementById('quickCustEmail').value = '';
        document.getElementById('quickCustGender').value = 'true';
        document.getElementById('quickCustDetailAddress').value = '';

        const provSelect = document.getElementById('quickCustProvince');
        const distSelect = document.getElementById('quickCustDistrict');
        const wardSelect = document.getElementById('quickCustWard');

        provSelect.innerHTML = '<option value="">Chọn Tỉnh/Thành</option>';
        distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        distSelect.disabled = true;
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const provinces = await this.fetchProvinces();
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.dataset.code = p.code;
            opt.textContent = p.name;
            provSelect.appendChild(opt);
        });

        this.quickAddCustomerModal.show();
    },

    onQuickCustProvinceChange: async function() {
        const provSelect = document.getElementById('quickCustProvince');
        const distSelect = document.getElementById('quickCustDistrict');
        const wardSelect = document.getElementById('quickCustWard');

        distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        distSelect.disabled = true;
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const selectedOpt = provSelect.options[provSelect.selectedIndex];
        if (!selectedOpt || !selectedOpt.dataset.code) return;

        const provCode = selectedOpt.dataset.code;
        try {
            let res = await fetch(`/api/address/districts/${provCode}`);
            let data = null;
            if (res.ok) data = await res.json();
            else {
                let resFallback = await fetch(`https://provinces.open-api.vn/api/p/${provCode}?depth=2`);
                if (resFallback.ok) data = await resFallback.json();
            }

            if (data && data.districts) {
                data.districts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.name;
                    opt.dataset.code = d.code;
                    opt.textContent = d.name;
                    distSelect.appendChild(opt);
                });
                distSelect.disabled = false;
            }
        } catch (e) {
            console.error('Lỗi tải quận huyện:', e);
        }
    },

    onQuickCustDistrictChange: async function() {
        const distSelect = document.getElementById('quickCustDistrict');
        const wardSelect = document.getElementById('quickCustWard');

        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const selectedOpt = distSelect.options[distSelect.selectedIndex];
        if (!selectedOpt || !selectedOpt.dataset.code) return;

        const distCode = selectedOpt.dataset.code;
        try {
            let res = await fetch(`/api/address/wards/${distCode}`);
            let data = null;
            if (res.ok) data = await res.json();
            else {
                let resFallback = await fetch(`https://provinces.open-api.vn/api/d/${distCode}?depth=2`);
                if (resFallback.ok) data = await resFallback.json();
            }

            if (data && data.wards) {
                data.wards.forEach(w => {
                    const opt = document.createElement('option');
                    opt.value = w.name;
                    opt.dataset.code = w.code;
                    opt.textContent = w.name;
                    wardSelect.appendChild(opt);
                });
                wardSelect.disabled = false;
            }
        } catch (e) {
            console.error('Lỗi tải phường xã:', e);
        }
    },

    saveQuickCustomer: async function() {
        const name = (document.getElementById('quickCustName').value || '').trim();
        const phone = (document.getElementById('quickCustPhone').value || '').trim();
        const email = (document.getElementById('quickCustEmail').value || '').trim();
        const gender = document.getElementById('quickCustGender').value;
        const prov = (document.getElementById('quickCustProvince').value || '').trim();
        const dist = (document.getElementById('quickCustDistrict').value || '').trim();
        const ward = (document.getElementById('quickCustWard').value || '').trim();
        const detail = (document.getElementById('quickCustDetailAddress').value || '').trim();

        if (!name) {
            Swal.fire('Lỗi', 'Vui lòng nhập họ và tên khách hàng!', 'error');
            return;
        }
        if (!phone) {
            Swal.fire('Lỗi', 'Vui lòng nhập số điện thoại khách hàng!', 'error');
            return;
        }

        const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
        if (!phoneRegex.test(phone)) {
            Swal.fire('Lỗi', 'Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 0)!', 'error');
            return;
        }

        let addressDto = null;
        if (prov || dist || ward || detail) {
            addressDto = {
                tenNguoiNhan: name,
                sdt: phone,
                tinhThanh: prov || '',
                quanHuyen: dist || '',
                phuongXa: ward || '',
                diaChiChiTiet: detail || '',
                loaiDiaChi: 'Nhà riêng',
                macDinh: true
            };
        }

        const payload = {
            hoTen: name,
            soDienThoai: phone,
            email: email || null,
            gioiTinh: gender === 'true',
            trangThai: 1,
            diaChiMacDinh: addressDto
        };

        try {
            const res = await fetch('/api/khach-hang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const createdCustomer = await res.json();
                
                // Refresh danh sách khách hàng trong cache
                await this.fetchCustomers();

                // Gán khách hàng vào hóa đơn hiện tại
                await this.selectCustomer(createdCustomer.id);

                // Nếu có địa chỉ, tự động bật giao hàng và gán thông tin
                if (addressDto && (prov || dist || ward || detail)) {
                    let parts = [];
                    if (detail) parts.push(detail);
                    if (ward) parts.push(ward);
                    if (dist) parts.push(dist);
                    if (prov) parts.push(prov);
                    const fullAddress = parts.join(', ');

                    document.getElementById('tenNguoiNhan').value = name;
                    document.getElementById('sdtNhan').value = phone;
                    document.getElementById('diaChiGiao').value = fullAddress;
                    document.getElementById('phiShip').value = '30.000';
                    document.getElementById('giaoHangSwitch').checked = true;
                    document.getElementById('shippingFieldsGroup').style.display = 'block';

                    this.updateSummary(this.getCurrentOrder());
                }

                this.quickAddCustomerModal.hide();
                if (this.customerModal) this.customerModal.hide();

                Swal.fire({
                    icon: 'success',
                    title: 'Thành công',
                    text: `Đã tạo và chọn khách hàng ${name}`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                let errMsg = 'Không thể tạo khách hàng';
                try {
                    const err = await res.json();
                    if (err && err.message) errMsg = err.message;
                } catch(e) {
                    errMsg = await res.text();
                }
                Swal.fire('Lỗi', errMsg, 'error');
            }
        } catch (e) {
            console.error('Lỗi khi thêm nhanh khách hàng:', e);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi tạo khách hàng', 'error');
        }
    },

    openCustomerModal: function() {
        if (!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }
        document.getElementById('modalCustomerSearch').value = '';
        this.customerCurrentPage = 1;
        this.filterModalCustomers();
        this.customerModal.show();
    },

    filterModalCustomers: function() {
        const keyword = document.getElementById('modalCustomerSearch').value.toLowerCase();
        const filtered = this.customers.filter(c => 
            (c.hoTen && c.hoTen.toLowerCase().includes(keyword)) || 
            (c.soDienThoai && c.soDienThoai.includes(keyword))
        );
        
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.customerPageSize);
        
        // Ensure current page is valid
        if (this.customerCurrentPage > totalPages) {
            this.customerCurrentPage = totalPages || 1;
        }
        
        const start = (this.customerCurrentPage - 1) * this.customerPageSize;
        const end = Math.min(start + this.customerPageSize, totalItems);
        const paginated = filtered.slice(start, end);
        
        this.renderModalCustomers(paginated, start);
        this.renderCustomerPagination(totalItems, totalPages, start, end);
    },

    renderModalCustomers: function(list, startIndex = 0) {
        const tbody = document.getElementById('customerTableBody');
        const noResult = document.getElementById('noCustomerResult');
        const paginationContainer = document.getElementById('customerPaginationContainer');
        
        if (!list || list.length === 0) {
            tbody.innerHTML = '';
            noResult.style.display = 'block';
            paginationContainer.style.setProperty('display', 'none', 'important');
            return;
        }
        
        noResult.style.display = 'none';
        paginationContainer.style.setProperty('display', 'flex', 'important');
        
        tbody.innerHTML = list.map((c, index) => `
            <tr>
                <td class="text-center text-muted fw-bold">${startIndex + index + 1}</td>
                <td class="fw-semibold text-dark">${c.hoTen || 'Khách lẻ'}</td>
                <td>${c.soDienThoai || ''}</td>
                <td>${c.email || ''}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="posApp.selectCustomer(${c.id})">Chọn</button>
                </td>
            </tr>
        `).join('');
    },

    renderCustomerPagination: function(totalItems, totalPages, start, end) {
        const info = document.getElementById('customerPaginationInfo');
        info.innerText = `Hiển thị ${totalItems > 0 ? start + 1 : 0}-${end} trên tổng ${totalItems}`;
        
        const ul = document.getElementById('customerPagination');
        ul.innerHTML = '';
        
        if (totalPages <= 1) return;

        ul.insertAdjacentHTML('beforeend', `
            <li class="page-item ${this.customerCurrentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="posApp.changeCustomerPage(${this.customerCurrentPage - 1})">Trước</button>
            </li>
        `);
        
        let startPage, endPage;
        if (totalPages <= 3) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (this.customerCurrentPage <= 2) {
                startPage = 1;
                endPage = 3;
            } else if (this.customerCurrentPage + 1 >= totalPages) {
                startPage = totalPages - 2;
                endPage = totalPages;
            } else {
                startPage = this.customerCurrentPage - 1;
                endPage = this.customerCurrentPage + 1;
            }
        }

        if (startPage > 1) {
            ul.insertAdjacentHTML('beforeend', `<li class="page-item"><button class="page-link" onclick="posApp.changeCustomerPage(1)">1</button></li><li class="page-item disabled"><span class="page-link">...</span></li>`);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            ul.insertAdjacentHTML('beforeend', `
                <li class="page-item ${this.customerCurrentPage === i ? 'active' : ''}">
                    <button class="page-link" onclick="posApp.changeCustomerPage(${i})">${i}</button>
                </li>
            `);
        }

        if (endPage < totalPages) {
            ul.insertAdjacentHTML('beforeend', `<li class="page-item disabled"><span class="page-link">...</span></li><li class="page-item"><button class="page-link" onclick="posApp.changeCustomerPage(${totalPages})">${totalPages}</button></li>`);
        }
        
        ul.insertAdjacentHTML('beforeend', `
            <li class="page-item ${this.customerCurrentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="posApp.changeCustomerPage(${this.customerCurrentPage + 1})">Sau</button>
            </li>
        `);
    },

    changeCustomerPage: function(page) {
        this.customerCurrentPage = page;
        this.filterModalCustomers();
    },

    fetchProducts: async function() {
        try {
            const res = await fetch('/api/pos/san-pham');
            if(res.ok) {
                this.products = await res.json();
            }
        } catch(e) { console.error(e); }
    },

    // --- 2. Order Details & Cart ---
    loadOrderDetails: async function(orderId) {
        try {
            if (!this.products || this.products.length === 0) {
                await this.fetchProducts();
            }
            const res = await fetch(`/api/pos/hoa-don/${orderId}/chi-tiet`);
            if(res.ok) {
                const data = await res.json();
                const orderIndex = this.orders.findIndex(o => o.id === orderId);
                if(orderIndex !== -1) {
                    const oldOrder = this.orders[orderIndex];
                    const hasShipping = oldOrder.isGiaoHang !== undefined 
                        ? Boolean(oldOrder.isGiaoHang) 
                        : Boolean(data.diaChiGiao && data.diaChiGiao.trim() !== '');

                    this.orders[orderIndex] = { 
                        ...oldOrder, 
                        ...data,
                        phieuGiamGia: data.phieuGiamGia || null,
                        isGiaoHang: hasShipping,
                        tenNguoiNhan: oldOrder.tenNguoiNhan !== undefined ? oldOrder.tenNguoiNhan : (data.tenNguoiNhan || ''),
                        sdtNhan: oldOrder.sdtNhan !== undefined ? oldOrder.sdtNhan : (data.sdtNhan || ''),
                        diaChiGiao: oldOrder.diaChiGiao !== undefined ? oldOrder.diaChiGiao : (data.diaChiGiao || ''),
                        phiShip: oldOrder.phiShip !== undefined ? oldOrder.phiShip : (data.phiShip ? Number(data.phiShip).toLocaleString('vi-VN') : '0')
                    };
                    this.renderOrderTabs();
                    this.renderCart(this.orders[orderIndex].cart);
                    this.restoreShippingUI(this.orders[orderIndex]);
                    this.updateSummary(this.orders[orderIndex]);

                    // Thông báo nếu có sản phẩm trong giỏ hàng đã ngừng kinh doanh
                    if (this.orders[orderIndex].cart && this.products) {
                        for (const it of this.orders[orderIndex].cart) {
                            let isItStopped = it.isStopped === true || it.trangThai === 0 || it.trangThaiSanPham === 0;
                            if (!isItStopped) {
                                const matched = this.products.find(p => p.id === it.idSanPhamChiTiet);
                                if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                                    isItStopped = true;
                                }
                            }
                            if (isItStopped && !it._notifiedStopped) {
                                it._notifiedStopped = true;
                                this.showToast(`Sản phẩm "${it.tenSanPham}" đã ngừng kinh doanh.`, 'warning');
                                if (typeof Swal !== 'undefined') {
                                    Swal.fire({
                                        title: 'Thông báo',
                                        text: `Sản phẩm "${it.tenSanPham}" đã ngừng kinh doanh.`,
                                        icon: 'warning',
                                        confirmButtonColor: '#00adef'
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    },

    renderCart: function(cartItems) {
        const tbody = document.getElementById('cartBody');
        tbody.innerHTML = '';
        
        const emptyCart = document.getElementById('emptyCart');
        
        if(!cartItems || cartItems.length === 0) {
            emptyCart.classList.remove('d-none');
            emptyCart.classList.add('d-flex');
            document.getElementById('cartTable').style.display = 'none';
            document.getElementById('cartItemCount').innerText = '0 sản phẩm';
            return;
        }

        emptyCart.classList.remove('d-flex');
        emptyCart.classList.add('d-none');
        document.getElementById('cartTable').style.display = 'table';
        document.getElementById('cartItemCount').innerText = `${cartItems.length} sản phẩm`;

        cartItems.forEach((item, index) => {
            const hasDiscount = item.phanTramGiam && item.phanTramGiam > 0;
            const discountBadge = hasDiscount 
                ? `<span class="badge bg-danger px-2 py-1 shadow-sm" style="font-size: 0.85rem;">-${item.phanTramGiam}%</span>` 
                : `<span class="text-muted">-</span>`;

            let isStopped = item.isStopped === true || item.trangThai === 0 || item.trangThaiSanPham === 0;
            if (!isStopped && this.products && this.products.length > 0) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                    isStopped = true;
                }
            }

            const stoppedBadge = isStopped 
                ? `<span class="badge bg-danger text-white px-2 py-1 shadow-sm ms-2" style="font-size: 0.75rem;"><i class="fa-solid fa-ban me-1"></i>ĐÃ NGỪNG KINH DOANH</span>`
                : '';

            const isPriceChanged = item.daDoiGia === true || (item.giaHienTai != null && item.donGia != null && Number(item.giaHienTai) !== Number(item.donGia));

            let tonKho = item.soLuongTon;
            if ((tonKho == null || tonKho === undefined) && this.products && this.products.length > 0) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && matched.soLuongTon != null) {
                    tonKho = matched.soLuongTon;
                }
            }
            const isMaxStockReached = tonKho != null && Number(tonKho) <= 0;

            // Check if there is an earlier item with same idSanPhamChiTiet but different unit price
            let priceChangeNotice = '';
            const previousItem = cartItems.slice(0, index).find(prev => prev.idSanPhamChiTiet === item.idSanPhamChiTiet && Number(prev.donGia) !== Number(item.donGia));
            if (previousItem) {
                const oldPrice = Number(previousItem.donGia);
                const newPrice = Number(item.donGia);
                let label = 'Giá hiện tại đã giảm:';
                if (newPrice > oldPrice) {
                    label = 'Giá hiện tại:';
                }
                priceChangeNotice = `
                    <div class="d-inline-flex align-items-center mt-1 text-white px-2 py-1 rounded-2 shadow-sm" style="background-color: #008dd5; font-size: 0.76rem; font-weight: 500; line-height: 1.2;">
                        <i class="fa-solid fa-circle-info me-1" style="font-size: 0.8rem;"></i>
                        <span>${label} ${this.formatCurrency(oldPrice)} ➔ ${this.formatCurrency(newPrice)}</span>
                    </div>
                `;
            }

            const giaGocTotal = (item.donGiaGoc || item.giaBanGoc) ? (Number(item.donGiaGoc || item.giaBanGoc) * Number(item.soLuong)) : 0;
            const thanhTien = Number(item.thanhTien != null ? item.thanhTien : (item.donGia * item.soLuong));
            
            let priceHtml = '';
            if (hasDiscount && giaGocTotal > thanhTien) {
                priceHtml = `
                    <div class="d-flex flex-column align-items-end justify-content-center">
                        <small class="text-muted text-decoration-line-through" style="font-size: 0.8rem;">${this.formatCurrency(giaGocTotal)}</small>
                        <span class="fw-bold text-danger">${this.formatCurrency(thanhTien)}</span>
                    </div>
                `;
            } else {
                priceHtml = `<span class="fw-bold text-dark">${this.formatCurrency(thanhTien)}</span>`;
            }

            const tr = `
                <tr style="font-size: 0.95rem; vertical-align: middle; ${isStopped ? 'background-color: #fff1f2;' : ''}">
                    <td class="text-muted ps-4 py-2">${index + 1}</td>
                    <td class="text-muted py-2">${item.maSanPham || 'N/A'}</td>
                    <td class="text-start py-2">
                        <div class="d-flex align-items-center">
                            <img src="${item.hinhAnh || '/images/white.png'}" class="product-img me-2 shadow-sm" onerror="this.src='/images/white.png'" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; ${isStopped ? 'filter: grayscale(80%);' : ''}">
                            <div class="d-flex flex-column">
                                <div class="d-flex align-items-center flex-wrap">
                                    <span class="fw-semibold ${isStopped ? 'text-danger text-decoration-line-through' : 'text-dark'}">${item.tenSanPham}</span>
                                    ${stoppedBadge}
                                </div>
                                ${priceChangeNotice}
                            </div>
                        </div>
                    </td>
                    <td class="text-muted py-2">${item.mauSac || ''}</td>
                    <td class="text-muted py-2">${item.size || ''}</td>
                    <td class="py-2">
                        ${isStopped ? `
                            <div class="d-flex justify-content-center align-items-center gap-2">
                                <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Sản phẩm đã ngừng kinh doanh"><i class="fa-solid fa-minus" style="font-size: 10px;"></i></button>
                                <span class="qty-text fw-bold text-muted border rounded d-flex align-items-center justify-content-center" title="Sản phẩm đã ngừng kinh doanh" style="cursor: not-allowed; min-width: 40px; height: 28px; background-color: #f1f5f9;">${item.soLuong}</span>
                                <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Sản phẩm đã ngừng kinh doanh"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                            </div>
                        ` : isPriceChanged ? `
                            <div class="d-flex justify-content-center align-items-center gap-2">
                                <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Giá sản phẩm đã thay đổi, không thể tăng giảm số lượng"><i class="fa-solid fa-minus" style="font-size: 10px;"></i></button>
                                <span class="qty-text fw-bold text-muted border rounded d-flex align-items-center justify-content-center" title="Giá sản phẩm đã thay đổi, không thể sửa số lượng" style="cursor: not-allowed; min-width: 40px; height: 28px; background-color: #f1f5f9;">${item.soLuong}</span>
                                <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Giá sản phẩm đã thay đổi, không thể tăng giảm số lượng"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                            </div>
                        ` : `
                            <div class="d-flex justify-content-center align-items-center gap-2">
                                ${Number(item.soLuong) <= 1 ? `
                                    <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Số lượng tối thiểu là 1"><i class="fa-solid fa-minus" style="font-size: 10px;"></i></button>
                                ` : `
                                    <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px;" onclick="posApp.updateCartItemQty(${item.id}, ${item.soLuong - 1})"><i class="fa-solid fa-minus" style="font-size: 10px;"></i></button>
                                `}
                                <span class="qty-text fw-bold text-dark border rounded d-flex align-items-center justify-content-center" title="Nhấn để sửa" onclick="posApp.promptUpdateQty(${item.id}, ${item.soLuong})" style="cursor: pointer; min-width: 40px; height: 28px; background-color: #fff;">${item.soLuong}</span>
                                ${isMaxStockReached ? `
                                    <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px; opacity: 0.35; cursor: not-allowed;" disabled title="Đã đạt số lượng tồn kho tối đa"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                                ` : `
                                    <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px;" onclick="posApp.updateCartItemQty(${item.id}, ${item.soLuong + 1})"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                                `}
                            </div>
                        `}
                    </td>
                    <td class="text-center py-2">${discountBadge}</td>
                    <td class="py-2 text-end">${priceHtml}</td>
                    <td class="pe-4 py-2 text-center">
                        <button class="btn btn-sm btn-link text-danger p-0 border-0" onclick="posApp.removeCartItem(${item.id})" title="Xóa">
                            <i class="fa-regular fa-trash-can fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', tr);
        });
    },

    promptUpdateQty: async function(idChiTiet, currentQty) {
        const item = this.getCurrentOrder()?.cart?.find(i => i.id === idChiTiet);
        if (item) {
            let isStopped = item.isStopped === true || item.trangThai === 0 || item.trangThaiSanPham === 0;
            if (!isStopped && this.products) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                    isStopped = true;
                }
            }
            if (isStopped) {
                Swal.fire('Thông báo', `Sản phẩm "${item.tenSanPham}" đã ngừng kinh doanh.`, 'warning');
                return;
            }
        }
        let maxStock = 999999;
        if (item) {
            let tonKho = item.soLuongTon;
            if (tonKho == null && this.products) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && matched.soLuongTon != null) tonKho = matched.soLuongTon;
            }
            if (tonKho != null) {
                maxStock = Number(item.soLuong) + Number(tonKho);
            }
        }

        const { value: quantity } = await Swal.fire({
            title: 'Sửa số lượng',
            input: 'number',
            inputLabel: `Số lượng mới (Tối đa có thể mua: ${maxStock < 999999 ? maxStock : 'tồn kho'})`,
            inputValue: currentQty,
            showCancelButton: true,
            inputValidator: (value) => {
                const val = parseInt(value);
                if (!value || isNaN(val) || val <= 0) {
                    return 'Số lượng phải lớn hơn 0!';
                }
                if (val > maxStock) {
                    return `Số lượng không thể vượt quá tồn kho tối đa (${maxStock})!`;
                }
            }
        });

        if (quantity) {
            this.updateCartItemQty(idChiTiet, quantity);
        }
    },

    updateCartItemQty: async function(idChiTiet, newQtyStr) {
        const item = this.getCurrentOrder()?.cart?.find(i => i.id === idChiTiet);
        if (item) {
            let isStopped = item.isStopped === true || item.trangThai === 0 || item.trangThaiSanPham === 0;
            if (!isStopped && this.products) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                    isStopped = true;
                }
            }
            if (isStopped) {
                Swal.fire('Thông báo', `Sản phẩm "${item.tenSanPham}" đã ngừng kinh doanh.`, 'warning');
                return;
            }
        }
        const newQty = parseInt(newQtyStr);
        if(isNaN(newQty) || newQty <= 0) {
            return;
        }

        try {
            const res = await fetch(`/api/pos/chi-tiet/${idChiTiet}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soLuong: newQty })
            });
            if(res.ok) {
                this.manualRemovedFlags = this.manualRemovedFlags || {};
                this.manualRemovedFlags[this.currentOrderId] = false;
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;
                await this.fetchProducts();
                this.loadOrderDetails(this.currentOrderId);
            } else {
                const errText = await res.text();
                Swal.fire('Lỗi', errText, 'error');
                await this.fetchProducts();
                this.loadOrderDetails(this.currentOrderId);
            }
        } catch(e) { console.error(e); }
    },

    removeCartItem: async function(idChiTiet) {
        try {
            const res = await fetch(`/api/pos/chi-tiet/${idChiTiet}`, { method: 'DELETE' });
            if(res.ok) {
                this.manualRemovedFlags = this.manualRemovedFlags || {};
                this.manualRemovedFlags[this.currentOrderId] = false;
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;
                this.loadOrderDetails(this.currentOrderId);
            }
        } catch(e) { console.error(e); }
    },

    // --- 3. Products ---
    openProductModal: async function() {
        if(!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }
        try {
            const res = await fetch('/api/pos/san-pham');
            if(res.ok) {
                this.products = await res.json();
                
                // Populate Filters
                const brands = new Set();
                const categories = new Set();
                this.products.forEach(p => {
                    if (p.thuongHieu) brands.add(p.thuongHieu);
                    if (p.danhMuc) categories.add(p.danhMuc);
                });
                
                const brandSelect = document.getElementById('modalBrandFilter');
                brandSelect.innerHTML = '<option value="">Tất cả thương hiệu</option>';
                [...brands].sort().forEach(b => brandSelect.insertAdjacentHTML('beforeend', `<option value="${b}">${b}</option>`));
                
                const catSelect = document.getElementById('modalCategoryFilter');
                catSelect.innerHTML = '<option value="">Tất cả danh mục</option>';
                [...categories].sort().forEach(c => catSelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

                this.productCurrentPage = 1;
                this.filterProducts();
                this.productModal.show();
            }
        } catch (error) { console.error(error); }
    },

    filterProducts: function() {
        const term = document.getElementById('modalProductSearch').value.toLowerCase();
        const brand = document.getElementById('modalBrandFilter').value;
        const category = document.getElementById('modalCategoryFilter').value;
        
        let filtered = this.products.filter(p => {
            const matchTerm = !term || (p.tenSanPham && p.tenSanPham.toLowerCase().includes(term)) || (p.ma && p.ma.toLowerCase().includes(term));
            const matchBrand = !brand || p.thuongHieu === brand;
            const matchCategory = !category || p.danhMuc === category;
            return matchTerm && matchBrand && matchCategory;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.productPageSize);
        if (this.productCurrentPage > totalPages) this.productCurrentPage = totalPages || 1;
        
        const start = (this.productCurrentPage - 1) * this.productPageSize;
        const end = Math.min(start + this.productPageSize, totalItems);
        const paginated = filtered.slice(start, end);
        
        this.renderProductModal(paginated, start);
        this.renderPagination(totalItems, totalPages, start, end);
    },

    renderProductModal: function(items, startIndex) {
        const tbody = document.getElementById('modalProductBody');
        tbody.innerHTML = '';
        items.forEach((p, index) => {
            const hasDiscount = p.phanTramGiam && p.phanTramGiam > 0;
            const discountBadge = hasDiscount 
                ? `<span class="badge bg-danger px-2 py-1 shadow-sm" style="font-size: 0.82rem;">-${p.phanTramGiam}%</span>` 
                : `<span class="text-muted">-</span>`;

            let priceHtml = '';
            if (hasDiscount) {
                priceHtml = `
                    <div class="d-flex flex-column align-items-center justify-content-center">
                        <span class="fw-bold text-danger">${this.formatCurrency(p.giaSauGiam || p.giaBan)}</span>
                        <small class="text-muted text-decoration-line-through" style="font-size: 0.8rem;">${this.formatCurrency(p.giaGoc || p.giaBan)}</small>
                    </div>
                `;
            } else {
                priceHtml = `<span class="fw-bold text-dark">${this.formatCurrency(p.giaBan)}</span>`;
            }

            const tr = `
                <tr>
                    <td class="text-muted fw-bold">${startIndex + index + 1}</td>
                    <td>${p.ma || p.maSanPhamChiTiet || 'N/A'}</td>
                    <td class="text-start fw-semibold">
                        <div class="d-flex align-items-center">
                            <img src="${p.hinhAnh || '/images/white.png'}" class="product-img me-2 shadow-sm" onerror="this.src='/images/white.png'" style="width: 34px; height: 34px; object-fit: cover; border-radius: 6px;">
                            <span>${p.tenSanPham}</span>
                        </div>
                    </td>
                    <td>${p.mauSac || p.tenMauSac || ''}</td>
                    <td>${p.size || p.sizeGiay || ''}</td>
                    <td>${p.soLuongTon}</td>
                    <td class="text-center">${discountBadge}</td>
                    <td>${priceHtml}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold shadow-sm" onclick="posApp.openAddToCartModal(${p.id})" ${p.soLuongTon <= 0 ? 'disabled' : ''}>
                            Thêm
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', tr);
        });
    },

    renderPagination: function(totalItems, totalPages, start, end) {
        const info = document.getElementById('productPaginationInfo');
        info.innerText = `Hiển thị ${totalItems > 0 ? start + 1 : 0}-${end} trên tổng ${totalItems}`;
        
        const ul = document.getElementById('productPagination');
        ul.innerHTML = '';
        
        if (totalPages <= 1) return;

        ul.insertAdjacentHTML('beforeend', `
            <li class="page-item ${this.productCurrentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="posApp.changeProductPage(${this.productCurrentPage - 1})">Trước</button>
            </li>
        `);
        
        let startPage, endPage;
        if (totalPages <= 3) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (this.productCurrentPage <= 2) {
                startPage = 1;
                endPage = 3;
            } else if (this.productCurrentPage + 1 >= totalPages) {
                startPage = totalPages - 2;
                endPage = totalPages;
            } else {
                startPage = this.productCurrentPage - 1;
                endPage = this.productCurrentPage + 1;
            }
        }

        if (startPage > 1) {
            ul.insertAdjacentHTML('beforeend', `<li class="page-item"><button class="page-link" onclick="posApp.changeProductPage(1)">1</button></li><li class="page-item disabled"><span class="page-link">...</span></li>`);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            ul.insertAdjacentHTML('beforeend', `
                <li class="page-item ${this.productCurrentPage === i ? 'active' : ''}">
                    <button class="page-link" onclick="posApp.changeProductPage(${i})">${i}</button>
                </li>
            `);
        }

        if (endPage < totalPages) {
            ul.insertAdjacentHTML('beforeend', `<li class="page-item disabled"><span class="page-link">...</span></li><li class="page-item"><button class="page-link" onclick="posApp.changeProductPage(${totalPages})">${totalPages}</button></li>`);
        }
        
        ul.insertAdjacentHTML('beforeend', `
            <li class="page-item ${this.productCurrentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="posApp.changeProductPage(${this.productCurrentPage + 1})">Sau</button>
            </li>
        `);
    },

    changeProductPage: function(page) {
        this.productCurrentPage = page;
        this.filterProducts();
    },

    openAddToCartModal: async function(idSanPhamChiTiet) {
        if (!this.currentOrderId) {
            if (this.orders && this.orders.length > 0) {
                this.currentOrderId = this.orders[0].id;
            } else {
                Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
                return;
            }
        }

        try {
            const res = await fetch('/api/pos/san-pham');
            if (res.ok) {
                this.products = await res.json();
            }
        } catch (e) { console.error(e); }

        const p = this.products ? this.products.find(x => x.id === idSanPhamChiTiet) : null;
        if (!p) return;
        const currentStock = p.soLuongTon != null ? Number(p.soLuongTon) : 0;
        if (currentStock <= 0) {
            Swal.fire('Hết hàng', 'Sản phẩm này trong kho đã hết (Tồn kho: 0)! Không thể thêm vào giỏ hàng.', 'error');
            return;
        }

        this.selectedProductForAdd = p;

        const imgEl = document.getElementById('addCartModalImg');
        if (imgEl) imgEl.src = p.hinhAnh || '/images/white.png';

        const nameEl = document.getElementById('addCartModalProductName');
        if (nameEl) {
            nameEl.innerText = p.tenSanPham || 'Sản phẩm';
            nameEl.title = p.tenSanPham || '';
        }

        const codeEl = document.getElementById('addCartModalProductCode');
        if (codeEl) codeEl.innerText = p.ma || p.maSanPhamChiTiet || 'N/A';

        const colorEl = document.getElementById('addCartModalColor');
        if (colorEl) colorEl.innerText = p.mauSac || p.tenMauSac || '-';

        const sizeEl = document.getElementById('addCartModalSize');
        if (sizeEl) sizeEl.innerText = p.size || p.sizeGiay || '-';

        const stockEl = document.getElementById('addCartModalStock');
        if (stockEl) stockEl.innerText = p.soLuongTon || 0;

        const priceEl = document.getElementById('addCartModalPrice');
        if (priceEl) priceEl.innerText = this.formatCurrency(p.giaSauGiam || p.giaBan);

        const qtyInput = document.getElementById('addCartModalQtyInput');
        if (qtyInput) {
            qtyInput.value = 1;
            qtyInput.max = p.soLuongTon;
        }

        this.updateModalQtyButtonsState();
        if (!this.addToCartModal) {
            const modalEl = document.getElementById('addToCartModal');
            if (modalEl) this.addToCartModal = new bootstrap.Modal(modalEl);
        }
        if (this.addToCartModal) {
            this.addToCartModal.show();
        } else {
            this.addToCart(p.id, 1);
        }
    },

    updateModalQtyButtonsState: function() {
        const qtyInput = document.getElementById('addCartModalQtyInput');
        const minusBtn = document.getElementById('btnModalAddMinus');
        const plusBtn = document.getElementById('btnModalAddPlus');
        const confirmBtn = document.getElementById('btnConfirmAddToCart');
        const errorMsg = document.getElementById('modalStockErrorMsg');
        const errorText = document.getElementById('modalStockErrorText');
        const stepper = document.getElementById('modalStepperContainer');
        if (!qtyInput || !minusBtn || !plusBtn) return;

        const val = parseInt(qtyInput.value);
        const max = this.selectedProductForAdd ? (this.selectedProductForAdd.soLuongTon != null ? this.selectedProductForAdd.soLuongTon : 0) : 0;

        // Minus button state
        if (isNaN(val) || val <= 1) {
            minusBtn.disabled = true;
            minusBtn.style.opacity = '0.35';
            minusBtn.style.cursor = 'not-allowed';
            minusBtn.title = 'Số lượng tối thiểu là 1';
        } else {
            minusBtn.disabled = false;
            minusBtn.style.opacity = '1';
            minusBtn.style.cursor = 'pointer';
            minusBtn.title = '';
        }

        // Plus button state
        if (!isNaN(val) && val >= max) {
            plusBtn.disabled = true;
            plusBtn.style.opacity = '0.35';
            plusBtn.style.cursor = 'not-allowed';
            plusBtn.title = 'Đã đạt số lượng tồn kho tối đa';
        } else {
            plusBtn.disabled = false;
            plusBtn.style.opacity = '1';
            plusBtn.style.cursor = 'pointer';
            plusBtn.title = '';
        }

        // Validation error display
        if (!isNaN(val) && val > max) {
            if (errorMsg) errorMsg.classList.remove('d-none');
            if (errorText) errorText.innerText = 'Số lượng trong kho không đủ';
            if (stepper) stepper.style.setProperty('border-color', '#ef4444', 'important');
        } else if (isNaN(val) || val <= 0) {
            if (errorMsg) errorMsg.classList.remove('d-none');
            if (errorText) errorText.innerText = 'Số lượng phải lớn hơn 0!';
            if (stepper) stepper.style.setProperty('border-color', '#ef4444', 'important');
        } else {
            if (errorMsg) errorMsg.classList.add('d-none');
            if (stepper) stepper.style.setProperty('border-color', '#cbd5e1', 'important');
        }

        // Luôn cho phép bấm nút Xác nhận để khi ấn vào thì thông báo lỗi trong kho không đủ hàng
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        }
    },

    changeModalAddQty: function(delta) {
        const qtyInput = document.getElementById('addCartModalQtyInput');
        if (!qtyInput) return;
        let val = parseInt(qtyInput.value) || 1;
        val += delta;
        if (val < 1) val = 1;
        qtyInput.value = val;
        this.updateModalQtyButtonsState();
    },

    onModalAddQtyInput: function() {
        this.updateModalQtyButtonsState();
    },

    confirmAddToCart: async function() {
        if (!this.selectedProductForAdd || !this.currentOrderId) return;
        const qtyInput = document.getElementById('addCartModalQtyInput');
        const qty = parseInt(qtyInput.value);
        const max = this.selectedProductForAdd.soLuongTon != null ? this.selectedProductForAdd.soLuongTon : 0;

        if (isNaN(qty) || qty <= 0) {
            Swal.fire('Lỗi', 'Số lượng phải lớn hơn 0!', 'error');
            return;
        }
        if (qty > max) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Số lượng trong kho không đủ'
            });
            return;
        }

        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/them-san-pham`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idSanPhamChiTiet: this.selectedProductForAdd.id, soLuong: qty })
            });

            if (res.ok) {
                this.addToCartModal.hide();
                if (this.productModal) {
                    this.productModal.hide();
                }
                setTimeout(() => {
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.removeProperty('padding-right');
                    document.body.style.removeProperty('overflow');
                }, 300);

                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Thêm thành công' });
                this.manualRemovedFlags = this.manualRemovedFlags || {};
                this.manualRemovedFlags[this.currentOrderId] = false;
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;

                await this.fetchProducts();
                await this.loadOrderDetails(this.currentOrderId);
            } else {
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch (error) {
            console.error(error);
        }
    },

    addToCart: async function(idSanPhamChiTiet, soLuong = 1) {
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/them-san-pham`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idSanPhamChiTiet: idSanPhamChiTiet, soLuong: soLuong })
            });

            if(res.ok) {
                if (this.productModal) this.productModal.hide();
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Thêm thành công' });
                this.manualRemovedFlags = this.manualRemovedFlags || {};
                this.manualRemovedFlags[this.currentOrderId] = false;
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;
                this.loadOrderDetails(this.currentOrderId);
            } else {
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch (error) { console.error(error); }
    },

    getCurrentOrder: function() {
        return this.orders.find(o => o.id === this.currentOrderId);
    },

    isPercentDiscount: function(v) {
        if (!v || !v.loaiGiamGia) return false;
        const l = v.loaiGiamGia.toString().trim().toLowerCase();
        return l === '1' || l === '%' || l.includes('trăm') || l.includes('tram') || l === 'percent';
    },

    // --- 4. Summary & Payment ---
    updateSummary: function(order) {
        if(!order) {
            document.getElementById('summaryTotalAmount').innerText = '0 đ';
            document.getElementById('summaryDiscount').innerText = '-0 đ';
            document.getElementById('summaryFinalAmount').innerText = '0 đ';
            document.getElementById('btnCheckout').disabled = true;
            this.setVoucherEmpty();
            document.querySelector('.suggest-block').style.display = 'none';
            const shippingCard = document.getElementById('shippingSectionCard');
            if(shippingCard) shippingCard.style.setProperty('display', 'none', 'important');
            return;
        }

        if ((order.tongTienHang == null || order.tongTienHang === 0) && order.cart && order.cart.length > 0) {
            order.tongTienHang = order.cart.reduce((sum, item) => sum + (item.thanhTien != null ? Number(item.thanhTien) : (Number(item.donGia) * Number(item.soLuong))), 0);
        }

        let hasStoppedProduct = false;
        if (order.cart && order.cart.length > 0) {
            for (const item of order.cart) {
                let isStopped = item.isStopped === true || item.trangThai === 0 || item.trangThaiSanPham === 0;
                if (!isStopped && this.products && this.products.length > 0) {
                    const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                    if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                        isStopped = true;
                    }
                }
                if (isStopped) {
                    hasStoppedProduct = true;
                    break;
                }
            }
        }
        document.getElementById('btnCheckout').disabled = hasStoppedProduct;
        
        // Handle Customer Info & Auto-fill Shipping
        const giaoHangToggleContainer = document.getElementById('giaoHangSwitch').parentElement;
        const shippingSectionCard = document.getElementById('shippingSectionCard');

        // Luôn hiển thị thẻ thông tin giao hàng và công tắc giao hàng khi có đơn
        if (shippingSectionCard) shippingSectionCard.style.setProperty('display', 'block', 'important');
        if (giaoHangToggleContainer) giaoHangToggleContainer.style.setProperty('display', 'flex', 'important');

        if(order.khachHang) {
            document.getElementById('searchCustomerInput').parentElement.style.setProperty('display', 'none', 'important');
            document.getElementById('selectedCustomerInfo').style.setProperty('display', 'flex', 'important');
            document.getElementById('customerName').innerText = order.khachHang.hoTen || 'Khách lẻ';
            document.getElementById('customerPhone').innerText = order.khachHang.soDienThoai || '';
            
            // Auto-fill shipping info from local customer list if empty
            const tenNguoiNhanInput = document.getElementById('tenNguoiNhan');
            const sdtInput = document.getElementById('sdtNhan');
            const diaChiInput = document.getElementById('diaChiGiao');
            
            if (!tenNguoiNhanInput.value.trim() && order.khachHang.hoTen) {
                tenNguoiNhanInput.value = order.khachHang.hoTen;
                order.tenNguoiNhan = order.khachHang.hoTen;
            }

            // Find customer details from this.customers to get address/sdt if it's available
            const localCust = this.customers.find(c => c.id === order.khachHang.id);
            if (localCust) {
                let autoToggled = false;
                if (!sdtInput.value.trim() && (localCust.sdtNhan || localCust.soDienThoai)) {
                    sdtInput.value = localCust.sdtNhan || localCust.soDienThoai;
                    order.sdtNhan = sdtInput.value;
                }
                if (!diaChiInput.value.trim() && localCust.diaChiGiao) {
                    diaChiInput.value = localCust.diaChiGiao;
                    order.diaChiGiao = diaChiInput.value;
                    autoToggled = true;
                }
                
                // If we populated address, auto-turn on shipping toggle
                if (autoToggled && !document.getElementById('giaoHangSwitch').checked) {
                    document.getElementById('giaoHangSwitch').checked = true;
                    document.getElementById('shippingFieldsGroup').style.display = 'block';
                    order.isGiaoHang = true;
                }
            }
        } else {
            document.getElementById('searchCustomerInput').parentElement.style.setProperty('display', 'flex', 'important');
            document.getElementById('selectedCustomerInfo').style.setProperty('display', 'none', 'important');
            document.getElementById('searchCustomerInput').value = '';
            
            // Khách lẻ: Khôi phục lại trạng thái giao hàng của đơn (nếu có)
            if (order.isGiaoHang !== undefined) {
                document.getElementById('giaoHangSwitch').checked = Boolean(order.isGiaoHang);
                document.getElementById('shippingFieldsGroup').style.display = order.isGiaoHang ? 'block' : 'none';
            }
        }

        // Cập nhật phí ship: Mặc định là 0, chỉ khi có địa chỉ mới là đồng giá 30.000
        let phiShip = 0;
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        if (isGiaoHang) {
            const phiShipInputEl = document.getElementById('phiShip');
            const diaChi = (document.getElementById('diaChiGiao').value || '').trim();
            if (diaChi) {
                if (!phiShipInputEl.value || phiShipInputEl.value === '0' || phiShipInputEl.value === '') {
                    phiShipInputEl.value = '30.000';
                }
            } else {
                if (!phiShipInputEl.value || phiShipInputEl.value === '') {
                    phiShipInputEl.value = '0';
                }
            }
            const phiShipInput = (phiShipInputEl.value || '0').replace(/[^0-9]/g, '');
            phiShip = parseInt(phiShipInput) || 0;
        }

        let tongThanhToan = (Number(order.tongTienHang) || 0) - (Number(order.tienGiamGia) || 0) + phiShip;
        if (tongThanhToan < 0) tongThanhToan = 0;
        order.tongTienThanhToan = tongThanhToan; // Update local order obj

        document.getElementById('summaryTotalAmount').innerText = this.formatCurrency(order.tongTienHang);
        document.getElementById('summaryDiscount').innerText = "-" + this.formatCurrency(order.tienGiamGia);
        document.getElementById('summaryFinalAmount').innerText = this.formatCurrency(tongThanhToan);

        // Handle Voucher Block Styling
        if(order.phieuGiamGia) {
            this.setVoucherApplied(order.phieuGiamGia, order.tienGiamGia);
        } else {
            this.setVoucherEmpty();
        }

        // Luôn hiển thị gợi ý nếu có (giống trong ảnh, kể cả khi áp dụng rồi vẫn có thể hiện cái ngon hơn)
        this.renderSuggestion(order);

        this.calculateChange();

        // Tự động áp dụng phiếu giảm giá tốt nhất
        this.autoApplyBestVoucher(order);
    },

    findBestVoucher: function(order) {
        if (!order || !this.vouchers || this.vouchers.length === 0) return null;
        const tongTien = Number(order.tongTienHang) || 0;
        if (tongTien === 0) return null;

        let eligibleVouchers = this.vouchers.filter(v => Number(v.donToiThieu || 0) <= tongTien);
        if (eligibleVouchers.length === 0) return null;

        let bestVoucher = null;
        let maxDiscount = -1;

        eligibleVouchers.forEach(v => {
            let discount = 0;
            const rate = Number(v.giaTriGiam) || 0;
            const maxCap = Number(v.giamToiDa) || 0;
            if (this.isPercentDiscount(v)) {
                discount = tongTien * rate / 100;
                if (maxCap > 0 && discount > maxCap) discount = maxCap;
            } else {
                discount = rate;
                if (discount > tongTien) discount = tongTien;
            }
            if (discount > maxDiscount) {
                maxDiscount = discount;
                bestVoucher = { voucher: v, discount: discount };
            }
        });

        return bestVoucher;
    },

    autoApplyBestVoucher: async function(order) {
        if (!order || !this.currentOrderId || order.id !== this.currentOrderId) return;
        this.manualRemovedFlags = this.manualRemovedFlags || {};
        this.manualVoucherFlags = this.manualVoucherFlags || {};
        if (this.manualRemovedFlags[order.id] || this.manualVoucherFlags[order.id]) {
            return;
        }

        const bestInfo = this.findBestVoucher(order);
        if (!bestInfo) {
            if (order.phieuGiamGia) {
                await this.applyVoucherSilently(null);
            }
            return;
        }

        const bestVoucher = bestInfo.voucher;
        const maxDiscount = bestInfo.discount;
        const currentDiscount = order.phieuGiamGia ? (Number(order.tienGiamGia) || 0) : 0;

        // Nếu chưa có voucher hoặc voucher tốt nhất giảm nhiều tiền hơn voucher hiện tại
        if (!order.phieuGiamGia || (order.phieuGiamGia.id !== bestVoucher.id && maxDiscount > currentDiscount)) {
            await this.applyVoucherSilently(bestVoucher.id);
        }
    },

    applyVoucherSilently: async function(idPhieu) {
        if (!this.currentOrderId) return;
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/phieu-giam-gia`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPhieuGiamGia: idPhieu })
            });
            if (res.ok) {
                const data = await res.json();
                const orderIndex = this.orders.findIndex(o => o.id === this.currentOrderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex] = {
                        ...this.orders[orderIndex],
                        ...data,
                        phieuGiamGia: data.phieuGiamGia || null
                    };
                    this.updateSummary(this.orders[orderIndex]);
                }
            }
        } catch (e) {
            console.error('Lỗi tự động áp dụng phiếu giảm giá:', e);
        }
    },

    renderSuggestion: function(order) {
        const suggestBlock = document.getElementById('suggestBlock');
        const tongTienHang = Number(order.tongTienHang) || 0;
        const tienGiamGiaHienTai = Number(order.tienGiamGia) || 0;

        if(!this.vouchers || this.vouchers.length === 0 || tongTienHang === 0) {
            suggestBlock.style.display = 'none';
            return;
        }

        // Tìm voucher khách chưa đủ điều kiện (cần mua thêm)
        let suggestions = this.vouchers.filter(v => Number(v.donToiThieu || 0) > tongTienHang);
        
        if(suggestions.length === 0) {
            suggestBlock.style.display = 'none';
            return;
        }

        // Lọc các voucher có dự kiến mức giảm CAO HƠN mức giảm hiện tại
        let validSuggestions = [];
        suggestions.forEach(v => {
            let estimateDiscount = 0;
            let assumedTotal = Number(v.donToiThieu) || 0; 
            const rate = Number(v.giaTriGiam) || 0;
            const maxCap = Number(v.giamToiDa) || 0;
            if (this.isPercentDiscount(v)) {
                 estimateDiscount = assumedTotal * rate / 100;
                 if (maxCap > 0 && estimateDiscount > maxCap) estimateDiscount = maxCap;
            } else {
                 estimateDiscount = rate;
            }
            
            if (estimateDiscount > tienGiamGiaHienTai) {
                validSuggestions.push({
                    voucher: v,
                    estimateDiscount: estimateDiscount,
                    diff: (Number(v.donToiThieu) || 0) - tongTienHang
                });
            }
        });

        if (validSuggestions.length === 0) {
            suggestBlock.style.display = 'none';
            return;
        }

        // Ưu tiên gợi ý cái có diff (cần mua thêm) NHỎ NHẤT
        validSuggestions.sort((a,b) => a.diff - b.diff);
        let bestSuggestion = validSuggestions[0];
        let suggestion = bestSuggestion.voucher;
        let diff = bestSuggestion.diff;
        let estimateDiscount = bestSuggestion.estimateDiscount;

        suggestBlock.style.display = 'block';
        const discountText = this.isPercentDiscount(suggestion) ? suggestion.giaTriGiam + '%' : this.formatCurrency(suggestion.giaTriGiam);

        suggestBlock.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold small" style="color: #047857;">Gợi ý mua thêm</span>
                <span class="badge rounded-pill px-2 py-1" style="font-size: 0.7rem; background-color: #fffbeb; border: 1px solid #fcd34d; color: #fbbf24; font-weight: 500;">1 đề xuất</span>
            </div>
            <div class="card border-0 rounded-4 p-3 d-flex flex-row align-items-start" style="background-color: #f8fafc;">
                <span class="badge rounded-pill px-2 py-1 me-3" style="font-size: 0.75rem; background-color: #d1fae5; color: #047857; font-weight: 600;">${discountText}</span>
                <div class="flex-grow-1 w-100">
                    <strong class="fs-6 text-dark d-block mb-2" style="letter-spacing: 0.5px;">${suggestion.tenVoucher || suggestion.maVoucher}</strong>
                    <div class="d-flex justify-content-between text-muted small mb-1">
                        <span>Cần mua thêm:</span>
                        <strong class="text-dark">${this.formatCurrency(diff)}</strong>
                    </div>
                    <div class="d-flex justify-content-between text-muted small">
                        <span>Sẽ được giảm:</span>
                        <strong style="color: #047857;">${this.formatCurrency(estimateDiscount)}</strong>
                    </div>
                </div>
            </div>
        `;
    },

    setVoucherEmpty: function() {
        const vBlock = document.getElementById('voucherBlock');
        vBlock.className = 'rounded-4 p-3 d-flex align-items-center justify-content-between mb-0';
        vBlock.style.backgroundColor = '#f8fafc';
        vBlock.style.border = 'none';
        vBlock.innerHTML = `
            <div class="d-flex align-items-center text-muted">
                <i class="fa-solid fa-ticket me-2 text-secondary"></i>
                <span class="small fw-semibold text-dark" style="font-size: 13px;">Chọn phiếu giảm giá</span>
            </div>
            <i class="fa-solid fa-chevron-right text-muted" style="font-size: 12px;"></i>
        `;
    },

    setVoucherApplied: function(pgg, tienGiamGia) {
        const vBlock = document.getElementById('voucherBlock');
        vBlock.className = 'rounded-4 p-3 mb-0';
        vBlock.style.backgroundColor = '#f0fdf4';
        vBlock.style.border = 'none';
        
        const matchedVoucher = (this.vouchers && Array.isArray(this.vouchers))
            ? this.vouchers.find(v => (v.id && pgg.id && v.id === pgg.id) || (v.maVoucher && pgg.maVoucher && v.maVoucher === pgg.maVoucher))
            : null;
        const voucherObj = matchedVoucher ? { ...pgg, ...matchedVoucher } : pgg;
        const voucherName = voucherObj.tenVoucher || voucherObj.tenPhieuGiamGia || voucherObj.ten || pgg.tenVoucher || pgg.tenPhieuGiamGia || pgg.ten || pgg.maVoucher || '';

        const isPercent = this.isPercentDiscount(voucherObj);
        const maxGiam = voucherObj.giamToiDa ? this.formatCurrency(voucherObj.giamToiDa) : '';
        const giaTriGiamText = isPercent ? voucherObj.giaTriGiam + '%' : this.formatCurrency(voucherObj.giaTriGiam);
        
        let pillText = giaTriGiamText;
        if (isPercent && voucherObj.giamToiDa) {
            pillText += ` (Tối đa ${maxGiam})`;
        }

        vBlock.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="d-flex align-items-center" style="color: #047857;">
                    <i class="fa-regular fa-circle-check me-2"></i>
                    <span class="small fw-semibold">Đang áp dụng voucher tốt nhất</span>
                </div>
                <i class="fa-solid fa-xmark" style="cursor: pointer; color: #047857;" onclick="posApp.removeVoucher(event)"></i>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="fs-6 text-dark" style="letter-spacing: 0.5px;">${voucherName}</strong>
                <span class="badge rounded-pill" style="background-color: #dcfce7; color: #166534; font-weight: 600;">${pillText}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span class="small text-muted">Giá trị giảm:</span>
                <strong style="color: #047857;">-${this.formatCurrency(tienGiamGia)}</strong>
            </div>
        `;
    },

    openVoucherModal: async function() {
        if(!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }
        await this.fetchVouchers(); // Refresh
        this.renderVoucherModal();
        this.voucherModal.show();
    },

    renderVoucherModal: function() {
        const body = document.getElementById('voucherModalBody');
        body.innerHTML = '';
        const order = this.getCurrentOrder();
        const total = order ? (Number(order.tongTienHang) || 0) : 0;

        if (!this.vouchers || this.vouchers.length === 0) {
            body.innerHTML = '<div class="text-center text-muted">Không có phiếu giảm giá nào khả dụng.</div>';
            return;
        }

        this.vouchers.forEach(v => {
            const minAmount = Number(v.donToiThieu) || 0;
            const isEligible = total >= minAmount;
            const isApplied = order && order.phieuGiamGia && order.phieuGiamGia.id === v.id;
            
            let rightSideHtml = '';
            if (isApplied) {
                rightSideHtml = `
                    <div class="d-flex flex-column align-items-end">
                        <span class="badge mb-2" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"><i class="fa-solid fa-check-circle me-1"></i>Đang áp dụng</span>
                        <button class="btn btn-sm rounded-pill px-4 fw-bold shadow-sm border" style="background-color: #fff; color: #ef4444;" onclick="posApp.removeVoucher(event)">Bỏ chọn</button>
                    </div>
                `;
            } else if (isEligible) {
                rightSideHtml = `<button class="btn btn-sm rounded-pill px-4 fw-bold shadow-sm" style="background-color: #047857; color: white; padding-top: 8px; padding-bottom: 8px;" onclick="posApp.applyVoucher(${v.id})">Áp dụng</button>`;
            } else {
                const missingAmount = minAmount - total;
                rightSideHtml = `
                    <div class="text-end">
                        <span class="badge rounded-pill" style="background-color: #9ca3af; padding: 6px 12px; font-weight: 500;">Chưa đủ điều kiện</span>
                        <div class="mt-2 fw-semibold" style="color: #ef4444; font-size: 13px;">
                            <i class="fa-solid fa-cart-plus me-1"></i> Mua thêm ${this.formatCurrency(missingAmount)}
                        </div>
                    </div>
                `;
            }

            const discountText = this.isPercentDiscount(v) ? v.giaTriGiam + '%' : this.formatCurrency(v.giaTriGiam);

            const html = `
                <div class="card mb-3 rounded-4" style="border: 1px solid #f1f5f9; background-color: #fcfcfd; box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div class="card-body p-3 d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center" style="width: 70%;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 52px; height: 52px; background-color: #d1fae5; color: #059669;">
                                <i class="fa-solid fa-ticket-simple fs-5"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 fw-bold" style="color: #6b7280; font-size: 15px;">${v.maVoucher} - ${v.tenVoucher}</h6>
                                <p class="mb-0 text-muted" style="font-size: 13px;">
                                    Giảm: <strong style="color: #4b5563;">${discountText}</strong> 
                                    <span class="mx-1" style="color: #d1d5db;">|</span> 
                                    Đơn tối thiểu: <strong style="color: #4b5563;">${this.formatCurrency(v.donToiThieu)}</strong>
                                </p>
                                ${v.giamToiDa ? `<p class="mb-0 text-muted" style="font-size: 13px;">Giảm tối đa: <strong style="color: #4b5563;">${this.formatCurrency(v.giamToiDa)}</strong></p>` : ''}
                            </div>
                        </div>
                        <div class="text-end flex-grow-1">
                            ${rightSideHtml}
                        </div>
                    </div>
                </div>
            `;
            body.insertAdjacentHTML('beforeend', html);
        });
    },

    applyVoucher: async function(idPhieu) {
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/phieu-giam-gia`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPhieuGiamGia: idPhieu })
            });
            if(res.ok) {
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = true;
                this.voucherModal.hide();
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'Áp dụng thành công' });
                this.loadOrderDetails(this.currentOrderId);
            } else {
                const errText = await res.text();
                await this.fetchVouchers();
                this.loadOrderDetails(this.currentOrderId);
                Swal.fire('Thông báo', errText || 'Phiếu giảm giá không thể áp dụng', 'warning');
            }
        } catch(e) { console.error(e); }
    },

    removeVoucher: async function(event) {
        if (event) event.stopPropagation();
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/phieu-giam-gia`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPhieuGiamGia: null })
            });
            if(res.ok) {
                this.manualRemovedFlags = this.manualRemovedFlags || {};
                this.manualRemovedFlags[this.currentOrderId] = true;
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = true;
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: 'Đã hủy voucher' });
                this.loadOrderDetails(this.currentOrderId);
            }
        } catch(e) { console.error(e); }
    },

    removeCustomer: async function() {
        if (!this.currentOrderId) return;
        try {
            const res = await fetch(`/api/ban-hang/hoa-don/${this.currentOrderId}/khach-hang`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idKhachHang: null })
            });
            if(res.ok) {
                const updatedOrder = await res.json();
                const orderIndex = this.orders.findIndex(o => o.id === this.currentOrderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex] = { 
                        ...this.orders[orderIndex], 
                        ...updatedOrder,
                        khachHang: null 
                    };
                    
                    // Clear autofilled shipping inputs if any
                    document.getElementById('tenNguoiNhan').value = '';
                    document.getElementById('sdtNhan').value = '';
                    document.getElementById('diaChiGiao').value = '';
                    document.getElementById('phiShip').value = '0';
                    document.getElementById('giaoHangSwitch').checked = false;
                    document.getElementById('shippingFieldsGroup').style.display = 'none';
                    
                    this.updateSummary(this.orders[orderIndex]);
                }
            }
        } catch (e) { console.error(e); }
    },

    calculateChange: function() {
        const order = this.getCurrentOrder();
        if(!order) return;
        
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        const cashInput = document.getElementById('customerCash');
        const qrGroup = document.getElementById('transferQrGroup');
        const imgQr = document.getElementById('vietqrImage');
        const msgQr = document.getElementById('transferMessage');
        const amtQr = document.getElementById('transferAmount');
        
        if(method === 'TRANSFER') {
            document.getElementById('customerCashGroup').style.display = 'none';
            document.getElementById('returnCash').innerText = "0 đ";
            
            // Hiển thị mã QR VietQR
            qrGroup.style.display = 'block';
            
            const bankId = 'VCB'; // Vietcombank
            const accountNo = '9789290632'; // Số tài khoản VCB
            const accountName = 'DINH VU ANH DUNG'; // Tên chủ tài khoản
            const amount = order.tongTienThanhToan || 0;
            const message = `THANH TOAN ${order.maHoaDon}`;
            
            // Generate VietQR URL: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact.png?amount=<AMOUNT>&addInfo=<MESSAGE>&accountName=<ACCOUNT_NAME>
            const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(message)}&accountName=${encodeURIComponent(accountName)}`;
            
            imgQr.src = qrUrl;
            msgQr.innerText = `Nội dung: ${message}`;
            amtQr.innerText = `Số tiền: ${this.formatCurrency(amount)}`;
            
        } else {
            qrGroup.style.display = 'none';
            document.getElementById('customerCashGroup').style.display = 'block';
            
            cashInput.placeholder = `Mặc định đưa đủ: ${this.formatCurrency(order.tongTienThanhToan || 0)}`;

            let rawValue = cashInput.value.replace(/[^0-9]/g, '');
            if (!rawValue) {
                document.getElementById('returnCash').innerText = "0 đ";
                return;
            }
            
            let cash = parseFloat(rawValue);
            
            // Giữ vị trí con trỏ
            let cursorPos = cashInput.selectionStart;
            let oldLength = cashInput.value.length;
            
            cashInput.value = cash.toLocaleString('vi-VN');
            
            let newLength = cashInput.value.length;
            cursorPos = cursorPos + (newLength - oldLength);
            cashInput.setSelectionRange(cursorPos, cursorPos);

            const diff = cash - (order.tongTienThanhToan || 0);
            document.getElementById('returnCash').innerText = this.formatCurrency(diff > 0 ? diff : 0);
        }
    },

    restoreShippingUI: function(order) {
        if (!order) return;
        const isGiaoHang = Boolean(order.isGiaoHang);
        const switchEl = document.getElementById('giaoHangSwitch');
        if (switchEl) switchEl.checked = isGiaoHang;
        
        const groupEl = document.getElementById('shippingFieldsGroup');
        if (groupEl) groupEl.style.display = isGiaoHang ? 'block' : 'none';
        
        const tenNguoiNhanEl = document.getElementById('tenNguoiNhan');
        const sdtNhanEl = document.getElementById('sdtNhan');
        const diaChiGiaoEl = document.getElementById('diaChiGiao');
        const phiShipEl = document.getElementById('phiShip');

        if (tenNguoiNhanEl) tenNguoiNhanEl.value = order.tenNguoiNhan || (order.khachHang ? order.khachHang.hoTen : '');
        if (sdtNhanEl) sdtNhanEl.value = order.sdtNhan || (order.khachHang ? order.khachHang.soDienThoai : '');
        if (diaChiGiaoEl) diaChiGiaoEl.value = order.diaChiGiao || '';
        if (phiShipEl) phiShipEl.value = order.phiShip || (isGiaoHang && order.diaChiGiao ? '30.000' : '0');
    },

    toggleGiaoHang: function() {
        const order = this.getCurrentOrder();
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        document.getElementById('shippingFieldsGroup').style.display = isGiaoHang ? 'block' : 'none';
        
        if (order) {
            order.isGiaoHang = isGiaoHang;
        }

        const phiShipInput = document.getElementById('phiShip');
        const diaChi = (document.getElementById('diaChiGiao').value || '').trim();
        if (isGiaoHang) {
            if (diaChi) {
                if (!phiShipInput.value || phiShipInput.value === '0' || phiShipInput.value === '') {
                    phiShipInput.value = '30.000';
                }
            } else {
                phiShipInput.value = '0';
                this.enableEditShipping();
            }
        } else {
            phiShipInput.value = '0';
            if (this.currentOrderId) {
                fetch(`/api/pos/hoa-don/${this.currentOrderId}/giao-hang`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isGiaoHang: false })
                }).catch(e => console.warn(e));
            }
        }
        
        if (order) {
            order.phiShip = phiShipInput.value;
        }
        
        this.updateSummary(this.getCurrentOrder());
    },

    formatPhiShip: function(input) {
        let rawValue = input.value.replace(/[^0-9]/g, '');
        if (!rawValue) {
            input.value = '0';
        } else {
            input.value = parseInt(rawValue).toLocaleString('vi-VN');
        }
        this.updateSummary(this.getCurrentOrder());
    },

    onMainShippingChange: function() {
        const order = this.getCurrentOrder();
        const name = (document.getElementById('tenNguoiNhan').value || '').trim();
        const phone = (document.getElementById('sdtNhan').value || '').trim();
        if (order) {
            order.tenNguoiNhan = name;
            order.sdtNhan = phone;
        }
        if (this.currentOrderId) {
            const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
            const fullAddress = (document.getElementById('diaChiGiao').value || '').trim();
            const phiShipVal = parseInt((document.getElementById('phiShip').value || '0').replace(/[^0-9]/g, '')) || 0;
            fetch(`/api/pos/hoa-don/${this.currentOrderId}/giao-hang`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isGiaoHang: isGiaoHang,
                    tenNguoiNhan: name,
                    sdtNhan: phone,
                    diaChiGiao: fullAddress,
                    phiShip: phiShipVal
                })
            }).catch(e => console.warn(e));
        }
    },

    // --- 5. Shipping Edit & Address APIs ---
    provincesList: [],

    fetchProvinces: async function() {
        if (this.provincesList && this.provincesList.length > 0) return this.provincesList;
        try {
            let res = await fetch('/api/address/provinces');
            if (res.ok) {
                const data = await res.json();
                this.provincesList = data;
                return data;
            }
        } catch (e) {
            console.warn('Lỗi proxy tải tỉnh thành:', e);
        }

        try {
            let res = await fetch('https://provinces.open-api.vn/api/?depth=1');
            if (res.ok) {
                const data = await res.json();
                this.provincesList = data;
                return data;
            }
        } catch (e) {
            console.error('Lỗi tải danh sách tỉnh thành:', e);
        }
        return [];
    },

    enableEditShipping: async function() {
        if (!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }

        const currentOrder = this.getCurrentOrder();
        const customer = currentOrder ? currentOrder.khachHang : null;

        const currentName = (document.getElementById('tenNguoiNhan').value || '').trim();
        const currentPhone = (document.getElementById('sdtNhan').value || '').trim();
        const currentAddress = (document.getElementById('diaChiGiao').value || '').trim();
        const currentPhiShip = (document.getElementById('phiShip').value || '').trim();

        const searchName = document.getElementById('searchCustomerInput') ? document.getElementById('searchCustomerInput').value.trim() : '';
        const defaultName = currentName || (customer && customer.hoTen ? customer.hoTen : '') || (searchName && searchName !== 'Khách lẻ' ? searchName : '');
        document.getElementById('modalTenNguoiNhan').value = defaultName;
        document.getElementById('modalSdtNhan').value = currentPhone || (customer && customer.soDienThoai ? customer.soDienThoai : '');
        document.getElementById('modalDiaChiChiTiet').value = '';

        const provSelect = document.getElementById('modalProvince');
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');

        provSelect.innerHTML = '<option value="">Chọn Tỉnh/Thành</option>';
        distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        distSelect.disabled = true;
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const provinces = await this.fetchProvinces();
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.dataset.code = p.code;
            opt.textContent = p.name;
            provSelect.appendChild(opt);
        });

        if (currentAddress) {
            document.getElementById('modalDiaChiChiTiet').value = currentAddress;
            document.getElementById('modalPhiShip').value = currentPhiShip && currentPhiShip !== '0' ? currentPhiShip : '30.000';
        } else {
            document.getElementById('modalPhiShip').value = currentPhiShip && currentPhiShip !== '0' ? currentPhiShip : '0';
        }

        this.editShippingModal.show();
    },

    onProvinceChange: async function() {
        const provSelect = document.getElementById('modalProvince');
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');

        distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        distSelect.disabled = true;
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const selectedOpt = provSelect.options[provSelect.selectedIndex];
        if (!selectedOpt || !selectedOpt.dataset.code) {
            this.checkShippingFeeAuto();
            return;
        }

        const provCode = selectedOpt.dataset.code;
        try {
            let res = await fetch(`/api/address/districts/${provCode}`);
            let data = null;
            if (res.ok) {
                data = await res.json();
            } else {
                let resFallback = await fetch(`https://provinces.open-api.vn/api/p/${provCode}?depth=2`);
                if (resFallback.ok) data = await resFallback.json();
            }

            if (data && data.districts) {
                data.districts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.name;
                    opt.dataset.code = d.code;
                    opt.textContent = d.name;
                    distSelect.appendChild(opt);
                });
                distSelect.disabled = false;
            }
        } catch (e) {
            console.error('Lỗi tải quận huyện:', e);
        }

        this.checkShippingFeeAuto();
    },

    onDistrictChange: async function() {
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');

        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const selectedOpt = distSelect.options[distSelect.selectedIndex];
        if (!selectedOpt || !selectedOpt.dataset.code) {
            this.checkShippingFeeAuto();
            return;
        }

        const distCode = selectedOpt.dataset.code;
        try {
            let res = await fetch(`/api/address/wards/${distCode}`);
            let data = null;
            if (res.ok) {
                data = await res.json();
            } else {
                let resFallback = await fetch(`https://provinces.open-api.vn/api/d/${distCode}?depth=2`);
                if (resFallback.ok) data = await resFallback.json();
            }

            if (data && data.wards) {
                data.wards.forEach(w => {
                    const opt = document.createElement('option');
                    opt.value = w.name;
                    opt.dataset.code = w.code;
                    opt.textContent = w.name;
                    wardSelect.appendChild(opt);
                });
                wardSelect.disabled = false;
            }
        } catch (e) {
            console.error('Lỗi tải phường xã:', e);
        }

        this.checkShippingFeeAuto();
    },

    onWardChange: function() {
        this.checkShippingFeeAuto();
    },

    onDetailAddressChange: function() {
        this.checkShippingFeeAuto();
    },

    checkShippingFeeAuto: function() {
        const prov = (document.getElementById('modalProvince').value || '').trim();
        const dist = (document.getElementById('modalDistrict').value || '').trim();
        const ward = (document.getElementById('modalWard').value || '').trim();
        const detail = (document.getElementById('modalDiaChiChiTiet').value || '').trim();
        const phiShipInput = document.getElementById('modalPhiShip');

        const hasAddress = Boolean(prov || dist || ward || detail);
        if (hasAddress) {
            // Sau khi nhập địa chỉ thì mới đồng giá 30k
            if (!phiShipInput.value || phiShipInput.value === '0' || phiShipInput.value === '0 đ') {
                phiShipInput.value = '30.000';
            }
        } else {
            // Phí ship để bằng 0 khi chưa có địa chỉ
            phiShipInput.value = '0';
        }
    },

    formatPhiShipModal: function(input) {
        let rawValue = input.value.replace(/[^0-9]/g, '');
        if (!rawValue) {
            input.value = '0';
        } else {
            input.value = parseInt(rawValue).toLocaleString('vi-VN');
        }
    },

    saveShippingEdit: async function() {
        const name = (document.getElementById('modalTenNguoiNhan').value || '').trim();
        const phone = (document.getElementById('modalSdtNhan').value || '').trim();
        const prov = (document.getElementById('modalProvince').value || '').trim();
        const dist = (document.getElementById('modalDistrict').value || '').trim();
        const ward = (document.getElementById('modalWard').value || '').trim();
        const detail = (document.getElementById('modalDiaChiChiTiet').value || '').trim();
        let phiShipStr = (document.getElementById('modalPhiShip').value || '').trim();

        if (!name) {
            Swal.fire('Lỗi', 'Vui lòng nhập tên người nhận!', 'error');
            return;
        }
        if (!phone) {
            Swal.fire('Lỗi', 'Vui lòng nhập số điện thoại người nhận!', 'error');
            return;
        }

        let addressParts = [];
        if (detail) addressParts.push(detail);
        if (ward) addressParts.push(ward);
        if (dist) addressParts.push(dist);
        if (prov) addressParts.push(prov);

        const fullAddress = addressParts.join(', ');
        if (!fullAddress) {
            Swal.fire('Lỗi', 'Vui lòng chọn hoặc nhập địa chỉ giao hàng!', 'error');
            return;
        }

        let phiShipVal = parseInt(phiShipStr.replace(/[^0-9]/g, ''));
        if (isNaN(phiShipVal) || phiShipVal < 0) {
            phiShipVal = 30000;
        }

        // Cập nhật lại giao diện chính
        document.getElementById('tenNguoiNhan').value = name;
        document.getElementById('sdtNhan').value = phone;
        document.getElementById('diaChiGiao').value = fullAddress;
        document.getElementById('phiShip').value = phiShipVal.toLocaleString('vi-VN');

        const order = this.getCurrentOrder();
        if (order) {
            order.isGiaoHang = true;
            order.tenNguoiNhan = name;
            order.sdtNhan = phone;
            order.diaChiGiao = fullAddress;
            order.phiShip = phiShipVal.toLocaleString('vi-VN');
        }

        this.editShippingModal.hide();
        this.updateSummary(this.getCurrentOrder());

        // Lưu thông tin giao hàng vào CSDL
        if (this.currentOrderId) {
            try {
                await fetch(`/api/pos/hoa-don/${this.currentOrderId}/giao-hang`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        isGiaoHang: true,
                        tenNguoiNhan: name,
                        sdtNhan: phone,
                        diaChiGiao: fullAddress,
                        phiShip: phiShipVal
                    })
                });
            } catch (e) {
                console.warn('Lỗi lưu thông tin giao hàng vào server:', e);
            }
        }

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: 'Cập nhật thông tin giao hàng thành công' });
    },

    checkout: async function() {
        const order = this.getCurrentOrder();
        if(!order || !order.cart || order.cart.length === 0) {
            Swal.fire('Chú ý', 'Giỏ hàng đang trống!', 'warning');
            return;
        }

        // Luôn làm mới danh sách sản phẩm và voucher mới nhất trước khi kiểm tra
        await this.fetchProducts();
        await this.fetchVouchers();

        // Kiểm tra xem có sản phẩm ngừng kinh doanh trong giỏ hàng không
        for (const item of order.cart) {
            let isStopped = item.isStopped === true;
            if (this.products && this.products.length > 0) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && (matched.trangThai === 0 || matched.trangThai === false || matched.isStopped)) {
                    isStopped = true;
                }
            }
            if (isStopped) {
                Swal.fire('Thông báo', `Sản phẩm "${item.tenSanPham}" đã ngừng kinh doanh.`, 'warning');
                return;
            }
        }



        // Kiểm tra tồn kho trước khi thanh toán / mua hàng
        for (const item of order.cart) {
            let tonKho = item.soLuongTon;
            if (tonKho == null && this.products) {
                const matched = this.products.find(p => p.id === item.idSanPhamChiTiet);
                if (matched && matched.soLuongTon != null) tonKho = matched.soLuongTon;
            }
            if (tonKho != null && Number(tonKho) < 0) {
                Swal.fire('Lỗi tồn kho', `Sản phẩm "${item.tenSanPham}" có số lượng vượt quá tồn kho thực tế! Vui lòng điều chỉnh lại giỏ hàng trước khi thanh toán.`, 'error');
                return;
            }
        }

        // Kiểm tra xem có voucher tốt hơn chưa được áp dụng không
        const bestInfo = this.findBestVoucher(order);
        const currentDiscount = order.phieuGiamGia ? (Number(order.tienGiamGia) || 0) : 0;
        if (bestInfo && bestInfo.discount > currentDiscount && (!order.phieuGiamGia || order.phieuGiamGia.id !== bestInfo.voucher.id)) {
            const bestVoucher = bestInfo.voucher;
            const maxDiscount = bestInfo.discount;
            const isUpgrade = Boolean(order.phieuGiamGia);

            const promptResult = await Swal.fire({
                title: '<span style="color: #047857; font-size: 1.25rem;"><i class="fa-solid fa-gift me-2"></i>Chưa áp dụng ưu đãi tốt nhất!</span>',
                html: `
                    <div class="text-start p-2" style="font-size: 0.95rem;">
                        <p class="mb-3">${isUpgrade ? `Đơn hàng có thể đổi sang phiếu <strong>${bestVoucher.maVoucher} - ${bestVoucher.tenVoucher}</strong> để được giảm <strong class="text-success">${this.formatCurrency(maxDiscount)}</strong> (nhiều hơn mức hiện tại <span class="text-muted">${this.formatCurrency(currentDiscount)}</span>).` : `Đơn hàng đủ điều kiện áp dụng phiếu giảm giá <strong>${bestVoucher.maVoucher} - ${bestVoucher.tenVoucher}</strong> để được giảm ngay <strong class="text-success">${this.formatCurrency(maxDiscount)}</strong>.`}</p>
                        <p class="mb-0 text-muted">Bạn có muốn áp dụng phiếu tốt nhất trước khi thanh toán không?</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#047857',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fa-solid fa-check me-1"></i> Áp dụng phiếu tốt nhất',
                cancelButtonText: 'Bỏ qua, thanh toán luôn'
            });

            if (promptResult.isConfirmed) {
                await this.applyVoucher(bestVoucher.id);
                return;
            }
        }

        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        const cashRaw = document.getElementById('customerCash').value.replace(/[^0-9]/g, '');
        let cash = cashRaw ? parseFloat(cashRaw) : 0;
        
        if (method === 'CASH') {
            if (!cashRaw || cash === 0) {
                // Khách đưa đủ tiền -> mặc định coi như đưa đúng tổng tiền thanh toán
                cash = order.tongTienThanhToan || 0;
            } else if (cash < (order.tongTienThanhToan || 0)) {
                Swal.fire('Lỗi', `Khách đưa không đủ tiền! Cần thanh toán: ${this.formatCurrency(order.tongTienThanhToan || 0)}`, 'error');
                return;
            }
        } else if (method === 'TRANSFER') {
            cash = order.tongTienThanhToan || 0; // Chuyển khoản coi như đưa đủ tiền
        }

        const note = document.getElementById('orderNote').value;
        const customerInput = document.getElementById('searchCustomerInput').value.trim();
        const tenNguoiNhan = (document.getElementById('tenNguoiNhan').value || '').trim();
        
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        let phiShip = 0;
        let sdtNhan = null;
        let diaChiGiao = null;
        
        if (isGiaoHang) {
            phiShip = parseInt((document.getElementById('phiShip').value || '0').replace(/[^0-9]/g, '')) || 0;
            sdtNhan = document.getElementById('sdtNhan').value.trim();
            diaChiGiao = document.getElementById('diaChiGiao').value.trim();
            
            if (!sdtNhan) {
                Swal.fire('Lỗi', 'Vui lòng nhập số điện thoại người nhận!', 'error');
                return;
            }
            if (!diaChiGiao) {
                Swal.fire('Lỗi', 'Vui lòng nhập địa chỉ giao hàng!', 'error');
                return;
            }
        }

        const tenKhachHangSend = isGiaoHang ? (tenNguoiNhan || customerInput || (order.khachHang ? order.khachHang.hoTen : 'Khách lẻ')) : (customerInput || (order.khachHang ? order.khachHang.hoTen : 'Khách lẻ'));

        window.isCheckoutModalOpen = true;
        const confirmResult = await Swal.fire({
            title: 'Xác nhận thanh toán',
            html: `
                <div class="text-start p-2" style="font-size: 0.95rem;">
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Mã hóa đơn:</span>
                        <strong class="text-dark">${order.maHoaDon || ''}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Khách hàng:</span>
                        <strong class="text-dark">${tenKhachHangSend}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Số lượng sản phẩm:</span>
                        <strong class="text-dark">${order.cart.length} sản phẩm</strong>
                    </div>
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Hình thức thanh toán:</span>
                        <strong class="text-dark">${method === 'TRANSFER' ? 'Chuyển khoản (VietQR)' : 'Tiền mặt'}</strong>
                    </div>
                    ${method === 'CASH' && cash > (order.tongTienThanhToan || 0) ? `
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Tiền khách đưa:</span>
                        <strong class="text-dark">${this.formatCurrency(cash)}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Tiền thừa trả khách:</span>
                        <strong class="text-success fw-bold">${this.formatCurrency(cash - (order.tongTienThanhToan || 0))}</strong>
                    </div>` : ''}
                    ${order.phieuGiamGia ? `
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Phiếu giảm giá:</span>
                        <strong class="text-success">${order.phieuGiamGia.tenVoucher || order.phieuGiamGia.maVoucher} (-${this.formatCurrency(order.tienGiamGia)})</strong>
                    </div>` : ''}
                    ${isGiaoHang ? `
                    <div class="d-flex justify-content-between py-1 border-bottom">
                        <span class="text-muted">Phí giao hàng:</span>
                        <strong class="text-dark">${this.formatCurrency(phiShip)}</strong>
                    </div>
                    <div class="py-1 border-bottom text-muted small">
                        <i class="fa-solid fa-truck-fast text-primary me-1"></i> Giao tới: <strong>${diaChiGiao}</strong> (${sdtNhan})
                    </div>` : ''}
                    <div class="d-flex justify-content-between pt-2">
                        <span class="fw-bold">Tổng thanh toán:</span>
                        <span class="text-danger fw-bold fs-5">${this.formatCurrency(order.tongTienThanhToan)}</span>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#008dd5',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fa-solid fa-check me-1"></i> Xác nhận thanh toán',
            cancelButtonText: 'Hủy'
        });
        window.isCheckoutModalOpen = false;

        if (!confirmResult.isConfirmed) {
            return;
        }

        // resolvedVoucherId: ID phiếu giảm giá chính xác sẽ gửi khi thanh toán
        let resolvedVoucherId = order.phieuGiamGia ? order.phieuGiamGia.id : null;
        // voucherBlocked: true = phiếu không hợp lệ, tuyệt đối không tiếp tục thanh toán
        let voucherBlocked = false;

        if (order.phieuGiamGia) {

            try {
                const res = await fetch('/api/pos/phieu-giam-gia');
                if (res.ok) {
                    const freshVouchers = await res.json();
                    
                    const oldVouchers = this.vouchers;
                    this.vouchers = freshVouchers;
                    const bestInfo = this.findBestVoucher(order);
                    this.vouchers = oldVouchers;

                    const stillValid = freshVouchers.some(v => Number(v.id) === Number(order.phieuGiamGia.id));
                    
                    if (!stillValid) {
                        voucherBlocked = true; // Mặc định chặn cho đến khi user xác nhận
                        // Trường hợp 1: Phiếu cũ đã bị tắt
                        if (bestInfo) {
                            const result = await Swal.fire({
                                title: 'Phiếu giảm giá không còn hiệu lực',
                                html: `Phiếu <strong>${order.phieuGiamGia.maVoucher}</strong> đã bị tắt hoặc hết hiệu lực. Bạn có muốn áp dụng phiếu <strong>${bestInfo.voucher.maVoucher}</strong> để tiếp tục thanh toán không?`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#28a745',
                                cancelButtonColor: '#6c757d',
                                confirmButtonText: 'Áp dụng phiếu mới',
                                cancelButtonText: 'Không áp dụng'
                            });
                            
                            if (result.isConfirmed) {
                                // Áp dụng phiếu mới, cập nhật UI và trở về màn hình bán hàng
                                await this.applyVoucherSilently(bestInfo.voucher.id);
                                await this.fetchVouchers();
                                this.loadOrderDetails(order.id);
                                return; // Trở về màn hình để người dùng xem lại và tự bấm Thanh toán
                            } else {
                                // Người dùng không áp dụng => gỡ phiếu cũ hỏng và trả về màn hình
                                if (order.id) {
                                    try { await fetch(`/api/pos/hoa-don/${order.id}/phieu-giam-gia`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idPhieuGiamGia: null }) }); } catch(e) {}
                                }
                                order.phieuGiamGia = null;
                                order.tienGiamGia = 0;
                                this.calculateTotals(order);
                                this.loadOrderDetails(order.id);
                                return;
                            }
                        } else {
                            // Không có phiếu thay thế nào — hiện popup 1, gỡ phiếu, trở về màn hình
                            await Swal.fire({
                                title: 'Thông báo',
                                text: `Phiếu giảm giá ${order.phieuGiamGia.maVoucher} đã hết hạn hoặc đã ngừng hoạt động!`,
                                icon: 'warning',
                                confirmButtonColor: '#00adef'
                            });
                            if (order.id) {
                                try { await fetch(`/api/pos/hoa-don/${order.id}/phieu-giam-gia`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idPhieuGiamGia: null }) }); } catch(e) {}
                            }
                            order.phieuGiamGia = null; order.tienGiamGia = 0; this.calculateTotals(order);
                            this.loadOrderDetails(order.id);
                            return; // Tuyệt đối dừng, không gọi API thanh toán
                        }
                    } else {
                        // Trường hợp 2: Phiếu cũ hợp lệ, kiểm tra xem có phiếu tốt hơn không
                        const currentDiscount = Number(order.tienGiamGia) || 0;
                        if (bestInfo && bestInfo.discount > currentDiscount && bestInfo.voucher.id !== order.phieuGiamGia.id) {
                            const result = await Swal.fire({
                                title: 'Phát hiện phiếu giảm giá tốt hơn',
                                html: `
                                    <div class="text-start">
                                        <p>Phiếu hiện tại: <strong>${order.phieuGiamGia.maVoucher}</strong> — giảm <strong class="text-danger">${this.formatCurrency(currentDiscount)}</strong></p>
                                        <p>Phiếu đề xuất: <strong>${bestInfo.voucher.maVoucher}</strong> — giảm <strong class="text-success">${this.formatCurrency(bestInfo.discount)}</strong></p>
                                        <p>Bạn tiết kiệm thêm: <strong class="text-success">${this.formatCurrency(bestInfo.discount - currentDiscount)}</strong></p>
                                        <p class="mb-0 mt-3 text-center"><strong>Bạn có muốn thay thế phiếu hiện tại bằng phiếu mới không?</strong></p>
                                    </div>
                                `,
                                icon: 'info',
                                showCancelButton: true,
                                confirmButtonColor: '#0d6efd',
                                cancelButtonColor: '#6c757d',
                                confirmButtonText: 'Đồng ý áp dụng',
                                cancelButtonText: 'Giữ phiếu hiện tại'
                            });
                            
                            if (result.isConfirmed) {
                                await this.applyVoucherSilently(bestInfo.voucher.id);
                                resolvedVoucherId = bestInfo.voucher.id; // Dùng phiếu tốt hơn cho thanh toán
                                const updatedOrder = this.orders.find(o => o.id === order.id);
                                if (updatedOrder) order = updatedOrder;
                            }
                        }
                        // Trường hợp 3: Không có thay đổi (tiếp tục thanh toán bên dưới)
                    }
                } else {
                    // Fetch danh sách phiếu thất bại - không thể xác minh, chặn thanh toán để an toàn
                    voucherBlocked = true;
                }
            } catch (err) {
                console.error("Lỗi kiểm tra voucher:", err);
                voucherBlocked = true; // Lỗi mạng => không thể xác minh phiếu => chặn thanh toán
            }

            // Guard tuyệt đối: nếu phiếu bị chặn mà code vẫn chạy đến đây (không return ở trên), dừng lại
            if (voucherBlocked) {
                this.loadOrderDetails(order.id);
                return;
            }
        }



        try {
            const res = await fetch(`/api/pos/hoa-don/${order.id}/thanh-toan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    hinhThucThanhToan: method, 
                    tienKhachDua: cash, 
                    ghiChu: note, 
                    tenKhachHang: tenKhachHangSend,
                    phiShip: phiShip,
                    sdtNhan: sdtNhan,
                    diaChiGiao: diaChiGiao,
                    idPhieuGiamGia: resolvedVoucherId
                })
            });

            if(res.ok) {
                if ('BroadcastChannel' in window) {
                    const bc = new BroadcastChannel('vshoes_sync_channel');
                    bc.postMessage({ type: 'order_completed', id: order.id });
                }
                localStorage.setItem('vshoes_sync_trigger', Date.now().toString());

                Swal.fire({ 
                    title: 'Thành công!', 
                    text: 'Thanh toán thành công.', 
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false
                });

                this.orders = this.orders.filter(o => o.id !== order.id);
                this.currentOrderId = null;
                document.getElementById('customerCash').value = '';
                document.getElementById('orderNote').value = '';
                document.getElementById('searchCustomerInput').value = '';
                document.getElementById('giaoHangSwitch').checked = false;
                document.getElementById('tenNguoiNhan').value = '';
                document.getElementById('sdtNhan').value = '';
                document.getElementById('diaChiGiao').value = '';
                document.getElementById('phiShip').value = '0';
                this.toggleGiaoHang();
                
                this.renderOrderTabs();
                if(this.orders.length > 0) this.switchOrder(this.orders[0].id);
                else this.showNoOrder();
            } else {
                const errText = await res.text();
                await this.fetchVouchers();
                await this.fetchProducts();
                if (this.currentOrderId) {
                    await this.loadOrderDetails(this.currentOrderId);
                }
                // Nếu lỗi liên quan đến phiếu giảm giá, không hiện popup - UI đã được cập nhật
                const isVoucherError = errText && (
                    errText.includes('Phiếu giảm giá') ||
                    errText.includes('phiếu giảm giá') ||
                    errText.includes('VOUCHER_ERROR') ||
                    errText.includes('voucher')
                );
                if (!isVoucherError) {
                    Swal.fire('Thông báo', errText || 'Thanh toán không thành công!', 'warning');
                }
                // Nếu là lỗi voucher: UI đã refresh, người dùng thấy màn hình bán hàng mới, tự chọn lại phiếu
            }
        } catch (e) { console.error(e); }
    },

    qrScanner: null,

    startQrScanner: function() {
        if(!this.currentOrderId) {
            Swal.fire('Chú ý', 'Vui lòng chọn hoặc tạo hóa đơn trước!', 'warning');
            return;
        }

        const qrModal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
        qrModal.show();
        
        // Wait for modal to render then start scanner
        setTimeout(() => {
            if (!this.qrScanner) {
                this.qrScanner = new Html5QrcodeScanner(
                    "qr-reader", { 
                        fps: 10, 
                        qrbox: {width: 250, height: 250},
                        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                    }, false);
            }
            this.qrScanner.render(this.onScanSuccess.bind(this), this.onScanFailure.bind(this));
        }, 500);
        
        // Fix for modal closing event to stop scanner
        document.getElementById('qrScannerModal').addEventListener('hidden.bs.modal', () => {
            this.stopQrScanner();
        }, { once: true });
    },

    stopQrScanner: function() {
        if (this.qrScanner) {
            this.qrScanner.clear().then(() => {
                this.qrScanner = null;
            }).catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        }
    },

    onScanSuccess: async function(decodedText, decodedResult) {
        this.stopQrScanner();
        
        const modalEl = document.getElementById('qrScannerModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        try {
            const res = await fetch('/api/pos/san-pham');
            if (res.ok) {
                const products = await res.json();
                const product = products.find(p => p.ma === decodedText);
                if (product) {
                    if (product.soLuongTon > 0) {
                        this.addToCart(product.id);
                        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                        Toast.fire({ icon: 'success', title: `Đã quét thêm ${product.tenSanPham}` });
                    } else {
                        Swal.fire('Lỗi', `Sản phẩm ${product.tenSanPham} đã hết hàng!`, 'error');
                    }
                } else {
                    Swal.fire('Lỗi', `Không tìm thấy sản phẩm có mã: ${decodedText}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error finding product:', error);
            Swal.fire('Lỗi', 'Lỗi khi tìm kiếm sản phẩm quét', 'error');
        }
    },

    onScanFailure: function(error) {
        // Ignore errors to avoid console spam
    },

    formatCurrency: function(value) {
        if(!value) return "0 đ";
        return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { posApp.init(); });
} else {
    posApp.init();
}
