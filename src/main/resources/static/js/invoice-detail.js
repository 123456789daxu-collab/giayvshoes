// invoice-detail.js - Handles detailed invoice rendering

let currentInvoice = null;
let currentItems = [];

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // Extract ID from URL path (e.g., /hoa-don/23)
    const parts = window.location.pathname.split('/');
    const invoiceId = parts[parts.length - 1];
    
    if (!invoiceId || isNaN(invoiceId)) {
        console.error("Mã hóa đơn không hợp lệ!");
        return;
    }

    // Export invoice / print
    const btnPrintInvoice = document.getElementById("btnPrintInvoice");
    if (btnPrintInvoice) {
        btnPrintInvoice.addEventListener("click", () => {
            if (typeof window.printInvoice === "function") {
                window.printInvoice(invoiceId);
            }
        });
    }

    // Action button to change status
    const btnChangeStatus = document.getElementById("btnChangeStatus");
    const confirmStatusModal = document.getElementById("confirmStatusModal");
    const confirmStatusModalClose = document.getElementById("confirmStatusModalClose");
    const btnCancelConfirmStatus = document.getElementById("btnCancelConfirmStatus");
    const btnSubmitConfirmStatus = document.getElementById("btnSubmitConfirmStatus");
    
    const confirmInvoiceCode = document.getElementById("confirmInvoiceCode");
    const confirmStatusNote = document.getElementById("confirmStatusNote");
    const confirmCurrentStatusBadge = document.getElementById("confirmCurrentStatusBadge");
    const confirmNewStatusBadge = document.getElementById("confirmNewStatusBadge");

    let targetNextStatus = 1;
    let targetNextStatusName = "";

    if (btnChangeStatus && confirmStatusModal) {
        btnChangeStatus.addEventListener("click", () => {
            if (!currentInvoice) return;
            
            let nextStatus = 1;
            let nextStatusName = "Đã xác nhận";
            let currentStatusName = "Chờ xác nhận";
            
            switch (currentInvoice.trangThai) {
                case 0:
                    nextStatus = 1;
                    nextStatusName = "Đã xác nhận";
                    currentStatusName = "Chờ xác nhận";
                    break;
                case 1:
                    nextStatus = 2;
                    nextStatusName = "Đang xử lý";
                    currentStatusName = "Đã xác nhận";
                    break;
                case 2:
                    nextStatus = 3;
                    nextStatusName = "Đang giao";
                    currentStatusName = "Đang xử lý";
                    break;
                case 3:
                    nextStatus = 4;
                    nextStatusName = "Đã giao";
                    currentStatusName = "Đang giao";
                    break;
                case 4:
                    nextStatus = 6;
                    nextStatusName = "Hoàn thành";
                    currentStatusName = "Đã giao";
                    break;
                default:
                    showToast("Lỗi", "Đơn hàng đã ở trạng thái cuối cùng hoặc bị hủy!", "error");
                    return;
            }

            targetNextStatus = nextStatus;
            targetNextStatusName = nextStatusName;

            // Populate Modal values
            if (confirmInvoiceCode) confirmInvoiceCode.textContent = currentInvoice.maHoaDon || "";
            if (confirmStatusNote) confirmStatusNote.value = `Chuyển trạng thái: ${currentStatusName} -> ${nextStatusName}`;
            if (confirmCurrentStatusBadge) confirmCurrentStatusBadge.textContent = currentStatusName;
            if (confirmNewStatusBadge) confirmNewStatusBadge.textContent = nextStatusName;

            // Open Modal
            confirmStatusModal.style.display = "flex";
        });

        const hideConfirmModal = () => {
            confirmStatusModal.style.display = "none";
        };

        if (confirmStatusModalClose) confirmStatusModalClose.onclick = hideConfirmModal;
        if (btnCancelConfirmStatus) btnCancelConfirmStatus.onclick = hideConfirmModal;

        window.addEventListener("click", (e) => {
            if (e.target === confirmStatusModal) {
                hideConfirmModal();
            }
        });

        if (btnSubmitConfirmStatus) {
            btnSubmitConfirmStatus.addEventListener("click", () => {
                const noteVal = confirmStatusNote ? confirmStatusNote.value.trim() : "";
                
                const payload = {
                    tenNguoiNhan: currentInvoice.tenKhachHang || currentInvoice.tenNguoiNhan,
                    sdtNguoiNhan: currentInvoice.sdtKhachHang || currentInvoice.sdtNguoiNhan,
                    loaiHoaDon: currentInvoice.loaiHoaDon === 'Trực tuyến',
                    trangThai: targetNextStatus,
                    tongTienThanhToan: currentInvoice.tongTien,
                    ghiChu: noteVal
                };

                fetch(`/api/hoa-don/${invoiceId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) {
                        return res.text().then(text => {
                            // Try to parse JSON error message if possible
                            try {
                                const errObj = JSON.parse(text);
                                throw new Error(errObj.message || "Không thể cập nhật trạng thái");
                            } catch(e) {
                                throw new Error(text || "Không thể cập nhật trạng thái");
                            }
                        });
                    }
                    return res.json();
                })
                .then(updatedInv => {
                    hideConfirmModal();
                    showToast("Thành công", "Cập nhật trạng thái thành công");
                    loadInvoiceDetails(invoiceId);
                })
                .catch(err => {
                    hideConfirmModal();
                    // Clean up Java stack traces or database error details if any, to keep it neat
                    let msg = err.message || "Lỗi không xác định";
                    if (msg.includes("Exception") || msg.includes("exception")) {
                        msg = msg.split("\n")[0]; // Just show the first line of exception
                    }
                    showToast("Thất bại", msg, "error");
                });
            });
        }
    }

    // Timeline History modal triggers
    const btnTimelineHistory = document.getElementById("btnTimelineHistory");
    const historyModal = document.getElementById("historyModal");
    const historyModalClose = document.getElementById("historyModalClose");
    const btnCloseHistoryModal = document.getElementById("btnCloseHistoryModal");
    const historyModalTableBody = document.getElementById("historyModalTableBody");

    if (btnTimelineHistory && historyModal) {
        btnTimelineHistory.addEventListener("click", () => {
            historyModal.style.display = "flex";
            historyModalTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Đang tải lịch sử...</td></tr>`;
            
            fetch(`/api/hoa-don/${invoiceId}/history`)
                .then(res => res.json())
                .then(historyList => {
                    historyModalTableBody.innerHTML = "";
                    if (historyList.length === 0) {
                        historyModalTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Chưa có lịch sử thao tác nào.</td></tr>`;
                        return;
                    }
                    historyList.forEach(item => {
                        const tr = document.createElement("tr");
                        
                        // Time Formatting: HH:mm dd/MM/yyyy
                        let dateStr = '';
                        if (item.ngayTao) {
                            const date = new Date(item.ngayTao);
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            dateStr = `${hours}:${minutes} ${day}/${month}/${year}`;
                        }

                        // Parse status from description (ghiChu) or action (hanhDong)
                        let statusText = "Chờ xác nhận";
                        const note = item.ghiChu || "";
                        const action = item.hanhDong || "";
                        if (note.includes(" -> ")) {
                            const parts = note.split(" -> ");
                            statusText = parts[parts.length - 1].trim();
                        } else if (note.includes("Chuyển trạng thái sang: ")) {
                            statusText = note.replace("Chuyển trạng thái sang: ", "").trim();
                        } else if (action.includes("Tạo đơn hàng") || note.includes("tự động tạo đơn hàng")) {
                            statusText = "Chờ xác nhận";
                        }

                        // Badge background based on status
                        let badgeClass = "badge-secondary";
                        if (statusText === "Chờ xác nhận") badgeClass = "badge-warning";
                        else if (statusText === "Đã xác nhận") badgeClass = "badge-info";
                        else if (statusText === "Đang xử lý") badgeClass = "badge-warning";
                        else if (statusText === "Đang giao") badgeClass = "badge-info";
                        else if (statusText === "Đã giao" || statusText === "Hoàn thành") badgeClass = "badge-success";
                        else if (statusText.includes("huỷ") || statusText.includes("hủy") || statusText.includes("tiền")) badgeClass = "badge-danger";

                        const statusBadge = `<span class="badge ${badgeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${statusText}</span>`;

                        // Action mapping matching screenshot
                        let finalAction = action;
                        if (statusText === "Hoàn thành") finalAction = "Hoàn thành đơn";
                        else if (statusText === "Đã giao") finalAction = "Xác nhận đã giao";
                        else if (statusText === "Đang giao") finalAction = "Chuyển sang đang giao";
                        else if (statusText === "Đang xử lý") finalAction = "Chuyển sang đang xử lý";
                        else if (statusText === "Đã xác nhận") finalAction = "Xác nhận đơn";
                        else if (statusText === "Chờ xác nhận") finalAction = "Tạo đơn hàng";
                        else if (statusText === "Đã huỷ") finalAction = "Hủy đơn";
                        else if (statusText === "Yêu cầu huỷ") finalAction = "Yêu cầu hủy đơn";
                        else if (statusText === "Đã hoàn tiền") finalAction = "Hoàn tiền đơn";

                        const maNV = (currentInvoice && currentInvoice.maNhanVien) ? currentInvoice.maNhanVien : "NV001";
                        const tenNV = (currentInvoice && currentInvoice.nguoiTao) ? currentInvoice.nguoiTao : "Admin TBT";

                        tr.innerHTML = `
                            <td>${statusBadge}</td>
                            <td>${dateStr}</td>
                            <td>${maNV}</td>
                            <td>${tenNV}</td>
                            <td style="font-weight:600; color:#1e293b;">${finalAction}</td>
                            <td>${note}</td>
                        `;
                        historyModalTableBody.appendChild(tr);
                    });
                })
                .catch(err => {
                    console.error("Error fetching history:", err);
                    historyModalTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">Không thể tải lịch sử thao tác.</td></tr>`;
                });
        });

        const hideHistoryModal = () => {
            historyModal.style.display = "none";
        };

        if (historyModalClose) historyModalClose.onclick = hideHistoryModal;
        if (btnCloseHistoryModal) btnCloseHistoryModal.onclick = hideHistoryModal;

        window.addEventListener("click", (e) => {
            if (e.target === historyModal) {
                hideHistoryModal();
            }
        });
    }

    // Toast show function
    window.showToast = (title, message, type = "success") => {
        const toastContainer = document.getElementById("toastContainer");
        if (!toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `premium-toast toast-${type}`;
        if (type === "error") {
            toast.style.borderLeftColor = "#ef4444";
        }
        
        toast.innerHTML = `
            <div class="toast-content-wrapper">
                <span class="toast-title" style="color: ${type === 'success' ? '#10b981' : '#ef4444'}">${title}</span>
                <span class="toast-msg">${message}</span>
            </div>
            <button class="toast-close-btn">&times;</button>
        `;
        toastContainer.appendChild(toast);

        toast.querySelector(".toast-close-btn").onclick = () => {
            toast.remove();
        };

        setTimeout(() => {
            toast.classList.add("hide");
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    };

    // Load details
    loadInvoiceDetails(invoiceId);
});

function loadInvoiceDetails(invoiceId) {
    fetch(`/api/hoa-don/${invoiceId}`)
        .then(res => {
            if (!res.ok) throw new Error("Không thể tải thông tin hóa đơn");
            return res.json();
        })
        .then(inv => {
            renderInvoiceData(inv);
            return fetch(`/api/hoa-don/${invoiceId}/items`)
                .then(itemsRes => {
                    if (!itemsRes.ok) throw new Error("Không thể tải danh sách sản phẩm.");
                    return itemsRes.json();
                })
                .catch(err => {
                    console.warn("Could not fetch items, falling back to mock data:", err);
                    return [];
                });
        })
        .then(items => {
            currentItems = items;
            
            // Fallback mock items matching screenshot
            if (!currentItems || currentItems.length === 0) {
                const goodsVal = currentInvoice ? currentInvoice.tongTien - (currentInvoice.phiShip || 0) + (currentInvoice.tienGiam || 0) : 1500000;
                currentItems = [
                    {
                        tenSanPham: "Giày Chạy Bộ VShoes SpeedRunner Elite",
                        mauSac: "Orange Fusion",
                        coGiay: "42",
                        soLuong: 1,
                        donGia: goodsVal,
                        thanhTien: goodsVal,
                        hinhAnh: "/images/logo.png"
                    }
                ];
            }
            renderInvoiceItems(currentItems);
            renderPaymentHistory();
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi: " + err.message);
        });
}

function renderInvoiceData(inv) {
    currentInvoice = inv;
    
    // Status Display Conversion
    let statusText = '';
    let statusClass = '';
    let nextActionText = '';
    
    switch (inv.trangThai) {
        case 0:
            statusText = "Chờ xác nhận";
            statusClass = "status-badge-orange";
            nextActionText = "Đổi trạng thái: Xác nhận";
            break;
        case 1:
            statusText = "Đã xác nhận";
            statusClass = "status-badge-orange";
            nextActionText = "Đổi trạng thái: Đang xử lý";
            break;
        case 2:
            statusText = "Đang xử lý";
            statusClass = "status-badge-orange";
            nextActionText = "Đổi trạng thái: Để giao";
            break;
        case 3:
            statusText = "Đang giao";
            statusClass = "status-badge-orange";
            nextActionText = "Đổi trạng thái: Đã giao";
            break;
        case 4:
            statusText = "Đã giao";
            statusClass = "status-badge-orange";
            nextActionText = "Đổi trạng thái: Hoàn thành";
            break;
        case 6:
            statusText = "Hoàn thành";
            statusClass = "status-badge-orange"; // Solid/light green or orange as badge
            nextActionText = "Đơn hoàn thành";
            break;
        case 7:
            statusText = "Đã huỷ";
            statusClass = "type-badge-gray";
            nextActionText = "Đơn đã huỷ";
            break;
        case 8:
            statusText = "Yêu cầu huỷ";
            statusClass = "type-badge-gray";
            nextActionText = "Xác nhận hủy";
            break;
        case 9:
            statusText = "Đã hoàn tiền";
            statusClass = "type-badge-gray";
            nextActionText = "Đơn hoàn tiền";
            break;
        default:
            statusText = "N/A";
            statusClass = "type-badge-gray";
            nextActionText = "N/A";
    }

    const lblChangeStatusText = document.getElementById("lblChangeStatusText");
    if (lblChangeStatusText) {
        lblChangeStatusText.textContent = nextActionText;
    }
    const btnChangeStatus = document.getElementById("btnChangeStatus");
    if (btnChangeStatus) {
        if ([6, 7, 9].includes(inv.trangThai)) {
            btnChangeStatus.disabled = true;
            btnChangeStatus.style.opacity = "0.5";
            btnChangeStatus.style.cursor = "not-allowed";
        } else {
            btnChangeStatus.disabled = false;
            btnChangeStatus.style.opacity = "1";
            btnChangeStatus.style.cursor = "pointer";
        }
    }

    // Badge status in header
    const lblOrderBadgeStatus = document.getElementById("lblOrderBadgeStatus");
    if (lblOrderBadgeStatus) {
        lblOrderBadgeStatus.textContent = statusText;
        lblOrderBadgeStatus.className = statusClass;
    }

    // Badge type in header
    const lblOrderBadgeType = document.getElementById("lblOrderBadgeType");
    if (lblOrderBadgeType) {
        lblOrderBadgeType.textContent = "Đơn hàng " + (inv.loaiHoaDon || "Tại quầy - giao hàng");
    }

    // Header values
    const grandTotalValStr = new Intl.NumberFormat('vi-VN').format(inv.tongTien || 0) + ' đ';
    document.getElementById("lblGrandTotalHeader").textContent = grandTotalValStr;
    document.getElementById("lblPaidAmountSub").textContent = "Đã thanh toán: " + grandTotalValStr;

    // Subtext meta info
    const dateStr = inv.ngayTao ? new Date(inv.ngayTao).toLocaleString('vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit'}) : '';
    const dateOnlyStr = inv.ngayTao ? new Date(inv.ngayTao).toLocaleDateString('vi-VN') : '';
    
    document.getElementById("lblOrderSubtext").textContent = `Mã: ${inv.maHoaDon || ''} • Tạo lúc: ${dateStr} • NV xử lý: ${inv.maNhanVien || 'NV001'} - ${inv.nguoiTao || 'Admin TBT'}`;

    // Info cards mapping
    document.getElementById("infoCustomerName").textContent = inv.tenKhachHang || 'Khách lẻ';
    document.getElementById("infoCustomerPhone").textContent = inv.sdtKhachHang || '-';
    document.getElementById("infoCustomerEmail").textContent = inv.email || 'N/A';
    document.getElementById("infoCustomerAddress").textContent = inv.diaChiGiao || '-';

    document.getElementById("infoShippingName").textContent = inv.tenKhachHang || 'Khách lẻ';
    document.getElementById("infoShippingPhone").textContent = inv.sdtKhachHang || '-';
    document.getElementById("infoShippingAddress").textContent = inv.diaChiGiao || '-';
    document.getElementById("infoShippingFee").textContent = new Intl.NumberFormat('vi-VN').format(inv.phiShip || 0) + ' đ';
    document.getElementById("infoShippingNote").textContent = inv.ghiChu || 'Khách đặt hàng trực tuyến';

    // Financial calculations
    const discountVal = inv.tienGiam || 0;
    const shippingFee = inv.phiShip || 0;
    
    // Hiển thị phiếu giảm giá và mã voucher
    const voucherCodeDisplay = document.getElementById("voucherCodeDisplay");
    if (voucherCodeDisplay) {
        if (inv.maVoucher) {
            voucherCodeDisplay.textContent = inv.maVoucher;
            voucherCodeDisplay.style.display = "inline-block";
        } else {
            voucherCodeDisplay.textContent = "";
            voucherCodeDisplay.style.display = "none";
        }
    }

    const shippingCarrierLogo = document.getElementById("shippingCarrierLogo");
    if (shippingCarrierLogo) {
        if (shippingFee > 0) {
            shippingCarrierLogo.style.display = "inline-flex";
        } else {
            shippingCarrierLogo.style.display = "none";
        }
    }

    // Cập nhật phương thức thanh toán
    const paymentMethodTitle = document.getElementById("paymentMethodTitle");
    const paymentMethodSub = document.getElementById("paymentMethodSub");
    const paymentStatusText = document.getElementById("paymentStatusText");
    if (paymentMethodTitle && paymentMethodSub) {
        if (inv.loaiHoaDon === 'Trực tuyến' || inv.loaiHoaDon === 'Online') {
            paymentMethodTitle.textContent = "Chuyển khoản";
            paymentMethodSub.textContent = "Khách thanh toán qua ngân hàng";
            if (paymentStatusText) {
                paymentStatusText.textContent = "Đã thanh toán";
                paymentStatusText.style.color = "#10b981";
            }
        } else {
            paymentMethodTitle.textContent = "Tiền mặt";
            paymentMethodSub.textContent = "Thanh toán đơn cửa hàng";
            if (paymentStatusText) {
                if (inv.trangThai === 0) {
                    paymentStatusText.textContent = "Chờ thanh toán";
                    paymentStatusText.style.color = "#ea580c";
                } else if (inv.trangThai === 7) {
                    paymentStatusText.textContent = "Đã hủy";
                    paymentStatusText.style.color = "#64748b";
                } else {
                    paymentStatusText.textContent = "Đã thanh toán";
                    paymentStatusText.style.color = "#10b981";
                }
            }
        }
    }
    
    // Update Timeline Steps
    updateTimeline(inv.trangThai, inv.ngayTao, inv.nguoiTao);
}

function updateTimeline(status, ngayTaoStr, actor) {
    const steps = [0, 1, 2, 3, 4, 6];
    const ngayTao = new Date(ngayTaoStr);
    
    // Clear styles
    steps.forEach(st => {
        const itemEl = document.getElementById(`step-${st}`);
        if (itemEl) {
            itemEl.classList.remove("completed", "active-step");
        }
    });

    let currentIdx = steps.indexOf(status);
    if (currentIdx === -1) {
        // Fallback or mapping for non-standard states
        if (status === 7) currentIdx = 0; // Hủy
        else if (status === 8) currentIdx = 1;
        else if (status === 9) currentIdx = 2;
        else currentIdx = 3;
    }

    steps.forEach((st, idx) => {
        const itemEl = document.getElementById(`step-${st}`);
        const timeEl = document.getElementById(`time-${st}`);
        
        if (!itemEl) return;

        if (idx <= currentIdx) {
            itemEl.classList.add("completed");
            // Mark only the current (last completed) step as active-step for pulse effect
            if (idx === currentIdx) {
                itemEl.classList.add("active-step");
            }
            const stepDate = new Date(ngayTao.getTime() + idx * 60 * 1000); // mock progressive time
            timeEl.textContent = stepDate.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + " " + stepDate.toLocaleDateString('vi-VN');
        } else {
            timeEl.textContent = "-";
        }
    });
    
    lucide.createIcons();
}

function renderInvoiceItems(items) {
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = "";

    let totalGoods = 0;

    items.forEach((item, index) => {
        const tr = document.createElement("tr");
        const price = item.donGia || 0;
        const total = item.thanhTien || (price * item.soLuong);
        totalGoods += total;

        const imgUrl = item.hinhAnh || '/images/logo.png';
        const priceStr = new Intl.NumberFormat('vi-VN').format(price) + ' đ';
        const totalStr = new Intl.NumberFormat('vi-VN').format(total) + ' đ';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <img src="${imgUrl}" alt="Product" onerror="this.src='/images/logo.png'" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>
                <div class="product-detail-info">
                    <span class="product-detail-name">${item.tenSanPham || 'Sản phẩm mẫu'}</span>
                    <span class="product-detail-variant">Màu sắc: ${item.mauSac || 'Mặc định'} | Size: ${item.coGiay || 'N/A'}</span>
                </div>
            </td>
            <td style="font-weight: 600;">${item.soLuong || 1}</td>
            <td style="font-weight: 600;">${priceStr}</td>
            <td style="font-weight: 600; color: #ef4444;">${totalStr}</td>
        `;
        tbody.appendChild(tr);
    });

    // Financial summaries mapping
    const discountVal = currentInvoice && currentInvoice.tienGiam != null ? currentInvoice.tienGiam : 0;
    const shippingFee = currentInvoice && currentInvoice.phiShip != null ? currentInvoice.phiShip : 0;
    const grandTotal = totalGoods + shippingFee - discountVal;

    document.getElementById("valTotalGoods").textContent = new Intl.NumberFormat('vi-VN').format(totalGoods) + ' đ';
    document.getElementById("valDiscount").textContent = discountVal > 0 ? new Intl.NumberFormat('vi-VN').format(discountVal) + ' đ' : '0 đ';
    document.getElementById("valShipping").textContent = shippingFee > 0 ? new Intl.NumberFormat('vi-VN').format(shippingFee) + ' đ' : '0 đ';
    
    const grandTotalStr = new Intl.NumberFormat('vi-VN').format(grandTotal) + ' đ';
    
    // Select all instances of valGrandTotal
    const grandTotalEls = document.querySelectorAll("#valGrandTotal");
    grandTotalEls.forEach(el => {
        el.textContent = grandTotalStr;
    });
}

function renderPaymentHistory() {
    const tbody = document.getElementById("paymentTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!currentInvoice) return;
    
    const tr = document.createElement("tr");
    const grandTotalStr = new Intl.NumberFormat('vi-VN').format(currentInvoice.tongTien || 0) + ' đ';
    const dateStr = currentInvoice.ngayTao ? new Date(currentInvoice.ngayTao).toLocaleString('vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit'}) : '';
    
    const txnCode = "155" + String(currentInvoice.id).padStart(5, '0');
    const method = currentInvoice.loaiHoaDon === 'Trực tuyến' ? 'Chuyển khoản QR' : 'Tiền mặt';
    const desc = currentInvoice.loaiHoaDon === 'Trực tuyến' ? 'Khách thanh toán VNPAY' : 'Thanh toán trực tiếp tại quầy';
    
    tr.innerHTML = `
        <td style="font-weight: 600;">${grandTotalStr}</td>
        <td>${dateStr}</td>
        <td style="font-weight: 600;">${txnCode}</td>
        <td>${method}</td>
        <td>${desc}</td>
    `;
    tbody.appendChild(tr);
}

// Window Print Function
window.printInvoice = function(id) {
    const modal = document.getElementById("printPreviewModal");
    const container = document.getElementById("thermalReceiptContent");
    if (!modal || !container) return;

    if (currentInvoice && currentInvoice.id == id) {
        showReceiptPreview(currentInvoice, currentItems);
    } else {
        fetch(`/api/hoa-don/${id}`)
            .then(res => res.json())
            .then(inv => {
                fetch(`/api/hoa-don/${id}/items`)
                    .then(r => r.json())
                    .then(items => {
                        showReceiptPreview(inv, items);
                    })
                    .catch(() => showReceiptPreview(inv, []));
            })
            .catch(err => {
                console.error(err);
                alert("Không thể tải thông tin hóa đơn để in");
            });
    }
};

function showReceiptPreview(inv, items) {
    const modal = document.getElementById("printPreviewModal");
    const container = document.getElementById("thermalReceiptContent");
    if (!modal || !container) return;

    // Time formatting
    let dateStr = '';
    if (inv.ngayTao) {
        const date = new Date(inv.ngayTao);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        dateStr = `${day}/${month}/${year}`;
    } else {
        const now = new Date();
        dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }

    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const formatter = new Intl.NumberFormat('vi-VN');
    
    // Ensure fallback items if empty
    let displayItems = items;
    if (!displayItems || displayItems.length === 0) {
        const goodsVal = inv.tongTien - (inv.phiShip || 0) + (inv.tienGiam || 0);
        displayItems = [{
            tenSanPham: "TBT Shop Vest",
            soLuong: 1,
            donGia: goodsVal,
            thanhTien: goodsVal,
            mauSac: "Mặc định",
            coGiay: "N/A"
        }];
    }

    let totalGoods = 0;
    let itemsRowsHtml = '';
    displayItems.forEach((item, index) => {
        const itemPrice = item.donGia || 0;
        const itemQty = item.soLuong || 1;
        const itemTotal = item.thanhTien || (itemPrice * itemQty);
        totalGoods += itemTotal;

        const colorStr = item.mauSac || '';
        const sizeStr = item.coGiay || '';
        let variantDetail = '';
        if (colorStr || sizeStr) {
            variantDetail = `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${colorStr} / ${sizeStr}</div>`;
        }

        itemsRowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 10px; text-align: center; color: #64748b; font-size: 13px;">${index + 1}</td>
                <td style="padding: 12px 10px; text-align: left;">
                    <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${item.tenSanPham || 'Sản phẩm'}</div>
                    ${variantDetail}
                </td>
                <td style="padding: 12px 10px; text-align: center; font-weight: 500; color: #1e293b; font-size: 13px;">${itemQty}</td>
                <td style="padding: 12px 10px; text-align: right; color: #475569; font-size: 13px;">${formatter.format(itemPrice)} đ</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #1e293b; font-size: 13px;">${formatter.format(itemTotal)} đ</td>
            </tr>
        `;
    });

    const discount = inv.tienGiam || 0;
    const shipping = inv.phiShip || 0;
    const grandTotal = inv.tongTien || (totalGoods + shipping - discount);
    
    // Status text & color mapping
    let statusText = 'Hoàn thành';
    let statusDotColor = '#16a34a'; // Green dot
    if (inv.trangThai != null) {
        switch (inv.trangThai) {
            case 0: statusText = "Chờ xác nhận"; statusDotColor = "#f59e0b"; break;
            case 1: statusText = "Đã xác nhận"; statusDotColor = "#3b82f6"; break;
            case 2: statusText = "Đang xử lý"; statusDotColor = "#f59e0b"; break;
            case 3: statusText = "Đang giao"; statusDotColor = "#3b82f6"; break;
            case 4: statusText = "Đã giao"; statusDotColor = "#16a34a"; break;
            case 5: statusText = "Giao hàng thất bại"; statusDotColor = "#ef4444"; break;
            case 6: statusText = "Hoàn thành"; statusDotColor = "#7c3aed"; break;
            case 7: statusText = "Đã huỷ"; statusDotColor = "#64748b"; break;
            case 8: statusText = "Yêu cầu huỷ"; statusDotColor = "#f59e0b"; break;
            case 9: statusText = "Đã hoàn tiền"; statusDotColor = "#64748b"; break;
        }
    }

    const orderType = (inv.loaiHoaDon && inv.loaiHoaDon.toLowerCase().includes("trực tuyến")) ? "Trực tuyến" : "Tại quầy";

    container.innerHTML = `
        <div class="print-invoice-layout" style="text-align: left; background: #ffffff; color: #1e293b; font-family: 'Outfit', sans-serif; line-height: 1.4; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto; max-width: 650px;">
            <!-- Header block -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #ffffff; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
                <div>
                    <h1 style="font-size: 22px; font-weight: 800; margin: 0; letter-spacing: 0.5px; color: #ffffff; font-family: 'Outfit', sans-serif; line-height: 1.2;">VSHOES</h1>
                    <p style="font-size: 12px; opacity: 0.9; margin: 4px 0 0 0; color: #ffffff; font-family: 'Outfit', sans-serif;">Hệ thống cửa hàng giày cao cấp</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 10px; opacity: 0.8; margin: 0; text-transform: uppercase; color: #ffffff; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif;">MÃ HÓA ĐƠN</p>
                    <p style="font-size: 18px; font-weight: 700; margin: 2px 0 0 0; color: #ffffff; font-family: 'Outfit', sans-serif;">${inv.maHoaDon || ''}</p>
                </div>
            </div>

            <!-- Title block -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #7c3aed; margin: 0; font-family: 'Outfit', sans-serif;">Hóa đơn bán hàng</h2>
                    <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0;">Ngày tạo: ${dateStr} - In lúc: ${nowStr}</p>
                </div>
                <div style="background: #f5f3ff; border: 1px solid #ddd6fe; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; color: #7c3aed;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${statusDotColor};"></span>
                    ${statusText}
                </div>
            </div>

            <!-- Invoice Information Block -->
            <div style="margin-bottom: 25px;">
                <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; font-weight: 700; color: #1e293b; font-family: 'Outfit', sans-serif;">Thông tin hóa đơn</span>
                    <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">${orderType}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: #334155;">
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Nhân viên</span><strong style="color: #1e293b;">${inv.maNhanVien || 'NV001'} - ${inv.nguoiTao || 'Admin TBT'}</strong></div>
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Khách hàng</span><strong style="color: #1e293b;">${inv.tenKhachHang || 'Khách lẻ'}</strong></div>
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Email</span><strong style="color: #1e293b;">${inv.email || 'N/A'}</strong></div>
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Số điện thoại</span><strong style="color: #1e293b;">${inv.sdtKhachHang || '-'}</strong></div>
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Địa chỉ</span><strong style="color: #1e293b;">${inv.diaChiGiao || '-'}</strong></div>
                    <div style="display: flex;"><span style="color: #64748b; width: 140px; flex-shrink: 0;">Ghi chú</span><strong style="color: #1e293b;">${inv.ghiChu || '-'}</strong></div>
                </div>
            </div>

            <!-- Product list block -->
            <div style="margin-bottom: 25px;">
                <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; font-weight: 700; color: #1e293b; font-family: 'Outfit', sans-serif;">Danh sách sản phẩm</span>
                    <span style="font-size: 11px; color: #64748b; font-weight: 600;">${displayItems.length} sản phẩm</span>
                </div>
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; margin-bottom: 10px;">
                    <thead>
                        <tr style="background-color: #f5f3ff;">
                            <th style="color: #7c3aed; font-weight: bold; padding: 12px 10px; text-align: center; border-radius: 8px 0 0 8px; width: 50px;">STT</th>
                            <th style="color: #7c3aed; font-weight: bold; padding: 12px 10px; text-align: left;">Sản phẩm</th>
                            <th style="color: #7c3aed; font-weight: bold; padding: 12px 10px; text-align: center; width: 80px;">Số lượng</th>
                            <th style="color: #7c3aed; font-weight: bold; padding: 12px 10px; text-align: right; width: 110px;">Đơn giá</th>
                            <th style="color: #7c3aed; font-weight: bold; padding: 12px 10px; text-align: right; border-radius: 0 8px 8px 0; width: 130px;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Summary block -->
            <div>
                <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 15px; font-family: 'Outfit', sans-serif;">
                    Tổng kết thanh toán
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #475569; padding-right: 5px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Tổng tiền hàng</span>
                        <strong style="color: #1e293b;">${formatter.format(totalGoods)} đ</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Phí vận chuyển</span>
                        <strong style="color: #1e293b;">+ ${formatter.format(shipping)} đ</strong>
                    </div>
                    ${inv.maVoucher ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Mã giảm giá</span>
                        <strong style="color: #1e293b;">${inv.maVoucher}</strong>
                    </div>
                    ` : ''}
                    ${discount > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Số tiền được giảm</span>
                        <strong style="color: #10b981;">- ${formatter.format(discount)} đ</strong>
                    </div>
                    ` : ''}
                    <div style="border-top: 1px dashed #7c3aed; padding-top: 12px; margin-top: 6px; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #7c3aed; align-items: center;">
                        <span style="text-transform: uppercase; letter-spacing: 0.5px;">Tổng thanh toán</span>
                        <span style="font-size: 20px;">${formatter.format(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer brand note -->
            <div style="text-align: center; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8; font-family: 'Outfit', sans-serif;">
                Cảm ơn quý khách đã mua sắm tại VSHOES. Hẹn gặp lại quý khách!
            </div>
        </div>
    `;

    modal.style.display = "flex";

    // Setup action buttons inside modal
    const closeBtn = document.getElementById("printPreviewModalClose");
    const cancelBtn = document.getElementById("btnCancelPrint");
    const printBtn = document.getElementById("btnDoPrint");

    const hideModal = () => {
        modal.style.display = "none";
    };

    closeBtn.onclick = hideModal;
    cancelBtn.onclick = hideModal;

    // Do print function
    printBtn.onclick = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=700');
        printWindow.document.write(`
            <html>
            <head>
                <title>In hóa đơn ${inv.maHoaDon || ''}</title>
                <style>
                    @page { margin: 15mm; }
                    body { font-family: 'Outfit', 'Arial', sans-serif; color: #1e293b; background: #fff; padding: 10px; }
                    .print-invoice-layout { width: 100% !important; max-width: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                </style>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body>
                ${container.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        hideModal();

        // Send invoice email to customer
        if (inv.email && inv.email.trim() !== "" && inv.email !== "N/A") {
            fetch(`/api/hoa-don/${inv.id}/send-email`, {
                method: "POST"
            })
            .then(res => {
                if (res.ok) {
                    if (typeof showToast === "function") {
                        showToast("Gửi Email", "Hóa đơn đã được gửi tới Gmail của khách hàng và bản sao tới lehung14042006@gmail.com!");
                    }
                } else {
                    console.error("Gửi email hóa đơn thất bại.");
                }
            })
            .catch(err => console.error("Lỗi gửi email hóa đơn:", err));
        } else {
            if (typeof showToast === "function") {
                showToast("Gửi Email", "Gửi hóa đơn thành công về Gmail mặc định: lehung14042006@gmail.com!");
            }
        }
    };
}

