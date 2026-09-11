        $(document).ready(function() {
            if (errorMessage) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: errorMessage,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            }
            if (successMessage) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: successMessage,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            }

            // Validate ký tự đặc biệt tên sản phẩm real-time (khi gõ)
            $('#tenSanPham').on('input', function() {
                const name = $(this).val();
                // Cho phép chữ cái (bao gồm tiếng Việt), số, khoảng trắng
                const specialCharRegex = /[^a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ\s]/u;
                if (name.length > 0 && specialCharRegex.test(name)) {
                    $(this).css('border-color', '#ef4444');
                    $('#tenSanPhamSpecialCharError').show();
                } else {
                    $(this).css('border-color', name.length > 0 ? '#d1d5db' : '#d1d5db');
                    $('#tenSanPhamSpecialCharError').hide();
                }
            });

            // Check tên sản phẩm real-time (trùng tên - khi blur)
            $('#tenSanPham').on('blur', function() {
                const name = $(this).val().trim();
                if (name.length > 0) {
                    $.get('/san-pham/api/check-name?name=' + encodeURIComponent(name), function(data) {
                        if (data.exists) {
                            $('#tenSanPham').css('border-color', '#f59e0b');
                            $('#tenSanPhamError').html('<i class="bi bi-info-circle me-1"></i>Tên sản phẩm đã tồn tại! Nếu khớp phân loại, biến thể sẽ được thêm vào sản phẩm cũ.').removeClass('text-danger').css('color', '#f59e0b').show();
                        } else {
                            $('#tenSanPham').css('border-color', '#10b981');
                            $('#tenSanPhamError').hide();
                        }
                    });
                } else {
                    $('#tenSanPham').css('border-color', '#d1d5db');
                    $('#tenSanPhamError').hide();
                }
            });

            // Validate submit form
            document.getElementById('productForm').addEventListener('submit', function(e) {
                // Kiểm tra ký tự đặc biệt trong tên sản phẩm
                const tenSP = document.getElementById('tenSanPham').value;
                const specialCharRegex = /[^a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ\s]/u;
                if (specialCharRegex.test(tenSP)) {
                    e.preventDefault();
                    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Tên sản phẩm không được chứa ký tự đặc biệt!', showConfirmButton: false, timer: 3000 });
                    return false;
                }
                // Không chặn submit khi trùng tên nữa, để backend kiểm tra phân loại


                const prices = document.getElementsByName('variantPrices');
                
                if (prices.length === 0) {
                    e.preventDefault();
                    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Vui lòng tạo ít nhất 1 biến thể!', showConfirmButton: false, timer: 3000 });
                    return false;
                }

                // If validation passes, show confirmation modal
                e.preventDefault();
                Swal.fire({
                    title: 'Xác nhận lưu sản phẩm?',
                    text: 'Bạn có chắc chắn muốn lưu sản phẩm cùng các biến thể này?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#0f2d4a',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Đồng ý',
                    cancelButtonText: 'Hủy'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Submit the form
                        HTMLFormElement.prototype.submit.call(document.getElementById('productForm'));
                    }
                });
            });

            // Khởi tạo Select2 với giao diện đẹp
            $('.select2-multiple').select2({
                placeholder: " Nhấp để chọn...",
                allowClear: true
            });

            // Tự động lắng nghe sự kiện thay đổi
            $('.color-checkbox, .size-checkbox').on('change', function() {
                updateDropdownTexts();
            });
            
            // Xóa tự động cập nhật tên trong bảng khi gõ Tên Sản Phẩm để tránh load lại bảng chưa mong muốn
            
            // Nút Tạo biến thể
            $('#btnGenerateVariants').on('click', function() {
                const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked'));
                const selectedSizes = Array.from(document.querySelectorAll('.size-checkbox:checked'));
                if(selectedColors.length === 0 || selectedSizes.length === 0) {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'warning',
                        title: 'Vui lòng chọn ít nhất 1 màu sắc và 1 kích cỡ!',
                        showConfirmButton: false, timer: 3000
                    });
                    return;
                }

                let globalSoLuong = document.getElementById('globalSoLuong') ? document.getElementById('globalSoLuong').value.trim() : '';
                let globalGiaBan = document.getElementById('globalGiaBan') ? document.getElementById('globalGiaBan').value.trim() : '';
                
                // Allow empty, but if provided, must not contain letters/special chars (only numbers and commas)
                if ((globalSoLuong && /[^0-9,]/.test(globalSoLuong)) || 
                    (globalGiaBan && /[^0-9,]/.test(globalGiaBan))) {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'error',
                        title: 'Thiết lập chung không được chứa chữ cái hay ký tự đặc biệt!',
                        showConfirmButton: false, timer: 3000
                    });
                    return;
                }
                
                generateVariants();
            });
        });

        function updateDropdownTexts() {
            const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked')).map(cb => cb.dataset.name);
            const selectedSizes = Array.from(document.querySelectorAll('.size-checkbox:checked')).map(cb => cb.dataset.name);
            
            document.getElementById('selectedColorsText').innerText = selectedColors.length > 0 ? selectedColors.join(', ') : 'Nhấn để chọn màu sắc...';
            document.getElementById('selectedColorsText').className = selectedColors.length > 0 ? 'text-dark fw-medium' : 'text-muted';
            
            document.getElementById('selectedSizesText').innerText = selectedSizes.length > 0 ? selectedSizes.join(', ') : 'Nhấn để chọn kích cỡ...';
            document.getElementById('selectedSizesText').className = selectedSizes.length > 0 ? 'text-dark fw-medium' : 'text-muted';
        }

        function generateVariants() {
            const tenSp = document.getElementById('tenSanPham').value || 'Sản phẩm mới';
            
            const selectedColors = Array.from(document.querySelectorAll('.color-checkbox:checked')).map(cb => ({ id: cb.value, element: { dataset: { name: cb.dataset.name } } }));
            const selectedSizes = Array.from(document.querySelectorAll('.size-checkbox:checked')).map(cb => ({ id: cb.value, element: { dataset: { name: cb.dataset.name } } }));
            const tbody = document.getElementById('variantTableBody');
            
            if(selectedColors.length === 0 || selectedSizes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="height: 120px; border-bottom: none;"></td></tr>';
                return;
            }

            let globalSoLuong = document.getElementById('globalSoLuong') ? document.getElementById('globalSoLuong').value : '';
            let globalGiaBan = document.getElementById('globalGiaBan') ? document.getElementById('globalGiaBan').value : '';
            
            let globalSoLuongRaw = globalSoLuong.replace(/,/g, '') || '0';
            let globalGiaBanRaw = globalGiaBan.replace(/,/g, '') || '0';
            
            // Format these values with commas for display in the table
            let dispSoLuong = globalSoLuongRaw !== '0' ? globalSoLuongRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
            let dispGiaBan = globalGiaBanRaw !== '0' ? globalGiaBanRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';

            tbody.innerHTML = '';
            let stt = 1;

            selectedColors.forEach((colorObj) => {
                const row = document.createElement('tr');
                let sizeNames = selectedSizes.map(s => s.element.dataset.name).join(', ');
                
                let hiddenInputs = '';
                selectedSizes.forEach((sizeObj) => {
                    hiddenInputs += `
                        <div class="variant-hidden-group color-${colorObj.id}-size-${sizeObj.id}" data-color-id="${colorObj.id}" data-size-id="${sizeObj.id}" data-size-name="${sizeObj.element.dataset.name}">
                            <input type="hidden" name="variantSizes" value="${sizeObj.id}">
                            <input type="hidden" name="variantColors" value="${colorObj.id}">
                            <input type="hidden" name="variantImages" class="image-color-${colorObj.id}" value="">
                            <input type="hidden" name="variantQuantities" class="qty-${colorObj.id}" value="${globalSoLuongRaw}">
                            <input type="hidden" name="variantImportPrices" class="import-price-${colorObj.id}" value="0">
                            <input type="hidden" name="variantPrices" class="price-${colorObj.id}" value="${globalGiaBanRaw}">
                        </div>
                    `;
                });
                
                row.className = `variant-row-${colorObj.id}`;
                row.dataset.colorName = colorObj.element.dataset.name;
                row.innerHTML = `
                    <td style="vertical-align: middle; text-align: center;">${stt}</td>
                    <td style="text-align: left; font-weight:500; color:#475569; vertical-align: middle;">
                        ${tenSp} [ Màu ${colorObj.element.dataset.name.toLowerCase()} ]<br/>
                        <span style="font-size: 0.85rem; color: #64748b; font-weight: 400;" id="size-names-${colorObj.id}">Kích cỡ: ${sizeNames}</span>
                        ${hiddenInputs}
                    </td>
                    <td style="vertical-align: middle;">
                        <div class="input-group flex-nowrap" style="width: 120px; margin: 0 auto;">
                            <input type="text" class="form-control m-0 text-center format-number" value="${dispSoLuong}" required oninput="formatNumberInputGroup(this, 'qty-${colorObj.id}')">
                        </div>
                    </td>
                    <td style="vertical-align: middle;">
                        <div class="input-group flex-nowrap" style="width: 190px; margin: 0 auto;">
                            <input type="text" class="form-control m-0 text-center format-currency input-price-${colorObj.id}" value="${dispGiaBan}" required oninput="formatNumberInputGroup(this, 'price-${colorObj.id}')">
                            <span class="input-group-text">VNĐ</span>
                        </div>
                    </td>
                    <td style="vertical-align: middle;">
                        <button type="button" class="btn btn-link text-danger" onclick="openDeleteSizeModal('${colorObj.id}')"><i class="bi bi-trash-fill fs-5"></i></button>
                    </td>
                    <td style="border-left: 1px solid #f1f5f9; background: #fff; vertical-align: middle; min-width: 200px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px;" id="previewGrid_${colorObj.id}"></div>
                        <div id="imagePreviewContainer_${colorObj.id}" style="border: 2px dashed #cbd5e1; padding: 15px; border-radius: 10px; cursor: pointer; text-align: center; color: #64748b; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f8fafc; transition: all 0.3s;" onclick="document.getElementById('imageUpload_${colorObj.id}').click()">
                            <i class="bi bi-cloud-arrow-up fs-3" id="uploadIcon_${colorObj.id}" style="color: #64748b; transition: all 0.3s;"></i>
                            <div class="mt-1 fw-medium" style="font-size: 13px; line-height: 1.4; transition: all 0.3s;" id="uploadText_${colorObj.id}" data-original-text="Tải ảnh (Tối đa 6)<br/>(Màu ${colorObj.element.dataset.name})">Tải ảnh (Tối đa 6)<br/>(Màu ${colorObj.element.dataset.name})</div>
                        </div>
                        <input type="file" id="imageUpload_${colorObj.id}" accept="image/*" multiple style="display: none;" onchange="previewImages(this, '${colorObj.id}')">
                    </td>
                `;
                
                tbody.appendChild(row);
                stt++;
            });

            document.getElementById('variantSection').style.display = 'block';
            
            // Render previously uploaded images globally stored
            Object.keys(colorImagesMap).forEach(cId => {
                renderPreviewGrid(cId);
            });
        }

        let colorImagesMap = {};

        function previewImages(input, colorId) {
            if (!colorImagesMap[colorId]) {
                colorImagesMap[colorId] = [];
            }
            
            if (input.files && input.files.length > 0) {
                let filesToProcess = Array.from(input.files);
                
                let spaceLeft = 6 - colorImagesMap[colorId].length;
                if (spaceLeft <= 0) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Đã đạt giới hạn 6 ảnh!', showConfirmButton: false, timer: 3000 });
                    input.value = '';
                    return;
                }
                
                if (filesToProcess.length > spaceLeft) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Chỉ có thể thêm ' + spaceLeft + ' ảnh nữa!', showConfirmButton: false, timer: 3000 });
                    filesToProcess = filesToProcess.slice(0, spaceLeft);
                }
                
                let loadedCount = 0;
                filesToProcess.forEach(file => {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        colorImagesMap[colorId].push(e.target.result);
                        loadedCount++;
                        if(loadedCount === filesToProcess.length) {
                            renderPreviewGrid(colorId);
                        }
                    }
                    reader.readAsDataURL(file);
                });
            }
            input.value = '';
        }

        function removeImage(colorId, index) {
            if (colorImagesMap[colorId]) {
                colorImagesMap[colorId].splice(index, 1);
                renderPreviewGrid(colorId);
            }
        }

        function renderPreviewGrid(colorId) {
            const grid = document.getElementById('previewGrid_' + colorId);
            if (!grid) return;
            
            grid.innerHTML = '';
            let images = colorImagesMap[colorId] || [];
            
            images.forEach((b64, index) => {
                grid.innerHTML += `
                    <div style="position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: #ffffff;">
                        <img src="${b64}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" />
                        <button type="button" onclick="removeImage('${colorId}', ${index})" style="position: absolute; top: 0; right: 0; background: rgba(239, 68, 68, 0.9); color: white; border: none; width: 22px; height: 22px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-bottom-left-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(220, 38, 38, 1)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.9)';">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                `;
            });
            
            // Update hidden inputs for backend array
            var hiddenInputs = document.querySelectorAll('.image-color-' + colorId);
            let valToSet = '';
            if(images.length > 0) {
                // Wrap in JSON array
                valToSet = JSON.stringify(images);
            }
            hiddenInputs.forEach(inp => inp.value = valToSet);
            
            // Hide/Show upload button
            const container = document.getElementById('imagePreviewContainer_' + colorId);
            const uploadIcon = document.getElementById('uploadIcon_' + colorId);
            const uploadText = document.getElementById('uploadText_' + colorId);
            
            if(images.length >= 6) {
                container.style.display = 'none';
            } else {
                container.style.display = 'flex';
                if (images.length > 0) {
                    // Shrink the container since there are images
                    container.style.padding = '8px';
                    container.style.flexDirection = 'row';
                    container.style.gap = '8px';
                    uploadIcon.className = 'bi bi-cloud-arrow-up fs-5';
                    uploadText.className = 'fw-medium mb-0';
                    uploadText.innerHTML = `Thêm ảnh (${images.length}/6)`;
                } else {
                    // Revert to big container when empty
                    container.style.padding = '15px';
                    container.style.flexDirection = 'column';
                    container.style.gap = '0';
                    uploadIcon.className = 'bi bi-cloud-arrow-up fs-3';
                    uploadText.className = 'mt-1 fw-medium';
                    uploadText.innerHTML = uploadText.dataset.originalText;
                }
            }
        }

        function promptAddNew(type, title) {
            if (type === 'mau-sac') {
                Swal.fire({
                    title: 'Thêm Màu Sắc Mới',
                    html: `
                        <div class="mb-3 text-start">
                            <label class="form-label fw-semibold">Tên màu sắc <span class="text-danger">*</span></label>
                            <input id="swal-color-name" class="form-control" placeholder="Ví dụ: Đỏ, Xanh, Vàng...">
                        </div>
                        <div class="mb-3 text-start">
                            <label class="form-label fw-semibold">Mã màu (Hex) <span class="text-danger">*</span></label>
                            <div class="d-flex gap-2">
                                <input type="color" id="swal-color-picker" class="form-control form-control-color" value="#0EA5E9" style="width: 50px; height: 38px; padding: 3px; border-radius: 6px;" oninput="
                                    const hexVal = this.value.toUpperCase();
                                    document.getElementById('swal-color-hex').value = hexVal;
                                    const nameInput = document.getElementById('swal-color-name');
                                    if(nameInput.value === '' || nameInput.value.startsWith('#')) {
                                        nameInput.value = hexVal;
                                    }
                                ">
                                <input type="text" id="swal-color-hex" class="form-control" value="#0EA5E9" placeholder="#FFFFFF" maxlength="7" style="border-radius: 6px;" oninput="
                                    const hexVal = this.value.toUpperCase();
                                    const nameInput = document.getElementById('swal-color-name');
                                    if(nameInput.value === '' || nameInput.value.startsWith('#')) {
                                        nameInput.value = hexVal;
                                    }
                                ">
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Thêm',
                    cancelButtonText: 'Hủy',
                    showLoaderOnConfirm: true,
                    preConfirm: () => {
                        const name = document.getElementById('swal-color-name').value.trim();
                        const hex = document.getElementById('swal-color-hex').value.trim();
                        if (!name) {
                            Swal.showValidationMessage('Vui lòng nhập tên màu sắc!');
                            return false;
                        }
                        if (/^\d+$/.test(name)) {
                            Swal.showValidationMessage('Tên màu sắc không được chỉ chứa số!');
                            return false;
                        }
                        if (/[^a-zA-Z0-9#\-\s\u00C0-\u1EF9]/u.test(name)) {
                            Swal.showValidationMessage('Tên màu sắc chứa ký tự đặc biệt không hợp lệ!');
                            return false;
                        }
                        if (name.startsWith('#') && !/^#[0-9A-F]{6}$/i.test(name)) {
                            Swal.showValidationMessage('Mã màu Hex phải có dạng #RRGGBB (ví dụ: #FF0000)!');
                            return false;
                        }
                        if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
                            Swal.showValidationMessage('Mã màu Hex phải có dạng #RRGGBB (ví dụ: #FF0000)!');
                            return false;
                        }
                        
                        let bodyData = new URLSearchParams();
                        bodyData.append('ten', name);
                        bodyData.append('ma', hex);

                        return fetch(`/api/thuoc-tinh/add-mau-sac`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: bodyData
                        })
                        .then(async response => {
                            if (!response.ok) {
                                let errJson = await response.json().catch(() => ({}));
                                throw new Error(errJson.message || response.statusText);
                            }
                            return response.json();
                        })
                        .catch(error => { Swal.showValidationMessage(error.message || `Lỗi: ${error}`); });
                    },
                    allowOutsideClick: () => !Swal.isLoading()
                }).then((result) => {
                    if (result.isConfirmed && result.value) {
                        const data = result.value;
                        const html = `
                            <input type="checkbox" class="btn-check color-checkbox" id="color_${data.id}" value="${data.id}" data-name="${data.ten}" autocomplete="off" checked>
                            <label class="btn pill-label mb-1 d-inline-flex align-items-center gap-2" for="color_${data.id}">
                                <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; border: 1px solid #cbd5e1; background-color: ${data.hex || data.ma || '#ccc'}"></span>
                                <span>${data.ten}</span>
                            </label>
                        `;
                        document.getElementById('colorGroup').insertAdjacentHTML('beforeend', html);
                        document.getElementById(`color_${data.id}`).addEventListener('change', updateDropdownTexts);
                        updateDropdownTexts();
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Thêm thành công!', showConfirmButton: false, timer: 2000 });
                    }
                });
                return;
            }

            let extraValidation = null;
            if (type === 'co-giay') {
                extraValidation = (val) => {
                    if (!/^\d+$/.test(val)) return 'Kích cỡ phải là số nguyên và không chứa ký tự đặc biệt!';
                    const num = parseInt(val, 10);
                    if (num < 35 || num > 48) return 'Kích cỡ phải nằm trong khoảng từ 35 đến 48!';
                    return null;
                };
            } else {
                extraValidation = (val) => {
                    if (/[^a-zA-ZàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ\s]/u.test(val)) {
                        return 'Tên ' + title.toLowerCase() + ' không được chứa số hoặc ký tự đặc biệt!';
                    }
                    return null;
                };
            }

            Swal.fire({
                title: 'Thêm ' + title + ' Mới',
                input: 'text',
                inputPlaceholder: 'Nhập ' + title.toLowerCase() + '...',
                showCancelButton: true,
                confirmButtonText: 'Thêm',
                cancelButtonText: 'Hủy',
                showLoaderOnConfirm: true,
                preConfirm: (name) => {
                    if (!name || name.trim() === '') {
                        Swal.showValidationMessage('Vui lòng nhập giá trị hợp lệ!');
                        return false;
                    }
                    if (extraValidation) {
                        let err = extraValidation(name.trim());
                        if (err) {
                            Swal.showValidationMessage(err);
                            return false;
                        }
                    }
                    let bodyData = new URLSearchParams();
                    if (type === 'co-giay') bodyData.append('size', name.trim());
                    else bodyData.append('ten', name.trim());

                    return fetch(`/api/thuoc-tinh/add-${type}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: bodyData
                    })
                    .then(async response => {
                        if (!response.ok) {
                            let errJson = await response.json().catch(() => ({}));
                            throw new Error(errJson.message || response.statusText);
                        }
                        return response.json();
                    })
                    .catch(error => { Swal.showValidationMessage(error.message || `Lỗi: ${error}`); });
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const data = result.value;
                    let selectId = '';
                    if (type === 'thuong-hieu') selectId = 'thuongHieuSelect';
                    else if (type === 'danh-muc') selectId = 'danhMucSelect';
                    else if (type === 'loai-giay') selectId = 'loaiGiaySelect';
                    else if (type === 'chat-lieu') selectId = 'chatLieuSelect';
                    
                    if (selectId) {
                        const newOption = new Option(data.ten, data.id, true, true);
                        document.getElementById(selectId).add(newOption);
                    } else if (type === 'co-giay') {
                        const html = `
                            <input type="checkbox" class="btn-check size-checkbox" id="size_${data.id}" value="${data.id}" data-name="${data.ten}" autocomplete="off" checked>
                            <label class="btn pill-label mb-1" for="size_${data.id}">${data.ten}</label>
                        `;
                        document.getElementById('sizeGroup').insertAdjacentHTML('beforeend', html);
                        document.getElementById(`size_${data.id}`).addEventListener('change', updateDropdownTexts);
                        updateDropdownTexts();
                    }
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Thêm thành công!', showConfirmButton: false, timer: 2000 });
                }
            });
        }

        function formatNumberInput(input) {
            let cursor = input.selectionStart;
            let oldVal = input.value;
            
            // Get raw value (digits only)
            let rawValue = oldVal.replace(/[^0-9]/g, '');
            if (rawValue === '') rawValue = '0'; // Handle empty case by defaulting to 0
            
            // Calculate new formatted value
            let newVal = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            
            // Prevent leading zeros if not just '0'
            if (newVal.startsWith('0') && newVal.length > 1) {
                newVal = newVal.replace(/^0+/, '');
                if (newVal === '') newVal = '0';
                rawValue = newVal.replace(/,/g, '');
            }

            input.value = newVal;
            // Update hidden input (which is immediately next to it) if it is an input
            if (input.nextElementSibling && input.nextElementSibling.tagName === 'INPUT') {
                input.nextElementSibling.value = rawValue;
            }
            
            // Try to keep cursor in sensible position
            try {
                if (oldVal.length < newVal.length) {
                    cursor += (newVal.length - oldVal.length);
                } else if (oldVal.length > newVal.length) {
                    cursor -= (oldVal.length - newVal.length);
                }
                input.setSelectionRange(cursor, cursor);
            } catch (e) {
                // Ignore errors for cursor positioning (some browsers might throw on setSelectionRange for specific types)
            }
        }
        function removeColorGroup(colorId) {
            document.querySelectorAll(`.variant-row-${colorId}`).forEach(el => el.remove());
        }

        function formatNumberInputGroup(input, hiddenClass) {
            let cursor = input.selectionStart;
            let oldVal = input.value;
            let rawValue = oldVal.replace(/[^0-9]/g, '');
            if (rawValue === '') rawValue = '0';
            
            let newVal = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (newVal.startsWith('0') && newVal.length > 1) {
                newVal = newVal.replace(/^0+/, '');
                if (newVal === '') newVal = '0';
                rawValue = newVal.replace(/,/g, '');
            }

            input.value = newVal;
            
            document.querySelectorAll('.' + hiddenClass).forEach(hiddenInput => {
                hiddenInput.value = rawValue;
            });
            
            // Realtime Validation for Import vs Sell Price
            if (hiddenClass.startsWith('import-price-') || hiddenClass.startsWith('price-')) {
                let colorId = hiddenClass.replace('import-price-', '').replace('price-', '');
                let importInput = document.querySelector(`.input-import-${colorId}`);
                let priceInput = document.querySelector(`.input-price-${colorId}`);
                
                if (importInput && priceInput) {
                    let importVal = parseFloat(importInput.value.replace(/,/g, '')) || 0;
                    let priceVal = parseFloat(priceInput.value.replace(/,/g, '')) || 0;
                    
                    if (importVal >= priceVal && importVal > 0) {
                        importInput.classList.add('is-invalid');
                        priceInput.classList.add('is-invalid');
                    } else {
                        importInput.classList.remove('is-invalid');
                        priceInput.classList.remove('is-invalid');
                    }
                }
            }
            
            try {
                if (oldVal.length < newVal.length) cursor += (newVal.length - oldVal.length);
                else if (oldVal.length > newVal.length) cursor -= (oldVal.length - newVal.length);
                input.setSelectionRange(cursor, cursor);
            } catch (e) {}
        }

        function openDeleteSizeModal(colorId) {
            const row = document.querySelector(`.variant-row-${colorId}`);
            if (!row) return;
            const colorName = row.dataset.colorName;
            
            const modalBody = document.getElementById('deleteSizeModalBody');
            modalBody.innerHTML = `<p class="mb-3 text-muted">Chi tiết các biến thể của <strong>Màu ${colorName.toLowerCase()}</strong>:</p>`;
            
            const groups = row.querySelectorAll('.variant-hidden-group');
            if (groups.length === 0) return;
            
            let listHtml = `
            <div class="table-responsive mb-4" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <table class="table align-middle text-center mb-0" style="font-size: 0.95rem;">
                    <thead style="background-color: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px;">
                        <tr>
                            <th class="py-3 border-0 fw-semibold">Kích cỡ</th>
                            <th class="py-3 border-0 fw-semibold">Số lượng</th>
                            <th class="py-3 border-0 fw-semibold">Giá bán</th>
                            <th class="py-3 border-0 fw-semibold">Hành động</th>
                        </tr>
                    </thead>
                    <tbody style="border-top: 1px solid #e2e8f0;">
            `;
            
            groups.forEach(g => {
                let sId = g.dataset.sizeId;
                let sName = g.dataset.sizeName;
                
                let qty = g.querySelector('input[name="variantQuantities"]').value;
                let price = g.querySelector('input[name="variantPrices"]').value;
                
                let dispQty = qty.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                let dispPrice = price.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                
                listHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td class="fw-bold text-dark py-3">${sName}</td>
                            <td class="text-dark py-3">${dispQty}</td>
                            <td class="text-dark py-3">${dispPrice} đ</td>
                            <td class="py-3">
                                <button type="button" class="btn btn-sm btn-outline-dark rounded-circle shadow-none" style="width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#1e293b'; this.style.color='#fff';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#1e293b';" onclick="removeSpecificSize('${colorId}', '${sId}')"><i class="bi bi-trash3"></i></button>
                            </td>
                        </tr>
                `;
            });
            
            listHtml += `
                    </tbody>
                </table>
            </div>
            `;
            
            listHtml += `<button type="button" class="btn text-white w-100 py-3 fw-bold" style="background-color: #334155; border: none; border-radius: 8px; font-size: 1rem; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" onmouseover="this.style.backgroundColor='#475569'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';" onmouseout="this.style.backgroundColor='#334155'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';" onclick="removeColorGroup('${colorId}')"><i class="bi bi-trash3-fill me-2 fs-5" style="vertical-align: middle;"></i><span style="vertical-align: middle;">Xóa Toàn Bộ Màu Này</span></button>`;
            
            modalBody.innerHTML += listHtml;
            
            const myModal = new bootstrap.Modal(document.getElementById('deleteSizeModal'));
            myModal.show();
        }

        function removeSpecificSize(colorId, sizeId) {
            Swal.fire({
                title: 'Xác nhận xóa?',
                text: "Bạn có chắc chắn muốn xóa kích cỡ này khỏi màu hiện tại?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#00adef',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Đồng ý',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    const group = document.querySelector(`.variant-hidden-group.color-${colorId}-size-${sizeId}`);
                    if (group) group.remove();
                    
                    const remaining = document.querySelectorAll(`.variant-hidden-group[data-color-id="${colorId}"]`);
                    const modalEl = document.getElementById('deleteSizeModal');
                    let modalObj = bootstrap.Modal.getInstance(modalEl);
                    if (!modalObj) {
                        modalObj = new bootstrap.Modal(modalEl);
                    }
                    
                    if (remaining.length === 0) {
                        const row = document.querySelector(`.variant-row-${colorId}`);
                        if (row) row.remove();
                        if (modalObj) modalObj.hide();
                    } else {
                        let names = Array.from(remaining).map(g => g.dataset.sizeName).join(', ');
                        let labelEl = document.getElementById(`size-names-${colorId}`);
                        if (labelEl) labelEl.innerText = 'Kích cỡ: ' + names;
                        
                        openDeleteSizeModal(colorId); // refresh modal content
                    }
                }
            });
        }
        
        // Override the simple one with one that hides modal
        window.removeColorGroup = function(colorId) {
            Swal.fire({
                title: 'Xác nhận xóa toàn bộ?',
                text: "Tất cả các kích cỡ của màu này sẽ bị xóa. Bạn chắc chứ?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#00adef',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Xóa toàn bộ',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    document.querySelectorAll(`.variant-row-${colorId}`).forEach(el => el.remove());
                    const modalEl = document.getElementById('deleteSizeModal');
                    const modalObj = bootstrap.Modal.getInstance(modalEl);
                    if (modalObj) modalObj.hide();
                }
            });
        };

        // Auto-fetch maSanPham if empty
        document.addEventListener("DOMContentLoaded", function() {
            const maSpInput = document.getElementById("maSanPham");
            if (maSpInput && (!maSpInput.value || maSpInput.value.trim() === '' || maSpInput.value.trim() === 'null')) {
                fetch('/api/san-pham/next-code')
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.code) {
                            maSpInput.value = data.code;
                        }
                    })
                    .catch(() => {
                        fetch('/san-pham/api/next-code')
                            .then(res => res.json())
                            .then(data => {
                                if (data && data.code) maSpInput.value = data.code;
                            })
                            .catch(() => {});
                    });
            }
        });
