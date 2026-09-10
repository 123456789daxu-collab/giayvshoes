        function exportToExcel() {
            var originalTable = document.querySelector(".custom-table");
            var selectedCheckboxes = originalTable.querySelectorAll(".row-checkbox:checked");
            
            var rowsToExport = [];
            
            if (selectedCheckboxes.length > 0) {
                selectedCheckboxes.forEach(function(cb) {
                    var tr = cb.closest('tr');
                    rowsToExport.push(tr);
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Chưa chọn sản phẩm',
                    text: 'Vui lòng tích chọn ít nhất 1 sản phẩm để xuất Excel.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                return; // Không xuất gì cả nếu không có check
            }

            var exportData = [];
            
            rowsToExport.forEach(function(tr, index) {
                var maBienThe = tr.getAttribute('data-ma') || '';
                var soLuong = tr.getAttribute('data-soluong') || '0';
                var gia = tr.getAttribute('data-gia') || '0';
                var kichCo = tr.getAttribute('data-kichco') || '';
                var mauSac = tr.getAttribute('data-mausac') || '';
                var trangThaiCode = tr.getAttribute('data-trangthai');
                var trangThaiStr = (trangThaiCode === '1') ? 'Đang kinh doanh' : 'Ngừng kinh doanh';
                
                exportData.push({
                    "STT": index + 1,
                    "Mã Sản Phẩm": maSanPham,
                    "Mã Biến Thể": maBienThe,
                    "Tên Sản Phẩm": tenSanPham,
                    "Thương Hiệu": thuongHieu,
                    "Loại Giày": loaiGiay,
                    "Danh Mục": danhMuc,
                    "Chất Liệu": chatLieu,
                    "Mô Tả": moTa,
                    "Kích Cỡ": kichCo,
                    "Màu Sắc": mauSac,
                    "Giá Bán (VNĐ)": parseFloat(gia),
                    "Số Lượng": parseInt(soLuong),
                    "Trạng Thái": trangThaiStr
                });
            });
            
            var ws = XLSX.utils.json_to_sheet(exportData);
            
            // Tự động căn chỉnh độ rộng cột
            var wscols = [
                {wch: 5},  // STT
                {wch: 15}, // Mã Sản Phẩm
                {wch: 15}, // Mã Biến Thể
                {wch: 30}, // Tên Sản Phẩm
                {wch: 15}, // Thương Hiệu
                {wch: 15}, // Loại Giày
                {wch: 15}, // Danh Mục
                {wch: 15}, // Chất Liệu
                {wch: 40}, // Mô Tả
                {wch: 10}, // Kích Cỡ
                {wch: 15}, // Màu Sắc
                {wch: 15}, // Giá Bán (VNĐ)
                {wch: 10}, // Số Lượng
                {wch: 20}  // Trạng Thái
            ];
            ws['!cols'] = wscols;

            var wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "DanhSachBienThe");
            XLSX.writeFile(wb, tenSanPham + "_ChiTiet.xlsx");
        }

        document.addEventListener('DOMContentLoaded', function() {
            // SweetAlert2 Notification
            if (successMsg) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: successMsg,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            }
            
            if (errorMsg) {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: errorMsg,
                    confirmButtonText: 'Đã hiểu'
                });
            }

            // Checkbox highlight row logic
            const selectAll = document.getElementById('selectAll');
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');

            if(selectAll) {
                selectAll.addEventListener('change', function() {
                    const isChecked = this.checked;
                    rowCheckboxes.forEach(cb => {
                        const tr = cb.closest('tr');
                        if (tr.style.display !== 'none') {
                            cb.checked = isChecked;
                            if (isChecked) {
                                tr.classList.add('row-selected');
                            } else {
                                tr.classList.remove('row-selected');
                            }
                        }
                    });
                });
            }

            rowCheckboxes.forEach(cb => {
                cb.addEventListener('change', function() {
                    const tr = this.closest('tr');
                    if (this.checked) {
                        tr.classList.add('row-selected');
                    } else {
                        tr.classList.remove('row-selected');
                    }
                    
                    const visibleCheckboxes = Array.from(rowCheckboxes).filter(c => c.closest('tr').style.display !== 'none');
                    const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(c => c.checked);
                    const someChecked = visibleCheckboxes.some(c => c.checked);
                    
                    if (selectAll) {
                        selectAll.checked = allChecked;
                        selectAll.indeterminate = someChecked && !allChecked;
                    }
                });
            });

            // Toggle Status Confirmation
            document.querySelectorAll('.toggle-status-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    let action = this.getAttribute('data-action');
                    let id = this.getAttribute('data-id');
                    Swal.fire({
                        title: 'Xác nhận',
                        text: "Bạn có chắc chắn muốn " + action.toLowerCase() + " biến thể này?",
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#00adef',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Có, thực hiện!',
                        cancelButtonText: 'Hủy'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/san-pham/toggle-status-variant/' + id;
                        }
                    });
                });
            });

            // Hiển thị giá khi kéo thanh range
            const filterGia = document.getElementById('filterGia');
            const priceDisplay = document.getElementById('priceDisplay');
            
            if(filterGia && priceDisplay) {
                filterGia.addEventListener('input', function() {
                    const val = parseInt(this.value);
                    priceDisplay.textContent = val.toLocaleString('en-US') + ' đ';
                    filterVariants();
                });
            }

            // Logic Lọc Dữ Liệu
            const searchInput = document.getElementById('searchInput');
            const btnSearch = document.getElementById('btnSearch');
            const btnReset = document.getElementById('btnReset');
            
            const filterSelects = document.querySelectorAll('.filter-select');
            
            function filterVariants() {
                const searchTxt = searchInput.value.toLowerCase();
                const selKichCo = document.getElementById('filterKichCo').value;
                const selMauSac = document.getElementById('filterMauSac').value;
                const selTrangThai = document.getElementById('filterTrangThai').value;
                const maxGia = parseInt(document.getElementById('filterGia').value);
                const selChatLieu = document.getElementById('filterChatLieu').value;
                const selThuongHieu = document.getElementById('filterThuongHieu').value;
                const selLoaiGiay = document.getElementById('filterLoaiGiay').value;
                const selDanhMuc = document.getElementById('filterDanhMuc').value;
                
                const rows = document.querySelectorAll('#variantTableBody .variant-row');
                
                rows.forEach(row => {
                    const ten = row.getAttribute('data-ten').toLowerCase();
                    const kichCo = row.getAttribute('data-kichco');
                    const mauSac = row.getAttribute('data-mausac');
                    const trangThai = row.getAttribute('data-trangthai');
                    const gia = parseFloat(row.getAttribute('data-gia'));
                    const chatLieu = row.getAttribute('data-chatlieu');
                    const thuongHieu = row.getAttribute('data-thuonghieu');
                    const loaiGiay = row.getAttribute('data-loaigiay');
                    const danhMuc = row.getAttribute('data-danhmuc');
                    
                    let match = true;
                    
                    if(searchTxt && !ten.includes(searchTxt)) match = false;
                    if(selKichCo && kichCo !== selKichCo) match = false;
                    if(selMauSac && mauSac !== selMauSac) match = false;
                    if(selTrangThai && trangThai !== selTrangThai) match = false;
                    if(selChatLieu && chatLieu !== selChatLieu) match = false;
                    if(selThuongHieu && thuongHieu !== selThuongHieu) match = false;
                    if(selLoaiGiay && loaiGiay !== selLoaiGiay) match = false;
                    if(selDanhMuc && danhMuc !== selDanhMuc) match = false;
                    if(maxGia && gia > maxGia) match = false;
                    
                    if(match) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            }

            // Gắn event listener
            if(btnSearch) btnSearch.addEventListener('click', filterVariants);
            if(searchInput) searchInput.addEventListener('keyup', function(e) {
                if(e.key === 'Enter') filterVariants();
            });
            
            filterSelects.forEach(sel => {
                sel.addEventListener('change', filterVariants);
            });
            
            if(btnReset) {
                btnReset.addEventListener('click', function() {
                    searchInput.value = '';
                    filterSelects.forEach(sel => {
                        if(sel.id !== 'filterGia') sel.value = '';
                    });
                    document.getElementById('filterGia').value = 10000000;
                    document.getElementById('priceDisplay').textContent = '10,000,000 đ';
                    filterVariants();
                });
            }

        });

        function showProductQR() {
            const qrModalLabel = document.getElementById('qrModalLabel');
            if(qrModalLabel) qrModalLabel.innerText = 'Sản Phẩm: ' + tenSanPham;
            
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            
            const desc = document.getElementById('qrDesc');
            if (desc) desc.innerText = 'Mã: ' + maSanPham;
            
            const url = window.location.origin + '/san-pham/edit/' + sanPhamId;
            new QRCode(qrContainer, {
                text: url,
                width: 180,
                height: 180,
                colorDark : "#0f172a",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            
            const modal = new bootstrap.Modal(document.getElementById('qrModal'));
            modal.show();
        }

        function showVariantQR(maVariant, tenVariant) {
            const qrModalLabel = document.getElementById('qrModalLabel');
            if(qrModalLabel) qrModalLabel.innerText = tenVariant;
            
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            
            const desc = document.getElementById('qrDesc');
            if (desc) desc.innerText = 'Mã biến thể: ' + maVariant;
            
            new QRCode(qrContainer, {
                text: maVariant,
                width: 180,
                height: 180,
                colorDark : "#0f172a",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            
            const modal = new bootstrap.Modal(document.getElementById('qrModal'));
            modal.show();
        }

        function downloadQR() {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (qrCanvas) {
                const url = qrCanvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                const name = document.getElementById('qrModalLabel').innerText;
                a.download = 'QR_' + name + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }
        function previewVariantImage(input, variantId) {
            var container = document.getElementById('previewContainer_' + variantId);
            var base64Input = document.getElementById('imageBase64_' + variantId);
            
            if (input.files && input.files.length > 0) {
                var files = Array.from(input.files);
                
                // Giới hạn tối đa 6 ảnh
                if (files.length > 6) {
                    alert("Bạn chỉ được phép chọn tối đa 6 ảnh!");
                    files = files.slice(0, 6);
                    // Reset input files to only have 6 (not directly possible, so we just process 6)
                }
                
                // Xóa các ảnh cũ trong container
                container.innerHTML = '';
                var base64Array = [];
                
                files.forEach(function(file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        // Tạo thẻ img mới cho mỗi ảnh
                        var img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.width = '100px';
                        img.style.height = '100px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '8px';
                        img.style.border = '1px solid #ccc';
                        img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        container.appendChild(img);
                        
                        // Push vào mảng base64
                        base64Array.push(e.target.result);
                        
                        // Cập nhật input hidden khi tất cả ảnh đã load xong
                        if (base64Array.length === files.length) {
                            base64Input.value = JSON.stringify(base64Array);
                        }
                    }
                    reader.readAsDataURL(file);
                });
            }
        }

        function confirmSaveVariant(variantId) {
            let form = document.getElementById('formVariant_' + variantId);
            if (!form) return;
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            Swal.fire({
                title: 'Xác nhận lưu?',
                text: "Bạn có chắc chắn muốn lưu các thay đổi này không?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#00adef',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Có, lưu thay đổi!',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    HTMLFormElement.prototype.submit.call(form);
                }
            });
        }
