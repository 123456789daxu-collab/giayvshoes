        // CÁC BIẾN TOÀN CỤC CHO VOUCHERS LIST
        let vCurrentPage = 0;
        let vPageSize = 10;
        let vTotalPages = 1;
        let allLoadedVouchers = [];

        // CÁC BIẾN TOÀN CỤC CHO CUSTOMER SELECTION (CHO PHIẾU CÁ NHÂN)
        let custCurrentPage = 0;
        let custPageSize = 5;
        let custTotalPages = 1;
        let selectedCustomerIds = new Set(); // Chứa danh sách ID khách hàng đã chọn
        let displayedCustomerIdsOnPage = []; // Chứa danh sách ID khách hàng hiển thị trang hiện tại

        // Khởi chạy khi DOM load xong
        document.addEventListener("DOMContentLoaded", () => {
            lucide.createIcons();
            loadVouchersTable();

            // Đặt ngày mặc định cho bộ lọc và biểu mẫu thêm mới
            const startInput = document.getElementById("voucher-start-date");
            const endInput = document.getElementById("voucher-end-date");

            // Mặc định ngày bắt đầu là hiện tại, kết thúc sau 3 ngày
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 3);

            startInput.value = formatDateLocalDate(now);
            endInput.value = formatDateLocalDate(future);

            // Vô hiệu hóa các ngày trong quá khứ đối với ngày kết thúc
            endInput.min = formatDateLocalDate(now);
        });

        // Hàm format Date thành chuỗi yyyy-MM-ddThh:mm để nhét vào input datetime-local
        function formatDateLocalDate(date) {
            const yyyy = date.getFullYear();
            const MM = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
        }

        // =========================================================================
        // SECTION 1: XỬ LÝ DANH SÁCH PHIẾU GIẢM GIÁ (VOUCHER LIST OPERATIONS)
        // =========================================================================

        // Tải dữ liệu voucher từ API
        async function loadVouchersTable() {
            const search = document.getElementById("filter-search").value;
            const loaiGiam = document.getElementById("filter-loai-giam").value;
            const loaiPhieu = document.getElementById("filter-loai-phieu").value;
            const start = document.getElementById("filter-start-date").value;
            const end = document.getElementById("filter-end-date").value;

            let url = `/api/phieu-giam-gia?page=${vCurrentPage}&size=${vPageSize}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (loaiGiam) url += `&loaiGiamGia=${encodeURIComponent(loaiGiam)}`;
            if (loaiPhieu) url += `&loaiPhieu=${encodeURIComponent(loaiPhieu)}`;
            if (start) url += `&ngayBatDau=${encodeURIComponent(start + "T00:00:00")}`;
            if (end) url += `&ngayKetThuc=${encodeURIComponent(end + "T23:59:59")}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Không thể tải danh sách phiếu giảm giá");
                const data = await response.json();
                renderVouchersTable(data);
            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối API: " + err.message);
            }
        }

        // Render dữ liệu voucher vào bảng
        function renderVouchersTable(pageData) {
            const tbody = document.getElementById("voucher-table-body");
            tbody.innerHTML = "";

            const list = pageData.content || [];
            if (list && list.length > 0) {
                allLoadedVouchers = list;
            }
            vTotalPages = pageData.totalPages || 1;
            const totalElements = pageData.totalElements || 0;

            document.getElementById("voucher-total-count").innerText = `Tổng ${totalElements} phiếu giảm giá`;

            if (list.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; color: #94a3b8; padding: 48px 16px;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <i data-lucide="inbox" style="width: 38px; height: 38px; color: #cbd5e1;"></i>
                                <span>Không tìm thấy phiếu giảm giá nào.</span>
                            </div>
                        </td>
                    </tr>
                `;
                renderVoucherPagination();
                lucide.createIcons();
                return;
            }

            list.forEach((voucher, index) => {
                const tr = document.createElement("tr");

                // STT
                const sttTd = `<td style="text-align: center; font-weight: 500; color: #64748b;">${vCurrentPage * vPageSize + index + 1}</td>`;

                // Mã giảm giá
                const maTd = `<td style="font-weight: 600; color: #0f172a; text-align: center;">${voucher.maVoucher}</td>`;

                // Tên giảm giá
                const tenTd = `<td style="text-align: center;"><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 auto;" title="${voucher.tenVoucher}">${voucher.tenVoucher}</div></td>`;

                const isCash = voucher.loaiGiamGia && (
                    voucher.loaiGiamGia.includes("Tiền mặt") ||
                    voucher.loaiGiamGia.includes("Ti?n") ||
                    voucher.loaiGiamGia.toLowerCase().includes("ti")
                );

                // Loại phiếu (Công khai / Cá nhân)
                const doiTuongBadge = voucher.loaiPhieu === "Cá nhân"
                    ? `<span class="badge badge-individual">Cá nhân</span>`
                    : `<span class="badge badge-public">Công khai</span>`;
                const loaiPhieuTd = `<td style="text-align: center;">${doiTuongBadge}</td>`;

                // Giá trị giảm
                const giaTriGiamText = !isCash
                    ? `${voucher.giaTriGiam}%`
                    : `${formatCurrency(voucher.giaTriGiam)}`;
                const giaTriGiamTd = `<td style="text-align: center; font-weight: 500; color: #334155;">${giaTriGiamText}</td>`;

                // Đơn hàng tối thiểu
                const donToiThieuTd = `<td style="text-align: center; font-weight: 500; color: #334155;">${formatCurrency(voucher.donToiThieu)}</td>`;

                // Số lượng
                const soLuongTd = `<td style="text-align: center; font-weight: 500; color: #334155;">${voucher.soLuong}</td>`;

                // Ngày bắt đầu
                const ngayBatDauText = formatDateTimeStr(voucher.ngayBatDau);
                const ngayBatDauTd = `<td style="text-align: center; color: #334155;">${ngayBatDauText}</td>`;

                // Ngày kết thúc
                const ngayKetThucText = formatDateTimeStr(voucher.ngayKetThuc);
                const ngayKetThucTd = `<td style="text-align: center; color: #334155;">${ngayKetThucText}</td>`;

                // Tính toán trạng thái thực tế dựa trên thời gian và db
                const statusInfo = getVoucherStatus(voucher);
                const trangThaiTd = `<td style="text-align: center;"><span class="badge ${statusInfo.class}">${statusInfo.text}</span></td>`;

                // Hành động (Sửa, Switch trạng thái)
                const isChecked = voucher.trangThai === 1 ? 'checked' : '';
                const isExpired = statusInfo.text === "Hết hạn";
                const switchHtml = isExpired ? '' : `
                            <label class="switch-control" title="Bật/Tắt trạng thái">
                                <input type="checkbox" ${isChecked} onchange="toggleVoucherActive(${voucher.id}, this.checked)">
                                <span class="switch-slider"></span>
                            </label>
                `;
                const hanhDongTd = `
                    <td style="text-align: center;">
                        <div class="btn-actions-cell" style="justify-content: center;">
                            <button class="action-icon-btn edit" title="Chỉnh sửa phiếu giảm giá" onclick="openEditVoucherForm(${voucher.id})">
                                <i data-lucide="edit-3" style="width: 18px; height: 18px;"></i>
                            </button>
                            ${switchHtml}
                        </div>
                    </td>
                `;

                tr.innerHTML = sttTd + maTd + tenTd + loaiPhieuTd + giaTriGiamTd + donToiThieuTd + soLuongTd + ngayBatDauTd + ngayKetThucTd + trangThaiTd + hanhDongTd;
                tbody.appendChild(tr);
            });

            renderVoucherPagination();
            lucide.createIcons();
        }

        function parseDateTimeArray(dateArr) {
            if (!dateArr) return new Date();
            if (Array.isArray(dateArr)) {
                const yyyy = dateArr[0];
                const MM = dateArr[1] - 1; // JS months are 0-11
                const dd = dateArr[2];
                const hh = dateArr[3] || 0;
                const mm = dateArr[4] || 0;
                const ss = dateArr[5] || 0;
                return new Date(yyyy, MM, dd, hh, mm, ss);
            }
            return new Date(dateArr);
        }

        // Tính trạng thái voucher
        function getVoucherStatus(voucher) {
            if (voucher.trangThai === 0) {
                return { text: "Ngừng áp dụng", class: "badge-status-inactive" };
            }

            const now = new Date();
            const start = parseDateTimeArray(voucher.ngayBatDau);
            const end = parseDateTimeArray(voucher.ngayKetThuc);

            if (now < start) {
                return { text: "Đang chờ", class: "badge-status-pending" };
            } else if (now > end) {
                return { text: "Hết hạn", class: "badge-status-expired" };
            } else {
                return { text: "Đang áp dụng", class: "badge-status-active" };
            }
        }

        // Định dạng tiền tệ VND
        function formatCurrency(val) {
            if (val === null || val === undefined) return "0 ₫";
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
        }

        // Định dạng datetime JSON thành dd/MM/yyyy HH:mm:ss
        function formatDateTimeStr(dateArr) {
            if (!dateArr) return "-";
            // Date từ spring boot có thể là mảng [yyyy, MM, dd, hh, mm, ss] hoặc chuỗi ISO
            if (Array.isArray(dateArr)) {
                const yyyy = dateArr[0];
                const MM = String(dateArr[1]).padStart(2, '0');
                const dd = String(dateArr[2]).padStart(2, '0');
                const hh = String(dateArr[3] || 0).padStart(2, '0');
                const mm = String(dateArr[4] || 0).padStart(2, '0');
                const ss = String(dateArr[5] || 0).padStart(2, '0');
                return `${dd}/${MM}/${yyyy} ${hh}:${mm}:${ss}`;
            }
            const date = new Date(dateArr);
            if (isNaN(date.getTime())) return dateArr;
            const dd = String(date.getDate()).padStart(2, '0');
            const MM = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${dd}/${MM}/${yyyy} ${hh}:${mm}:${ss}`;
        }

        // Định dạng datetime JSON thành dd/MM/yyyy
        function formatDateTimeStrShort(dateArr) {
            if (!dateArr) return "-";
            if (Array.isArray(dateArr)) {
                const yyyy = dateArr[0];
                const MM = String(dateArr[1]).padStart(2, '0');
                const dd = String(dateArr[2]).padStart(2, '0');
                return `${dd}/${MM}/${yyyy}`;
            }
            const date = new Date(dateArr);
            if (isNaN(date.getTime())) return dateArr;
            const dd = String(date.getDate()).padStart(2, '0');
            const MM = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            return `${dd}/${MM}/${yyyy}`;
        }

        // Vẽ các nút phân trang voucher
        function renderVoucherPagination() {
            const nav = document.getElementById("voucher-pagination");
            nav.innerHTML = "";

            // Nút lùi
            const prev = document.createElement("button");
            prev.className = `page-btn ${vCurrentPage === 0 ? 'disabled' : ''}`;
            prev.innerHTML = `<i data-lucide="chevron-left" style="width: 20px; height: 20px;"></i>`;
            prev.onclick = () => { if (vCurrentPage > 0) { vCurrentPage--; loadVouchersTable(); } };
            nav.appendChild(prev);

            // Các trang số
            for (let i = 0; i < vTotalPages; i++) {
                const btn = document.createElement("button");
                btn.className = `page-btn ${i === vCurrentPage ? 'active' : ''}`;
                btn.innerText = i + 1;
                btn.onclick = () => { vCurrentPage = i; loadVouchersTable(); };
                nav.appendChild(btn);
            }

            // Nút tiến
            const next = document.createElement("button");
            next.className = `page-btn ${vCurrentPage >= vTotalPages - 1 ? 'disabled' : ''}`;
            next.innerHTML = `<i data-lucide="chevron-right" style="width: 20px; height: 20px;"></i>`;
            next.onclick = () => { if (vCurrentPage < vTotalPages - 1) { vCurrentPage++; loadVouchersTable(); } };
            nav.appendChild(next);
        }

        // Đổi page size của voucher
        function changeVoucherPageSize(val) {
            vPageSize = parseInt(val);
            vCurrentPage = 0;
            loadVouchersTable();
        }

        // Áp dụng bộ lọc voucher
        function applyVoucherFilters() {
            vCurrentPage = 0;
            loadVouchersTable();
        }

        // Reset bộ lọc voucher
        function resetVoucherFilters() {
            document.getElementById("filter-search").value = "";
            document.getElementById("filter-loai-giam").value = "";
            document.getElementById("filter-loai-phieu").value = "";
            document.getElementById("filter-start-date").value = "";
            document.getElementById("filter-end-date").value = "";
            vCurrentPage = 0;
            loadVouchersTable();
        }

        // Toggle nhanh bật/tắt hoạt động của voucher
        async function toggleVoucherActive(id, isChecked) {
            const status = isChecked ? 1 : 0;
            try {
                const response = await fetch(`/api/phieu-giam-gia/${id}/trang-thai?trangThai=${status}`, {
                    method: "PATCH"
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || "Không thể cập nhật trạng thái");
                }
                loadVouchersTable();
            } catch (err) {
                alert("Lỗi: " + err.message);
                loadVouchersTable();
            }
        }

        // Xuất Excel danh sách voucher
        function exportVouchersExcel() {
            const search = document.getElementById("filter-search").value;
            const loaiGiam = document.getElementById("filter-loai-giam").value;
            const loaiPhieu = document.getElementById("filter-loai-phieu").value;
            const start = document.getElementById("filter-start-date").value;
            const end = document.getElementById("filter-end-date").value;

            let url = `/api/phieu-giam-gia/export?`;
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (loaiGiam) url += `loaiGiamGia=${encodeURIComponent(loaiGiam)}&`;
            if (loaiPhieu) url += `loaiPhieu=${encodeURIComponent(loaiPhieu)}&`;
            if (start) url += `ngayBatDau=${encodeURIComponent(start + "T00:00:00")}&`;
            if (end) url += `ngayKetThuc=${encodeURIComponent(end + "T23:59:59")}&`;

            window.location.href = url;
        }


        // =========================================================================
        // SECTION 2: XỬ LÝ BIỂU MẪU THÊM MỚI / SỬA PHIẾU (FORM OPERATIONS)
        // =========================================================================

        // Plus/Minus helper cho các input number
        function adjustNumberInput(id, delta) {
            const input = document.getElementById(id);
            if (input.disabled) return;

            const isCurrency = input.classList.contains('currency-input');
            let val = isCurrency ? parseCurrencyFromInput(input.value) : (parseInt(input.value) || 0);
            val += delta;

            if (input.min !== "" && val < parseInt(input.min)) {
                val = parseInt(input.min);
            }

            input.value = isCurrency ? formatCurrencyToInput(val) : val;

            // Kích hoạt sự kiện oninput nếu có
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }

        // Chuyển string format về số
        function parseCurrencyFromInput(str) {
            if (!str) return 0;
            return parseInt(str.toString().replace(/[^\d]/g, ''), 10) || 0;
        }

        // Chuyển số về string format cho input
        function formatCurrencyToInput(val) {
            if (val === null || val === undefined || val === '') return '';
            return new Intl.NumberFormat('vi-VN').format(val);
        }

        // Xử lý sự kiện nhập liệu cho input tiền tệ
        function handleCurrencyInput(input) {
            let val = parseCurrencyFromInput(input.value);
            if (input.value === '') {
                input.value = '';
                return;
            }
            input.value = formatCurrencyToInput(val);
        }

        // Đếm ký tự cho textarea mô tả
        function updateCharCount(textarea) {
            const label = document.getElementById("desc-char-count");
            label.innerText = `${textarea.value.length}/500`;
        }

        // Bật tắt UI dựa trên hình thức giảm (% hoặc VND)
        function toggleDiscountType() {
            const checkedRadio = document.querySelector('input[name="loaiGiamGia"]:checked');
            const loaiGiamVal = checkedRadio ? checkedRadio.value : "Phần trăm";
            const maxDiscountInput = document.getElementById("voucher-max-discount");

            if (loaiGiamVal === "Tiền mặt") {
                maxDiscountInput.disabled = true;
                maxDiscountInput.value = "";
                maxDiscountInput.placeholder = "Chỉ áp dụng khi giảm theo %";
            } else {
                maxDiscountInput.disabled = false;
                maxDiscountInput.placeholder = "Nhập mức giảm tối đa...";
            }
        }

        // Bật tắt UI dựa trên loại phiếu (Công khai hoặc Cá nhân)
        function toggleVoucherType() {
            const checkedRadio = document.querySelector('input[name="loaiPhieu"]:checked');
            const loaiPhieuVal = checkedRadio ? checkedRadio.value : "Công khai";
            const qtyInput = document.getElementById("voucher-quantity");
            const btnQtyMinus = document.getElementById("btn-qty-minus");
            const btnQtyPlus = document.getElementById("btn-qty-plus");
            const customerSection = document.getElementById("customer-select-section");

            if (loaiPhieuVal === "Cá nhân") {
                qtyInput.disabled = true;
                qtyInput.value = selectedCustomerIds.size;
                qtyInput.placeholder = "Tự động theo số KH chọn";
                btnQtyMinus.style.pointerEvents = "none";
                btnQtyMinus.style.opacity = "0.5";
                btnQtyPlus.style.pointerEvents = "none";
                btnQtyPlus.style.opacity = "0.5";

                customerSection.style.display = "block";
                loadCustomersTable();
            } else {
                qtyInput.disabled = false;
                qtyInput.placeholder = "Nhập số lượng phát hành...";
                btnQtyMinus.style.pointerEvents = "auto";
                btnQtyMinus.style.opacity = "1";
                btnQtyPlus.style.pointerEvents = "auto";
                btnQtyPlus.style.opacity = "1";

                customerSection.style.display = "none";
            }
        }

        function getNextVoucherCodeLocal() {
            let maxNum = 0;
            if (allLoadedVouchers && allLoadedVouchers.length > 0) {
                allLoadedVouchers.forEach(v => {
                    if (v && v.maVoucher) {
                        const digits = String(v.maVoucher).replace(/\D+/g, '');
                        if (digits) {
                            const num = parseInt(digits, 10);
                            if (num < 1000000 && num > maxNum) maxNum = num;
                        }
                    }
                });
            }
            return 'PGG' + String(maxNum + 1).padStart(3, '0');
        }

        // Mở màn hình thêm mới voucher
        function openAddVoucherForm() {
            document.getElementById("voucher-form").reset();
            document.getElementById("voucher-id").value = "";
            document.getElementById("voucher-code").value = getNextVoucherCodeLocal();
            fetch('/api/phieu-giam-gia/next-code')
                .then(res => res.json())
                .then(data => {
                    if (data && data.code) {
                        document.getElementById("voucher-code").value = data.code;
                    }
                })
                .catch(() => {});
            document.getElementById("form-panel-title").innerText = "Thêm mới Phiếu giảm giá";

            selectedCustomerIds.clear();
            document.getElementById("cust-selected-label").innerText = "0";

            // Thiết lập giá trị mặc định cho ngày
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 3);
            document.getElementById("voucher-start-date").value = formatDateLocalDate(now);
            const endInput = document.getElementById("voucher-end-date");
            endInput.value = formatDateLocalDate(future);
            endInput.min = formatDateLocalDate(now);

            // Bật tắt control về trạng thái mặc định
            toggleDiscountType();
            toggleVoucherType();

            // Chuyển panel
            document.getElementById("list-panel").classList.remove("active");
            document.getElementById("form-panel").classList.add("active");

            window.scrollTo(0, 0);
            lucide.createIcons();
        }

        // Mở màn hình chỉnh sửa voucher
        async function openEditVoucherForm(id) {
            try {
                const resVoucher = await fetch(`/api/phieu-giam-gia/${id}`);
                if (!resVoucher.ok) throw new Error("Không thể tải thông tin phiếu giảm giá");
                const voucher = await resVoucher.json();

                // Điền thông tin cơ bản vào form
                document.getElementById("voucher-id").value = voucher.id;
                document.getElementById("voucher-code").value = voucher.maVoucher || "";
                document.getElementById("voucher-name").value = voucher.tenVoucher;

                // Chọn radio button hình thức giảm
                const radiosLoaiGiam = document.querySelectorAll('input[name="loaiGiamGia"]');
                let foundGiam = false;
                const isCash = voucher.loaiGiamGia && (
                    voucher.loaiGiamGia.includes("Tiền mặt") ||
                    voucher.loaiGiamGia.includes("Ti?n") ||
                    voucher.loaiGiamGia.toLowerCase().includes("ti")
                );
                const targetValue = isCash ? "Tiền mặt" : "Phần trăm";
                radiosLoaiGiam.forEach(r => {
                    r.checked = (r.value === targetValue);
                    if (r.checked) foundGiam = true;
                });
                if (!foundGiam && radiosLoaiGiam.length > 0) {
                    radiosLoaiGiam[0].checked = true; // mặc định Phần trăm
                }

                // Chọn radio button loại phiếu
                const radiosLoaiPhieu = document.querySelectorAll('input[name="loaiPhieu"]');
                let foundPhieu = false;
                radiosLoaiPhieu.forEach(r => {
                    r.checked = (r.value === voucher.loaiPhieu);
                    if (r.checked) foundPhieu = true;
                });
                if (!foundPhieu && radiosLoaiPhieu.length > 0) {
                    radiosLoaiPhieu[0].checked = true; // mặc định Công khai
                }

                document.getElementById("voucher-discount-val").value = formatCurrencyToInput(voucher.giaTriGiam);
                document.getElementById("voucher-max-discount").value = voucher.giamToiDa ? formatCurrencyToInput(voucher.giamToiDa) : "";
                document.getElementById("voucher-min-order").value = formatCurrencyToInput(voucher.donToiThieu);
                document.getElementById("voucher-quantity").value = voucher.soLuong;

                // Format date về dạng ISO local datetime string
                document.getElementById("voucher-start-date").value = formatIsoString(voucher.ngayBatDau);
                const endInput = document.getElementById("voucher-end-date");
                endInput.value = formatIsoString(voucher.ngayKetThuc);
                endInput.min = formatDateLocalDate(new Date());

                selectedCustomerIds.clear();

                // Nếu là phiếu cá nhân thì lấy danh sách ID khách hàng cũ đã gán
                if (voucher.loaiPhieu === "Cá nhân") {
                    const resCustIds = await fetch(`/api/phieu-giam-gia/${id}/customer-ids`);
                    if (resCustIds.ok) {
                        const ids = await resCustIds.json();
                        ids.forEach(cid => selectedCustomerIds.add(cid));
                    }
                }

                document.getElementById("cust-selected-label").innerText = selectedCustomerIds.size;

                // Thiết lập trạng thái UI và nạp bảng khách hàng
                toggleDiscountType();
                toggleVoucherType();

                document.getElementById("form-panel-title").innerText = `Chỉnh sửa Phiếu giảm giá - Mã: ${voucher.maVoucher || ''}`;

                // Chuyển panel
                document.getElementById("list-panel").classList.remove("active");
                document.getElementById("form-panel").classList.add("active");

                window.scrollTo(0, 0);
                lucide.createIcons();

            } catch (err) {
                alert("Lỗi tải chi tiết: " + err.message);
            }
        }

        // Format Date Array hoặc string từ server thành yyyy-MM-ddThh:mm
        function formatIsoString(dateArr) {
            if (!dateArr) return "";
            let date;
            if (Array.isArray(dateArr)) {
                const yyyy = dateArr[0];
                const MM = String(dateArr[1]).padStart(2, '0');
                const dd = String(dateArr[2]).padStart(2, '0');
                const hh = String(dateArr[3] || 0).padStart(2, '0');
                const mm = String(dateArr[4] || 0).padStart(2, '0');
                return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
            } else {
                date = new Date(dateArr);
            }
            if (isNaN(date.getTime())) return dateArr;
            return formatDateLocalDate(date);
        }

        // Quay lại màn hình danh sách
        function backToListPanel() {
            document.getElementById("form-panel").classList.remove("active");
            document.getElementById("list-panel").classList.add("active");
            loadVouchersTable();
            window.scrollTo(0, 0);
        }

        // Lưu thông tin phiếu (Thêm mới / Cập nhật)
        async function saveVoucher(event) {
            event.preventDefault();

            const id = document.getElementById("voucher-id").value;
            const maVoucher = document.getElementById("voucher-code").value.trim();
            const tenVoucher = document.getElementById("voucher-name").value.trim();
            const checkedLoaiGiam = document.querySelector('input[name="loaiGiamGia"]:checked');
            const loaiGiamGia = checkedLoaiGiam ? checkedLoaiGiam.value : "Phần trăm";
            const checkedLoaiPhieu = document.querySelector('input[name="loaiPhieu"]:checked');
            const loaiPhieu = checkedLoaiPhieu ? checkedLoaiPhieu.value : "Công khai";
            const giaTriGiam = parseCurrencyFromInput(document.getElementById("voucher-discount-val").value);
            const giamToiDaVal = document.getElementById("voucher-max-discount").value;
            const giamToiDa = giamToiDaVal !== "" ? parseCurrencyFromInput(giamToiDaVal) : null;
            const donToiThieu = parseCurrencyFromInput(document.getElementById("voucher-min-order").value);
            const soLuongVal = document.getElementById("voucher-quantity").value;
            const soLuong = soLuongVal !== "" ? parseInt(soLuongVal) : 0;
            const ngayBatDauVal = document.getElementById("voucher-start-date").value;
            const ngayKetThucVal = document.getElementById("voucher-end-date").value;

            if (!tenVoucher) {
                Swal.fire('Lỗi', 'Vui lòng nhập tên phiếu giảm giá!', 'warning');
                return;
            }

            if (!ngayBatDauVal || !ngayKetThucVal) {
                Swal.fire('Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc!', 'warning');
                return;
            }

            if (new Date(ngayBatDauVal) > new Date(ngayKetThucVal)) {
                alert("Lỗi: Ngày bắt đầu phải diễn ra trước hoặc cùng ngày với ngày kết thúc!");
                return;
            }

            if (loaiGiamGia === "Phần trăm" && (giaTriGiam < 1 || giaTriGiam > 100)) {
                alert("Lỗi: Giá trị giảm theo % phải nằm trong khoảng 1% - 100%!");
                return;
            }

            if (loaiGiamGia === "Tiền mặt") {
                if (giaTriGiam > donToiThieu) {
                    alert("Lỗi: Giá trị giảm không được lớn hơn hóa đơn tối thiểu!");
                    return;
                }
            } else if (loaiGiamGia === "Phần trăm") {
                if (giamToiDa !== null && !isNaN(giamToiDa) && giamToiDa > donToiThieu) {
                    alert("Lỗi: Giảm tối đa không được lớn hơn hóa đơn tối thiểu!");
                    return;
                }
            }

            if (loaiPhieu === "Cá nhân" && selectedCustomerIds.size === 0) {
                alert("Lỗi: Đối tượng cá nhân yêu cầu bạn chọn ít nhất 1 khách hàng nhận phiếu!");
                return;
            }

            // Chuẩn bị payload gửi đi
            const payload = {
                maVoucher,
                tenVoucher,
                loaiGiamGia,
                loaiPhieu,
                giaTriGiam,
                donToiThieu,
                giamToiDa: loaiGiamGia === "Phần trăm" ? giamToiDa : 0,
                soLuong: loaiPhieu === "Cá nhân" ? selectedCustomerIds.size : soLuong,
                ngayBatDau: ngayBatDauVal.length === 16 ? ngayBatDauVal + ":00" : ngayBatDauVal,
                ngayKetThuc: ngayKetThucVal.length === 16 ? ngayKetThucVal + ":00" : ngayKetThucVal,
                trangThai: 1, // mặc định hoạt động
                customerIds: loaiPhieu === "Cá nhân" ? Array.from(selectedCustomerIds) : []
            };

            const result = await Swal.fire({
                title: id ? 'Xác nhận cập nhật?' : 'Xác nhận thêm mới?',
                text: "Bạn có chắc chắn muốn lưu thông tin phiếu giảm giá này?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0ea5e9',
                cancelButtonColor: '#cbd5e1',
                confirmButtonText: 'Đồng ý',
                cancelButtonText: 'Hủy'
            });

            if (!result.isConfirmed) return;

            const url = id ? `/api/phieu-giam-gia/${id}` : "/api/phieu-giam-gia";
            const method = id ? "PUT" : "POST";

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || "Lỗi lưu thông tin phiếu giảm giá");
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: id ? "Cập nhật phiếu giảm giá thành công!" : "Thêm mới phiếu giảm giá thành công!",
                    showConfirmButton: false,
                    timer: 2000
                });
                backToListPanel();
            } catch (err) {
                Swal.fire('Lỗi', "Thao tác thất bại: " + err.message, 'error');
            }
        }


        // =========================================================================
        // SECTION 3: XỬ LÝ CHỌN KHÁCH HÀNG (CUSTOMER SELECTION OPERATIONS)
        // =========================================================================

        // Tải dữ liệu khách hàng kèm thống kê mua hàng
        async function loadCustomersTable() {
            const search = document.getElementById("cust-filter-search").value;
            const month = document.getElementById("cust-filter-month").value;
            const year = document.getElementById("cust-filter-year").value;

            let url = `/api/phieu-giam-gia/khach-hang-statistics?page=${custCurrentPage}&size=${custPageSize}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (month) url += `&month=${month}`;
            if (year) url += `&year=${year}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Không thể tải danh sách khách hàng");
                const data = await response.json();
                renderCustomersTable(data);
            } catch (err) {
                console.error(err);
            }
        }

        // Render dữ liệu khách hàng vào bảng con
        function renderCustomersTable(pageData) {
            const tbody = document.getElementById("cust-table-body");
            tbody.innerHTML = "";

            const list = pageData.content || [];
            custTotalPages = pageData.totalPages || 1;
            const totalElements = pageData.totalElements || 0;

            document.getElementById("cust-total-count").innerText = `Tổng ${totalElements} khách hàng`;

            if (list.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">
                            Không tìm thấy khách hàng nào khớp bộ lọc.
                        </td>
                    </tr>
                `;
                renderCustPagination();
                return;
            }

            displayedCustomerIdsOnPage = list.map(c => c.id);

            list.forEach((customer, index) => {
                const tr = document.createElement("tr");

                // Checkbox
                const isChecked = selectedCustomerIds.has(customer.id) ? "checked" : "";
                const checkboxTd = `
                    <td class="checkbox-cell">
                        <input type="checkbox" value="${customer.id}" ${isChecked} onchange="toggleCustomerSelect(${customer.id}, this.checked)">
                    </td>
                `;

                // Các cột dữ liệu
                const maTd = `<td style="font-weight: 500;">${customer.maKhachHang}</td>`;
                const tenTd = `<td style="font-weight: 600; color: #1e293b;">${customer.hoTen}</td>`;
                const sdtTd = `<td>${customer.soDienThoai || "-"}</td>`;
                const emailTd = `<td>${customer.email || "-"}</td>`;
                const dobTd = `<td>${formatDate(customer.ngaySinh)}</td>`;

                const ngayDatTd = `<td>${formatDateTimeStr(customer.ngayDatGanNhat)}</td>`;
                const soLanDatTd = `<td style="text-align: center; font-weight: 500;">${customer.soLanDat}</td>`;
                const tongTienTd = `<td style="text-align: right; font-weight: 600; color: #1e3a8a;">${formatCurrency(customer.tongTienDaDat)}</td>`;

                tr.innerHTML = checkboxTd + maTd + tenTd + sdtTd + emailTd + dobTd + ngayDatTd + soLanDatTd + tongTienTd;
                tbody.appendChild(tr);
            });

            // Cập nhật trạng thái checkbox "Chọn tất cả" trên header trang hiện tại
            updateHeaderCheckboxState();
            renderCustPagination();
        }

        // Định dạng ngày sinh dd/MM/yyyy
        function formatDate(dateStr) {
            if (!dateStr) return "-";
            if (Array.isArray(dateStr)) {
                return `${String(dateStr[2]).padStart(2, '0')}-${String(dateStr[1]).padStart(2, '0')}-${dateStr[0]}`;
            }
            const parts = dateStr.split("-");
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return dateStr;
        }

        // Xử lý sự kiện click checkbox của từng khách hàng
        function toggleCustomerSelect(customerId, isChecked) {
            if (isChecked) {
                selectedCustomerIds.add(customerId);
            } else {
                selectedCustomerIds.delete(customerId);
            }

            // Cập nhật số lượng đã chọn hiển thị trên UI
            document.getElementById("cust-selected-label").innerText = selectedCustomerIds.size;

            // Gán lại số lượng sử dụng của phiếu tự động
            document.getElementById("voucher-quantity").value = selectedCustomerIds.size;

            updateHeaderCheckboxState();
        }

        // Cập nhật trạng thái của checkbox đầu bảng
        function updateHeaderCheckboxState() {
            const headerCheckbox = document.getElementById("check-all-customers");
            if (displayedCustomerIdsOnPage.length === 0) {
                headerCheckbox.checked = false;
                return;
            }

            const allChecked = displayedCustomerIdsOnPage.every(id => selectedCustomerIds.has(id));
            headerCheckbox.checked = allChecked;
        }

        // Bật/tắt tất cả khách hàng trên TRANG HIỆN TẠI bằng checkbox đầu bảng
        function toggleSelectAllPage(isChecked) {
            displayedCustomerIdsOnPage.forEach(id => {
                if (isChecked) {
                    selectedCustomerIds.add(id);
                } else {
                    selectedCustomerIds.delete(id);
                }
            });

            // Cập nhật UI
            document.getElementById("cust-selected-label").innerText = selectedCustomerIds.size;
            document.getElementById("voucher-quantity").value = selectedCustomerIds.size;

            // Render lại bảng để check/uncheck các checkbox
            loadCustomersTable();
        }

        // Nút "Chọn tất cả" (Chọn toàn bộ khách hàng trên trang hiện tại)
        function selectAllCurrentPageCustomers() {
            toggleSelectAllPage(true);
        }

        // Vẽ các nút phân trang khách hàng
        function renderCustPagination() {
            const nav = document.getElementById("cust-pagination");
            nav.innerHTML = "";

            const prev = document.createElement("button");
            prev.type = "button";
            prev.className = `page-btn ${custCurrentPage === 0 ? 'disabled' : ''}`;
            prev.innerHTML = `<i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>`;
            prev.onclick = () => { if (custCurrentPage > 0) { custCurrentPage--; loadCustomersTable(); } };
            nav.appendChild(prev);

            for (let i = 0; i < custTotalPages; i++) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `page-btn ${i === custCurrentPage ? 'active' : ''}`;
                btn.innerText = i + 1;
                btn.onclick = () => { custCurrentPage = i; loadCustomersTable(); };
                nav.appendChild(btn);
            }

            const next = document.createElement("button");
            next.type = "button";
            next.className = `page-btn ${custCurrentPage >= custTotalPages - 1 ? 'disabled' : ''}`;
            next.innerHTML = `<i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>`;
            next.onclick = () => { if (custCurrentPage < custTotalPages - 1) { custCurrentPage++; loadCustomersTable(); } };
            nav.appendChild(next);

            lucide.createIcons();
        }

        // Đổi page size của bảng khách hàng
        function changeCustPageSize(val) {
            custPageSize = parseInt(val);
            custCurrentPage = 0;
            loadCustomersTable();
        }

        // Lọc danh sách khách hàng
        function applyCustFilters() {
            custCurrentPage = 0;
            loadCustomersTable();
        }
