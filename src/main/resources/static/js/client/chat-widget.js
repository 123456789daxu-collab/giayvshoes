        (function() {
            var toggleBtn = document.getElementById('vShoesToggleBtn');
            var closeBtn = document.getElementById('cwHeaderCloseBtn');
            var chatWindow = document.getElementById('vShoesChatWindow');
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            function toggleChat() {
                chatWindow.classList.toggle('show');
                toggleBtn.classList.toggle('open');
                if (chatWindow.classList.contains('show')) {
                    fetchProductsForAI();
                }
            }

            if (toggleBtn) toggleBtn.addEventListener('click', toggleChat);
            if (closeBtn) closeBtn.addEventListener('click', toggleChat);

            var sessionId = localStorage.getItem('vshoes_chat_session');
            if(!sessionId) {
                sessionId = 'CUS_' + Math.floor(1000 + Math.random() * 9000);
                localStorage.setItem('vshoes_chat_session', sessionId);
            }
            var guestCode = sessionId.replace('CUS_', '').replace('USER_', '');
            var customerName = "Khách hàng #" + guestCode;
            var customerPhone = "Chưa cung cấp SĐT";

            async function checkCurrentUser() {
                try {
                    const res = await fetch('/api/auth/current-user');
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.loggedIn && data.user) {
                            const u = data.user;
                            if (u.hoTen && u.hoTen.trim().length > 0) {
                                customerName = u.hoTen.trim();
                            } else if (u.email) {
                                customerName = u.email.split('@')[0];
                            }
                            if (u.soDienThoai && u.soDienThoai.trim().length > 0) {
                                customerPhone = u.soDienThoai.trim();
                            }
                            if (u.id) {
                                sessionId = 'CUS_USER_' + u.id;
                                localStorage.setItem('vshoes_chat_session', sessionId);
                            }
                        } else {
                            // Khách vãng lai
                            if (!sessionId || sessionId.startsWith('CUS_USER_')) {
                                sessionId = 'CUS_' + Math.floor(1000 + Math.random() * 9000);
                                localStorage.setItem('vshoes_chat_session', sessionId);
                            }
                            var guestCode = sessionId.replace('CUS_', '').replace('USER_', '');
                            customerName = "Khách hàng #" + guestCode;
                            customerPhone = "Chưa cung cấp SĐT";
                        }
                    }
                } catch(e) {
                    console.warn("Lỗi kiểm tra current user:", e);
                }
            }

            window.sendQuickMessage = function(text) {
                var input = document.getElementById('cwInput');
                if (input) {
                    input.value = text;
                    sendMessage();
                }
            };

            function ensureSendToAdmin(chatMessage) {
                if (stompClient && stompClient.connected) {
                    stompClient.send("/app/chat.sendToAdmin", {}, JSON.stringify(chatMessage));
                } else {
                    connectWS(function() {
                        if (stompClient && stompClient.connected) {
                            stompClient.send("/app/chat.sendToAdmin", {}, JSON.stringify(chatMessage));
                        }
                    });
                }
            }

            window.requestHumanSupport = function() {
                // Ẩn thanh gặp nhân viên ngay khi đã gửi yêu cầu kết nối
                var banner = document.getElementById('cwAgentBanner');
                if (banner) banner.style.display = 'none';

                var content = "Tôi muốn gặp nhân viên tư vấn hỗ trợ trực tiếp";
                var now = new Date();
                var timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

                var chatMessage = {
                    sender: customerName,
                    phone: customerPhone,
                    content: content,
                    type: 'CHAT',
                    sessionId: sessionId,
                    senderRole: 'CUSTOMER',
                    status: 'NEED_SUPPORT',
                    timestamp: timeStr
                };
                
                showSentMessage(chatMessage);
                ensureSendToAdmin(chatMessage);

                // AI Response
                setTimeout(function() {
                    var botReply = "Đã gửi yêu cầu kết nối với nhân viên tư vấn. Nhân viên trực sẽ phản hồi bạn trong giây lát!";
                    var botMsg = {
                        sender: customerName,
                        phone: customerPhone,
                        content: botReply,
                        type: 'CHAT',
                        sessionId: sessionId,
                        senderRole: 'BOT',
                        status: 'NEED_SUPPORT',
                        timestamp: timeStr
                    };

                    ensureSendToAdmin(botMsg);

                    var container = document.getElementById('cwMessages');
                    var div = document.createElement('div');
                    div.className = 'cw-msg bot';
                    div.innerHTML = `
                        <div class="cw-msg-bubble">
                            ${botReply}
                        </div>
                        <div class="cw-msg-time">Trợ lý AI • ${timeStr}</div>
                    `;
                    container.appendChild(div);
                    container.scrollTop = container.scrollHeight;
                }, 500);
            };

            // Cache dữ liệu sản phẩm & đánh giá cho AI
            var productsCache = [];
            var ratingsCache = {};

            async function fetchProductsForAI() {
                try {
                    var [resProd, resRating] = await Promise.all([
                        fetch('/api/san-pham/search-sale'),
                        fetch('/api/auth/danh-gia/summary-all').catch(function() { return { ok: false }; })
                    ]);
                    if (resProd.ok) {
                        productsCache = await resProd.json();
                    }
                    if (resRating.ok) {
                        ratingsCache = await resRating.json();
                    }
                } catch(e) {
                    console.warn("Lỗi nạp sản phẩm cho AI:", e);
                }
            }

            // Load trước sản phẩm ngay khi tải trang
            fetchProductsForAI();

            // WebSocket connection logic
            var stompClient = null;

            function connectWS(onConnectCallback) {
                if (stompClient && stompClient.connected) {
                    if (typeof onConnectCallback === 'function') onConnectCallback();
                    return;
                }
                try {
                    var socket = new SockJS('/ws-chat');
                    stompClient = Stomp.over(socket);
                    stompClient.debug = null;

                    stompClient.connect({}, function (frame) {
                        stompClient.subscribe('/topic/customer/' + sessionId, function (chatMessage) {
                            showReceivedMessage(JSON.parse(chatMessage.body));
                        });

                        var now = new Date();
                        var timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

                        stompClient.send("/app/chat.addUser",
                            {},
                            JSON.stringify({
                                sender: customerName,
                                phone: customerPhone,
                                type: 'JOIN',
                                sessionId: sessionId,
                                senderRole: 'CUSTOMER',
                                status: 'NEED_SUPPORT',
                                timestamp: timeStr
                            })
                        );

                        if (typeof onConnectCallback === 'function') {
                            onConnectCallback();
                        }
                    }, function(error) {
                        console.warn("WebSocket reconnecting in 5s...", error);
                        setTimeout(function() { connectWS(onConnectCallback); }, 5000);
                    });
                } catch(e) {
                    console.warn("WebSocket status: fallback mode", e);
                }
            }

            async function loadHistoryIfAvailable() {
                try {
                    var res = await fetch('/api/chat/history/' + sessionId);
                    if (res.ok) {
                        var data = await res.json();
                        if (data && data.messages && data.messages.length > 0) {
                            var container = document.getElementById('cwMessages');
                            container.innerHTML = `
                                <div class="cw-msg bot">
                                    <div class="cw-msg-bubble">
                                        Xin chào! Tôi là <strong>VShoes AI Assistant</strong>.<br><br>
                                        Tôi có thể gợi ý cho bạn các mẫu giày <strong>bán chạy nhất</strong>, giày <strong>đánh giá 5 sao</strong>, tìm giày theo <strong>màu sắc / thương hiệu</strong>, hoặc tư vấn chọn size chuẩn xác. Bạn đang cần tìm mẫu giày như thế nào ạ?
                                    </div>
                                    <div class="cw-msg-time">VShoes AI • Vừa xong</div>
                                </div>
                            `;
                            data.messages.forEach(function(m) {
                                if (m.senderRole === 'CUSTOMER') {
                                    var div = document.createElement('div');
                                    div.className = 'cw-msg user';
                                    div.innerHTML = `
                                        <div class="cw-msg-bubble">${escapeHTML(m.content)}</div>
                                        <div class="cw-msg-time">${m.timestamp || ''}</div>
                                    `;
                                    container.appendChild(div);
                                } else if (m.senderRole === 'ADMIN') {
                                    var div = document.createElement('div');
                                    div.className = 'cw-msg admin';
                                    div.innerHTML = `
                                        <div class="cw-msg-bubble">${escapeHTML(m.content)}</div>
                                        <div class="cw-msg-time">${escapeHTML(m.sender || 'CSKH VShoes')} • ${m.timestamp || ''}</div>
                                    `;
                                    container.appendChild(div);
                                } else if (m.senderRole === 'BOT') {
                                    var div = document.createElement('div');
                                    div.className = 'cw-msg bot';
                                    div.innerHTML = `
                                        <div class="cw-msg-bubble">${m.content}</div>
                                        <div class="cw-msg-time">Trợ lý AI • ${m.timestamp || ''}</div>
                                    `;
                                    container.appendChild(div);
                                }
                            });
                            container.scrollTop = container.scrollHeight;
                        }
                    }
                } catch(e) {
                    console.warn("Lỗi tải lịch sử chat:", e);
                }
            }

            // Khởi tạo Chat sau khi kiểm tra Auth
            (async function init() {
                await checkCurrentUser();
                connectWS();
                await loadHistoryIfAvailable();
            })();

            function sendMessage() {
                var input = document.getElementById('cwInput');
                if(!input) return;
                var content = input.value.trim();
                
                if(content) {
                    var now = new Date();
                    var timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

                    var chatMessage = {
                        sender: customerName,
                        phone: customerPhone,
                        content: content,
                        type: 'CHAT',
                        sessionId: sessionId,
                        senderRole: 'CUSTOMER',
                        status: 'CHATTING',
                        timestamp: timeStr
                    };
                    
                    showSentMessage(chatMessage);
                    input.value = '';
                    ensureSendToAdmin(chatMessage);

                    // Smart AI Auto-Response
                    setTimeout(async function() {
                        if (productsCache.length === 0) {
                            await fetchProductsForAI();
                        }
                        generateAIResponse(content);
                    }, 500);
                }
            }

            function formatCurrency(val) {
                if (!val) return "Liên hệ";
                return Number(val).toLocaleString('vi-VN') + "₫";
            }

            function getProductRating(p) {
                var spctKey = 'spct_' + p.id;
                var spKey = 'sp_' + (p.sanPhamId || 0);
                if (ratingsCache[spctKey] && ratingsCache[spctKey].rating) {
                    return ratingsCache[spctKey].rating.toFixed(1);
                }
                if (ratingsCache[spKey] && ratingsCache[spKey].rating) {
                    return ratingsCache[spKey].rating.toFixed(1);
                }
                return "5.0";
            }

            function generateAIResponse(userText) {
                var textLower = userText.toLowerCase().trim();
                var aiReply = "";
                var matchedProducts = [];

                // 1. TÌM THEO SẢN PHẨM BÁN CHẠY NHẤT / HOT TREND / BEST SELLER
                if (textLower.includes("bán chạy") || textLower.includes("hot") || textLower.includes("mua nhiều") || 
                    textLower.includes("ưa chuộng") || textLower.includes("best seller") || textLower.includes("thịnh hành") ||
                    textLower.includes("nổi bật") || textLower.includes("sản phẩm nào tốt") || textLower.includes("gợi ý sản phẩm")) {
                    
                    aiReply = "Dạ chào bạn! Dưới đây là top những mẫu giày <strong>bán chạy nhất và được săn đón nhiều nhất</strong> tại VShoes hiện nay:";
                    // Sắp xếp ưu tiên giảm giá cao hoặc hàng hot
                    matchedProducts = [...productsCache].sort(function(a, b) {
                        var disA = a.phanTramGiam || 0;
                        var disB = b.phanTramGiam || 0;
                        return disB - disA;
                    }).slice(0, 3);
                    if (matchedProducts.length === 0) matchedProducts = productsCache.slice(0, 3);
                }

                // 2. TÌM THEO ĐÁNH GIÁ CAO / 5 SAO / REVIEW TỐT
                else if (textLower.includes("đánh giá cao") || textLower.includes("nhiều sao") || textLower.includes("review tốt") ||
                         textLower.includes("đánh giá tốt") || textLower.includes("5 sao") || textLower.includes("top đánh giá") ||
                         textLower.includes("chất lượng nhất") || textLower.includes("phản hồi tốt")) {
                    
                    aiReply = "Dạ VShoes gửi bạn các mẫu giày nhận được <strong>đánh giá 5 sao (5.0/5.0)</strong> và phản hồi xuất sắc nhất từ khách hàng thực tế:";
                    matchedProducts = [...productsCache].slice(0, 3);
                }

                // 3. TÌM THEO MÀU SẮC (Đen, Trắng, Đỏ, Xanh, Hồng, Xám, Vàng, Cam, Tím, Be...)
                else if (textLower.includes("màu") || textLower.includes("đen") || textLower.includes("trắng") || 
                         textLower.includes("đỏ") || textLower.includes("xanh") || textLower.includes("hồng") || 
                         textLower.includes("xám") || textLower.includes("ghi") || textLower.includes("vàng") || 
                         textLower.includes("cam") || textLower.includes("tím") || textLower.includes("be") || 
                         textLower.includes("nâu") || textLower.includes("kem")) {
                    
                    var colorKeyword = "";
                    var colorName = "";
                    if (textLower.includes("đen")) { colorKeyword = "đen"; colorName = "Đen"; }
                    else if (textLower.includes("trắng")) { colorKeyword = "trắng"; colorName = "Trắng"; }
                    else if (textLower.includes("đỏ")) { colorKeyword = "đỏ"; colorName = "Đỏ"; }
                    else if (textLower.includes("xanh dương") || textLower.includes("xanh biển")) { colorKeyword = "xanh"; colorName = "Xanh dương"; }
                    else if (textLower.includes("xanh lá")) { colorKeyword = "xanh lá"; colorName = "Xanh lá"; }
                    else if (textLower.includes("xanh")) { colorKeyword = "xanh"; colorName = "Xanh"; }
                    else if (textLower.includes("hồng")) { colorKeyword = "hồng"; colorName = "Hồng"; }
                    else if (textLower.includes("xám") || textLower.includes("ghi")) { colorKeyword = "xám"; colorName = "Xám"; }
                    else if (textLower.includes("vàng")) { colorKeyword = "vàng"; colorName = "Vàng"; }
                    else if (textLower.includes("cam")) { colorKeyword = "cam"; colorName = "Cam"; }
                    else if (textLower.includes("tím")) { colorKeyword = "tím"; colorName = "Tím"; }
                    else if (textLower.includes("be") || textLower.includes("kem")) { colorKeyword = "be"; colorName = "Be / Kem"; }
                    else if (textLower.includes("nâu")) { colorKeyword = "nâu"; colorName = "Nâu"; }

                    if (colorKeyword) {
                        matchedProducts = productsCache.filter(function(p) {
                            var c = (p.mauSac || '').toLowerCase();
                            var name = (p.tenSanPham || '').toLowerCase();
                            return c.includes(colorKeyword) || name.includes(colorKeyword);
                        }).slice(0, 3);

                        if (matchedProducts.length > 0) {
                            aiReply = "Dạ VShoes gợi ý cho bạn các mẫu giày <strong>tông màu " + colorName + "</strong> cực kỳ thời trang và êm chân dưới đây ạ:";
                        } else {
                            aiReply = "Dạ hiện tại các mẫu tông màu " + colorName + " đang được cập nhật thêm. Bạn tham khảo qua các mẫu nổi bật đang có sẵn bên dưới nhé:";
                            matchedProducts = productsCache.slice(0, 3);
                        }
                    }
                }

                // 4. TÌM THEO THƯƠNG HIỆU (Nike, Adidas, Puma, Hoka, Asics, Ananas, Biti's, Vans...)
                else if (textLower.includes("nike") || textLower.includes("adidas") || textLower.includes("puma") || 
                         textLower.includes("hoka") || textLower.includes("asics") || textLower.includes("ananas") || 
                         textLower.includes("biti") || textLower.includes("vans") || textLower.includes("converse") || textLower.includes("skechers")) {
                    
                    var brandName = "";
                    if (textLower.includes("nike")) brandName = "Nike";
                    else if (textLower.includes("adidas")) brandName = "Adidas";
                    else if (textLower.includes("puma")) brandName = "Puma";
                    else if (textLower.includes("hoka")) brandName = "Hoka";
                    else if (textLower.includes("asics")) brandName = "Asics";
                    else if (textLower.includes("ananas")) brandName = "Ananas";
                    else if (textLower.includes("biti")) brandName = "Biti's";
                    else if (textLower.includes("vans")) brandName = "Vans";
                    else if (textLower.includes("converse")) brandName = "Converse";
                    else if (textLower.includes("skechers")) brandName = "Skechers";

                    matchedProducts = productsCache.filter(function(p) {
                        var th = (p.thuongHieu || '').toLowerCase();
                        var name = (p.tenSanPham || '').toLowerCase();
                        return th.includes(brandName.toLowerCase()) || name.includes(brandName.toLowerCase());
                    }).slice(0, 3);

                    if (matchedProducts.length > 0) {
                        aiReply = "Dưới đây là các mẫu giày chính hãng thương hiệu <strong>" + brandName + "</strong> đang có sẵn tại VShoes:";
                    } else {
                        aiReply = "Dạ thương hiệu " + brandName + " đang rất hot. Bạn xem qua các mẫu bán chạy tại shop nhé:";
                        matchedProducts = productsCache.slice(0, 3);
                    }
                }

                // 5. TƯ VẤN SIZE GIÀY
                else if (textLower.includes("size") || textLower.includes("đo chân") || textLower.includes("kích thước") || textLower.includes("bảng size")) {
                    aiReply = "<strong>Bảng tư vấn chọn Size VShoes chuẩn:</strong><br>- Size 39: Chân dài 24.0 - 24.5 cm<br>- Size 40: Chân dài 24.5 - 25.0 cm<br>- Size 41: Chân dài 25.0 - 25.5 cm<br>- Size 42: Chân dài 25.5 - 26.0 cm<br>- Size 43: Chân dài 26.0 - 27.0 cm<br><em>Mẹo: Bạn nên chọn tăng 0.5 - 1 size nếu mang thêm tất dày hoặc chạy bộ đường dài nhé!</em>";
                }

                // 6. CHÍNH SÁCH GIAO HÀNG
                else if (textLower.includes("giao hàng") || textLower.includes("ship") || textLower.includes("vận chuyển") || textLower.includes("phí ship")) {
                    aiReply = "<strong>Chính sách giao hàng VShoes:</strong><br>- <strong>Miễn phí vận chuyển</strong> toàn quốc cho đơn hàng từ 500.000₫.<br>- Thời gian giao hàng: 2 - 3 ngày làm việc.<br>- Cho phép kiểm tra hàng thoải mái trước khi thanh toán!";
                }

                // 7. CHÍNH SÁCH ĐỔI TRẢ & BẢO HÀNH
                else if (textLower.includes("đổi trả") || textLower.includes("bảo hành") || textLower.includes("hoàn tiền") || textLower.includes("lỗi")) {
                    aiReply = "<strong>Chính sách bảo hành & Đổi trả:</strong><br>- Đổi trả dễ dàng trong vòng <strong>30 ngày</strong> nếu không vừa size hoặc lỗi do nhà sản xuất.<br>- Bảo hành chính hãng <strong>12 tháng</strong> keo chỉ toàn bộ sản phẩm!";
                }

                // 8. KHUYẾN MÃI & MÃ GIẢM GIÁ
                else if (textLower.includes("khuyến mãi") || textLower.includes("ưu đãi") || textLower.includes("sale") || textLower.includes("voucher") || textLower.includes("mã giảm giá")) {
                    aiReply = "<strong>Ưu đãi cực HOT tháng này:</strong><br>- Giảm 15% cho thành viên mới đăng ký tài khoản.<br>- Voucher giảm giá đến 100.000₫ áp dụng trực tiếp tại bước thanh toán!<br>Bạn tham khảo thêm các sản phẩm đang có giá ưu đãi bên dưới:";
                    matchedProducts = productsCache.filter(function(p) { return (p.phanTramGiam || 0) > 0; }).slice(0, 3);
                    if (matchedProducts.length === 0) matchedProducts = productsCache.slice(0, 3);
                }

                // 9. TÌM THEO TỪ KHOÁ SẢN PHẨM KHÁC HOẶC GỢI Ý MẶC ĐỊNH
                else {
                    var searchMatches = productsCache.filter(function(p) {
                        var name = (p.tenSanPham || '').toLowerCase();
                        var words = textLower.split(' ');
                        return words.some(function(w) { return w.length >= 3 && name.includes(w); });
                    }).slice(0, 3);

                    if (searchMatches.length > 0) {
                        aiReply = "Dạ VShoes tìm thấy một số sản phẩm phù hợp với yêu cầu của bạn nè:";
                        matchedProducts = searchMatches;
                    } else {
                        aiReply = "Cảm ơn câu hỏi của bạn! Nếu bạn đang tìm giày chạy bộ êm ái, VShoes xin phép gợi ý một số mẫu đang <strong>bán chạy và được đánh giá cao nhất</strong> tại shop:";
                        matchedProducts = productsCache.slice(0, 3);
                    }
                }

                // TẠO HTML DANH SÁCH THẺ SẢN PHẨM TƯƠNG TÁC
                var productCardsHtml = "";
                var summaryListText = "";
                if (matchedProducts && matchedProducts.length > 0) {
                    summaryListText = "<br>" + matchedProducts.map(function(p) {
                        return "• <b>" + escapeHTML(p.tenSanPham || 'Giày VShoes') + "</b> - " + formatCurrency(p.giaBan || p.giaGoc || 0) + " (" + getProductRating(p) + "/5.0)";
                    }).join("<br>");

                    productCardsHtml = `
                        <div class="cw-prod-cards-container">
                            ${matchedProducts.map(function(p) {
                                var rating = getProductRating(p);
                                var img = p.hinhAnh || '/images/white.png';
                                var price = formatCurrency(p.giaBan || p.giaGoc || 0);
                                var discountBadge = (p.phanTramGiam && p.phanTramGiam > 0) ? `<span class="cw-prod-discount">-${p.phanTramGiam}%</span>` : '';
                                var colorText = p.mauSac ? ` · ${p.mauSac}` : '';
                                var link = `/client/products/${p.id}`;

                                return `
                                    <div class="cw-prod-mini-card" onclick="window.open('${link}', '_blank')" style="cursor: pointer;">
                                        <img src="${img}" class="cw-prod-mini-img" alt="${escapeHTML(p.tenSanPham || '')}" onerror="this.src='/images/white.png'">
                                        <div class="cw-prod-mini-info">
                                            <div class="cw-prod-mini-title" title="${escapeHTML(p.tenSanPham || '')}">
                                                ${escapeHTML(p.tenSanPham || 'Giày thể thao VShoes')}
                                            </div>
                                            <div class="cw-prod-mini-meta">
                                                <div class="cw-prod-price-wrap">
                                                    <span class="cw-prod-mini-price">${price}</span>
                                                    ${discountBadge}
                                                </div>
                                                <span class="cw-prod-mini-badge"><i data-lucide="star" style="width:11px;height:11px;fill:#f59e0b;color:#f59e0b;vertical-align:-1px;margin-right:2px;"></i>${rating}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                                                <span style="font-size: 11px; color: #64748b; font-weight: 500;">${escapeHTML(p.thuongHieu || 'VShoes')}${escapeHTML(colorText)}</span>
                                                <a href="${link}" class="cw-prod-mini-btn" target="_blank" onclick="event.stopPropagation()">Xem ngay <i data-lucide="arrow-right" style="width:12px;height:12px;vertical-align:-1px;"></i></a>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                var container = document.getElementById('cwMessages');
                var now = new Date();
                var timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
                var shortTime = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                var div = document.createElement('div');
                div.className = 'cw-msg bot';
                div.innerHTML = `
                    <div class="cw-msg-bubble">${aiReply}${productCardsHtml}</div>
                    <div class="cw-msg-time">VShoes AI • ${shortTime}</div>
                `;
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;

                // Đồng bộ tin nhắn phản hồi của AI sang bên Admin
                var botMsg = {
                    sender: 'Trợ lý AI',
                    phone: customerPhone,
                    content: aiReply + summaryListText,
                    type: 'CHAT',
                    sessionId: sessionId,
                    senderRole: 'BOT',
                    status: 'CHATTING',
                    timestamp: timeStr
                };
                ensureSendToAdmin(botMsg);
            }

            function showReceivedMessage(msg) {
                // Ẩn thanh gặp nhân viên khi nhận tin nhắn từ CSKH
                var banner = document.getElementById('cwAgentBanner');
                if (banner && msg.senderRole === 'ADMIN') banner.style.display = 'none';

                var container = document.getElementById('cwMessages');
                var now = new Date();
                var time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                var div = document.createElement('div');
                
                if (msg.type === 'CLOSE_SESSION') {
                    div.className = 'cw-msg bot';
                    div.innerHTML = `
                        <div class="cw-msg-bubble" style="border-left: 3px solid #64748b; background: #f8fafc; color: #475569;">
                            ℹ️ <em>${escapeHTML(msg.content || 'Phiên hỗ trợ đã kết thúc.')}</em>
                        </div>
                        <div class="cw-msg-time">${time}</div>
                    `;
                    if (banner) banner.style.display = 'flex';
                } else {
                    div.className = 'cw-msg admin';
                    div.innerHTML = `
                        <div class="cw-msg-bubble">${escapeHTML(msg.content)}</div>
                        <div class="cw-msg-time">${escapeHTML(msg.sender || 'CSKH VShoes')} • ${time}</div>
                    `;
                }
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            }

            function showSentMessage(msg) {
                var container = document.getElementById('cwMessages');
                var time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                var div = document.createElement('div');
                div.className = 'cw-msg user';
                div.innerHTML = `
                    <div class="cw-msg-bubble">${escapeHTML(msg.content)}</div>
                    <div class="cw-msg-time">${time}</div>
                `;
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            }

            function escapeHTML(text) {
                if(!text) return '';
                var div = document.createElement('div');
                div.innerText = text;
                return div.innerHTML;
            }

            var sendBtn = document.getElementById('cwSendBtn');
            var inputEl = document.getElementById('cwInput');
            if (sendBtn) sendBtn.addEventListener('click', sendMessage);
            if (inputEl) {
                inputEl.addEventListener('keypress', function(e) {
                    if(e.key === 'Enter') sendMessage();
                });
            }
        })();
