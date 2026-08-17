import os
import re

files = [
    'thuong-hieu.html',
    'chat-lieu.html',
    'de-giay.html',
    'the-loai.html',
    'mau-sac.html',
    'kich-thuoc.html'
]

base_dir = r'e:\giayvshoes-main 123 (1)\src\main\resources\templates'

for f in files:
    path = os.path.join(base_dir, f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Replace the toggle switch with a circular button
    pattern_switch_full = re.compile(r'<div class=\"form-check form-switch\"[^>]*>.*?<a [^>]*th:href=\"@\{\'(/[a-z\-]+/delete/)\' \+ \$\{item\.id\}\}\"[^>]*></a>\s*</div>', re.DOTALL)
    
    def repl_switch(match):
        url_prefix = match.group(1)
        return f'''<button type="button" title="Đổi trạng thái" th:onclick="'confirmToggleStatus(\\'' + '{url_prefix}' + '\\' + ${{item.id}} + '\\')'" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.backgroundColor='#ffffff'; this.style.borderColor='#e2e8f0';">
                                            <i data-lucide="refresh-cw" style="width: 14px; height: 14px; color: #3b82f6;"></i>
                                        </button>'''
    
    new_content = pattern_switch_full.sub(repl_switch, content)
    
    # 2. Add the confirmToggleStatus script before </body>
    script = '''
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
    </script>
</body>'''
    
    if 'confirmToggleStatus' not in new_content:
        new_content = new_content.replace('</script>\n</body>', script)
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(new_content)
        
print('Done modifying HTML files')
