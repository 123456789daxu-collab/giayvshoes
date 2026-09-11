document.addEventListener("DOMContentLoaded", function() {
    if (typeof successMsg !== 'undefined' && successMsg) {
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
    if (typeof errorMsg !== 'undefined' && errorMsg) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: errorMsg,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }

    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", function(e) {
            const attrInputs = form.querySelectorAll("input[name='tenChatLieu'], input[name='tenDeGiay'], input[name='tenMauSac'], input[name='tenTheLoai'], input[name='tenThuongHieu'], input[name='giaTri'], input[name='tenDanhMuc']");
            for (let input of attrInputs) {
                if (input.value.trim() === '') {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi nhập liệu',
                        text: 'Thông tin thuộc tính không được để trống!'
                    });
                    return;
                }
            }
        });
    });
});

function confirmToggleStatus(url) {
    Swal.fire({
        title: 'Xác nhận thay đổi',
        text: 'Bạn có chắc chắn muốn thay đổi trạng thái?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = url;
        }
    });
}
