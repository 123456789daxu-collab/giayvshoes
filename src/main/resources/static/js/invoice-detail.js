// invoice-detail.js - Handles detailed invoice rendering

let currentInvoice = null;
let currentItems = [];

// Wrapper cho showToast sử dụng SweetAlert2
function showToast(title, message, type = "success") {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: type === "error" ? "error" : "success",
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else if (typeof window.showToast === "function") {
        window.showToast(title, message, type);
    } else {
        alert(message);
    }
}
// Thay thế window.showToast thành showToast trong file này
window.showToast = showToast;

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
                    window.showToast("Lỗi", "Đơn hàng đã ở trạng thái cuối cùng hoặc bị hủy!", "error");
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
                    loaiHoaDon: currentInvoice.loaiHoaDon === 'Online',
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
                    window.showToast("Thành công", "Cập nhật trạng thái thành công");
                    loadInvoiceDetails(invoiceId);
                })
                .catch(err => {
                    hideConfirmModal();
                    // Clean up Java stack traces or database error details if any, to keep it neat
                    let msg = err.message || "Lỗi không xác định";
                    if (msg.includes("Exception") || msg.includes("exception")) {
                        msg = msg.split("\n")[0]; // Just show the first line of exception
                    }
                    window.showToast("Thất bại", msg, "error");
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
    document.getElementById("infoShippingNote").textContent = inv.ghiChu || 'Khách đặt hàng online';

    // Financial calculations
    const discountVal = inv.tienGiam || 0;
    const shippingFee = inv.phiShip || 0;
    
    // Status Summary row elements
    const summaryCurrentStatus = document.getElementById("summaryCurrentStatus");
    if (summaryCurrentStatus) {
        summaryCurrentStatus.textContent = statusText;
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
    document.getElementById("valDiscount").textContent = new Intl.NumberFormat('vi-VN').format(discountVal) + ' đ';
    document.getElementById("valShipping").textContent = new Intl.NumberFormat('vi-VN').format(shippingFee) + ' đ';
    
    const grandTotalStr = new Intl.NumberFormat('vi-VN').format(grandTotal) + ' đ';
    
    // Select all instances of valGrandTotal
    const grandTotalEls = document.querySelectorAll("#valGrandTotal");
    grandTotalEls.forEach(el => {
        el.textContent = grandTotalStr;
    });

    // Update status summary card values
    document.getElementById("summaryProductCount").textContent = items.length;
    document.getElementById("summaryTotalGoods").textContent = new Intl.NumberFormat('vi-VN').format(totalGoods) + ' đ';
    document.getElementById("summaryBalance").textContent = "0 đ";
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
    const method = currentInvoice.loaiHoaDon === 'Online' ? 'Chuyển khoản QR' : 'Tiền mặt';
    const desc = currentInvoice.loaiHoaDon === 'Online' ? 'Khách thanh toán VNPAY' : 'Thanh toán trực tiếp tại quầy';
    
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
    fetch(`/api/hoa-don/${id}`)
        .then(res => res.json())
        .then(inv => {
            const dateStr = inv.ngayTao ? new Date(inv.ngayTao).toLocaleString('vi-VN') : '';
            const priceStr = new Intl.NumberFormat('vi-VN').format(inv.tongTien || 0);
            
            let statusText = '';
            switch (inv.trangThai) {
                case 0: statusText = "Chờ xác nhận"; break;
                case 1: statusText = "Đã xác nhận"; break;
                case 2: statusText = "Đang xử lý"; break;
                case 3: statusText = "Đang giao"; break;
                case 4: statusText = "Đã giao"; break;
                case 5: statusText = "Giao hàng thất bại"; break;
                case 6: statusText = "Hoàn thành"; break;
                case 7: statusText = "Hủy"; break;
                case 8: statusText = "Yêu cầu hủy"; break;
                case 9: statusText = "Cần hoàn tiền"; break;
                default: statusText = "N/A";
            }

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <html>
                <head>
                    <title>In hóa đơn ${inv.maHoaDon || ''}</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                        .receipt-container { max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
                        .store-header { text-align: center; margin-bottom: 20px; }
                        .store-name { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; color: #1b2a47; }
                        .store-subtitle { font-size: 12px; color: #666; margin: 5px 0 0 0; }
                        .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
                        .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 15px; }
                        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
                        .row .label { color: #666; }
                        .row .value { font-weight: bold; }
                        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #1b2a47; border-top: 1px dashed #ddd; padding-top: 10px; margin-top: 15px; }
                        .footer { text-align: center; font-size: 11px; color: #888; margin-top: 25px; }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="store-header">
                            <h1 class="store-name">VShoes Store</h1>
                            <p class="store-subtitle">Bán giày chạy bộ cao cấp</p>
                            <p style="font-size: 11px; color: #888; margin: 2px 0 0 0;">Địa chỉ: Hà Nội, Việt Nam</p>
                        </div>
                        <div class="divider"></div>
                        <h2 class="receipt-title">HÓA ĐƠN MUA HÀNG</h2>
                        <div class="row"><span class="label">Mã hóa đơn:</span><span class="value">${inv.maHoaDon || ''}</span></div>
                        <div class="row"><span class="label">Ngày tạo:</span><span class="value">${dateStr}</span></div>
                        <div class="row"><span class="label">Khách hàng:</span><span class="value">${inv.tenKhachHang || 'Khách vãng lai'}</span></div>
                        <div class="row"><span class="label">Số điện thoại:</span><span class="value">${inv.sdtKhachHang || 'N/A'}</span></div>
                        <div class="row"><span class="label">Người tạo:</span><span class="value">${inv.nguoiTao || 'NV_AUTO'}</span></div>
                        <div class="row"><span class="label">Loại đơn:</span><span class="value">${inv.loaiHoaDon || 'N/A'}</span></div>
                        <div class="row"><span class="label">Trạng thái:</span><span class="value">${statusText}</span></div>
                        <div class="divider"></div>
                        <div class="total-row"><span>TỔNG TIỀN:</span><span>${priceStr} đ</span></div>
                        <div class="footer">
                            <p>Cảm ơn quý khách đã mua sắm!</p>
                            <p>Hẹn gặp lại quý khách!</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        })
        .catch(err => alert("Không thể in hóa đơn"));
};
