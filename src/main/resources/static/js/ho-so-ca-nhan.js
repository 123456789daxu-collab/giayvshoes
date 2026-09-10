        document.addEventListener('DOMContentLoaded', function() {
            loadCurrentProfile();

            // Kiểm tra tham số URL ?tab=password hoặc #password
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam === 'password' || window.location.hash === '#password') {
                switchTab('password');
            }
        });

        function switchTab(tabName) {
            const tabBtnInfo = document.getElementById('tabBtnInfo');
            const tabBtnPassword = document.getElementById('tabBtnPassword');
            const infoContent = document.getElementById('infoTabContent');
            const passwordContent = document.getElementById('passwordTabContent');

            if (tabName === 'password') {
                tabBtnInfo.classList.remove('active');
                tabBtnPassword.classList.add('active');
                infoContent.style.display = 'none';
                passwordContent.style.display = 'block';
            } else {
                tabBtnPassword.classList.remove('active');
                tabBtnInfo.classList.add('active');
                passwordContent.style.display = 'none';
                infoContent.style.display = 'block';
            }

            if (window.lucide) lucide.createIcons();
        }

        function togglePassword(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
            if (window.lucide) lucide.createIcons();
        }

        async function loadCurrentProfile() {
            try {
                const response = await fetch('/api/nhan-vien/current');
                if (response.ok) {
                    const data = await response.json();
                    renderProfile(data);
                } else {
                    Swal.fire('Thất bại', 'Không thể lấy thông tin nhân viên đăng nhập', 'error');
                }
            } catch (err) {
                console.error('Lỗi tải hồ sơ cá nhân:', err);
            }
        }

        function renderProfile(data) {
            document.getElementById('displayHoTen').innerText = data.hoTen || 'Tài khoản Quản trị';
            document.getElementById('displayChucVu').innerText = data.chucVu ? (data.chucVu.tenChucVu || data.chucVu) : (data.vaiTro || 'Nhân viên');
            document.getElementById('displayMaNV').innerText = data.maNhanVien || ('NV' + String(data.id).padStart(4, '0'));
            document.getElementById('displayTrangThai').innerText = data.trangThai === 1 || data.trangThai === true ? 'Đang hoạt động' : 'Tạm khóa';

            document.getElementById('inputMaNV').value = data.maNhanVien || ('NV' + String(data.id).padStart(4, '0'));
            document.getElementById('inputChucVu').value = data.chucVu ? (data.chucVu.tenChucVu || data.chucVu) : (data.vaiTro || 'Nhân viên');
            document.getElementById('inputHoTen').value = data.hoTen || '';
            document.getElementById('inputSdt').value = data.soDienThoai || '';
            document.getElementById('inputEmail').value = data.email || '';
            document.getElementById('inputCccd').value = data.cccd || '';
            document.getElementById('inputNgaySinh').value = data.ngaySinh || '';
            document.getElementById('inputGioiTinh').value = String(data.gioiTinh !== false);
            document.getElementById('inputDiaChi').value = data.diaChi || '';

            const avatarDisplay = document.getElementById('avatarDisplay');
            if (data.anhDaiDien) {
                avatarDisplay.innerHTML = `<img src="${data.anhDaiDien}" alt="Avatar" />`;
            } else if (data.hoTen) {
                avatarDisplay.innerHTML = `<span style="font-weight: 700; font-size: 2rem;">${data.hoTen.trim().charAt(0).toUpperCase()}</span>`;
            }
            if (window.lucide) lucide.createIcons();
        }

        async function saveProfileInfo(event) {
            event.preventDefault();

            const hoTen = document.getElementById('inputHoTen').value.trim();
            const soDienThoai = document.getElementById('inputSdt').value.trim();
            const email = document.getElementById('inputEmail').value.trim();
            const cccd = document.getElementById('inputCccd').value.trim();
            const ngaySinh = document.getElementById('inputNgaySinh').value;
            const gioiTinh = document.getElementById('inputGioiTinh').value === 'true';
            const diaChi = document.getElementById('inputDiaChi').value.trim();

            const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
            if (!phoneRegex.test(soDienThoai)) {
                Swal.fire('Thất bại', 'Số điện thoại không hợp lệ. Vui lòng nhập số ĐTDĐ Việt Nam (10 số).', 'error');
                return;
            }

            const payload = {
                hoTen,
                soDienThoai,
                email,
                cccd,
                ngaySinh,
                gioiTinh,
                diaChi
            };

            try {
                const res = await fetch('/api/nhan-vien/current', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const updated = await res.json();
                    renderProfile(updated);
                    Swal.fire({
                        icon: 'success',
                        title: 'Thành công',
                        text: 'Đã cập nhật thông tin cá nhân thành công!',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    const errText = await res.text();
                    Swal.fire('Thất bại', errText || 'Cập nhật thất bại', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
            }
        }

        async function changePassword(event) {
            event.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                Swal.fire('Thất bại', 'Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
                return;
            }

            if (newPassword.length < 6) {
                Swal.fire('Thất bại', 'Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');
                return;
            }

            if (currentPassword === newPassword) {
                Swal.fire('Thất bại', 'Mật khẩu mới phải khác mật khẩu hiện tại!', 'error');
                return;
            }

            const payload = {
                currentPassword,
                newPassword
            };

            try {
                const res = await fetch('/api/nhan-vien/current', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    document.getElementById('passwordForm').reset();
                    Swal.fire({
                        icon: 'success',
                        title: 'Thành công',
                        text: 'Đã đổi mật khẩu tài khoản thành công!',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    const errText = await res.text();
                    Swal.fire('Thất bại', errText || 'Đổi mật khẩu thất bại', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
            }
        }
