import os

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('th:href="@{/css/sidebar.css}"', 'th:href="@{/css/sidebar.css(v=3)}"')
    new_content = new_content.replace('href="/css/sidebar.css"', 'href="/css/sidebar.css?v=3"')
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated", filepath)

for root, dirs, files in os.walk('D:/giayvshoes-main (1)/src/main/resources/templates/'):
    for f in files:
        if f.endswith('.html'):
            update_file(os.path.join(root, f))

for root, dirs, files in os.walk('d:/giayvshoes-main/src/main/resources/templates/'):
    for f in files:
        if f.endswith('.html'):
            update_file(os.path.join(root, f))
