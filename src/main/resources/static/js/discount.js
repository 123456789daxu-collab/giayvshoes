        // CÁC BIẾN TOÀN CỤC CHO CAMPAIGNS LIST
        let cCurrentPage = 0;
        let cPageSize = 10;
        let cTotalPages = 1;
        let allLoadedCampaigns = [];

        function getNextCampaignCodeLocal() {
            let maxNum = 0;
            if (allLoadedCampaigns && allLoadedCampaigns.length > 0) {
                allLoadedCampaigns.forEach(c => {
                    if (c && c.maDotGiamGia) {
                        const digits = String(c.maDotGiamGia).replace(/\D+/g, '');
                        if (digits) {
                            const num = parseInt(digits, 10);
                            if (num < 1000000 && num > maxNum) maxNum = num;
                        }
                    }
                });
            }
            return 'DGG' + String(maxNum + 1).padStart(3, '0');
        }

        // CÁC BIẾN TOÀN CỤC CHO SẢN PHẨM SELECTION
        let prodCurrentPage = 0;
        let prodPageSize = 5;
        let prodTotalPages = 1;
        let prodTotalElements = 0;
        let selectedProductDetailIds = new Set(); // Chứa danh sách ID sản phẩm chi tiết đã chọn
        let displayedProductsOnPage = []; // Chứa danh sách sản phẩm hiển thị trên trang hiện tại

        // Khởi chạy khi DOM load xong
        document.addEventListener("DOMContentLoaded", () => {
            lucide.createIcons();
            loadCampaignsTable();
        });

        // Hàm format Date sang yyyy-MM-ddThh:mm
        function formatDateTimeLocal(date) {
            const yyyy = date.getFullYear();
            const MM = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
        }

        async function generateNextCampaignCode() {
            try {
                const res = await fetch('/api/dot-giam-gia/next-code');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.code) {
                        document.getElementById("campaign-code").value = data.code;
                    }
                }
            } catch (e) {
                console.error("Lỗi lấy mã đợt giảm giá:", e);
            }
        }

        // =========================================================================
        // SECTION 1: XỬ LÝ DANH SÁCH ĐỢT GIẢM GIÁ (CAMPAIGN LIST OPERATIONS)
        // =========================================================================

        // Tải dữ liệu đợt giảm giá từ API
        async function loadCampaignsTable() {
            const search = document.getElementById("filter-search").value;
            const start = document.getElementById("filter-start-date").value;
            const end = document.getElementById("filter-end-date").value;
            const status = document.getElementById("filter-status").value;

            let url = `/api/dot-giam-gia?page=${cCurrentPage}&size=${cPageSize}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (status) url += `&trangThai=${status}`;
            if (start) url += `&ngayBatDau=${encodeURIComponent(start + "T00:00:00")}`;
            if (end) url += `&ngayKetThuc=${encodeURIComponent(end + "T23:59:59")}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Không thể tải danh sách đợt giảm giá");
                const data = await response.json();
                renderCampaignsTable(data);
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Lỗi kết nối API: ' + err.message, 'error');
            }
        }

        // Render dữ liệu đợt giảm giá vào bảng
        function renderCampaignsTable(pageData) {
            const tbody = document.getElementById("campaign-table-body");
            tbody.innerHTML = "";

            const list = pageData.content || [];
            if (list && list.length > 0) {
                allLoadedCampaigns = list;
            }
            cTotalPages = pageData.totalPages || 1;
            const totalElements = pageData.totalElements || 0;

            document.getElementById("campaign-total-count").innerText = `Tổng ${totalElements} đợt giảm giá`;

            if (list.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: #94a3b8; padding: 48px 16px;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <i data-lucide="inbox" style="width: 38px; height: 38px; color: #cbd5e1;"></i>
                                <span>Không tìm thấy đợt giảm giá nào.</span>
                            </div>
                        </td>
                    </tr>
                `;
                renderCampaignPagination();
                lucide.createIcons();
                return;
            }

            list.forEach((campaign, index) => {
                const tr = document.createElement("tr");

                // STT
                const sttTd = `<td style="text-align: center; font-weight: 500; color: #64748b;">${cCurrentPage * cPageSize + index + 1}</td>`;
                
                // Mã & Tên
                const maTd = `<td style="font-weight: 600; color: #0f172a;">${campaign.maDotGiamGia}</td>`;
                const tenTd = `<td><div style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${campaign.tenDotGiamGia}">${campaign.tenDotGiamGia}</div></td>`;

                // Mức giảm %
                let textValGiam = (campaign.phanTramGiam || campaign.giaTriGiam || 0) + "%";
                const giamTd = `<td style="text-align: center; font-weight: 600; color: #dc2626;">${textValGiam}</td>`;

                // Thời gian áp dụng
                const thoiGianBatDauTd = `<td>${formatDateTimeStr(campaign.ngayBatDau)}</td>`;
                const thoiGianKetThucTd = `<td>${formatDateTimeStr(campaign.ngayKetThuc)}</td>`;

                // Trạng thái thực tế
                const statusInfo = getCampaignStatus(campaign);
                const trangThaiTd = `<td><span class="badge ${statusInfo.class}">${statusInfo.text}</span></td>`;

                // Hành động
                const hanhDongTd = `
                    <td style="text-align: center;">
                        <div class="btn-actions-cell" style="justify-content: center; gap: 20px;">
                            <button type="button" class="action-icon-btn edit" title="Chỉnh sửa đợt giảm giá" onclick="openEditCampaignForm(${campaign.id})">
                                <i data-lucide="edit-3" style="width: 18px; height: 18px;"></i>
                            </button>
                        </div>
                    </td>
                `;

                tr.innerHTML = sttTd + maTd + tenTd + giamTd + thoiGianBatDauTd + thoiGianKetThucTd + trangThaiTd + hanhDongTd;
                tbody.appendChild(tr);
            });

            renderCampaignPagination();
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

        // Tính trạng thái đợt giảm giá
        function getCampaignStatus(campaign) {
            const now = new Date();
            const start = parseDateTimeArray(campaign.ngayBatDau);
            const end = parseDateTimeArray(campaign.ngayKetThuc);

            if (campaign.trangThai === 0 || now > end) {
                return { text: "Hết hạn", class: "badge-expired" };
            } else if (now < start) {
                return { text: "Sắp diễn ra", class: "badge-pending" };
            } else {
                return { text: "Diễn ra", class: "badge-active" };
            }
        }

        // Định dạng tiền tệ VND
        function formatCurrency(val) {
            if (val === null || val === undefined) return "0";
            return new Intl.NumberFormat('vi-VN').format(val);
        }

        // Định dạng datetime JSON thành dd/MM/yyyy HH:mm:ss
        function formatDateTimeStr(dateArr) {
            if (!dateArr) return "-";
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

        // Vẽ phân trang đợt giảm giá
        function renderCampaignPagination() {
            AdminUtils.renderPagination("campaign-pagination", cCurrentPage, cTotalPages, (page) => {
                cCurrentPage = page;
                loadCampaignsTable();
            });
        }

        function changeCampaignPageSize(val) {
            cPageSize = parseInt(val);
            cCurrentPage = 0;
            loadCampaignsTable();
        }

        function applyCampaignFilters() {
            cCurrentPage = 0;
            loadCampaignsTable();
        }

        function resetCampaignFilters() {
            document.getElementById("filter-search").value = "";
            document.getElementById("filter-start-date").value = "";
            document.getElementById("filter-end-date").value = "";
            document.getElementById("filter-status").value = "";
            cCurrentPage = 0;
            loadCampaignsTable();
        }

        // Bật/tắt trạng thái
        function toggleCampaignActive(id, isChecked, name = 'đợt giảm giá') {
            const status = isChecked ? 1 : 0;
            const checkboxEl = window.event ? window.event.target : null;
            AdminStatus.confirmToggle({
                entityName: `đợt giảm giá "${name}"`,
                isActivating: isChecked,
                checkboxEl: checkboxEl,
                onConfirm: async () => {
                    try {
                        const response = await fetch(`/api/dot-giam-gia/${id}/trang-thai?trangThai=${status}`, {
                            method: "PATCH"
                        });
                        if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.message || "Không thể cập nhật trạng thái");
                        }
                        AdminNotify.success("Cập nhật trạng thái thành công!");
                        loadCampaignsTable();
                    } catch (err) {
                        if (checkboxEl) checkboxEl.checked = !isChecked;
                        AdminNotify.error("Lỗi: " + err.message);
                        loadCampaignsTable();
                    }
                },
                onCancel: () => {
                    if (checkboxEl) checkboxEl.checked = !isChecked;
                }
            });
        }

        /*
        // KHONG DUNG XOA CUNG (SU DUNG toggleCampaignActive)
        async function deleteCampaign(id) {
            const result = await Swal.fire({
                title: 'Xóa đợt giảm giá?',
                text: "Bạn có chắc chắn muốn xóa đợt giảm giá này? Hành động này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Đồng ý xóa',
                cancelButtonText: 'Hủy'
            });

            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/dot-giam-gia/${id}`, {
                        method: "DELETE"
                    });
                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.message || "Không thể xóa");
                    }
                    Swal.fire('Đã xóa!', 'Đợt giảm giá đã được xóa thành công.', 'success');
                    loadCampaignsTable();
                } catch (err) {
                    Swal.fire('Lỗi', "Thao tác thất bại: " + err.message, 'error');
                }
            }
        }
        */

        function exportCampaignsExcel() {
            const search = document.getElementById("filter-search").value;
            const start = document.getElementById("filter-start-date").value;
            const end = document.getElementById("filter-end-date").value;
            const status = document.getElementById("filter-status").value;

            let url = `/api/dot-giam-gia/export?`;
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (status) url += `trangThai=${status}&`;
            if (start) url += `ngayBatDau=${encodeURIComponent(start + "T00:00:00")}&`;
            if (end) url += `ngayKetThuc=${encodeURIComponent(end + "T23:59:59")}&`;

            window.location.href = url;
        }


        // =========================================================================
        // SECTION 2: XỬ LÝ BIỂU MẪU THÊM MỚI / SỬA (FORM OPERATIONS)
        // =========================================================================

        // Remove adjustNumberInput and onCampaignDiscountTypeChange

        function updateCharCount(textarea) {
            const label = document.getElementById("desc-char-count");
            label.innerText = `${textarea.value.length}/500`;
        }

        function openAddCampaignForm() {
            document.getElementById("campaign-form").reset();
            document.getElementById("campaign-id").value = "";
            document.getElementById("campaign-code").value = getNextCampaignCodeLocal();
            generateNextCampaignCode();
            document.getElementById("form-panel-title").innerText = "Thêm mới Đợt giảm giá";
            
            const descCharEl = document.getElementById("desc-char-count");
            if (descCharEl) descCharEl.innerText = "0/500";
            document.getElementById("campaign-discount-value").value = "";
            
            selectedProductDetailIds.clear();
            if (typeof selectedVariantsMap !== 'undefined') selectedVariantsMap.clear();
            if (typeof renderSelectedVariantsTable === 'function') renderSelectedVariantsTable();
            const prodSelectedEl = document.getElementById("prod-selected-label");
            if (prodSelectedEl) prodSelectedEl.innerText = "0";

            // Ngày mặc định: bắt đầu là hiện tại, kết thúc sau 3 ngày
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 3);
            
            document.getElementById("campaign-start-date").value = formatDateTimeLocal(now);
            document.getElementById("campaign-end-date").value = formatDateTimeLocal(future);

            // Nạp bộ lọc và bảng sản phẩm chi tiết
            loadFilters();
            prodCurrentPage = 0;
            loadProductDetailsTable();

            // Chuyển panel
            document.getElementById("list-panel").classList.remove("active");
            document.getElementById("form-panel").classList.add("active");
            
            window.scrollTo(0, 0);
            lucide.createIcons();
        }

        async function openEditCampaignForm(id) {
            try {
                const resCampaign = await fetch(`/api/dot-giam-gia/${id}`);
                if (!resCampaign.ok) throw new Error("Không thể tải thông tin đợt giảm giá");
                const campaign = await resCampaign.json();

                // Điền dữ liệu
                document.getElementById("campaign-id").value = campaign.id;
                document.getElementById("campaign-code").value = campaign.maDotGiamGia;
                document.getElementById("campaign-name").value = campaign.tenDotGiamGia;
                document.getElementById("campaign-discount-value").value = campaign.giaTriGiam || campaign.phanTramGiam || 0;
                document.getElementById("campaign-desc").value = campaign.moTa || "";
                
                const descCharEl = document.getElementById("desc-char-count");
                if (descCharEl) descCharEl.innerText = `${(campaign.moTa || "").length}/500`;

                // Format datetime-local
                document.getElementById("campaign-start-date").value = formatIsoLocalDateTime(campaign.ngayBatDau);
                document.getElementById("campaign-end-date").value = formatIsoLocalDateTime(campaign.ngayKetThuc);

                selectedProductDetailIds.clear();
                if (typeof selectedVariantsMap !== 'undefined') selectedVariantsMap.clear();

                // Lấy danh sách sản phẩm chi tiết đã áp dụng
                const resProdDetails = await fetch(`/api/dot-giam-gia/${id}/product-details`);
                if (resProdDetails.ok) {
                    const variants = await resProdDetails.json();
                    variants.forEach(v => {
                        selectedVariantsMap.set(v.id, v);
                        selectedProductDetailIds.add(v.id);
                    });
                }

                const prodSelectedEl = document.getElementById("prod-selected-label");
                if (prodSelectedEl) prodSelectedEl.innerText = selectedProductDetailIds.size;
                
                if (typeof renderSelectedVariantsTable === 'function') renderSelectedVariantsTable();

                document.getElementById("form-panel-title").innerText = `Chỉnh sửa Đợt giảm giá - Mã: ${campaign.maDotGiamGia || ''}`;

                // Nạp bảng sản phẩm chi tiết
                prodCurrentPage = 0;
                loadProductDetailsTable();

                // Chuyển panel
                document.getElementById("list-panel").classList.remove("active");
                document.getElementById("form-panel").classList.add("active");

                window.scrollTo(0, 0);
                lucide.createIcons();

            } catch (err) {
                Swal.fire('Lỗi', 'Lỗi tải chi tiết: ' + err.message, 'error');
            }
        }

        // Format Date Array hoặc string từ server thành yyyy-MM-ddThh:mm
        function formatIsoLocalDateTime(dateArr) {
            if (!dateArr) return "";
            if (Array.isArray(dateArr)) {
                const yyyy = dateArr[0];
                const MM = String(dateArr[1]).padStart(2, '0');
                const dd = String(dateArr[2]).padStart(2, '0');
                const hh = String(dateArr[3] || 0).padStart(2, '0');
                const mm = String(dateArr[4] || 0).padStart(2, '0');
                return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
            }
            const date = new Date(dateArr);
            if (isNaN(date.getTime())) return dateArr;
            return formatDateTimeLocal(date);
        }

        function backToListPanel() {
            document.getElementById("form-panel").classList.remove("active");
            document.getElementById("list-panel").classList.add("active");
            loadCampaignsTable();
            window.scrollTo(0, 0);
        }

        // Lưu thông tin (Thêm mới / Cập nhật)
        async function saveCampaign(event) {
            event.preventDefault();

            const id = document.getElementById("campaign-id").value;
            const maDotGiamGia = document.getElementById("campaign-code").value.trim();
            const tenDotGiamGia = document.getElementById("campaign-name").value.trim();
            const hinhThucGiam = "%";
            const giaTriGiam = parseInt(document.getElementById("campaign-discount-value").value) || 0;
            const ngayBatDau = document.getElementById("campaign-start-date").value;
            const ngayKetThuc = document.getElementById("campaign-end-date").value;
            const moTa = document.getElementById("campaign-desc").value.trim();

            if (new Date(ngayBatDau) > new Date(ngayKetThuc)) {
                AdminNotify.warning('Ngày bắt đầu phải diễn ra trước ngày kết thúc!');
                return;
            }

            if (selectedProductDetailIds.size === 0) {
                AdminNotify.warning('Bạn phải chọn ít nhất 1 sản phẩm chi tiết để áp dụng đợt giảm giá!');
                return;
            }

            const payload = {
                maDotGiamGia,
                tenDotGiamGia,
                phanTramGiam: giaTriGiam,
                ngayBatDau,
                ngayKetThuc,
                moTa,
                trangThai: 1, // kích hoạt mặc định
                productDetailIds: Array.from(selectedProductDetailIds)
            };

            const url = id ? `/api/dot-giam-gia/${id}` : "/api/dot-giam-gia";
            const method = id ? "PUT" : "POST";

            AdminNotify.confirm({
                title: id ? 'Xác nhận cập nhật?' : 'Xác nhận tạo mới?',
                text: 'Bạn có chắc chắn muốn lưu thông tin đợt giảm giá này?',
                onConfirm: async () => {
                    try {
                        const response = await fetch(url, {
                            method: method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });

                        if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.message || "Lỗi lưu thông tin đợt giảm giá");
                        }

                        AdminNotify.success(id ? "Cập nhật đợt giảm giá thành công!" : "Tạo đợt giảm giá thành công!");
                        backToListPanel();
                    } catch (err) {
                        AdminNotify.error("Thao tác thất bại: " + err.message);
                    }
                }
            });
        }


        // =========================================================================
        // SECTION 3: XỬ LÝ CHỌN SẢN PHẨM CHI TIẾT (PRODUCT SELECTION)
        // =========================================================================

        let selectedVariantsMap = new Map(); // Map<variantId, variantObj>
        let variantsDataCache = new Map(); // Map<variantId, variantObj> - cache to avoid embedding JSON in HTML

        async function loadFilters() {
            try {
                const res = await fetch("/api/dot-giam-gia/filters");
                if (res.ok) {
                    const data = await res.json();
                    
                    const colorSelect = document.getElementById("prod-filter-color");
                    colorSelect.innerHTML = '<option value="">Tất cả màu sắc</option>';
                    if (data.colors) {
                        data.colors.forEach(c => {
                            colorSelect.innerHTML += `<option value="${c}">${c}</option>`;
                        });
                    }

                    const sizeSelect = document.getElementById("prod-filter-size");
                    sizeSelect.innerHTML = '<option value="">Tất cả kích cỡ</option>';
                    const hardcodedSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44];
                    hardcodedSizes.forEach(s => {
                        sizeSelect.innerHTML += `<option value="${s}">${s}</option>`;
                    });
                }
            } catch (e) {
                console.error("Lỗi nạp bộ lọc", e);
            }
        }

        let allFilteredProducts = []; // Cache for frontend filtering

        function applyProdFilters() {
            prodCurrentPage = 0;
            loadProductDetailsTable();
        }

        async function loadProductDetailsTable() {
            const search = document.getElementById("prod-filter-search").value;
            const filterColor = document.getElementById("prod-filter-color").value;
            const filterSize = document.getElementById("prod-filter-size").value;

            // Fetch a large page to allow frontend filtering for color and size
            let url = `/api/dot-giam-gia/san-pham-group?page=0&size=1000`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm");
                const data = await response.json();
                
                const allProducts = data.content || [];
                allFilteredProducts = [];

                allProducts.forEach(sp => {
                    const matchingVariants = (sp.variants || []).filter(v => {
                        const matchColor = !filterColor || (v.tenMauSac && String(v.tenMauSac) === String(filterColor));
                        const matchSize = !filterSize || (v.tenKichCo && String(v.tenKichCo) === String(filterSize));
                        return matchColor && matchSize;
                    });
                    
                    if (matchingVariants.length > 0) {
                        allFilteredProducts.push({
                            ...sp,
                            variants: matchingVariants
                        });
                    }
                });

                prodTotalElements = allFilteredProducts.length;
                prodTotalPages = Math.ceil(prodTotalElements / prodPageSize) || 1;
                
                if (prodCurrentPage >= prodTotalPages) {
                    prodCurrentPage = Math.max(0, prodTotalPages - 1);
                }

                renderProductGroupTablePage();
            } catch (err) {
                console.error(err);
            }
        }

        function renderProductGroupTablePage() {
            const startIndex = prodCurrentPage * prodPageSize;
            const paginatedList = allFilteredProducts.slice(startIndex, startIndex + prodPageSize);
            
            renderProductGroupTable({
                content: paginatedList,
                totalPages: prodTotalPages,
                totalElements: prodTotalElements
            });
        }

        function renderProductGroupTable(pageData) {
            const tbody = document.getElementById("prod-table-body");
            tbody.innerHTML = "";

            const list = pageData.content || [];

            const totalCountEl = document.getElementById("prod-total-count");
            if (totalCountEl) {
                totalCountEl.innerText = `Tổng ${pageData.totalElements} sản phẩm`;
            }

            if (list.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px;">
                            Không tìm thấy sản phẩm nào hoạt động.
                        </td>
                    </tr>
                `;
                renderProdPagination();
                return;
            }

            displayedProductsOnPage = list;

            list.forEach((sp, index) => {
                const filteredVariants = sp.variants || [];
                if (filteredVariants.length === 0) return; // Skip product if no variants match the filter

                // Main product row
                const mainTr = document.createElement("tr");
                mainTr.style.background = "#f8fafc";
                mainTr.style.borderBottom = "1px solid #e2e8f0";
                
                const checkboxTd = `
                    <td style="padding: 12px; text-align: center; width: 40px;">
                        <input type="checkbox" id="cb-prod-main-${sp.id}" onchange="toggleSelectAllVariantsInProduct(${index}, this.checked)" title="Chọn tất cả biến thể của sản phẩm này">
                    </td>
                `;
                
                const toggleTd = `
                    <td style="padding: 12px; text-align: center; width: 40px;">
                        <button type="button" class="btn-toggle-variants" onclick="toggleVariantsRow(${sp.id})" style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; padding: 0;">
                            <i data-lucide="plus" id="icon-toggle-${sp.id}" style="width: 18px; height: 18px;"></i>
                        </button>
                    </td>
                `;
                
                const sttTd = `<td style="font-weight: 500; text-align: center; padding: 12px; color: #64748b;">${prodCurrentPage * prodPageSize + index + 1}</td>`;
                const maTd = `<td style="font-weight: 600; text-align: left; padding: 12px; color: #475569;">${sp.maSanPham || ''}</td>`;
                const spGiamBadge = sp.phanTramGiam ? `<span style="background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 700;">-${sp.phanTramGiam}%</span>` : '';
                const tenTd = `<td style="font-weight: 600; color: #334155; text-align: left; padding: 12px;">${sp.tenSanPham || ''}${spGiamBadge}</td>`;

                mainTr.innerHTML = checkboxTd + sttTd + maTd + tenTd + toggleTd;
                tbody.appendChild(mainTr);
                
                // Variants row
                const variantsTr = document.createElement("tr");
                variantsTr.id = `variants-row-${sp.id}`;
                variantsTr.style.display = "none";
                variantsTr.style.borderBottom = "2px solid #e2e8f0";
                
                let variantsHtml = `
                    <td colspan="5" style="padding: 0; background: #fff;">
                        <div style="padding: 10px 10px 10px 50px; background: #fff; border-left: 3px solid #00adef;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
                                        <th style="padding: 8px; text-align: center; width: 40px;">Chọn</th>
                                        <th style="padding: 8px; text-align: center; width: 60px;">Ảnh</th>
                                        <th style="padding: 8px; text-align: left;">Mã biến thể</th>
                                        <th style="padding: 8px; text-align: left;">Màu sắc</th>
                                        <th style="padding: 8px; text-align: center;">Kích cỡ</th>
                                        <th style="padding: 8px; text-align: center;">Số lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                if (filteredVariants && filteredVariants.length > 0) {
                    filteredVariants.forEach(v => {
                        // Store variant data in JS cache instead of embedding JSON in HTML (prevents rendering crash from special chars)
                        variantsDataCache.set(v.id, v);
                        const isChecked = selectedProductDetailIds.has(v.id) ? "checked" : "";
                        let imgUrl = v.hinhAnh;
                        if (imgUrl && imgUrl.includes(",")) imgUrl = imgUrl.split(",")[0];
                        const hinhSrc = imgUrl || '/images/white.png';
                        const hinhAnh = `<img src="${hinhSrc}" onerror="this.onerror=null;this.src='/images/white.png';" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">`;
                        const safeMauSac = (v.tenMauSac || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const safeMaSP = (v.maSanPham || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const safeKichCo = (v.tenKichCo || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const variantGiamBadge = v.phanTramGiam ? `<span style="background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-bottom: 4px; display: inline-block;">-${v.phanTramGiam}%</span><br>` : '';
                        
                        variantsHtml += `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px; text-align: center;">
                                    <input type="checkbox" class="cb-variant-${sp.id}" data-product-id="${sp.id}" data-variant-id="${v.id}" ${isChecked} onchange="toggleVariantSelect(this)">
                                </td>
                                <td style="padding: 10px; text-align: center;">${hinhAnh}</td>
                                <td style="padding: 10px; text-align: left; font-size: 13px; color: #475569;">${variantGiamBadge}${safeMaSP}</td>
                                <td style="padding: 10px; text-align: left; font-size: 13px;">${safeMauSac}</td>
                                <td style="padding: 10px; text-align: center; font-size: 13px; font-weight: 500;">${safeKichCo}</td>
                                <td style="padding: 10px; text-align: center; font-size: 13px; color: #0f172a;">${v.soLuong !== null ? v.soLuong : '-'}</td>
                            </tr>
                        `;
                    });
                    
                    variantsHtml += `</tbody></table>`;
                } else {
                    variantsHtml += `</tbody></table><div style="color: #64748b; font-size: 13px; padding: 10px;">Sản phẩm này không có biến thể nào đang hoạt động.</div>`;
                }
                
                variantsHtml += `</div></td>`;
                variantsTr.innerHTML = variantsHtml;
                tbody.appendChild(variantsTr);
            });

            renderProdPagination();
            lucide.createIcons();
        }

        function toggleVariantsRow(productId) {
            const row = document.getElementById(`variants-row-${productId}`);
            const icon = document.getElementById(`icon-toggle-${productId}`);
            if (row.style.display === "none") {
                row.style.display = "table-row";
                icon.setAttribute("data-lucide", "minus");
            } else {
                row.style.display = "none";
                icon.setAttribute("data-lucide", "plus");
            }
            lucide.createIcons();
        }

        function toggleSelectAllVariantsInProduct(index, isChecked) {
            const sp = displayedProductsOnPage[index];
            if (!sp || !sp.variants) return;
            
            const checkboxes = document.querySelectorAll(`.cb-variant-${sp.id}`);
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
                toggleVariantSelect(cb);
            });
        }

        function toggleSelectAllProducts(isChecked) {
            displayedProductsOnPage.forEach((sp, index) => {
                const prodCheckbox = document.getElementById(`cb-prod-main-${sp.id}`);
                if (prodCheckbox) {
                    prodCheckbox.checked = isChecked;
                    toggleSelectAllVariantsInProduct(index, isChecked);
                }
            });
        }

        function toggleVariantSelect(checkboxElement) {
            const variantId = parseInt(checkboxElement.getAttribute("data-variant-id"));
            const isChecked = checkboxElement.checked;
            
            if (isChecked) {
                const variantData = variantsDataCache.get(variantId);
                if (variantData) {
                    selectedVariantsMap.set(variantId, variantData);
                }
                selectedProductDetailIds.add(variantId);
            } else {
                selectedVariantsMap.delete(variantId);
                selectedProductDetailIds.delete(variantId);
            }

            const selectedLabelEl = document.getElementById("prod-selected-label");
            if (selectedLabelEl) {
                selectedLabelEl.innerText = selectedVariantsMap.size;
            }
            
            const productId = checkboxElement.getAttribute("data-product-id");
            if (productId) {
                updateParentCheckbox(productId);
            }
            
            renderSelectedVariantsTable();
        }

        function updateParentCheckbox(productId) {
            const prodCheckbox = document.getElementById(`cb-prod-main-${productId}`);
            if (!prodCheckbox) return;
            
            const variantCheckboxes = document.querySelectorAll(`.cb-variant-${productId}`);
            if (variantCheckboxes.length === 0) return;
            
            let checkedCount = 0;
            variantCheckboxes.forEach(cb => {
                if (cb.checked) checkedCount++;
            });
            
            if (checkedCount === 0) {
                prodCheckbox.checked = false;
                prodCheckbox.indeterminate = false;
            } else if (checkedCount === variantCheckboxes.length) {
                prodCheckbox.checked = true;
                prodCheckbox.indeterminate = false;
            } else {
                prodCheckbox.checked = false;
                prodCheckbox.indeterminate = true;
            }
        }

        function calculateDiscountedPrice(originalPrice) {
            const giamGiaValue = parseInt(document.getElementById("campaign-discount-value").value) || 0;
            if (giamGiaValue > 0 && giamGiaValue <= 100) {
                const discountAmount = originalPrice * (giamGiaValue / 100);
                return originalPrice - discountAmount;
            }
            return originalPrice;
        }

        function renderSelectedVariantsTable() {
            const tbody = document.getElementById("selected-variants-body");
            tbody.innerHTML = "";
            
            const countEl = document.getElementById("selected-variants-count");
            if (countEl) countEl.innerText = selectedVariantsMap.size;
            
            if (selectedVariantsMap.size === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; color: #94a3b8; padding: 32px 16px;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <i data-lucide="check-circle" style="width: 38px; height: 38px; color: #cbd5e1;"></i>
                                <span>Chưa có sản phẩm/biến thể nào được chọn.</span>
                            </div>
                        </td>
                    </tr>
                `;
                lucide.createIcons();
                return;
            }
            
            let stt = 1;
            selectedVariantsMap.forEach((v, id) => {
                const tr = document.createElement("tr");
                
                let imgUrl = v.hinhAnh;
                if (imgUrl && imgUrl.includes(",")) imgUrl = imgUrl.split(",")[0];
                const hinhSrc = imgUrl || '/images/white.png';
                const hinhAnh = `<img src="${hinhSrc}" onerror="this.onerror=null;this.src='/images/white.png';" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;">`;
                
                const discountedPrice = calculateDiscountedPrice(v.giaBan);
                
                const deleteBtn = `
                    <button type="button" class="action-icon-btn" style="color: #ef4444; background: #fee2e2; border-radius: 4px; padding: 4px;" title="Xóa" onclick="removeSelectedVariant(${v.id})">
                        <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                    </button>
                `;
                
                tr.innerHTML = `
                    <td style="text-align: center; font-weight: 500; color: #64748b;">${stt++}</td>
                    <td style="text-align: center;">${hinhAnh}</td>
                    <td style="font-weight: 600; color: #475569;">${v.maSanPham}</td>
                    <td style="font-weight: 600; color: #0f172a;">${v.tenSanPham}</td>
                    <td style="color: #475569; font-size: 13px;">${v.maSanPham}</td>
                    <td>${v.tenMauSac}</td>
                    <td style="text-align: center; font-weight: 500;">${v.tenKichCo}</td>
                    <td style="text-align: right; color: #64748b; text-decoration: line-through;">${formatCurrency(v.giaBan)}</td>
                    <td style="text-align: right; color: #e11d48; font-weight: 700;">${formatCurrency(discountedPrice)}</td>
                    <td style="text-align: center; font-weight: 500;">${v.soLuong !== null ? v.soLuong : '-'}</td>
                    <td style="text-align: center;">${deleteBtn}</td>
                `;
                tbody.appendChild(tr);
            });
            
            lucide.createIcons();
        }

        function removeSelectedVariant(variantId) {
            selectedVariantsMap.delete(variantId);
            selectedProductDetailIds.delete(variantId);
            
            const selectedLabelEl = document.getElementById("prod-selected-label");
            if (selectedLabelEl) selectedLabelEl.innerText = selectedVariantsMap.size;
            
            const cb = document.querySelector(`input[data-variant-id="${variantId}"]`);
            if (cb) cb.checked = false;
            
            renderSelectedVariantsTable();
        }

        document.getElementById("campaign-discount-value").addEventListener("input", () => {
            renderSelectedVariantsTable();
        });

        function renderProdPagination() {
            AdminUtils.renderPagination("prod-pagination", prodCurrentPage, prodTotalPages, (page) => {
                prodCurrentPage = page;
                renderProductGroupTablePage();
            });
        }

        function changeProdPageSize() {
            const sizeSelect = document.getElementById("prod-page-size");
            if (sizeSelect) {
                prodPageSize = parseInt(sizeSelect.value);
                prodTotalPages = Math.ceil(prodTotalElements / prodPageSize) || 1;
                prodCurrentPage = 0;
                renderProductGroupTablePage();
            }
        }

        function applyProdFilters() {
            prodCurrentPage = 0;
            loadProductDetailsTable();
        }

        window.exportCampaignsExcel = function() {
            AdminNotify.info("Chức năng xuất danh sách đợt giảm giá ra file Excel đang được hoàn thiện.");
        };
