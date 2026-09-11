        let mainChartInstance = null;
        let orderStatusChartInstance = null;
        let currentMainChartType = 'bar'; // 'bar' or 'line'

        document.addEventListener("DOMContentLoaded", () => {
            lucide.createIcons();
            
            // Set default range to 'Tháng này'
            setQuickDateRange('month');

            initCharts();
            loadThongKeData();
            
            // Event Listeners for Quick Date Buttons
            document.getElementById('btn-quick-today').addEventListener('click', (e) => { setActiveQuickBtn(e.target); setQuickDateRange('today'); loadThongKeData(); });
            document.getElementById('btn-quick-7days').addEventListener('click', (e) => { setActiveQuickBtn(e.target); setQuickDateRange('7days'); loadThongKeData(); });
            document.getElementById('btn-quick-month').addEventListener('click', (e) => { setActiveQuickBtn(e.target); setQuickDateRange('month'); loadThongKeData(); });
            document.getElementById('btn-quick-last-month').addEventListener('click', (e) => { setActiveQuickBtn(e.target); setQuickDateRange('last-month'); loadThongKeData(); });
            document.getElementById('btn-quick-year').addEventListener('click', (e) => { setActiveQuickBtn(e.target); setQuickDateRange('year'); loadThongKeData(); });

            // Date picker change events
            document.getElementById('filter-start').addEventListener('change', () => loadThongKeData());
            document.getElementById('filter-end').addEventListener('change', () => loadThongKeData());
            document.getElementById('filter-tong-quan-mode').addEventListener('change', () => loadThongKeData());
            if (document.getElementById('filter-thuong-hieu-select')) {
                document.getElementById('filter-thuong-hieu-select').addEventListener('change', () => loadThongKeData());
            }

            // Reset button
            document.getElementById('btn-reset-filter').addEventListener('click', () => {
                if (document.getElementById('filter-thuong-hieu-select')) document.getElementById('filter-thuong-hieu-select').value = '';
                if (document.getElementById('filter-thuong-hieu-search')) document.getElementById('filter-thuong-hieu-search').value = '';
                document.getElementById('filter-tong-quan-mode').value = 'day';
                setActiveQuickBtn(document.getElementById('btn-quick-month'));
                setQuickDateRange('month');
                loadThongKeData();
            });

            // Sync revenue button
            document.getElementById('btn-sync-data').addEventListener('click', () => {
                loadThongKeData();
            });

            // Chart toggle buttons
            document.getElementById('btn-main-chart-bar').addEventListener('click', () => {
                currentMainChartType = 'bar';
                document.getElementById('btn-main-chart-bar').classList.add('active');
                document.getElementById('btn-main-chart-line').classList.remove('active');
                loadThongKeData();
            });
            document.getElementById('btn-main-chart-line').addEventListener('click', () => {
                currentMainChartType = 'line';
                document.getElementById('btn-main-chart-line').classList.add('active');
                document.getElementById('btn-main-chart-bar').classList.remove('active');
                loadThongKeData();
            });
        });

        function setActiveQuickBtn(activeBtn) {
            document.querySelectorAll('.btn-quick-date').forEach(btn => btn.classList.remove('active'));
            if (activeBtn) activeBtn.classList.add('active');
        }

        function setQuickDateRange(rangeType) {
            const today = new Date();
            let start = new Date();
            let end = new Date();

            if (rangeType === 'today') {
                start = today;
                end = today;
            } else if (rangeType === '7days') {
                start = new Date(today);
                start.setDate(today.getDate() - 6);
                end = today;
            } else if (rangeType === 'month') {
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
            } else if (rangeType === 'last-month') {
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
            } else if (rangeType === 'year') {
                start = new Date(today.getFullYear(), 0, 1);
                end = today;
            }

            document.getElementById('filter-start').value = formatDateStr(start);
            document.getElementById('filter-end').value = formatDateStr(end);
        }

        function formatDateStr(d) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatDateDisplay(dateStr) {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        }

        function updateLastSyncTime() {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            document.getElementById('last-update-time').innerText = timeStr;
        }

        function initCharts() {
            // Main Chart Initial Configuration
            const ctxMain = document.getElementById('mainChart').getContext('2d');
            mainChartInstance = new Chart(ctxMain, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Sản phẩm / Doanh thu',
                        data: [],
                        backgroundColor: '#ef4444',
                        borderColor: '#dc2626',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            // Order Status Initial Configuration
            const ctxStatus = document.getElementById('orderStatusChart').getContext('2d');
            orderStatusChartInstance = new Chart(ctxStatus, {
                type: 'pie',
                data: {
                    labels: ['Chờ xác nhận', 'Hoàn thành', 'Hủy', 'Đã xác nhận', 'Giao hàng thất bại'],
                    datasets: [{
                        data: [1, 1, 1, 1, 1],
                        backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4'],
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 10,
                                font: { size: 12 }
                            }
                        }
                    }
                }
            });
        }

        function loadThongKeData() {
            const start = document.getElementById('filter-start').value;
            const end = document.getElementById('filter-end').value;
            
            // Update info display range
            document.getElementById('filter-info-range').innerText = 
                `Đang hiển thị dữ liệu tổng quan từ ngày ${formatDateDisplay(start)} đến ngày ${formatDateDisplay(end)}`;
            
            updateLastSyncTime();

            let queryParams = '';
            if (start && end) {
                queryParams = `?startDate=${start}T00:00:00&endDate=${end}T23:59:59`;
            } else if (start) {
                queryParams = `?startDate=${start}T00:00:00`;
            } else if (end) {
                queryParams = `?endDate=${end}T23:59:59`;
            }

            // 1. Fetch Tong Quan Metrics
            fetch(`/api/thong-ke/tong-quan${queryParams}`)
                .then(res => res.json())
                .then(data => {
                    document.getElementById('kpi-tong-doanh-thu').innerText = formatCurrency(data.tongDoanhThu);
                    document.getElementById('kpi-tong-tien-mat').innerText = formatCurrency(data.tongTienMat != null ? data.tongTienMat : data.tongDoanhThu);
                    document.getElementById('kpi-tong-chuyen-khoan').innerText = formatCurrency(data.tongTienChuyenKhoan != null ? data.tongTienChuyenKhoan : 0);
                    
                    document.getElementById('kpi-tong-don').innerText = (data.tongDonHang || 0).toLocaleString('vi-VN');
                    document.getElementById('kpi-aov').innerText = formatCurrency(data.giaTriTrungBinhDon || 0);
                    document.getElementById('kpi-sp-da-ban').innerText = (data.sanPhamDaBan || 0).toLocaleString('vi-VN');
                    document.getElementById('kpi-khach-moi').innerText = (data.khachMoi || 0).toLocaleString('vi-VN');
                })
                .catch(err => console.error("Error loading tong quan stats:", err));

            // 2. Fetch Bieu Do Main (Sales per Day)
            fetch(`/api/thong-ke/bieu-do${queryParams}`)
                .then(res => res.json())
                .then(data => {
                    let labels = [];
                    let values = [];

                    if (start && end) {
                        const [sYear, sMonth, sDay] = start.split('-').map(Number);
                        const [eYear, eMonth, eDay] = end.split('-').map(Number);
                        const startDate = new Date(sYear, sMonth - 1, sDay);
                        const endDate = new Date(eYear, eMonth - 1, eDay);

                        let currentDate = new Date(startDate);
                        const dataMap = {};
                        (data || []).forEach(item => {
                            dataMap[item.ngay] = item.doanhThu;
                        });

                        while (currentDate <= endDate) {
                            const year = currentDate.getFullYear();
                            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                            const day = String(currentDate.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${day}`;

                            labels.push(day + '/' + month);
                            values.push(dataMap[dateStr] || 0);

                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    } else {
                        labels = (data || []).map(item => item.ngay);
                        values = (data || []).map(item => item.doanhThu);
                    }

                    if (mainChartInstance) {
                        mainChartInstance.destroy();
                    }

                    const ctxMain = document.getElementById('mainChart').getContext('2d');
                    if (currentMainChartType === 'bar') {
                        mainChartInstance = new Chart(ctxMain, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Doanh thu',
                                    data: values,
                                    backgroundColor: '#ef4444',
                                    borderColor: '#dc2626',
                                    borderWidth: 1,
                                    borderRadius: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                    x: { grid: { display: false } }
                                }
                            }
                        });
                    } else {
                        mainChartInstance = new Chart(ctxMain, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Doanh thu',
                                    data: values,
                                    borderColor: '#ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderWidth: 2,
                                    tension: 0.3,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                    x: { grid: { display: false } }
                                }
                            }
                        });
                    }
                })
                .catch(err => console.error("Error loading main chart:", err));

            // 3. Fetch Order Status Data (Cơ cấu trạng thái đơn hàng)
            fetch(`/api/thong-ke/trang-thai${queryParams}`)
                .then(res => res.json())
                .then(data => {
                    renderOrderStatusChart(data || []);
                })
                .catch(err => {
                    console.error("Error loading order status stats:", err);
                    renderOrderStatusChart([]);
                });

            // 4. Load Top Products
            loadTopSanPhamData();
        }

        const STATUS_DEFINITIONS = [
            { key: 'cho_xac_nhan', codes: [0], name: 'Chờ xác nhận', color: '#ef4444' },
            { key: 'hoan_thanh', codes: [5, 6], name: 'Hoàn thành', color: '#f97316' },
            { key: 'huy', codes: [7, 8], name: 'Hủy', color: '#f59e0b' },
            { key: 'da_xac_nhan', codes: [1], name: 'Đã xác nhận', color: '#10b981' },
            { key: 'that_bai', codes: [4], name: 'Giao hàng thất bại', color: '#06b6d4' },
            { key: 'dang_giao', codes: [2, 3], name: 'Đang giao', color: '#3b82f6' },
            { key: 'hoan_tien', codes: [9], name: 'Đã hoàn tiền', color: '#8b5cf6' }
        ];

        function renderOrderStatusChart(data) {
            const rawList = data || [];
            
            const items = STATUS_DEFINITIONS.map(def => {
                let total = 0;
                rawList.forEach(row => {
                    if (def.codes.includes(row.trangThai)) {
                        total += (row.soLuong || 0);
                    }
                });
                return {
                    name: def.name,
                    color: def.color,
                    count: total
                };
            });

            // Priority display: Always include the 5 standard statuses from reference mockup, plus any status with count > 0
            const standardNames = ['Chờ xác nhận', 'Hoàn thành', 'Hủy', 'Đã xác nhận', 'Giao hàng thất bại'];
            let displayItems = items.filter(it => standardNames.includes(it.name) || it.count > 0);

            const labels = displayItems.map(it => it.name);
            const values = displayItems.map(it => it.count);
            const colors = displayItems.map(it => it.color);

            const totalCount = values.reduce((a, b) => a + b, 0);
            const chartData = (totalCount === 0) ? displayItems.map(() => 1) : values;

            if (orderStatusChartInstance) {
                orderStatusChartInstance.destroy();
            }

            const ctxStatus = document.getElementById('orderStatusChart').getContext('2d');
            orderStatusChartInstance = new Chart(ctxStatus, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: colors,
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 10,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const actualVal = values[context.dataIndex] || 0;
                                    return ` ${context.label}: ${actualVal} đơn`;
                                }
                            }
                        }
                    }
                }
            });

            // Render 2-column grid cards
            const gridEl = document.getElementById('orderStatusGrid');
            if (gridEl) {
                gridEl.innerHTML = displayItems.map(it => `
                    <div class="status-item-card">
                        <div class="status-item-left">
                            <span class="status-dot" style="background-color: ${it.color};"></span>
                            <span>${it.name}</span>
                        </div>
                        <span class="status-item-count">${it.count}</span>
                    </div>
                `).join('');
            }
        }

        // Top San Pham Data & Pagination
        let allTopSanPham = [];
        let currentTopSpPage = 1;
        const topSpItemsPerPage = 5;

        function loadTopSanPhamData() {
            const start = document.getElementById('filter-start').value;
            const end = document.getElementById('filter-end').value;
            let url = `/api/thong-ke/top-san-pham?1=1`;
            
            if (start) url += `&startDate=${start}T00:00:00`;
            if (end) url += `&endDate=${end}T23:59:59`;
            
            const chatLieu = document.getElementById('filter-chat-lieu')?.value;
            if (chatLieu) url += `&idChatLieu=${chatLieu}`;
            
            const thuongHieu = document.getElementById('filter-thuong-hieu')?.value;
            if (thuongHieu) url += `&idThuongHieu=${thuongHieu}`;
            
            const loaiGiay = document.getElementById('filter-loai-giay')?.value;
            if (loaiGiay) url += `&idLoaiGiay=${loaiGiay}`;
            
            const kichCo = document.getElementById('filter-kich-co')?.value;
            if (kichCo) url += `&idCoGiay=${kichCo}`;
            
            const mauSac = document.getElementById('filter-mau-sac')?.value;
            if (mauSac) url += `&idMauSac=${mauSac}`;
            
            const danhMuc = document.getElementById('filter-danh-muc')?.value;
            if (danhMuc) url += `&idDanhMuc=${danhMuc}`;
            
            const trangThai = document.getElementById('filter-trang-thai')?.value;
            if (trangThai !== "" && trangThai !== undefined) url += `&trangThai=${trangThai}`;

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    allTopSanPham = data || [];
                    renderTopSanPhamTable(1);
                })
                .catch(err => console.error("Error loading top sp:", err));
        }

        document.addEventListener("DOMContentLoaded", () => {
            const btnLocTopSp = document.getElementById('btn-loc-top-sp');
            if (btnLocTopSp) {
                btnLocTopSp.addEventListener('click', () => {
                    loadTopSanPhamData();
                });
            }
        });

        function renderTopSanPhamTable(page) {
            const tbody = document.getElementById('top-sp-body');
            const paginationDiv = document.getElementById('top-sp-pagination');
            
            if (!allTopSanPham || allTopSanPham.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">Không có dữ liệu.</td></tr>';
                paginationDiv.innerHTML = '';
                return;
            }
            
            const totalPages = Math.ceil(allTopSanPham.length / topSpItemsPerPage);
            if (page < 1) page = 1;
            if (page > totalPages) page = totalPages;
            currentTopSpPage = page;
            
            const startIdx = (page - 1) * topSpItemsPerPage;
            const endIdx = startIdx + topSpItemsPerPage;
            const pageData = allTopSanPham.slice(startIdx, endIdx);
            
            let html = '';
            pageData.forEach((sp, index) => {
                html += `
                    <tr>
                        <td>${startIdx + index + 1}</td>
                        <td style="font-weight: 500;">${sp.maSanPham || '-'}</td>
                        <td>${sp.tenSanPham || '-'}</td>
                        <td><span class="badge badge-cash">${sp.thuocTinh || '-'}</span></td>
                        <td>${formatCurrency(sp.donGia)}</td>
                        <td style="text-align: center;">${sp.tonKho || 0}</td>
                        <td style="text-align: center; font-weight: 600; color: #16a34a;">${sp.daBan || 0}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            
            if (totalPages <= 1) {
                paginationDiv.innerHTML = '';
                return;
            }
            
            let pageHtml = '';
            pageHtml += `<button class="btn-outline" style="padding: 4px 10px;" onclick="renderTopSanPhamTable(${currentTopSpPage - 1})" ${currentTopSpPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentTopSpPage) {
                    pageHtml += `<button class="btn-outline active" style="padding: 4px 10px; background-color: #ef4444; border-color: #ef4444; color: #fff;">${i}</button>`;
                } else {
                    pageHtml += `<button class="btn-outline" style="padding: 4px 10px;" onclick="renderTopSanPhamTable(${i})">${i}</button>`;
                }
            }
            
            pageHtml += `<button class="btn-outline" style="padding: 4px 10px;" onclick="renderTopSanPhamTable(${currentTopSpPage + 1})" ${currentTopSpPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
            
            paginationDiv.innerHTML = pageHtml;
        }

        function formatCurrency(val) {
            if (val === null || val === undefined) return '0 ₫';
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
        }
