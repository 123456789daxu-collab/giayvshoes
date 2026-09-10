        /* ============================================================
           ADMIN ONLINE SUPPORT MANAGEMENT SYSTEM
           ============================================================ */
        const chatState = {
            stompClient: null,
            currentTab: 'active', // 'active' | 'history'
            searchQuery: '',
            activeSessionId: null,
            adminName: 'CSKH VShoes',
            sessions: {} // Key: sessionId -> { sender, phone, startTime, lastTime, status, messages: [] }
        };

        // Bắt đầu ứng dụng
        document.addEventListener("DOMContentLoaded", async function() {
            lucide.createIcons();
            connectAdminWS();
            await loadSessionsFromBackend();
        });

        // Tải danh sách phiên chat từ máy chủ
        async function loadSessionsFromBackend() {
            try {
                const res = await fetch('/api/chat/sessions');
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data) && data.length > 0) {
                        data.forEach(s => {
                            chatState.sessions[s.sessionId] = {
                                sessionId: s.sessionId,
                                sender: s.sender || ('Khách hàng #' + s.sessionId.replace('CUS_', '').replace('USER_', '')),
                                phone: s.phone || 'Chưa cung cấp SĐT',
                                startTime: s.startTime || '',
                                lastTime: s.lastTime || s.startTime || '',
                                status: s.status || 'NEED_SUPPORT',
                                messages: (s.messages || []).map(m => ({
                                    sender: m.senderRole === 'BOT' ? 'Trợ lý AI' : (m.senderRole === 'ADMIN' ? (m.sender || 'CSKH VShoes') : (s.sender || 'Khách hàng')),
                                    role: m.senderRole || (m.sender === 'Trợ lý AI' ? 'BOT' : 'CUSTOMER'),
                                    time: m.timestamp || '',
                                    content: m.content
                                }))
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('Lỗi nạp danh sách phiên chat từ API:', e);
            }

            renderSessionsList();

            // Mặc định chọn phiên đầu tiên nếu có
            const firstKey = Object.keys(chatState.sessions)[0];
            if (firstKey && !chatState.activeSessionId) {
                selectSession(firstKey);
            }
        }

        // Kết nối WebSocket
        function connectAdminWS() {
            try {
                const socket = new SockJS('/ws-chat');
                chatState.stompClient = Stomp.over(socket);
                chatState.stompClient.debug = null;

                chatState.stompClient.connect({}, function (frame) {
                    // Lắng nghe kênh Admin
                    chatState.stompClient.subscribe('/topic/admin', function (output) {
                        const msg = JSON.parse(output.body);
                        handleIncomingMessage(msg);
                    });
                }, function (error) {
                    console.warn('Admin WebSocket error, reconnecting...', error);
                    setTimeout(connectAdminWS, 5000);
                });
            } catch (e) {
                console.warn('WebSocket init warning:', e);
            }
        }

        // Xử lý khi có tin nhắn từ khách hoặc Bot
        function handleIncomingMessage(msg) {
            const sessionId = msg.sessionId || 'CUS_DEFAULT';
            let sender = msg.sender || 'Khách hàng';
            if (msg.senderRole !== 'BOT' && (sender === 'Khách hàng' || sender.startsWith('Khách_'))) {
                sender = 'Khách hàng #' + sessionId.replace('CUS_', '').replace('USER_', '');
            }
            const phone = msg.phone || 'Chưa cung cấp SĐT';
            const now = new Date();
            const timeStr = msg.timestamp || (now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear());

            const isNew = !chatState.sessions[sessionId];

            if (isNew) {
                let defaultSender = sender;
                if (msg.senderRole === 'BOT' || msg.senderRole === 'ADMIN') {
                    defaultSender = 'Khách hàng #' + sessionId.replace('CUS_', '').replace('USER_', '');
                }
                const newSession = {
                    sessionId: sessionId,
                    sender: defaultSender,
                    phone: phone,
                    startTime: timeStr,
                    lastTime: timeStr,
                    status: msg.status || 'NEED_SUPPORT',
                    messages: []
                };
                // Đặt session mới lên đầu
                chatState.sessions = { [sessionId]: newSession, ...chatState.sessions };
            } else {
                // Đưa session đã có lên đầu danh sách
                const currSession = chatState.sessions[sessionId];
                delete chatState.sessions[sessionId];
                chatState.sessions = { [sessionId]: currSession, ...chatState.sessions };
            }

            const session = chatState.sessions[sessionId];
            if (msg.senderRole !== 'BOT' && msg.senderRole !== 'ADMIN' && sender) {
                session.sender = sender;
            }
            if (phone && phone !== 'Chưa cung cấp SĐT') session.phone = phone;
            session.lastTime = timeStr;
            if (msg.status) session.status = msg.status;

            if (msg.type === 'CHAT' && msg.content) {
                session.messages.push({
                    sender: msg.senderRole === 'BOT' ? 'Trợ lý AI' : (msg.senderRole === 'ADMIN' ? (msg.sender || 'CSKH VShoes') : session.sender),
                    role: msg.senderRole || (msg.sender === 'Trợ lý AI' ? 'BOT' : 'CUSTOMER'),
                    time: timeStr,
                    content: msg.content
                });
            }

            // Tự động chuyển qua tab Đang hoạt động
            chatState.currentTab = 'active';
            const tabActiveBtn = document.getElementById('tabActiveBtn');
            const tabHistoryBtn = document.getElementById('tabHistoryBtn');
            if (tabActiveBtn) tabActiveBtn.classList.add('active');
            if (tabHistoryBtn) tabHistoryBtn.classList.remove('active');

            if (!chatState.activeSessionId || chatState.activeSessionId === sessionId || isNew) {
                selectSession(sessionId);
            } else {
                renderSessionsList();
                renderMessagesStream();
            }

            // Thông báo Toast cho nhân viên khi có khách cần hỗ trợ
            if (msg.status === 'NEED_SUPPORT' && (isNew || msg.content?.includes('gặp nhân viên'))) {
                if (window.Swal) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: `Khách hàng ${session.sender} yêu cầu hỗ trợ tư vấn!`,
                        showConfirmButton: false,
                        timer: 4000
                    });
                }
            }
        }

        // Chuyển Tab: Đang hoạt động / Lịch sử chat
        function switchTab(tab) {
            chatState.currentTab = tab;
            document.getElementById('tabActiveBtn').classList.toggle('active', tab === 'active');
            document.getElementById('tabHistoryBtn').classList.toggle('active', tab === 'history');
            renderSessionsList();
        }

        // Ô tìm kiếm
        function onSearchInput(val) {
            chatState.searchQuery = val.trim().toLowerCase();
            renderSessionsList();
        }

        // Render danh sách thẻ hội thoại cột trái
        function renderSessionsList() {
            const listEl = document.getElementById('chatSessionsList');
            if (!listEl) return;

            const allKeys = Object.keys(chatState.sessions);
            let filteredKeys = allKeys.filter(k => {
                const s = chatState.sessions[k];
                // Lọc theo Tab
                if (chatState.currentTab === 'active' && s.status === 'CLOSED') return false;
                if (chatState.currentTab === 'history' && s.status !== 'CLOSED') return false;

                // Lọc theo từ khóa tìm kiếm
                if (chatState.searchQuery) {
                    const matchName = s.sender.toLowerCase().includes(chatState.searchQuery);
                    const matchPhone = (s.phone || '').toLowerCase().includes(chatState.searchQuery);
                    return matchName || matchPhone;
                }
                return true;
            });

            if (filteredKeys.length === 0) {
                listEl.innerHTML = `
                    <div class="chat-empty-center" style="padding: 40px 10px;">
                        <i data-lucide="inbox" style="width: 38px; height: 38px; color: #cbd5e1; margin-bottom: 8px;"></i>
                        <div style="font-size: 13.5px; font-weight: 700; color: #64748b;">Không có hội thoại nào</div>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            listEl.innerHTML = filteredKeys.map(k => {
                const s = chatState.sessions[k];
                const isActive = chatState.activeSessionId === k ? 'active' : '';
                
                // Status badge
                let statusBadge = '';
                if (s.status === 'NEED_SUPPORT') {
                    statusBadge = `<span class="chat-card-status-badge need-help">Cần hỗ trợ</span>`;
                } else if (s.status === 'CHATTING') {
                    statusBadge = `<span class="chat-card-status-badge chatting">Đang chat</span>`;
                } else {
                    statusBadge = `<span class="chat-card-status-badge closed">Đã kết thúc</span>`;
                }

                const phoneDisplay = s.phone && s.phone !== 'Chưa cung cấp SĐT' 
                    ? `<i data-lucide="phone" style="width: 12px; height: 12px; vertical-align: -1px; margin-right: 4px;"></i>${escapeHTML(s.phone)}` 
                    : `<i data-lucide="phone" style="width: 12px; height: 12px; vertical-align: -1px; margin-right: 4px;"></i>Chưa cung cấp SĐT`;

                return `
                    <div class="chat-session-card ${isActive}" onclick="selectSession('${k}')">
                        <div class="chat-user-avatar-circle">
                            <i data-lucide="user" style="width: 18px; height: 18px;"></i>
                        </div>
                        <div class="chat-card-info">
                            <div class="chat-card-name-row">
                                <span class="chat-card-name">${escapeHTML(s.sender)}</span>
                                <span class="chat-card-time">${s.lastTime || s.startTime}</span>
                            </div>
                            <div class="chat-card-phone">${phoneDisplay}</div>
                            <div class="chat-card-bottom-row">
                                ${statusBadge}
                                <button class="chat-btn-delete-card" onclick="deleteSession('${k}', event)" title="Xoá đoạn chat này">
                                    <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        // Chọn hội thoại
        function selectSession(sessionId) {
            chatState.activeSessionId = sessionId;
            const session = chatState.sessions[sessionId];
            if (!session) return;

            document.getElementById('chatEmptyPlaceholder').style.display = 'none';
            const detailContainer = document.getElementById('chatDetailContainer');
            detailContainer.style.display = 'flex';

            // Cập nhật Header
            document.getElementById('activeCustomerName').innerText = session.sender;
            document.getElementById('activeCustomerPhone').innerHTML = session.phone && session.phone !== 'Chưa cung cấp SĐT'
                ? `<i data-lucide="phone" style="width: 13px; height: 13px; vertical-align: -2px; margin-right: 4px;"></i>${escapeHTML(session.phone)}`
                : `<i data-lucide="phone" style="width: 13px; height: 13px; vertical-align: -2px; margin-right: 4px;"></i>Chưa cung cấp SĐT`;
            document.getElementById('activeStartTime').innerHTML = `<i data-lucide="clock" style="width: 13px; height: 13px; vertical-align: -2px; margin-right: 4px;"></i>Bắt đầu lúc: ${escapeHTML(session.startTime || session.lastTime || '')}`;

            // Cập nhật trạng thái composer nếu đã đóng
            const composer = document.getElementById('chatComposerWrap');
            if (session.status === 'CLOSED') {
                composer.style.display = 'none';
            } else {
                composer.style.display = 'flex';
            }

            renderSessionsList();
            renderMessagesStream();
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                const input = document.getElementById('adminChatInput');
                if (input && session.status !== 'CLOSED') input.focus();
            }, 100);
        }

        // Render dòng chảy tin nhắn
        function renderMessagesStream() {
            const stream = document.getElementById('chatStreamBody');
            if (!stream || !chatState.activeSessionId) return;

            const session = chatState.sessions[chatState.activeSessionId];
            if (!session) return;

            if (session.messages.length === 0) {
                stream.innerHTML = `
                    <div class="chat-empty-center" style="margin: auto;">
                        <div style="margin-bottom: 8px;"><i data-lucide="message-square" style="width: 38px; height: 38px; color: #00adef;"></i></div>
                        <div style="font-weight: 700; color: #475569;">Bắt đầu phản hồi khách hàng</div>
                        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Nhập tin nhắn bên dưới để trò chuyện trực tiếp.</div>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            stream.innerHTML = session.messages.map(m => {
                let roleClass = 'customer';
                let headerMeta = `${escapeHTML(m.sender)} • ${m.time}`;
                let metaClass = '';

                if (m.role === 'BOT') {
                    roleClass = 'bot';
                    metaClass = 'bot-meta';
                    headerMeta = `<i data-lucide="bot" style="width: 13px; height: 13px; vertical-align: -2px; margin-right: 4px;"></i>Trợ lý AI • ${m.time}`;
                } else if (m.role === 'ADMIN') {
                    roleClass = 'admin';
                    headerMeta = `${escapeHTML(m.sender)} • ${m.time}`;
                }

                return `
                    <div class="chat-msg-entry ${roleClass}">
                        <div class="chat-msg-header-meta ${metaClass}">
                            ${headerMeta}
                        </div>
                        <div class="chat-msg-bubble">
                            ${m.content}
                        </div>
                    </div>
                `;
            }).join('');

            stream.scrollTop = stream.scrollHeight;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        // Gửi tin nhắn từ CSKH
        function sendAdminMessage() {
            const input = document.getElementById('adminChatInput');
            if (!input || !chatState.activeSessionId) return;

            const content = input.value.trim();
            if (!content) return;

            const session = chatState.sessions[chatState.activeSessionId];
            if (!session) return;

            const now = new Date();
            const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

            const chatMessage = {
                sender: chatState.adminName,
                content: content,
                type: 'CHAT',
                sessionId: chatState.activeSessionId,
                senderRole: 'ADMIN',
                status: 'CHATTING',
                timestamp: timeStr
            };

            // Gửi qua WebSocket
            if (chatState.stompClient && chatState.stompClient.connected) {
                chatState.stompClient.send("/app/chat.sendToCustomer", {}, JSON.stringify(chatMessage));
            }

            // Cập nhật trạng thái phiên
            session.status = 'CHATTING';
            session.lastTime = timeStr;
            session.messages.push({
                sender: chatState.adminName,
                role: 'ADMIN',
                time: timeStr,
                content: content
            });

            input.value = '';
            renderSessionsList();
            renderMessagesStream();
        }

        // Đóng phiên chat
        function closeCurrentSession() {
            if (!chatState.activeSessionId) return;

            const session = chatState.sessions[chatState.activeSessionId];
            if (!session) return;

            Swal.fire({
                title: 'Đóng phiên chat?',
                text: `Bạn có chắc chắn muốn kết thúc phiên hỗ trợ với ${session.sender}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Đồng ý kết thúc',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    session.status = 'CLOSED';

                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

                    const closeMsg = {
                        sender: chatState.adminName,
                        content: 'Phiên hỗ trợ trực tuyến đã kết thúc. Cảm ơn bạn đã liên hệ VShoes!',
                        type: 'CLOSE_SESSION',
                        sessionId: chatState.activeSessionId,
                        status: 'CLOSED',
                        timestamp: timeStr
                    };

                    if (chatState.stompClient && chatState.stompClient.connected) {
                        chatState.stompClient.send("/app/chat.sendToCustomer", {}, JSON.stringify(closeMsg));
                    }

                    // Gọi REST API đóng session trên backend
                    fetch('/api/chat/close/' + chatState.activeSessionId, { method: 'POST' }).catch(() => {});

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Đã đóng phiên chat thành công!',
                        showConfirmButton: false,
                        timer: 2000
                    });

                    document.getElementById('chatComposerWrap').style.display = 'none';
                    renderSessionsList();
                    renderMessagesStream();
                }
            });
        }

        // Xoá hội thoại
        function deleteSession(sessionId, event) {
            if (event) event.stopPropagation();

            const session = chatState.sessions[sessionId];
            const name = session ? session.sender : 'hội thoại này';

            Swal.fire({
                title: 'Xoá đoạn chat?',
                text: `Bạn có chắc muốn xoá hội thoại của ${name}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Đồng ý xoá',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    delete chatState.sessions[sessionId];

                    // Gọi REST API xóa session trên backend
                    fetch('/api/chat/session/' + sessionId, { method: 'DELETE' }).catch(() => {});

                    if (chatState.activeSessionId === sessionId) {
                        chatState.activeSessionId = null;
                        document.getElementById('chatDetailContainer').style.display = 'none';
                        document.getElementById('chatEmptyPlaceholder').style.display = 'flex';
                    }

                    renderSessionsList();

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Đã xoá đoạn chat thành công!',
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
            });
        }

        // Escape HTML
        function escapeHTML(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.innerText = text;
            return div.innerHTML;
        }

        // Phím tắt Enter để gửi
        document.addEventListener('keydown', function(e) {
            if (e.target && e.target.id === 'adminChatInput' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAdminMessage();
            }
        });
