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
        
        document.getElementById('btnCreateOrder').addEventListener('click', () => {
            this.createOrder();
        });

        this.productModal = new bootstrap.Modal(document.getElementById('productModal'));
        this.voucherModal = new bootstrap.Modal(document.getElementById('voucherModal'));
        this.customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
        if (document.getElementById('editShippingModal')) {
            this.editShippingModal = new bootstrap.Modal(document.getElementById('editShippingModal'));
        }
        this.fetchProvinces();
    },

    fetchProvinces: async function() {
        try {
            const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
            if (res.ok) {
                const data = await res.json();
                const sel = document.getElementById('modalProvince');
                sel.innerHTML = '<option value="">Chọn Tỉnh/Thành</option>' + 
                    data.map(p => `<option value="${p.code}">${p.name}</option>`).join('');
            }
        } catch(e) { console.error(e); }
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
            Swal.fire({ icon: 'warning', title: 'Giới hạn', text: 'Chỉ được tạo tối đa 5 hóa đơn chờ!' });
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
                Swal.fire('Lỗi', 'Không thể tạo hóa đơn mới', 'error');
            }
        } catch (error) {
            console.error(error);
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
            text: "Toàn bộ thông tin hóa đơn này sẽ bị hủy bỏ!",
            icon: 'warning',
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 shadow border-0',
                title: 'fs-4 fw-bold pt-3 pb-1 text-dark',
                confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm',
                cancelButton: 'btn btn-light rounded-pill px-5 py-2 mx-3 fw-bold text-secondary border shadow-sm'
            },
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy bỏ'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/pos/hoa-don/${orderId}`, { method: 'DELETE' });
                if(res.ok) {
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
        
        document.getElementById('orderCount').innerText = `${this.orders.length} hóa đơn`;
        
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

            const cartCount = (order.cart && order.cart.length > 0) ? order.cart.length : 0;
            const badgeHtml = cartCount > 0
                ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;border-radius:9px;padding:0 5px;margin-left:5px;line-height:1;">${cartCount}</span>`
                : '';
            const html = `
                <li class="nav-item" role="presentation" title="${order.maHoaDon}">
                    <button class="nav-link ${isActive}" onclick="posApp.switchOrder(${order.id})">
                        ${displayName}${badgeHtml}
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
        const input = document.getElementById('searchCustomerInput').value.toLowerCase();
        const dropdown = document.getElementById('customerDropdown');
        
        if (!input) {
            dropdown.style.display = 'none';
            return;
        }

        const filtered = this.customers.filter(c => 
            (c.hoTen && c.hoTen.toLowerCase().includes(input)) || 
            (c.soDienThoai && c.soDienThoai.includes(input))
        );

        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="p-2 text-muted small text-center">Không tìm thấy khách hàng</div>`;
        } else {
            dropdown.innerHTML = filtered.map(c => `
                <div class="p-2 border-bottom dropdown-item" style="cursor:pointer;" onclick="posApp.confirmSelectCustomer(${c.id})">
                    <div class="fw-bold text-dark">${c.hoTen || 'Khách lẻ'}</div>
                    <small class="text-muted">${c.soDienThoai || ''}</small>
                </div>
            `).join('');
        }
        dropdown.style.display = 'block';
    },

    confirmSelectCustomer: function(idKhachHang) {
        const customer = this.customers.find(c => c.id === idKhachHang);
        if (!customer) return;

        Swal.fire({
            title: 'Xác nhận khách hàng',
            html: `
                <div class="text-start mt-3 px-3 pb-2" style="font-family: 'Inter', sans-serif;">
                    <div class="d-flex align-items-center mb-4 pb-4" style="border-bottom: 1px solid #f1f5f9;">
                        <div class="me-4 d-flex align-items-center justify-content-center text-primary fw-bold bg-primary-subtle" 
                             style="width: 60px; height: 60px; border-radius: 50%; font-size: 1.5rem;">
                            ${customer.hoTen ? customer.hoTen.charAt(0).toUpperCase() : 'K'}
                        </div>
                        <div>
                            <div class="fw-bold text-dark fs-4">${customer.hoTen || 'Khách lẻ'}</div>
                        </div>
                    </div>
                    
                    <div class="d-flex flex-column gap-3 px-2">
                        <div class="d-flex align-items-center p-3 rounded-4" style="border: 1px solid #e2e8f0; background-color: #f8fafc;">
                            <div class="text-muted me-3 text-center" style="width: 28px;"><i class="fa-solid fa-phone fs-5"></i></div>
                            <div>
                                <div class="text-muted mb-1" style="font-size: 0.9rem;">Số điện thoại</div>
                                <div class="text-dark fw-medium fs-6">${customer.soDienThoai || '---'}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center p-3 rounded-4" style="border: 1px solid #e2e8f0; background-color: #f8fafc;">
                            <div class="text-muted me-3 text-center" style="width: 28px;"><i class="fa-solid fa-envelope fs-5"></i></div>
                            <div>
                                <div class="text-muted mb-1" style="font-size: 0.9rem;">Email</div>
                                <div class="text-dark fw-medium fs-6">${customer.email || '---'}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center p-3 rounded-4" style="border: 1px solid #e2e8f0; background-color: #f8fafc;">
                            <div class="text-muted me-3 text-center" style="width: 28px;"><i class="fa-solid fa-location-dot fs-5"></i></div>
                            <div>
                                <div class="text-muted mb-1" style="font-size: 0.9rem;">Địa chỉ</div>
                                <div class="text-dark fw-medium fs-6" style="line-height: 1.4;">${customer.diaChiGiao || customer.diaChi || '---'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            showConfirmButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 shadow border-0',
                title: 'fs-3 fw-bold pt-3 pb-1 text-dark',
                confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm',
                cancelButton: 'btn btn-light rounded-pill px-5 py-2 mx-3 fw-bold text-secondary border shadow-sm'
            },
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy bỏ'
        }).then((result) => {
            if (result.isConfirmed) {
                this.selectCustomer(idKhachHang);
            }
        });
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
                    <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="posApp.confirmSelectCustomer(${c.id})">Chọn</button>
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

    // --- 2. Order Details & Cart ---
    loadOrderDetails: async function(orderId) {
        try {
            const res = await fetch(`/api/pos/hoa-don/${orderId}/chi-tiet`);
            if(res.ok) {
                const data = await res.json();
                const orderIndex = this.orders.findIndex(o => o.id === orderId);
                if(orderIndex !== -1) {
                    this.orders[orderIndex] = { 
                        ...this.orders[orderIndex], 
                        ...data,
                        phieuGiamGia: data.phieuGiamGia || null
                    };
                    this.renderCart(this.orders[orderIndex].cart);
                    this.updateSummary(this.orders[orderIndex]);
                    this.renderOrderTabs();
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
            let priceWarning = '';
            if (item.giaHienTai !== undefined && item.giaHienTai !== null && item.giaHienTai !== item.donGia) {
                const isTang = item.giaHienTai > item.donGia;
                const text = isTang ? 'Giá hiện tại đã tăng' : 'Giá hiện tại đã giảm';
                priceWarning = `<div class="mt-1 px-2 py-1 rounded text-white" style="background-color: #3b82f6; display: inline-block; font-size: 0.75rem;">
                    <i class="fa-solid fa-circle-exclamation me-1"></i>${text}:<br>${this.formatCurrency(item.donGia)} <i class="fa-solid fa-arrow-right mx-1"></i> ${this.formatCurrency(item.giaHienTai)}
                </div>`;
            }

            const tr = `
                <tr style="font-size: 0.95rem; vertical-align: middle;">
                    <td class="text-muted ps-4 py-2">${index + 1}</td>
                    <td class="text-muted py-2">${item.maSanPham || 'N/A'}</td>
                    <td class="text-start py-2">
                        <div class="d-flex align-items-center">
                            <img src="${item.hinhAnh || 'https://via.placeholder.com/32'}" class="product-img me-2 shadow-sm" onerror="this.src='https://via.placeholder.com/32'" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
                            <div class="d-flex flex-column">
                                <span class="fw-semibold text-dark">${item.tenSanPham}</span>
                                ${priceWarning}
                            </div>
                        </div>
                    </td>
                    <td class="text-muted py-2">${item.mauSac}</td>
                    <td class="text-muted py-2">${item.size}</td>
                    <td class="py-2">
                        <div class="d-flex justify-content-center align-items-center gap-2">
                            <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px;" onclick="posApp.updateCartItemQty(${item.id}, ${item.soLuong - 1})"><i class="fa-solid fa-minus" style="font-size: 10px;"></i></button>
                            <span class="qty-text fw-bold text-dark border rounded d-flex align-items-center justify-content-center" title="Nhấn để sửa" onclick="posApp.promptUpdateQty(${item.id}, ${item.soLuong})" style="cursor: pointer; min-width: 40px; height: 28px; background-color: #fff;">${item.soLuong}</span>
                            <button class="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center text-muted" style="width: 28px; height: 28px;" onclick="posApp.updateCartItemQty(${item.id}, ${item.soLuong + 1})"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                        </div>
                    </td>
                    <td class="py-2 text-center">
                        ${(item.giaBanGoc && item.giaBanGoc > item.donGia && item.phanTramGiam > 0) ? 
                            `<span class="badge bg-danger px-2 py-1 shadow-sm" style="font-size: 0.85rem;">-${item.phanTramGiam}%</span>` 
                            : `<span class="text-muted">-</span>`
                        }
                    </td>
                    <td class="py-2 text-end">
                        ${(item.giaBanGoc && item.giaBanGoc > item.donGia && item.phanTramGiam > 0) ? 
                            `<div class="d-flex flex-column align-items-end justify-content-center">
                                <span class="text-muted text-decoration-line-through" style="font-size: 0.8rem;">${this.formatCurrency(item.giaBanGoc * item.soLuong)}</span>
                                <span class="fw-bold text-danger" style="font-size: 0.95rem;">${this.formatCurrency(item.donGia * item.soLuong)}</span>
                            </div>` 
                            : `<span class="fw-bold text-dark" style="font-size: 0.95rem;">${this.formatCurrency(item.donGia * item.soLuong)}</span>`
                        }
                    </td>
                    <td class="pe-4 py-2">
                        <button class="btn btn-sm btn-link text-muted p-0 border-0" onclick="posApp.removeCartItem(${item.id})" title="Xóa">
                            <i class="fa-regular fa-trash-can fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', tr);
        });
    },

    promptUpdateQty: async function(idChiTiet, currentQty) {
        const { value: quantity } = await Swal.fire({
            title: 'Sửa số lượng',
            input: 'number',
            inputLabel: 'Số lượng mới',
            inputValue: currentQty,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || value <= 0) {
                    return 'Số lượng phải lớn hơn 0!'
                }
            }
        });

        if (quantity) {
            this.updateCartItemQty(idChiTiet, quantity);
        }
    },

    updateCartItemQty: async function(idChiTiet, newQtyStr) {
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
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;
                this.loadOrderDetails(this.currentOrderId);
            } else {
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch(e) { console.error(e); }
    },

    removeCartItem: async function(idChiTiet) {
        const result = await Swal.fire({
            title: 'Xóa sản phẩm?',
            text: "Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?",
            icon: 'warning',
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 shadow border-0',
                title: 'fs-4 fw-bold pt-3 pb-1 text-dark',
                confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm',
                cancelButton: 'btn btn-light rounded-pill px-5 py-2 mx-3 fw-bold text-secondary border shadow-sm'
            },
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy bỏ'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/pos/chi-tiet/${idChiTiet}`, { method: 'DELETE' });
                if(res.ok) {
                    this.manualVoucherFlags = this.manualVoucherFlags || {};
                    this.manualVoucherFlags[this.currentOrderId] = false;
                    this.loadOrderDetails(this.currentOrderId);
                }
            } catch(e) { console.error(e); }
        }
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
                
                // Sắp xếp sản phẩm mới nhất lên đầu (theo id giảm dần)
                this.products.sort((a, b) => b.id - a.id);
                
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

    resetProductFilters: function() {
        document.getElementById('modalProductSearch').value = '';
        document.getElementById('modalBrandFilter').value = '';
        document.getElementById('modalCategoryFilter').value = '';
        this.productCurrentPage = 1;
        this.filterProducts();
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
            const tr = `
                <tr>
                    <td class="text-muted fw-bold">${startIndex + index + 1}</td>
                    <td>${p.ma || 'N/A'}</td>
                    <td class="text-start fw-semibold">
                        <div class="d-flex align-items-center">
                            <img src="${p.hinhAnh || 'https://via.placeholder.com/32'}" class="product-img me-2" onerror="this.src='https://via.placeholder.com/32'" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
                            <span>${p.tenSanPham}</span>
                        </div>
                    </td>
                    <td>${p.mauSac}</td>
                    <td>${p.size || ''}</td>
                    <td>${p.soLuongTon}</td>
                    <td class="text-center">
                        ${(p.giaBanGoc && p.giaBanGoc > p.giaBan) ? 
                            `<div class="d-flex flex-column align-items-center justify-content-center">
                                <span class="text-muted text-decoration-line-through mb-1" style="font-size: 0.8rem;">${this.formatCurrency(p.giaBanGoc)}</span>
                                <span class="fw-bold text-danger">${this.formatCurrency(p.giaBan)}</span>
                            </div>` 
                            : `<span class="fw-bold text-dark">${this.formatCurrency(p.giaBan)}</span>`
                        }
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="posApp.confirmAddToCart(${p.id})" ${p.soLuongTon <= 0 ? 'disabled' : ''}>
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

    changeModalQty: function(delta, maxQty) {
        const qtyEl = document.getElementById('modalAddQty');
        const warningEl = document.getElementById('qtyWarning');
        if(!qtyEl) return;
        
        if (warningEl) warningEl.style.display = 'none';

        let current = parseInt(qtyEl.innerText) || 1;
        let next = current + delta;
        
        if (next < 1) next = 1;
        if (next > maxQty) {
            next = maxQty;
            if (warningEl) {
                warningEl.style.display = 'block';
                setTimeout(() => { if(warningEl) warningEl.style.display = 'none'; }, 5000);
            }
        }
        qtyEl.innerText = next;
    },

    confirmAddToCart: function(idSanPhamChiTiet) {
        const product = this.products.find(p => p.id === idSanPhamChiTiet);
        if (!product) return;

        Swal.fire({
            title: 'Thêm vào giỏ hàng',
            html: `
                <div class="row px-4 pt-3 pb-2" style="font-family: 'Inter', sans-serif;">
                    <div class="col-5">
                        <div class="border rounded-4 d-flex align-items-center justify-content-center bg-white shadow-sm" style="min-height: 350px; padding: 10px;">
                            <img src="${product.hinhAnh || 'https://via.placeholder.com/400'}" 
                                 onerror="this.src='https://via.placeholder.com/400'"
                                 class="img-fluid rounded-3" style="max-height: 330px; object-fit: contain;">
                        </div>
                    </div>
                    
                    <div class="col-7 text-start d-flex flex-column justify-content-between ps-4">
                        <div>
                            <div class="text-center mb-3 pb-3 border-bottom">
                                <div class="fw-bold text-primary mb-2" style="font-size: 1.6rem;">${product.tenSanPham || 'Sản phẩm'}</div>
                                <span class="badge text-white fw-medium px-3 py-1 rounded-pill" style="font-size: 0.95rem; background-color: #6c757d; letter-spacing: 0.5px;">${product.ma || 'N/A'}</span>
                            </div>
                            
                            <div class="mb-4 px-2" style="font-size: 0.95rem;">
                                <div class="d-flex justify-content-between border-bottom py-2 mb-1">
                                    <span class="text-muted">Màu sắc:</span>
                                    <span class="text-dark">${product.mauSac || '---'}</span>
                                </div>
                                <div class="d-flex justify-content-between border-bottom py-2 mb-1">
                                    <span class="text-muted">Kích cỡ:</span>
                                    <span class="text-dark">${product.size || '---'}</span>
                                </div>
                                <div class="d-flex justify-content-between border-bottom py-2 mb-1">
                                    <span class="text-muted">Tồn kho:</span>
                                    <span class="fw-bold text-success">${product.soLuongTon}</span>
                                </div>
                                <div class="d-flex justify-content-between py-2 mt-1">
                                    <span class="text-muted">Đơn giá:</span>
                                    <span class="fw-bold text-danger fs-5">${this.formatCurrency(product.giaBan)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex flex-column align-items-center rounded-4 p-3 mx-2 mt-2" style="border: 1px solid #dee2e6;">
                            <div class="d-flex align-items-center justify-content-between w-100 px-2">
                                <span class="fw-bold text-dark" style="font-size: 0.95rem;">Số lượng:</span>
                                <div class="d-flex align-items-center justify-content-between rounded-pill border px-2 py-1" style="width: 120px; border-color: #dee2e6;">
                                    <i class="fa-solid fa-minus text-muted" style="cursor: pointer; font-size: 0.9rem; padding: 4px 8px;" onclick="posApp.changeModalQty(-1, ${product.soLuongTon})"></i>
                                    <span id="modalAddQty" class="fw-bold text-dark" style="font-size: 1rem;">1</span>
                                    <i class="fa-solid fa-plus text-muted" style="cursor: pointer; font-size: 0.9rem; padding: 4px 8px;" onclick="posApp.changeModalQty(1, ${product.soLuongTon})"></i>
                                </div>
                            </div>
                            <div id="qtyWarning" class="text-danger mt-3 fw-bold w-100 text-center" style="font-size: 0.85rem; display: none;">
                                <i class="fa-solid fa-circle-exclamation me-1"></i> Số lượng trong kho không đủ
                            </div>
                        </div>
                    </div>
                </div>
            `,
            width: '800px',
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 shadow border-0',
                title: 'fs-3 fw-bold pt-4 text-dark',
                actions: 'pb-4 mt-3',
                confirmButton: 'btn btn-primary rounded-pill px-4 py-2 mx-2 fw-bold shadow-sm',
                cancelButton: 'btn btn-danger rounded-pill px-4 py-2 mx-2 fw-bold text-white shadow-sm'
            },
            confirmButtonText: '<i class="fa-solid fa-cart-plus me-2"></i>Xác nhận',
            cancelButtonText: '<i class="fa-solid fa-xmark me-2"></i>Hủy',
            preConfirm: () => {
                const qtyEl = document.getElementById('modalAddQty');
                return qtyEl ? parseInt(qtyEl.innerText) : 1;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const qty = result.value || 1;
                this.addToCart(idSanPhamChiTiet, qty);
            }
        });
    },

    addToCart: async function(idSanPhamChiTiet, qty = 1) {
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/them-san-pham`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idSanPhamChiTiet: idSanPhamChiTiet, soLuong: qty })
            });

            if(res.ok) {
                this.productModal.hide();
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Thêm thành công' });
                this.manualVoucherFlags = this.manualVoucherFlags || {};
                this.manualVoucherFlags[this.currentOrderId] = false;
                this.loadOrderDetails(this.currentOrderId);
            } else {
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch (error) { console.error(error); }
    },

    // --- 4. Summary & Payment ---
    updateSummary: function(order) {
        if(!order) {
            document.getElementById('summaryTotalAmount').innerText = '0 đ';
            document.getElementById('summaryDiscount').innerText = '-0 đ';
            const discountRow = document.getElementById('discountRow');
            if (discountRow) discountRow.style.setProperty('display', 'none', 'important');
            document.getElementById('summaryFinalAmount').innerText = '0 đ';
            document.getElementById('btnCheckout').disabled = true;
            this.setVoucherEmpty();
            document.querySelector('.suggest-block').style.display = 'none';
            const shippingCard = document.getElementById('shippingSectionCard');
            if(shippingCard) shippingCard.style.setProperty('display', 'none', 'important');
            return;
        }

        // Tự động áp dụng voucher tốt nhất
        if (this.autoApplyBestVoucher(order)) {
            return; // Dừng updateSummary vì sẽ gọi lại qua loadOrderDetails
        }

        document.getElementById('btnCheckout').disabled = false;
        
        // Handle Customer Info & Auto-fill Shipping
        const giaoHangToggleContainer = document.getElementById('giaoHangSwitch').parentElement;
        const shippingSectionCard = document.getElementById('shippingSectionCard');

        if(order.khachHang) {
            document.getElementById('searchCustomerInput').parentElement.style.setProperty('display', 'none', 'important');
            document.getElementById('selectedCustomerInfo').style.setProperty('display', 'flex', 'important');
            document.getElementById('customerName').innerText = order.khachHang.hoTen || 'Khách lẻ';
            document.getElementById('customerPhone').innerText = order.khachHang.soDienThoai || '';
            
            giaoHangToggleContainer.style.setProperty('display', 'flex', 'important');
            if (shippingSectionCard) shippingSectionCard.style.setProperty('display', 'block', 'important');
            
            // Auto-fill shipping info from local customer list if empty
            const tenInput = document.getElementById('tenNguoiNhan');
            const sdtInput = document.getElementById('sdtNhan');
            const diaChiInput = document.getElementById('diaChiGiao');
            
            // Find customer details from this.customers to get address/sdt if it's available
            const localCust = this.customers.find(c => c.id === order.khachHang.id);
            if (localCust) {
                let autoToggled = false;
                if (!tenInput.value.trim() && localCust.hoTen) {
                    tenInput.value = localCust.hoTen;
                    tenInput.setAttribute('readonly', 'true');
                    tenInput.style.backgroundColor = '#f8fafc';
                    autoToggled = true;
                }
                if (!sdtInput.value.trim() && localCust.sdtNhan) {
                    sdtInput.value = localCust.sdtNhan;
                    sdtInput.setAttribute('readonly', 'true');
                    sdtInput.style.backgroundColor = '#f8fafc';
                    autoToggled = true;
                }
                if (!diaChiInput.value.trim() && localCust.diaChiGiao) {
                    diaChiInput.value = localCust.diaChiGiao;
                    diaChiInput.setAttribute('readonly', 'true');
                    diaChiInput.style.backgroundColor = '#f8fafc';
                    autoToggled = true;
                }
                
                // If we populated address, auto-turn on shipping toggle
                if (autoToggled && !document.getElementById('giaoHangSwitch').checked) {
                    document.getElementById('giaoHangSwitch').checked = true;
                    document.getElementById('shippingFieldsGroup').style.display = 'block';
                }
            }
        } else {
            document.getElementById('searchCustomerInput').parentElement.style.setProperty('display', 'flex', 'important');
            document.getElementById('selectedCustomerInfo').style.setProperty('display', 'none', 'important');
            
            giaoHangToggleContainer.style.setProperty('display', 'flex', 'important');
            if (shippingSectionCard) shippingSectionCard.style.setProperty('display', 'block', 'important');
            
            // Clear shipping info if no customer is selected
            const tenInput = document.getElementById('tenNguoiNhan');
            const sdtInput = document.getElementById('sdtNhan');
            const diaChiInput = document.getElementById('diaChiGiao');
            
            tenInput.value = '';
            tenInput.removeAttribute('readonly');
            tenInput.style.backgroundColor = '#ffffff';
            
            sdtInput.value = '';
            sdtInput.removeAttribute('readonly');
            sdtInput.style.backgroundColor = '#ffffff';
            
            diaChiInput.value = '';
            diaChiInput.removeAttribute('readonly');
            diaChiInput.style.backgroundColor = '#ffffff';
        }

        // Cập nhật phí ship
        let phiShip = 0;
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        if (isGiaoHang) {
            const diaChiInputVal = (document.getElementById('diaChiGiao').value || '').toLowerCase();
            const normalizedAddr = diaChiInputVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            const isHaNoi = normalizedAddr.includes('ha noi') || diaChiInputVal.includes('hà nội');

            const phiShipInputEl = document.getElementById('phiShip');
            const phiShipCol = phiShipInputEl.parentElement;
            const diaChiCol = document.getElementById('diaChiGiao').parentElement;

            if (isHaNoi) {
                phiShipCol.style.setProperty('display', 'none', 'important');
                diaChiCol.classList.remove('col-md-4');
                diaChiCol.classList.add('col-md-6');
                phiShipInputEl.value = '0';
            } else {
                phiShipCol.style.setProperty('display', 'block', 'important');
                diaChiCol.classList.remove('col-md-6');
                diaChiCol.classList.add('col-md-4');
                // Auto set to 30.000 if empty or zero
                if (!phiShipInputEl.value || phiShipInputEl.value === '0' || phiShipInputEl.value === '') {
                    phiShipInputEl.value = '30.000';
                }
            }

            const phiShipInput = phiShipInputEl.value.replace(/[^0-9]/g, '');
            phiShip = parseInt(phiShipInput) || 0;
        }

        let tongThanhToan = (order.tongTienHang || 0) - (order.tienGiamGia || 0) + phiShip;
        if (tongThanhToan < 0) tongThanhToan = 0;
        order.tongTienThanhToan = tongThanhToan; // Update local order obj

        document.getElementById('summaryTotalAmount').innerText = this.formatCurrency(order.tongTienHang);
        document.getElementById('summaryDiscount').innerText = "-" + this.formatCurrency(order.tienGiamGia);
        const discountRow = document.getElementById('discountRow');
        if (discountRow) {
            if (order.tienGiamGia && order.tienGiamGia > 0) {
                discountRow.style.setProperty('display', 'flex', 'important');
            } else {
                discountRow.style.setProperty('display', 'none', 'important');
            }
        }
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
    },

    autoApplyBestVoucher: function(order) {
        if(!this.vouchers || this.vouchers.length === 0 || order.tongTienHang === 0) return false;
        
        // Bỏ qua nếu user vừa thao tác thủ công (flag sẽ được reset khi giỏ hàng thay đổi)
        if (this.manualVoucherFlags && this.manualVoucherFlags[order.id]) return false;

        let eligibleVouchers = this.vouchers.filter(v => v.donToiThieu <= order.tongTienHang);
        if (eligibleVouchers.length === 0) return false;

        let bestVoucher = null;
        let maxDiscount = -1;

        eligibleVouchers.forEach(v => {
            let discount = 0;
            if (v.loaiGiamGia === '1' || v.loaiGiamGia === '%') {
                discount = order.tongTienHang * v.giaTriGiam / 100;
                if (v.giamToiDa && discount > v.giamToiDa) discount = v.giamToiDa;
            } else {
                discount = v.giaTriGiam;
            }
            if (discount > maxDiscount) {
                maxDiscount = discount;
                bestVoucher = v;
            }
        });

        if (bestVoucher) {
            if (!order.phieuGiamGia || order.phieuGiamGia.id !== bestVoucher.id) {
                fetch(`/api/pos/hoa-don/${order.id}/phieu-giam-gia`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idPhieuGiamGia: bestVoucher.id })
                }).then(res => {
                    if(res.ok) this.loadOrderDetails(order.id);
                });
                return true; 
            }
        }
        return false;
    },

    renderSuggestion: function(order) {
        const suggestBlock = document.getElementById('suggestBlock');
        const tongTienHang = order.tongTienHang || 0;
        const tienGiamGiaHienTai = order.tienGiamGia || 0;

        if(!this.vouchers || this.vouchers.length === 0 || tongTienHang === 0) {
            suggestBlock.style.display = 'none';
            return;
        }

        // Tìm voucher khách chưa đủ điều kiện (cần mua thêm)
        let suggestions = this.vouchers.filter(v => v.donToiThieu > tongTienHang);
        
        if(suggestions.length === 0) {
            suggestBlock.style.display = 'none';
            return;
        }

        // Lọc các voucher có dự kiến mức giảm CAO HƠN mức giảm hiện tại
        let validSuggestions = [];
        suggestions.forEach(v => {
            let estimateDiscount = 0;
            // Nếu đạt đơn tối thiểu thì tính tiền giảm dựa trên đơn tối thiểu
            let assumedTotal = v.donToiThieu; 
            if (v.loaiGiamGia === '1' || v.loaiGiamGia === '%') {
                 estimateDiscount = assumedTotal * v.giaTriGiam / 100;
                 if (v.giamToiDa && estimateDiscount > v.giamToiDa) estimateDiscount = v.giamToiDa;
            } else {
                 estimateDiscount = v.giaTriGiam;
            }
            
            if (estimateDiscount > tienGiamGiaHienTai) {
                validSuggestions.push({
                    voucher: v,
                    estimateDiscount: estimateDiscount,
                    diff: v.donToiThieu - tongTienHang
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
        const discountText = suggestion.loaiGiamGia === '1' || suggestion.loaiGiamGia === '%' ? suggestion.giaTriGiam + '%' : this.formatCurrency(suggestion.giaTriGiam);

        suggestBlock.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold small" style="color: #047857;">Gợi ý mua thêm</span>
                <span class="badge rounded-pill px-2 py-1" style="font-size: 0.7rem; background-color: #fffbeb; border: 1px solid #fcd34d; color: #fbbf24; font-weight: 500;">1 đề xuất</span>
            </div>
            <div class="card border-0 rounded-4 p-3 d-flex flex-row align-items-start" style="background-color: #f8fafc;">
                <span class="badge rounded-pill px-2 py-1 me-3" style="font-size: 0.75rem; background-color: #d1fae5; color: #047857; font-weight: 600;">${discountText}</span>
                <div class="flex-grow-1 w-100">
                    <strong class="fs-6 text-dark d-block mb-2" style="letter-spacing: 0.5px;">${suggestion.maVoucher}</strong>
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
        
        const maxGiam = pgg.giamToiDa ? this.formatCurrency(pgg.giamToiDa) : '';
        const giaTriGiamText = pgg.loaiGiamGia === '1' || pgg.loaiGiamGia === '%' ? pgg.giaTriGiam + '%' : this.formatCurrency(pgg.giaTriGiam);
        
        let pillText = giaTriGiamText;
        if (pgg.loaiGiamGia === '1' || pgg.loaiGiamGia === '%') {
            if (pgg.giamToiDa) pillText += ` (Tối đa ${maxGiam})`;
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
                <strong class="fs-6 text-dark" style="letter-spacing: 0.5px;">${pgg.maVoucher}</strong>
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
        const total = order ? order.tongTienHang : 0;

        if (!this.vouchers || this.vouchers.length === 0) {
            body.innerHTML = '<div class="text-center text-muted">Không có phiếu giảm giá nào khả dụng.</div>';
            return;
        }

        this.vouchers.forEach(v => {
            const isEligible = total >= v.donToiThieu;
            
            let rightSideHtml = '';
            if (isEligible) {
                rightSideHtml = `<button class="btn btn-sm rounded-pill px-4 fw-bold shadow-sm" style="background-color: #047857; color: white; padding-top: 8px; padding-bottom: 8px;" onclick="posApp.applyVoucher(${v.id})">Áp dụng</button>`;
            } else {
                const missingAmount = v.donToiThieu - total;
                rightSideHtml = `
                    <div class="text-end">
                        <span class="badge rounded-pill" style="background-color: #9ca3af; padding: 6px 12px; font-weight: 500;">Chưa đủ điều kiện</span>
                        <div class="mt-2 fw-semibold" style="color: #ef4444; font-size: 13px;">
                            <i class="fa-solid fa-cart-plus me-1"></i> Mua thêm ${this.formatCurrency(missingAmount)}
                        </div>
                    </div>
                `;
            }

            const discountText = v.loaiGiamGia === '1' || v.loaiGiamGia === '%' ? v.giaTriGiam + '%' : this.formatCurrency(v.giaTriGiam);

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
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch(e) { console.error(e); }
    },

    removeVoucher: async function(event) {
        event.stopPropagation();
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/phieu-giam-gia`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPhieuGiamGia: null })
            });
            if(res.ok) {
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
                    document.getElementById('sdtNhan').value = '';
                    document.getElementById('diaChiGiao').value = '';
                    
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
            
            let rawValue = cashInput.value.replace(/[^0-9]/g, '');
            if (!rawValue) {
                cashInput.value = '';
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

            const diff = cash - order.tongTienThanhToan;
            document.getElementById('returnCash').innerText = this.formatCurrency(diff > 0 ? diff : 0);
        }
    },

    toggleGiaoHang: function() {
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        document.getElementById('shippingFieldsGroup').style.display = isGiaoHang ? 'block' : 'none';
        
        const phiShipInput = document.getElementById('phiShip');
        if (isGiaoHang) {
            if (!phiShipInput.value || phiShipInput.value === '0' || phiShipInput.value === '') {
                phiShipInput.value = '30.000';
            }
        } else {
            phiShipInput.value = '';
        }
        
        this.updateSummary(this.getCurrentOrder());
    },

    formatPhiShip: function(input) {
        let rawValue = input.value.replace(/[^0-9]/g, '');
        if (!rawValue) {
            input.value = '';
        } else {
            input.value = parseInt(rawValue).toLocaleString('vi-VN');
        }
        this.updateSummary(this.getCurrentOrder());
    },

    checkout: async function() {
        const order = this.getCurrentOrder();
        if(!order || !order.cart || order.cart.length === 0) return;

        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        let cash = parseFloat(document.getElementById('customerCash').value.replace(/[^0-9]/g, '')) || 0;
        
        if(method === 'CASH' && cash < order.tongTienThanhToan) {
            Swal.fire({
                title: 'Lỗi',
                text: 'Khách đưa không đủ tiền!',
                icon: 'error',
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-4 shadow border-0',
                    title: 'fs-4 fw-bold pt-3 pb-1 text-dark',
                    confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm'
                }
            });
            return;
        }
        
        if(method === 'TRANSFER') {
            cash = order.tongTienThanhToan; // Chuyển khoản coi như đưa đủ tiền
        }

        const note = document.getElementById('orderNote').value;
        let customerInput = document.getElementById('searchCustomerInput').value.trim();
        
        const isGiaoHang = document.getElementById('giaoHangSwitch').checked;
        let phiShip = 0;
        let tenNguoiNhan = null;
        let sdtNhan = null;
        let diaChiGiao = null;
        
        if (isGiaoHang) {
            phiShip = parseInt(document.getElementById('phiShip').value.replace(/[^0-9]/g, '')) || 0;
            tenNguoiNhan = document.getElementById('tenNguoiNhan').value.trim();
            sdtNhan = document.getElementById('sdtNhan').value.trim();
            diaChiGiao = document.getElementById('diaChiGiao').value.trim();
            
            if (!tenNguoiNhan) {
                Swal.fire('Lỗi', 'Vui lòng nhập tên người nhận!', 'error');
                return;
            }
            if (!sdtNhan) {
                Swal.fire('Lỗi', 'Vui lòng nhập số điện thoại người nhận!', 'error');
                return;
            }
            if (!diaChiGiao) {
                Swal.fire({
                    title: 'Lỗi',
                    text: 'Vui lòng nhập địa chỉ giao hàng!',
                    icon: 'error',
                    buttonsStyling: false,
                    customClass: {
                        popup: 'rounded-4 shadow border-0',
                        title: 'fs-4 fw-bold pt-3 pb-1 text-dark',
                        confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm'
                    }
                });
                return;
            }
            
            customerInput = tenNguoiNhan; // Override with shipping name
        }

        const confirmResult = await Swal.fire({
            title: 'Xác nhận thanh toán',
            text: "Bạn có chắc chắn muốn thanh toán hóa đơn này?",
            icon: 'question',
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 shadow border-0',
                title: 'fs-4 fw-bold pt-3 pb-1 text-dark',
                confirmButton: 'btn btn-primary rounded-pill px-5 py-2 mx-3 fw-bold shadow-sm',
                cancelButton: 'btn btn-light rounded-pill px-5 py-2 mx-3 fw-bold text-secondary border shadow-sm'
            },
            confirmButtonText: 'Thanh toán',
            cancelButtonText: 'Hủy bỏ'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const res = await fetch(`/api/pos/hoa-don/${order.id}/thanh-toan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    hinhThucThanhToan: method, 
                    tienKhachDua: cash, 
                    ghiChu: note, 
                    tenKhachHang: customerInput,
                    phiShip: phiShip,
                    sdtNhan: sdtNhan,
                    diaChiGiao: diaChiGiao
                })
            });

            if(res.ok) {
                Swal.fire({ title: 'Thành công!', text: 'Thanh toán thành công.', icon: 'success' });
                
                // Mở chi tiết hóa đơn vừa thanh toán ở tab mới để in/xem
                window.open(`/hoa-don/${order.id}`, '_blank');

                this.orders = this.orders.filter(o => o.id !== order.id);
                this.currentOrderId = null;
                document.getElementById('customerCash').value = '';
                document.getElementById('orderNote').value = '';
                document.getElementById('searchCustomerInput').value = '';
                document.getElementById('giaoHangSwitch').checked = false;
                document.getElementById('tenNguoiNhan').value = '';
                document.getElementById('sdtNhan').value = '';
                document.getElementById('diaChiGiao').value = '';
                document.getElementById('phiShip').value = '';
                this.toggleGiaoHang();
                
                this.renderOrderTabs();
                if(this.orders.length > 0) this.switchOrder(this.orders[0].id);
                else this.showNoOrder();
            } else {
                Swal.fire('Lỗi', await res.text(), 'error');
            }
        } catch (e) { console.error(e); }
    },

    getCurrentOrder: function() {
        return this.orders.find(o => o.id === this.currentOrderId);
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
    },

    onProvinceChange: async function() {
        const provSelect = document.getElementById('modalProvince');
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');
        
        distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        distSelect.disabled = true;
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const provCode = provSelect.value;
        if (provCode) {
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/p/${provCode}?depth=2`);
                if (res.ok) {
                    const data = await res.json();
                    distSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>' + 
                        data.districts.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
                    distSelect.disabled = false;
                }
            } catch(e) { console.error(e); }
        }
        this.updateModalAddress();
        
        // Auto update shipping fee
        const provName = provSelect.value ? provSelect.options[provSelect.selectedIndex].text.toLowerCase() : '';
        const feeInput = document.getElementById('modalPhiShip');
        if (provName && (provName.includes('hà nội') || provName === 'hà nội' || provName === 'thành phố hà nội')) {
            feeInput.value = '0';
        } else if (provName) {
            feeInput.value = '30.000';
        }
    },

    onDistrictChange: async function() {
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');
        
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wardSelect.disabled = true;

        const distCode = distSelect.value;
        if (distCode) {
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/d/${distCode}?depth=2`);
                if (res.ok) {
                    const data = await res.json();
                    wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>' + 
                        data.wards.map(w => `<option value="${w.code}">${w.name}</option>`).join('');
                    wardSelect.disabled = false;
                }
            } catch(e) { console.error(e); }
        }
        this.updateModalAddress();
    },

    onWardChange: function() {
        this.updateModalAddress();
    },

    onDetailAddressChange: function() {
        this.updateModalAddress();
    },

    updateModalAddress: function() {
        const provSelect = document.getElementById('modalProvince');
        const distSelect = document.getElementById('modalDistrict');
        const wardSelect = document.getElementById('modalWard');
        const detailInput = document.getElementById('modalDiaChiChiTiet');
        
        let parts = [];
        if (detailInput.value.trim()) parts.push(detailInput.value.trim());
        if (wardSelect.value) parts.push(wardSelect.options[wardSelect.selectedIndex].text);
        if (distSelect.value) parts.push(distSelect.options[distSelect.selectedIndex].text);
        if (provSelect.value) parts.push(provSelect.options[provSelect.selectedIndex].text);
        
        document.getElementById('modalDiaChiGiao').value = parts.join(', ');
    },

    enableEditShipping: function() {
        document.getElementById('modalTenNguoiNhan').value = document.getElementById('tenNguoiNhan').value;
        document.getElementById('modalSdtNhan').value = document.getElementById('sdtNhan').value;
        
        const currentAddr = document.getElementById('diaChiGiao').value;
        document.getElementById('modalDiaChiChiTiet').value = currentAddr;
        document.getElementById('modalDiaChiGiao').value = currentAddr;
        
        document.getElementById('modalProvince').value = '';
        document.getElementById('modalDistrict').innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        document.getElementById('modalDistrict').disabled = true;
        document.getElementById('modalWard').innerHTML = '<option value="">Chọn Phường/Xã</option>';
        document.getElementById('modalWard').disabled = true;

        document.getElementById('modalPhiShip').value = document.getElementById('phiShip').value;
        if (this.editShippingModal) this.editShippingModal.show();
    },

    saveShippingEdit: function() {
        document.getElementById('tenNguoiNhan').value = document.getElementById('modalTenNguoiNhan').value;
        document.getElementById('sdtNhan').value = document.getElementById('modalSdtNhan').value;
        document.getElementById('diaChiGiao').value = document.getElementById('modalDiaChiGiao').value;
        document.getElementById('phiShip').value = document.getElementById('modalPhiShip').value;
        if (this.editShippingModal) this.editShippingModal.hide();
        this.updateSummary(this.getCurrentOrder());
    }
};

document.addEventListener('DOMContentLoaded', () => { posApp.init(); });
