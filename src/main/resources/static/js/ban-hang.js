// ban-hang.js
const posApp = {
    orders: [], 
    currentOrderId: null,
    products: [],

    init: function() {
        this.fetchOrders();
        this.fetchVouchers();
        
        document.getElementById('btnCreateOrder').addEventListener('click', () => {
            this.createOrder();
        });

        this.productModal = new bootstrap.Modal(document.getElementById('productModal'));
        this.voucherModal = new bootstrap.Modal(document.getElementById('voucherModal'));
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
                    this.switchOrder(this.orders[0].id);
                } else {
                    this.showNoOrder();
                }
            } else {
                this.orders = [];
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
                }
            } catch (error) {
                console.error(error);
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
        
        document.getElementById('orderCount').innerText = `${this.orders.length}/5 hóa đơn`;
        
        this.orders.forEach((order, index) => {
            const isActive = order.id === this.currentOrderId ? 'active' : '';
            const html = `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isActive}" onclick="posApp.switchOrder(${order.id})">
                        ${order.maHoaDon || 'HD Mới'}
                        <i class="fa-solid fa-xmark close-tab" onclick="posApp.closeOrder(${order.id}, event)"></i>
                    </button>
                </li>
            `;
            tabsContainer.insertAdjacentHTML('beforeend', html);
        });
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
            const tr = `
                <tr>
                    <td class="text-muted ps-4">${index + 1}</td>
                    <td class="text-muted">${item.maSanPham || 'N/A'}</td>
                    <td class="text-start">
                        <div class="d-flex align-items-center">
                            <img src="${item.hinhAnh || 'https://via.placeholder.com/32'}" class="product-img me-2" onerror="this.src='https://via.placeholder.com/32'" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
                            <span class="fw-semibold text-dark">${item.tenSanPham}</span>
                        </div>
                    </td>
                    <td class="text-muted">${item.mauSac}</td>
                    <td class="text-muted">${item.size}</td>
                    <td>
                        <span class="qty-text" title="Nhấn để sửa" onclick="posApp.promptUpdateQty(${item.id}, ${item.soLuong})">${item.soLuong}</span>
                    </td>
                    <td class="fw-semibold text-dark">${this.formatCurrency(item.donGia)}</td>
                    <td class="pe-4">
                        <button class="btn-trash" onclick="posApp.removeCartItem(${item.id})">
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
        try {
            const res = await fetch(`/api/pos/chi-tiet/${idChiTiet}`, { method: 'DELETE' });
            if(res.ok) {
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
                this.renderProductModal();
                this.productModal.show();
            }
        } catch (error) { console.error(error); }
    },

    renderProductModal: function(searchTerm = '') {
        const tbody = document.getElementById('modalProductBody');
        tbody.innerHTML = '';
        this.products.forEach(p => {
            if(searchTerm && !p.tenSanPham.toLowerCase().includes(searchTerm.toLowerCase()) && !p.ma.toLowerCase().includes(searchTerm.toLowerCase())) return;
            const tr = `
                <tr>
                    <td>${p.ma || 'N/A'}</td>
                    <td class="text-start fw-semibold">
                        <div class="d-flex align-items-center">
                            <img src="${p.hinhAnh || 'https://via.placeholder.com/32'}" class="product-img me-2" onerror="this.src='https://via.placeholder.com/32'" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">
                            <span>${p.tenSanPham}</span>
                        </div>
                    </td>
                    <td>${p.mauSac}</td>
                    <td><span class="badge ${p.soLuongTon > 0 ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} rounded-pill">${p.soLuongTon}</span></td>
                    <td class="text-primary fw-bold">${this.formatCurrency(p.giaBan)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="posApp.addToCart(${p.id})" ${p.soLuongTon <= 0 ? 'disabled' : ''}>
                            Thêm
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', tr);
        });
    },

    filterProducts: function() {
        const term = document.getElementById('modalProductSearch').value;
        this.renderProductModal(term);
    },

    addToCart: async function(idSanPhamChiTiet) {
        try {
            const res = await fetch(`/api/pos/hoa-don/${this.currentOrderId}/them-san-pham`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idSanPhamChiTiet: idSanPhamChiTiet, soLuong: 1 })
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
            document.getElementById('summaryFinalAmount').innerText = '0 đ';
            document.getElementById('btnCheckout').disabled = true;
            this.setVoucherEmpty();
            document.querySelector('.suggest-block').style.display = 'none';
            return;
        }

        // Tự động áp dụng voucher tốt nhất
        if (this.autoApplyBestVoucher(order)) {
            return; // Dừng updateSummary vì sẽ gọi lại qua loadOrderDetails
        }

        document.getElementById('btnCheckout').disabled = false;
        document.getElementById('summaryTotalAmount').innerText = this.formatCurrency(order.tongTienHang);
        document.getElementById('summaryDiscount').innerText = "-" + this.formatCurrency(order.tienGiamGia);
        document.getElementById('summaryFinalAmount').innerText = this.formatCurrency(order.tongTienThanhToan);
        
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
                <span class="text-success fw-bold small">Gợi ý mua thêm</span>
                <span class="badge rounded-pill text-warning px-2 py-1" style="font-size: 0.7rem; background-color: #fffbeb; border: 1px solid #fde68a;">1 đề xuất</span>
            </div>
            <div class="card border-0 rounded-4 p-3 d-flex flex-row align-items-start" style="background-color: #f8fafc;">
                <span class="badge rounded-pill px-2 py-1 me-3" style="font-size: 0.75rem; background-color: #d1fae5; color: #047857;">${discountText}</span>
                <div class="flex-grow-1 w-100">
                    <div class="fw-bold text-dark mb-2">${suggestion.maVoucher}</div>
                    <div class="d-flex justify-content-between text-muted small mb-1">
                        <span>Cần mua thêm:</span>
                        <strong class="text-dark">${this.formatCurrency(diff)}</strong>
                    </div>
                    <div class="d-flex justify-content-between text-muted small">
                        <span>Sẽ được giảm:</span>
                        <strong class="text-success">${this.formatCurrency(estimateDiscount)}</strong>
                    </div>
                </div>
            </div>
        `;
    },

    setVoucherEmpty: function() {
        const vBlock = document.getElementById('voucherBlock');
        vBlock.className = 'voucher-block rounded-4 p-3 mb-4 bg-light border-0';
        vBlock.innerHTML = `
            <div class="d-flex justify-content-between align-items-center text-muted">
                <span class="fw-semibold small"><i class="fa-solid fa-ticket me-1"></i> Chọn phiếu giảm giá</span>
                <i class="fa-solid fa-chevron-right small"></i>
            </div>
        `;
    },

    setVoucherApplied: function(pgg, tienGiamGia) {
        const vBlock = document.getElementById('voucherBlock');
        vBlock.className = 'voucher-block rounded-4 p-3 mb-4 border-0';
        vBlock.style.backgroundColor = '#ecfdf5'; // light green bg
        const discountText = pgg.loaiGiamGia === '1' || pgg.loaiGiamGia === '%' ? pgg.giaTriGiam + '%' : this.formatCurrency(pgg.giaTriGiam);
        vBlock.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <div class="text-success fw-bold small"><i class="bi bi-check-circle me-1"></i> Đang áp dụng voucher tốt nhất</div>
                <i class="bi bi-x text-success cursor-pointer fs-5 lh-1" onclick="posApp.removeVoucher(event)"></i>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="fw-bold text-dark fs-6 ms-4" style="letter-spacing: 0.5px;">${pgg.maVoucher || 'Voucher'}</span>
                <span class="badge rounded-pill px-2 py-1" style="background-color: #d1fae5; color: #047857;">${discountText}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2 text-muted small ms-4">
                <span>Giá trị giảm:</span>
                <strong class="text-success">-${this.formatCurrency(tienGiamGia)}</strong>
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
            const bgClass = isEligible ? 'bg-white' : 'bg-light opacity-75';
            const textClass = isEligible ? 'text-dark' : 'text-muted';
            const btnHtml = isEligible 
                ? `<button class="btn btn-sm btn-dark rounded-pill px-3 fw-bold" onclick="posApp.applyVoucher(${v.id})">Áp dụng</button>` 
                : `<span class="badge bg-secondary">Chưa đủ điều kiện</span>`;

            const discountText = v.loaiGiamGia === '1' || v.loaiGiamGia === '%' ? v.giaTriGiam + '%' : this.formatCurrency(v.giaTriGiam);

            const html = `
                <div class="card border-0 shadow-sm rounded-4 ${bgClass}">
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
                                <i class="fa-solid fa-ticket fs-5"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 fw-bold ${textClass}">${v.maVoucher} - ${v.tenVoucher}</h6>
                                <p class="mb-0 small text-muted">Giảm: <strong class="text-dark">${discountText}</strong> | Đơn tối thiểu: <strong>${this.formatCurrency(v.donToiThieu)}</strong></p>
                                ${v.giamToiDa ? `<p class="mb-0 small text-muted">Giảm tối đa: <strong>${this.formatCurrency(v.giamToiDa)}</strong></p>` : ''}
                            </div>
                        </div>
                        <div>
                            ${btnHtml}
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

    removeCustomer: function() {
        document.getElementById('searchCustomerInput').parentElement.style.setProperty('display', 'block', 'important');
        document.getElementById('selectedCustomerInfo').style.setProperty('display', 'none', 'important');
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
            
            let cursorPosition = cashInput.selectionStart;
            let originalValue = cashInput.value;
            
            // Đếm số chữ số trước con trỏ
            let digitsBeforeCursor = 0;
            for (let i = 0; i < cursorPosition; i++) {
                if (/[0-9]/.test(originalValue[i])) {
                    digitsBeforeCursor++;
                }
            }

            let rawValue = originalValue.replace(/[^0-9]/g, '');
            if (!rawValue) {
                cashInput.value = '';
                document.getElementById('returnCash').innerText = "0 đ";
                return;
            }
            
            let cash = parseFloat(rawValue);
            let formattedValue = cash.toLocaleString('vi-VN');
            cashInput.value = formattedValue;
            
            // Tìm vị trí con trỏ mới
            let newCursorPosition = 0;
            let digitCount = 0;
            for (let i = 0; i < formattedValue.length; i++) {
                if (digitCount === digitsBeforeCursor) {
                    newCursorPosition = i;
                    break;
                }
                if (/[0-9]/.test(formattedValue[i])) {
                    digitCount++;
                }
            }
            if (digitCount === digitsBeforeCursor) {
                newCursorPosition = formattedValue.length;
            }
            
            cashInput.setSelectionRange(newCursorPosition, newCursorPosition);

            const diff = cash - order.tongTienThanhToan;
            document.getElementById('returnCash').innerText = this.formatCurrency(diff > 0 ? diff : 0);
        }
    },

    checkout: async function() {
        const order = this.getCurrentOrder();
        if(!order || !order.cart || order.cart.length === 0) return;

        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        let cash = parseFloat(document.getElementById('customerCash').value.replace(/[^0-9]/g, '')) || 0;
        
        if(method === 'CASH' && cash < order.tongTienThanhToan) {
            Swal.fire('Lỗi', 'Khách đưa không đủ tiền!', 'error');
            return;
        }
        
        if(method === 'TRANSFER') {
            cash = order.tongTienThanhToan; // Chuyển khoản coi như đưa đủ tiền
        }

        const note = document.getElementById('orderNote').value;
        const customerInput = document.getElementById('searchCustomerInput').value.trim();

        try {
            const res = await fetch(`/api/pos/hoa-don/${order.id}/thanh-toan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hinhThucThanhToan: method, tienKhachDua: cash, ghiChu: note, tenKhachHang: customerInput })
            });

            if(res.ok) {
                Swal.fire({ title: 'Thành công!', text: 'Thanh toán thành công.', icon: 'success' });
                this.orders = this.orders.filter(o => o.id !== order.id);
                this.currentOrderId = null;
                document.getElementById('customerCash').value = '';
                document.getElementById('orderNote').value = '';
                document.getElementById('searchCustomerInput').value = '';
                
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
                    "qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
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
            this.qrScanner.clear().catch(error => {
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

document.addEventListener('DOMContentLoaded', () => { posApp.init(); });
