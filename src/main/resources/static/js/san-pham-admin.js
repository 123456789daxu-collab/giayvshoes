    function toggleFormElements(disabled) {
        document.getElementById('maSanPham').disabled = disabled;
        document.getElementById('tenSanPham').disabled = disabled;
        document.getElementById('thuongHieu').disabled = disabled;
        document.getElementById('loaiGiay').disabled = disabled;
        document.getElementById('giaBan').disabled = disabled;
        document.getElementById('soLuong').disabled = disabled;
        document.getElementById('moTaChiTiet').disabled = disabled;
        document.getElementById('trangThai').disabled = disabled;
        document.getElementById('btnSubmitForm').style.display = disabled ? 'none' : 'block';
    }

    function openAddModal() {
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2"></i> Thêm mới Sản Phẩm';
        document.getElementById('productForm').action = '/san-pham/add';
        document.getElementById('maSanPham').value = 'Đang tải...';
        fetch('/san-pham/api/next-code')
            .then(res => res.json())
            .then(data => {
                if (data && data.code) {
                    document.getElementById('maSanPham').value = data.code;
                }
            })
            .catch(() => {
                document.getElementById('maSanPham').value = 'SP' + Math.random().toString(36).substring(2, 8).toUpperCase();
            });
        document.getElementById('tenSanPham').value = '';
        document.getElementById('thuongHieu').value = '';
        document.getElementById('loaiGiay').value = '';
        document.getElementById('giaBan').value = '';
        document.getElementById('soLuong').value = '';
        document.getElementById('moTaChiTiet').value = '';
        document.getElementById('trangThai').value = '1';
        toggleFormElements(false);
    }

    function openEditModal(btn) {
        const id = btn.getAttribute('data-id');
        const maSp = btn.getAttribute('data-ma') || '';
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-pencil-square me-2"></i> Chỉnh sửa Sản Phẩm' + (maSp ? ' - Mã: ' + maSp : '');
        document.getElementById('productForm').action = '/san-pham/edit/' + id;
        document.getElementById('maSanPham').value = maSp;
        document.getElementById('tenSanPham').value = btn.getAttribute('data-ten');
        document.getElementById('thuongHieu').value = btn.getAttribute('data-thuonghieu');
        document.getElementById('loaiGiay').value = btn.getAttribute('data-loaigiay');
        document.getElementById('giaBan').value = btn.getAttribute('data-giaban') || '0';
        document.getElementById('soLuong').value = btn.getAttribute('data-soluong') || '0';
        document.getElementById('moTaChiTiet').value = btn.getAttribute('data-mota') || '';
        document.getElementById('trangThai').value = btn.getAttribute('data-trangthai') || '1';
        toggleFormElements(false);
        new bootstrap.Modal(document.getElementById('productModal')).show();
    }

    function openViewModal(btn) {
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-eye me-2"></i> Chi Tiết Sản Phẩm';
        document.getElementById('productForm').action = '#';
        document.getElementById('maSanPham').value = btn.getAttribute('data-ma');
        document.getElementById('tenSanPham').value = btn.getAttribute('data-ten');
        document.getElementById('thuongHieu').value = btn.getAttribute('data-thuonghieu');
        document.getElementById('loaiGiay').value = btn.getAttribute('data-loaigiay');
        document.getElementById('giaBan').value = btn.getAttribute('data-giaban') || '0';
        document.getElementById('soLuong').value = btn.getAttribute('data-soluong') || '0';
        document.getElementById('moTaChiTiet').value = btn.getAttribute('data-mota') || '';
        document.getElementById('trangThai').value = btn.getAttribute('data-trangthai') || '1';
        toggleFormElements(true);
        new bootstrap.Modal(document.getElementById('productModal')).show();
    }

    /*
    // KHONG DUNG XOA CUNG (SU DUNG confirmToggleStatus)
    function confirmDelete(id) {
        Swal.fire({
            title: 'Xóa sản phẩm?',
            text: 'Bạn không thể hoàn tác hành động này!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Có, xóa đi!',
            cancelButtonText: 'Hủy',
            borderRadius: '12px'
        }).then(r => { if (r.isConfirmed) window.location.href = '/san-pham/delete/' + id; });
    }
    */

    function confirmToggleStatus(id, currentStatus) {
        let title = currentStatus === 1 ? 'Ngừng kinh doanh?' : 'Kinh doanh lại?';
        let text = currentStatus === 1 ? 'Sản phẩm này và tất cả biến thể sẽ chuyển sang trạng thái Ngừng Kinh Doanh.' : 'Sản phẩm và tất cả biến thể sẽ được mở bán lại.';
        let btnColor = currentStatus === 1 ? '#f59e0b' : '#10b981';
        
        Swal.fire({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: btnColor,
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
            borderRadius: '12px'
        }).then(r => { 
            if (r.isConfirmed) window.location.href = '/san-pham/toggle-status/' + id; 
        });
    }

    document.getElementById('productForm').addEventListener('submit', function(e) {
        if (this.action.endsWith('#')) {
            e.preventDefault();
            return;
        }
    });

    function onPriceSliderInput(val) {
        let num = parseInt(val) || 0;
        let formatted = new Intl.NumberFormat('vi-VN').format(num) + ' đ';
        let label = document.getElementById('priceSliderValue');
        if (label) label.textContent = formatted;
        
        let slider = document.getElementById('priceSlider');
        if (slider) {
            let max = parseInt(slider.max) || 10000000;
            let percent = (num / max) * 100;
            slider.style.background = `linear-gradient(to right, #0f2d4a 0%, #00adef ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
        }
    }

    function resetPriceSlider() {
        let slider = document.getElementById('priceSlider');
        if (slider) {
            slider.value = 10000000;
            onPriceSliderInput(10000000);
            document.getElementById('filterForm').submit();
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        let slider = document.getElementById('priceSlider');
        if (slider) {
            onPriceSliderInput(slider.value);
        }
    });
