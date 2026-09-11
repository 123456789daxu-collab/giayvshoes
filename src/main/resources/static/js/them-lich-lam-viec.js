document.addEventListener("DOMContentLoaded", function () {
    lucide.createIcons();

    // Lấy tham số ngày từ URL (nếu có)
    const urlParams = new URLSearchParams(window.location.search);
    const ngayParam = urlParams.get('ngay');
    if (ngayParam) {
        document.getElementById('inputNgayLamViec').value = ngayParam;
    }

    // Fetch Dropdown Data
    fetch('/api/nhan-vien')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('selectNhanVien');
            data.forEach(nv => {
                select.innerHTML += `<option value="${nv.id}">${nv.maNhanVien} - ${nv.hoTen}</option>`;
            });
        });

    fetch('/api/ca-lam')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('selectCaLam');
            data.forEach(ca => {
                if (ca.trangThai === 1) {
                    select.innerHTML += `<option value="${ca.id}">${ca.tenCa} (${ca.thoiGianBatDau.substring(0, 5)} - ${ca.thoiGianKetThuc.substring(0, 5)})</option>`;
                }
            });
        });

    // Handle Form Submit
    document.getElementById('formLichLamViec').addEventListener('submit', function (e) {
        e.preventDefault();
        const payload = {
            nhanVien: { id: document.getElementById('selectNhanVien').value },
            caLam: { id: document.getElementById('selectCaLam').value },
            ngayLamViec: document.getElementById('inputNgayLamViec').value,
            ghiChu: document.getElementById('inputGhiChu').value
        };

        fetch('/api/lich-lam-viec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Lỗi server');
            })
            .then(data => {
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: 'Đã thêm lịch làm việc.',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = '/lich-lam-viec';
                });
            })
            .catch(err => {
                Swal.fire('Lỗi', 'Không thể lưu lịch làm việc', 'error');
            });
    });
});
