document.addEventListener("DOMContentLoaded", function() {
    lucide.createIcons();

    var calendarEl = document.getElementById('calendar');
    let globalShifts = [];
    
    let choicesNhanVien = new Choices('#modalSelectNhanVien', {
        removeItemButton: true,
        placeholderValue: 'Tìm và chọn nhiều nhân viên...',
        noChoicesText: 'Không có dữ liệu',
        itemSelectText: ''
    });
    let choicesCaLam = new Choices('#modalSelectCaLam', {
        removeItemButton: true,
        placeholderValue: 'Tìm và chọn ca làm việc...',
        noChoicesText: 'Không có dữ liệu',
        itemSelectText: ''
    });

    window.openQuickAddModal = function(dateStr, caLamId = null) {
        document.getElementById('quickAddModal').style.display = 'flex';
        document.getElementById('modalInputNgay').value = dateStr;
        choicesNhanVien.removeActiveItems();
        choicesCaLam.removeActiveItems();
        if (caLamId) {
            choicesCaLam.setChoiceByValue(caLamId.toString());
        }
    };
    
    window.closeQuickAddModal = function() {
        document.getElementById('quickAddModal').style.display = 'none';
    };

    document.getElementById('quickAddForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nvIds = choicesNhanVien.getValue(true);
        const caIds = choicesCaLam.getValue(true);
        const ngay = document.getElementById('modalInputNgay').value;

        if (!nvIds.length || !caIds.length || !ngay) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn nhân viên và ca làm', 'warning');
            return;
        }

        const promises = [];
        nvIds.forEach(nvId => {
            caIds.forEach(caId => {
                promises.push(fetch('/api/lich-lam-viec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nhanVien: { id: nvId },
                        caLam: { id: caId },
                        ngayLamViec: ngay,
                        ghiChu: ''
                    })
                }).then(res => {
                    if (!res.ok) {
                        return res.text().then(text => { throw new Error(text || 'Lỗi không xác định'); });
                    }
                    return res.json();
                }));
            });
        });

        Promise.all(promises).then(responses => {
            Swal.fire({
                icon: 'success', title: 'Thành công!', text: 'Đã thêm lịch làm việc.',
                showConfirmButton: false, timer: 1500
            });
            closeQuickAddModal();
            calendar.refetchEvents();
        }).catch(err => {
            Swal.fire('Cảnh báo', err.message, 'warning');
        });
    });

    // Hàm render custom day view
    window.renderCustomDayView = function(date) {
        const customView = document.getElementById('customDayView');
        if (!customView) return;
        
        const day = date.getDay(); 
        const diffToMon = day === 0 ? -6 : 1 - day; 
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() + diffToMon);
        
        let daysHtml = '';
        const dayNames = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const isActive = d.toDateString() === date.toDateString() ? 'active' : '';
            const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            daysHtml += `<div class="cdv-day-tab ${isActive}" onclick="calendar.gotoDate('${dStr}')">${dayNames[i]}</div>`;
        }
        
        const dayOfWeekStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
        const dateStr = `${dayOfWeekStr} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        
        const localDateStr = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
        
        const eventsToday = calendar.getEvents().filter(e => {
            return e.startStr && e.startStr.split('T')[0] === localDateStr;
        });

        let shiftsHtml = '';
        globalShifts.forEach(shift => {
            const shiftEvents = eventsToday.filter(e => e.extendedProps && e.extendedProps.shiftId == shift.id);
            
            let contentHtml = '';
            if (shiftEvents.length === 0) {
                contentHtml = `<div class="cdv-add-btn" onclick="openQuickAddModal('${localDateStr}', '${shift.id}')">+ Bấm vào đây để thêm nhân viên vào ca này</div>`;
            } else {
                contentHtml += `<div class="cdv-event-add" onclick="openQuickAddModal('${localDateStr}', '${shift.id}')" title="Thêm nhân viên">+</div>`;
                shiftEvents.forEach(e => {
                    contentHtml += `
                        <div class="cdv-event-card" style="position: relative; padding-right: 12px;">
                            <div class="event-circle" style="width: 24px; height: 24px; font-size: 12px; margin: 0;">${e.extendedProps.initials}</div>
                            <div style="font-size: 13px; font-weight: 500;">
                                <div style="margin-bottom: 2px;">${e.extendedProps.tenNV}</div>
                                <div style="font-size: 11px; color: #64748b;">${e.extendedProps.maNhanVien || ''}</div>
                            </div>
                        </div>
                    `;
                });
            }

            shiftsHtml += `
                <div class="cdv-shift-row">
                    <div class="cdv-shift-info">
                        <div class="cdv-shift-name">${shift.tenCa}</div>
                        <div class="cdv-shift-time">${shift.thoiGianBatDau.substring(0,5)} - ${shift.thoiGianKetThuc.substring(0,5)}</div>
                    </div>
                    <div class="cdv-shift-content">
                        ${contentHtml}
                    </div>
                </div>
            `;
        });

        if (globalShifts.length === 0) {
            shiftsHtml = `<div style="padding: 20px; text-align: center; color: #64748b;">Đang tải ca làm...</div>`;
        }

        customView.innerHTML = `
            <div class="cdv-header">
                <div class="cdv-shift-col">CA LÀM VIỆC</div>
                <div class="cdv-days-col">
                    ${daysHtml}
                </div>
            </div>
            <div class="cdv-date-row">
                <div class="cdv-shift-col"></div>
                <div class="cdv-date-display">${dateStr}</div>
            </div>
            ${shiftsHtml}
        `;
        
        setTimeout(() => { lucide.createIcons(); }, 10);
    };

    var calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'vi',
        initialView: 'dayGridWeek',
        headerToolbar: {
            left: 'prev title next today',
            center: '',
            right: 'dayGridDay,dayGridWeek,dayGridMonth'
        },
        buttonText: {
            today: 'Hôm nay',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày',
            list: 'Danh sách'
        },
        views: {
            dayGridWeek: {
                titleFormat: function(date) {
                    var currentMonth = date.date.month;
                    var startOfMonth = new Date(date.date.year, currentMonth, 1);
                    var weekNum = Math.ceil((date.date.day + startOfMonth.getDay()) / 7);
                    return `Tuần ${weekNum} Năm ${date.date.year}`;
                }
            },
            dayGridDay: {
                titleFormat: function(date) {
                    return `Tháng ${date.date.month + 1} Năm ${date.date.year}`;
                }
            },
            dayGridMonth: {
                titleFormat: function(date) {
                    return `Tháng ${date.date.month + 1} Năm ${date.date.year}`;
                }
            }
        },
        datesSet: function(info) {
            if (info.view.type === 'dayGridDay') {
                document.querySelector('.fc-view-harness').style.display = 'none';
                document.getElementById('customDayView').style.display = 'block';
                
                document.getElementById('calendarTitleText').innerHTML = `<i data-lucide="calendar-days" style="width: 18px; height: 18px;"></i> Lịch Làm Việc Ngày`;
                lucide.createIcons();
                
                window.renderCustomDayView(info.view.calendar.getDate());
            } else {
                document.querySelector('.fc-view-harness').style.display = '';
                document.getElementById('customDayView').style.display = 'none';
                
                let titleText = 'Lịch Làm Việc Tháng';
                if(info.view.type === 'dayGridWeek') titleText = 'Lịch Làm Việc Tuần';
                document.getElementById('calendarTitleText').innerHTML = `<i data-lucide="calendar-days" style="width: 18px; height: 18px;"></i> ${titleText}`;
                lucide.createIcons();
                
                setTimeout(() => { info.view.calendar.updateSize(); }, 50);
            }
        },
        dayHeaderFormat: { weekday: 'short', omitCommas: true },
        height: 'auto',
        firstDay: 1,
        
        dateClick: function(info) {
            openQuickAddModal(info.dateStr);
        },
        
        events: function(fetchInfo, successCallback, failureCallback) {
            fetch('/api/lich-lam-viec')
                .then(res => res.json())
                .then(data => {
                    let grouped = {};
                    data.forEach(item => {
                        var startStr = item.ngayLamViec;
                        if (Array.isArray(startStr)) {
                            startStr = startStr[0] + '-' + String(startStr[1]).padStart(2, '0') + '-' + String(startStr[2]).padStart(2, '0');
                        }
                        let caId = (item.caLam && item.caLam.id) ? item.caLam.id : 'null';
                        let key = startStr + '_' + caId;
                        
                        if (!grouped[key]) {
                            grouped[key] = {
                                start: startStr,
                                tenCa: (item.caLam && item.caLam.tenCa) ? item.caLam.tenCa : 'Ca',
                                shiftId: caId,
                                records: []
                            };
                        }
                        grouped[key].records.push(item);
                    });

                    var events = Object.values(grouped).map(g => {
                        let namesStr = g.records.map(r => (r.nhanVien && r.nhanVien.hoTen) ? r.nhanVien.hoTen : 'Unknown').join(' - ');
                        let title = g.tenCa + ': ' + namesStr;
                        
                        return {
                            id: g.start + '_' + g.shiftId,
                            title: title,
                            start: g.start,
                            extendedProps: { 
                                tenCa: g.tenCa,
                                namesStr: namesStr,
                                shiftId: g.shiftId,
                                records: g.records
                            }
                        };
                    });
                    
                    var filterText = document.getElementById('searchNhanVien').value.toLowerCase();
                    if (filterText) {
                        events = events.filter(e => e.title.toLowerCase().includes(filterText));
                    }
                    
                    successCallback(events);
                    
                    if (calendar.view.type === 'dayGridDay') {
                        window.renderCustomDayView(calendar.getDate());
                    }
                })
                .catch(err => failureCallback(err));
        },
        
        eventClick: function(info) {
            let records = info.event.extendedProps.records;
            let tenCa = info.event.extendedProps.tenCa;
            
            let htmlList = records.map(r => {
                let name = (r.nhanVien && r.nhanVien.hoTen) ? r.nhanVien.hoTen : 'Unknown';
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 14px; font-weight: 500; color: #1e293b;">${name}</span>
                </div>
                `;
            }).join('');

            Swal.fire({
                title: 'Chi tiết ' + tenCa,
                html: `<div style="text-align:left; max-height: 300px; overflow-y:auto; padding-right: 8px;">${htmlList}</div>`,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Đóng'
            });
        },
        eventContent: function(arg) {
            var customHtml = `
                <div style="width:100%; padding: 6px 8px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid #2563eb; border-radius: 4px; margin-bottom: 2px; overflow: hidden;">
                    <div class="event-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; color: #1e293b; text-align: left; line-height: 1.4;" title="${arg.event.title}">
                        <b>${arg.event.extendedProps.tenCa}:</b> ${arg.event.extendedProps.namesStr}
                    </div>
                </div>
            `;
            return { html: customHtml };
        }
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const nvParam = urlParams.get('nhanVien');
    if (nvParam) {
        document.getElementById('searchNhanVien').value = nvParam;
    }
    
    calendar.render();
    
    setTimeout(() => { lucide.createIcons(); }, 500);

    fetch('/api/ca-lam')
        .then(res => res.json())
        .then(data => {
            globalShifts = data.filter(ca => ca.trangThai === 1);
            globalShifts.sort((a,b) => a.thoiGianBatDau.localeCompare(b.thoiGianBatDau));
            
            const caOptions = globalShifts.map(ca => ({
                value: ca.id.toString(),
                label: ca.tenCa + ' (' + ca.thoiGianBatDau.substring(0,5) + ' - ' + ca.thoiGianKetThuc.substring(0,5) + ')'
            }));
            choicesCaLam.setChoices(caOptions, 'value', 'label', true);
            
            if (calendar && calendar.view && calendar.view.type === 'dayGridDay') {
                window.renderCustomDayView(calendar.getDate());
            }
        });
        
    fetch('/api/nhan-vien')
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch nhan vien");
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                const activeEmployees = data.filter(nv => nv.trangThai === 1);
                const nvOptions = activeEmployees.map(nv => ({
                    value: nv.id ? nv.id.toString() : '',
                    label: (nv.maNhanVien || 'NV') + ' - ' + (nv.hoTen || 'Chưa cập nhật')
                }));
                choicesNhanVien.setChoices(nvOptions, 'value', 'label', true);
            }
        })
        .catch(err => console.error("Lỗi khi tải nhân viên: ", err));

    document.getElementById('searchNhanVien').addEventListener('input', function() {
        calendar.refetchEvents();
    });

    document.getElementById('btnThemLich').addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        openQuickAddModal(todayStr);
    });

    document.getElementById('btnViewBang').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('btnViewLich').classList.remove('active');
        calendar.changeView('listWeek');
    });

    document.getElementById('btnViewLich').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('btnViewBang').classList.remove('active');
        calendar.changeView('dayGridWeek');
    });

    document.getElementById('btnXuatExcelLich').addEventListener('click', function() {
        var events = calendar.getEvents();
        if (events.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu lịch làm việc để xuất', 'info');
            return;
        }
        
        let csvContent = "\uFEFF";
        csvContent += "Tên ca - Nhân viên,Ngày làm việc\n";
        
        events.forEach(function(e) {
            var title = `"${e.title.replace(/"/g, '""')}"`;
            var start = e.startStr || ""; 
            csvContent += `${title},${start}\n`;
        });
        
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Lich_Lam_Viec_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
