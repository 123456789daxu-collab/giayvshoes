        let allGiaoCa = [];

        function setupNumberFormatting(inputIds) {
            inputIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', function() {
                        let val = this.value.replace(/[^\d\-]/g, '');
                        if (val !== '' && val !== '-') {
                            this.value = parseInt(val, 10).toLocaleString('vi-VN');
                        } else {
                            this.value = val;
                        }
                    });
                }
            });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            setupNumberFormatting(['dashTienBanGiao', 'tienBanDauMoCa', 'tienBanGiao', 'tienPhatSinh']);
        });

        function formatTimeDate(dateString) {
            if (!dateString) return null;
            const d = new Date(dateString);
            const time = d.toTimeString().substring(0, 8); // HH:mm:ss
            const date = d.toLocaleDateString('vi-VN'); // DD/MM/YYYY
            return { time, date };
        }

        function formatCurrency(amount) {
            if (amount === null || amount === undefined) return "0 đ";
            return amount.toLocaleString('vi-VN') + " đ";
        }

        let activeShift = null;

        function bindDashboard(data, transactions) {
            document.getElementById('dashboardMaCa').innerText = data.maGiaoCa || "N/A";
            const td = formatTimeDate(data.thoiGianNhanCa);
            const timeStr = td ? `${td.time} ${td.date}` : "N/A";
            document.getElementById('dashboardThoiGianVao').innerText = timeStr;
            const nvHoTen = data.nhanVienNhan ? data.nhanVienNhan.hoTen : "N/A";
            document.getElementById('dashboardNhanVien').innerText = nvHoTen;
            
            document.getElementById('dashNVGiao').innerText = nvHoTen;
            document.getElementById('dashNVVao').innerText = "Vào ca: " + timeStr;

            const tienBanDau = data.tienBanDau || 0;
            const tienBanGiao = data.tienBanGiao || 0; // Accumulated total cash
            const doanhThuMat = tienBanGiao > 0 ? (tienBanGiao - tienBanDau) : 0;
            const tienHeThong = tienBanDau + doanhThuMat;

            const doanhThuCK = 0; // Mock

            document.getElementById('dashTienDauCa').innerText = formatCurrency(tienBanDau);
            document.getElementById('dashDoanhThuTienMat').innerText = "+" + formatCurrency(doanhThuMat);
            document.getElementById('dashDoanhThuCK').innerText = "+" + formatCurrency(doanhThuCK);
            
            document.getElementById('dashTienHeThong').innerText = formatCurrency(tienHeThong);
            
            let tbody = '';
            if (transactions && transactions.length > 0) {
                transactions.forEach(tx => {
                    const txtime = formatTimeDate(tx.ngayThanhToan || tx.ngayTao);
                    const txtimestr = txtime ? `${txtime.time} ${txtime.date}` : "";
                    const amnt = tx.tongTienThanhToan || 0;
                    tbody += `<tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${txtimestr}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b;">${tx.maHoaDon}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Doanh thu bán hàng</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #1e293b;">${formatCurrency(amnt)}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span style="background: #f0fdf4; color: #16a34a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">Tiền mặt</span></td>
                    </tr>`;
                });
            } else {
                tbody = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #94a3b8;">Chưa có hóa đơn nào trong ca này</td></tr>';
            }
            document.getElementById('dashTransactionBody').innerHTML = tbody;

            const inputTienThucTe = document.getElementById('dashTienBanGiao');
            const elThucTe = document.getElementById('dashTienThucTe');
            const elChenhLech = document.getElementById('dashChenhLech');
            const elChenhLechTxt = document.getElementById('dashChenhLechTxt');

            const calcDiff = () => {
                const thucTe = parseInt(inputTienThucTe.value.replace(/\./g, '')) || 0;
                elThucTe.innerText = formatCurrency(thucTe);
                const diff = thucTe - tienHeThong;
                
                if (diff === 0) {
                    elChenhLech.innerText = "+0 đ";
                    elChenhLech.style.color = "#15803d";
                    elChenhLechTxt.innerText = "(Khớp)";
                    elChenhLechTxt.style.color = "#16a34a";
                } else if (diff > 0) {
                    elChenhLech.innerText = "+" + formatCurrency(diff);
                    elChenhLech.style.color = "#15803d";
                    elChenhLechTxt.innerText = "(Thừa)";
                    elChenhLechTxt.style.color = "#16a34a";
                } else {
                    elChenhLech.innerText = formatCurrency(diff);
                    elChenhLech.style.color = "#dc2626";
                    elChenhLechTxt.innerText = "(Thiếu)";
                    elChenhLechTxt.style.color = "#ef4444";
                }
            };
            
            if(inputTienThucTe._calcDiffHandler) {
                inputTienThucTe.removeEventListener('input', inputTienThucTe._calcDiffHandler);
            }
            inputTienThucTe._calcDiffHandler = calcDiff;
            inputTienThucTe.addEventListener('input', calcDiff);
            inputTienThucTe.value = tienHeThong.toLocaleString('vi-VN');
            calcDiff();

            const selectNhanVienNhan = document.getElementById('dashNhanVienNhan');
            if(!selectNhanVienNhan._boundHandler) {
                selectNhanVienNhan._boundHandler = true;
                selectNhanVienNhan.addEventListener('change', (e) => {
                    if(e.target.value) {
                        const text = e.target.options[e.target.selectedIndex].text;
                        document.getElementById('dashDisplayNVNhan').innerText = text.split('- ')[1] || text;
                    } else {
                        document.getElementById('dashDisplayNVNhan').innerText = "Chưa nhận";
                    }
                });
            }
            document.getElementById('dashDisplayNVNhan').innerText = "Chưa nhận";
        }

        let allLichLamViec = [];

        function loadGiaoCa() {
            Promise.all([
                fetch('/api/giao-ca').then(res => res.json()),
                fetch('/api/lich-lam-viec').then(res => res.json())
            ])
            .then(([giaoCaData, lichData]) => {
                allGiaoCa = giaoCaData;
                allLichLamViec = lichData;
                renderGiaoCaTable(giaoCaData);
            })
            .catch(err => {
                document.getElementById('giaoCaTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">Lỗi tải dữ liệu</td></tr>';
            });
        }

        function renderGiaoCaTable(data) {
            const tbody = document.getElementById('giaoCaTableBody');
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">Chưa có dữ liệu</td></tr>';
                return;
            }

            let html = '';
            data.forEach((item, index) => {
                const nvName = item.nhanVienNhan ? item.nhanVienNhan.hoTen : "Admin";
                const nvCode = item.nhanVienNhan ? item.nhanVienNhan.maNhanVien : "ADMIN";
                const initial = nvName.charAt(0).toUpperCase();

                const timeIn = formatTimeDate(item.thoiGianNhanCa);
                const dateNhanCa = item.thoiGianNhanCa ? new Date(item.thoiGianNhanCa) : null;
                const dateStr = dateNhanCa ? dateNhanCa.getFullYear() + "-" + String(dateNhanCa.getMonth() + 1).padStart(2, '0') + "-" + String(dateNhanCa.getDate()).padStart(2, '0') : null;
                const nhanVienId = item.nhanVienNhan ? item.nhanVienNhan.id : null;
                
                const matchedLich = allLichLamViec.find(l => 
                    l.nhanVien && l.nhanVien.id === nhanVienId && l.ngayLamViec === dateStr
                );
                
                let shiftName = "";
                let lateMinutes = 0;
                let earlyMinutes = 0;

                if (matchedLich && matchedLich.caLam) {
                    shiftName = matchedLich.caLam.tenCa;
                    const tStartStr = matchedLich.caLam.thoiGianBatDau; // "19:00:00"
                    const tEndStr = matchedLich.caLam.thoiGianKetThuc;
                    
                    if (tStartStr && item.thoiGianNhanCa) {
                        const shiftStartDate = new Date(`${dateStr}T${tStartStr}`);
                        const diffMs = dateNhanCa - shiftStartDate;
                        if (diffMs > 0) lateMinutes = Math.floor(diffMs / 60000);
                    }
                    
                    if (tEndStr && item.thoiGianGiaoCa) {
                        const dateGiaoCa = new Date(item.thoiGianGiaoCa);
                        const shiftEndDate = new Date(`${dateStr}T${tEndStr}`);
                        const diffMs = shiftEndDate - dateGiaoCa;
                        if (diffMs > 0) earlyMinutes = Math.floor(diffMs / 60000);
                    }
                }

                let lateHtml = lateMinutes > 0 ? `<div style="background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px; white-space: nowrap;">Đi muộn ${lateMinutes} phút</div>` : '';
                let earlyHtml = earlyMinutes > 0 ? `<div style="background: #fef9c3; color: #eab308; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px; white-space: nowrap;">Ra sớm ${earlyMinutes} phút</div>` : '';

                const inHtml = timeIn ? `
                    <div style="display: flex; align-items: flex-start; justify-content: center; gap: 6px;">
                        <i data-lucide="log-in" style="width: 18px; height: 18px; color: #10b981; margin-top: 3px;"></i>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #1e293b;">${timeIn.time.substring(0,5)}</div>
                            <div style="font-size: 13px; color: #64748b;">${timeIn.date}</div>
                            ${lateHtml}
                        </div>
                    </div>` : "-";

                const timeOut = formatTimeDate(item.thoiGianGiaoCa);
                const outHtml = timeOut ? `
                    <div style="display: flex; align-items: flex-start; justify-content: center; gap: 6px;">
                        <i data-lucide="log-out" style="width: 18px; height: 18px; color: #f59e0b; margin-top: 3px;"></i>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #1e293b;">${timeOut.time.substring(0,5)}</div>
                            <div style="font-size: 13px; color: #64748b;">${timeOut.date}</div>
                            ${earlyHtml}
                        </div>
                    </div>` : "-";

                const doanhThuMat = (item.tienBanGiao || 0) > 0 ? ((item.tienBanGiao || 0) - (item.tienBanDau || 0)) : 0;
                const doanhThuCK = 0;
                const total = doanhThuMat + doanhThuCK;

                const statusHtml = item.trangThai === 0 
                    ? `<span style="background: #ffedd5; color: #ea580c; padding: 6px 12px; border-radius: 99px; font-weight: 600; font-size: 13px; white-space: nowrap;">Đang làm</span>`
                    : `<span style="background: #dcfce7; color: #16a34a; padding: 6px 12px; border-radius: 99px; font-weight: 600; font-size: 13px; white-space: nowrap;">Đã kết ca</span>`;

                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9; background: white; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <td style="padding: 20px 24px; text-align: center; color: #64748b;">${index + 1}</td>
                        <td style="padding: 20px 24px;">
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <div style="width: 40px; height: 40px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0;">${initial}</div>
                                <div>
                                    <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${nvName}</div>
                                    <div style="font-size: 13px; color: #64748b;">(${nvCode})</div>
                                    ${shiftName ? `<div style="font-size: 13px; color: #64748b;">${shiftName}</div>` : ''}
                                </div>
                            </div>
                        </td>
                        <td style="padding: 20px 24px; text-align: center;">${inHtml}</td>
                        <td style="padding: 20px 24px; text-align: center;">${outHtml}</td>
                        <td style="padding: 20px 24px; text-align: right;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 14px; margin-bottom: 4px;">${formatCurrency(total)}</div>
                            <div style="font-size: 13px; color: #16a34a; font-weight: 500;">Tiền mặt: ${formatCurrency(doanhThuMat)}</div>
                            <div style="font-size: 13px; color: #3b82f6; font-weight: 500;">Chuyển khoản: ${formatCurrency(doanhThuCK)}</div>
                        </td>
                        <td style="padding: 20px 24px; text-align: center;">${statusHtml}</td>
                        <td style="padding: 20px 24px; color: #64748b; font-size: 13px;">${item.ghiChu || ""}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            lucide.createIcons();
        }

        function checkActiveShift() {
            const urlParams = new URLSearchParams(window.location.search);
            const viewMode = urlParams.get('view');
            
            if (viewMode === 'history') {
                document.getElementById('historyView').style.display = 'block';
                document.getElementById('moCaView').style.display = 'none';
                document.getElementById('activeShiftDashboard').style.display = 'none';
                document.getElementById('pageTopTitle').innerText = 'Lịch sử hoạt động';
                
                const statusBadge = document.getElementById('topStatusBadge');
                if (statusBadge) statusBadge.style.display = 'none';
                
                return;
            }

            fetch('/api/giao-ca/active')
                .then(res => {
                    if(res.status === 200) {
                        return res.json();
                    }
                    return null;
                })
                .then(data => {
                    if(data) {
                        activeShift = data;
                        document.getElementById('historyView').style.display = 'none';
                        document.getElementById('moCaView').style.display = 'none';
                        document.getElementById('activeShiftDashboard').style.display = 'block';
                        document.getElementById('pageTopTitle').innerText = 'Bàn giao ca';
                        document.getElementById('topStatusText').innerText = 'Giao ca';
                        
                        // Fetch transactions
                        fetch(`/api/giao-ca/${data.id}/hoa-don`)
                            .then(res => res.json())
                            .then(txs => {
                                bindDashboard(data, txs);
                            })
                            .catch(err => {
                                bindDashboard(data, []);
                            });
                    } else {
                        activeShift = null;
                        document.getElementById('historyView').style.display = 'none';
                        document.getElementById('activeShiftDashboard').style.display = 'none';
                        document.getElementById('moCaView').style.display = 'flex';
                        document.getElementById('txtNgayMoCa').innerText = new Date().toLocaleDateString('vi-VN');
                        document.getElementById('pageTopTitle').innerText = 'Mở ca làm việc';
                        document.getElementById('topStatusText').innerText = 'Mở ca';
                    }
                })
                .catch(err => console.log('Error checking active shift', err));
        }

        document.addEventListener("DOMContentLoaded", function() {
            lucide.createIcons();
            checkActiveShift();
            loadGiaoCa();
            
            // Set default dates
            const today = new Date().toISOString().substring(0, 10);
            document.getElementById('dateFrom').value = today;
            document.getElementById('dateTo').value = today;

            // Load employees for select
            fetch('/api/nhan-vien')
                .then(res => res.json())
                .then(data => {
                    const selectMoCa = document.getElementById('nhanVienMoCa');
                    const selectDashNhan = document.getElementById('dashNhanVienNhan');
                    data.forEach(nv => {
                        const opt = `<option value="${nv.id}">${nv.maNhanVien} - ${nv.hoTen}</option>`;
                        selectMoCa.innerHTML += opt;
                        selectDashNhan.innerHTML += opt;
                    });
                    
                    const currentIdEl = document.getElementById('currentLoggedInUserId');
                    const currentId = currentIdEl ? currentIdEl.value : null;
                    if (data.length > 0) {
                        let matchedNv = null;
                        if (currentId) {
                            matchedNv = data.find(x => x.id == currentId);
                        }
                        if (!matchedNv) {
                            matchedNv = data[0]; // fallback
                        }
                        selectMoCa.value = matchedNv.id;
                        
                        const updateThuNganUI = (selectedId) => {
                            const nv = data.find(x => x.id == selectedId);
                            if (!nv) return;
                            
                            const thunganEl = document.getElementById('txtThuNganMoCa');
                            thunganEl.innerText = nv.maNhanVien + " - " + nv.hoTen;
                            
                            fetch('/api/lich-lam-viec')
                                .then(res => res.json())
                                .then(lichData => {
                                    const todayStr = new Date().toISOString().substring(0, 10);
                                    let isScheduled = lichData.some(l => {
                                        let dateStr = l.ngayLamViec;
                                        if (Array.isArray(dateStr)) {
                                            dateStr = dateStr[0] + '-' + String(dateStr[1]).padStart(2, '0') + '-' + String(dateStr[2]).padStart(2, '0');
                                        }
                                        return dateStr === todayStr && l.nhanVien && l.nhanVien.id == nv.id;
                                    });
                                    
                                    const btnMoCa = document.getElementById('btnSubmitMoCa');
                                    if(isScheduled) {
                                        thunganEl.style.color = '#2563eb'; // Xanh dương
                                        thunganEl.style.fontWeight = '800';
                                        btnMoCa.style.background = 'linear-gradient(to right, #14466b, #009fe3)';
                                        btnMoCa.innerText = 'BẮT ĐẦU CA LÀM VIỆC';
                                        btnMoCa.disabled = false;
                                        btnMoCa.style.opacity = '1';
                                    } else {
                                        thunganEl.style.color = '#ef4444'; // Đỏ
                                        thunganEl.style.fontWeight = '800';
                                        btnMoCa.style.background = '#ef4444';
                                        btnMoCa.innerText = 'BẮT ĐẦU CA (KHÔNG CÓ LỊCH)';
                                        btnMoCa.disabled = false;
                                        btnMoCa.style.opacity = '1';
                                    }
                                });
                        };
                        
                        updateThuNganUI(matchedNv.id);
                        
                        selectMoCa.addEventListener('change', (e) => {
                            updateThuNganUI(e.target.value);
                        });
                    }
                }).catch(e => console.log('Cannot load nhan vien API'));

            // Dark Mode logic
            const themeToggleBtn = document.getElementById('themeToggleBtn');
            const themeIcon = document.getElementById('themeIcon');
            let isDark = localStorage.getItem('theme') === 'dark';
            
            function applyTheme() {
                if (isDark) {
                    document.body.classList.add('dark-mode');
                    themeToggleBtn.style.borderColor = '#eab308'; // yellow for moon
                    themeToggleBtn.style.color = '#eab308';
                    themeIcon.setAttribute('data-lucide', 'moon');
                } else {
                    document.body.classList.remove('dark-mode');
                    themeToggleBtn.style.borderColor = '#3b82f6';
                    themeToggleBtn.style.color = '#3b82f6';
                    themeIcon.setAttribute('data-lucide', 'sun');
                }
                lucide.createIcons();
            }
            
            applyTheme();
            
            themeToggleBtn.addEventListener('click', () => {
                isDark = !isDark;
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                applyTheme();
            });

            // Show Modal Bàn Giao Ca
            const btnGiaoCa = document.getElementById('btnGiaoCa');
            if (btnGiaoCa) {
                btnGiaoCa.addEventListener('click', () => {
                    if(!activeShift) return;
                    document.getElementById('giaoCaModal').style.display = 'flex';
                    document.getElementById('idGiaoCaDangMo').value = activeShift.id;
                    document.getElementById('tienBanDauDisplay').value = formatCurrency(activeShift.tienBanDau || 0);
                });
            }

            // Handle Submit Mở Ca (Manual Click)
            document.getElementById('btnSubmitMoCa').addEventListener('click', function(e) {
                const btn = this;
                const originalText = btn.innerText;
                btn.innerText = 'Đang xử lý...';
                btn.style.opacity = '0.7';
                btn.disabled = true;

                let tienStr = document.getElementById('tienBanDauMoCa').value.replace(/\./g, '');
                let tien = tienStr ? parseFloat(tienStr) : 0;

                const payload = {
                    maGiaoCa: 'GC' + Date.now().toString(),
                    tienBanDau: tien,
                    tienBanGiao: 0,
                    ghiChu: document.getElementById('ghiChuMoCa').value,
                    trangThai: 0 // Đang làm
                };
                
                // Add current time in a safe format, but also let backend handle it if missing
                try {
                    payload.thoiGianNhanCa = new Date().toISOString().substring(0, 19);
                } catch(e) {}

                let nvNhanId = document.getElementById('nhanVienMoCa').value;
                if (!nvNhanId) {
                    let currentIdEl = document.getElementById('currentLoggedInUserId');
                    nvNhanId = currentIdEl ? currentIdEl.value : '';
                }
                if (nvNhanId) {
                    payload.nhanVienNhan = { id: nvNhanId };
                }

                fetch('/api/giao-ca', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(async res => {
                    if (!res.ok) {
                        let text = await res.text();
                        throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
                    }
                    return res.json();
                })
                .then(data => {
                    document.getElementById('tienBanDauMoCa').value = '0';
                    document.getElementById('ghiChuMoCa').value = '';
                    checkActiveShift();
                    loadGiaoCa();
                    try {
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã mở ca làm việc', showConfirmButton: false, timer: 2000 });
                    } catch(e) {}
                    btn.innerText = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                })
                .catch(err => {
                    console.error("Lỗi khi mở ca:", err);
                    alert("Chi tiết lỗi hệ thống: " + err.message);
                    btn.innerText = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                });
            });

            // Handle Submit Bàn Giao Ca from Dashboard
            document.getElementById('formGiaoCaDashboard').addEventListener('submit', function(e) {
                e.preventDefault();
                if(!activeShift) return;
                
                const tienThucTe = parseInt(document.getElementById('dashTienBanGiao').value.replace(/\./g, '')) || 0;
                const tienBanDau = activeShift.tienBanDau || 0;
                const tienBanGiao = activeShift.tienBanGiao || 0;
                const doanhThuMat = tienBanGiao > 0 ? (tienBanGiao - tienBanDau) : 0;
                const tienHeThong = tienBanDau + doanhThuMat;
                
                const diff = tienThucTe - tienHeThong;
                
                const nvId = document.getElementById('dashNhanVienNhan').value;
                const payload = {
                    thoiGianGiaoCa: new Date().toISOString().slice(0,19),
                    tienBanDau: activeShift.tienBanDau,
                    tienBanGiao: tienThucTe,
                    tienPhatSinh: diff,
                    ghiChu: document.getElementById('dashGhiChu').value,
                    trangThai: 1 // Hoàn tất
                };
                if (nvId) {
                    payload.nhanVienNhan = { id: nvId };
                } else {
                    payload.nhanVienNhan = null;
                }

                fetch('/api/giao-ca/' + activeShift.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("Server returned " + res.status);
                    return res.json();
                })
                .then(data => {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã chốt ca thành công', showConfirmButton: false, timer: 2000 });
                    this.reset();
                    checkActiveShift();
                    loadGiaoCa();
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire('Lỗi', 'Không thể lưu thông tin giao ca. Kiểm tra lại dữ liệu.', 'error');
                });
            });

            // Handle Submit Bàn Giao Ca (Close Shift) modal - legacy
            document.getElementById('formGiaoCa').addEventListener('submit', function(e) {
                e.preventDefault();
                if(!activeShift) return;
                
                const payload = {
                    thoiGianGiaoCa: new Date().toISOString().slice(0,19),
                    nhanVienNhan: activeShift.nhanVienNhan, // Keep the same user
                    tienBanDau: activeShift.tienBanDau,
                    tienBanGiao: document.getElementById('tienBanGiao').value.replace(/\./g, ''),
                    tienPhatSinh: document.getElementById('tienPhatSinh').value.replace(/\./g, '') || 0,
                    ghiChu: document.getElementById('ghiChu').value,
                    trangThai: 1 // Hoàn tất
                };

                fetch('/api/giao-ca/' + activeShift.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã chốt ca', showConfirmButton: false, timer: 2000 });
                    document.getElementById('giaoCaModal').style.display = 'none';
                    this.reset();
                    checkActiveShift();
                    loadGiaoCa();
                })
                .catch(err => {
                    Swal.fire('Lỗi', 'Không thể lưu thông tin giao ca', 'error');
                });
            });

            // Bind filters
            const filterFn = () => {
                const keyword = document.getElementById('searchKeyword').value.toLowerCase();
                const filtered = allGiaoCa.filter(item => {
                    const acc = item.nhanVienNhan ? item.nhanVienNhan.maNhanVien.toLowerCase() : "admin";
                    const mc = item.maGiaoCa ? item.maGiaoCa.toLowerCase() : "";
                    return acc.includes(keyword) || mc.includes(keyword);
                });
                renderGiaoCaTable(filtered);
            };
            document.getElementById('searchKeyword').addEventListener('input', filterFn);
        });
