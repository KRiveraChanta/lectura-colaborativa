import os

files_to_fix = [
    'src/components/Catalog.tsx',
    'src/components/Profile.tsx',
    'src/components/AdminDashboard.tsx'
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Catalog.tsx fixes
    if 'Catalog.tsx' in file_path:
        content = content.replace('bg-white rounded shadow-sm', 'rounded shadow-sm border\" style={{ backgroundColor: \\'var(--surface-card)\\', borderColor: \\'var(--surface-border)\\' }}')
        content = content.replace('fw-bold text-dark', 'fw-bold\" style={{ color: \\'var(--text-color)\\' }}')
        # Change fw-bold to fw-normal for 'Tus Favoritos'
        content = content.replace('<h3 className=\"fw-bold mb-4 border-start border-danger', '<h3 className=\"fw-normal mb-4 border-start border-danger')
        content = content.replace('<h3 className=\"fw-bold\" style={{ color: \\'var(--text-color)\\' }}>Tus Favoritos</h3>', '<h3 className=\"fw-normal\" style={{ color: \\'var(--text-color)\\' }}>Tus Favoritos</h3>')
        # And Mis Listas Personalizadas
        content = content.replace('<h3 className=\"fw-bold border-start border-info', '<h3 className=\"fw-normal border-start border-info')

    # Profile.tsx fixes
    if 'Profile.tsx' in file_path:
        content = content.replace('bg-white rounded shadow-sm', 'rounded shadow-sm border\" style={{ backgroundColor: \\'var(--surface-card)\\', borderColor: \\'var(--surface-border)\\' }}')
        content = content.replace('fw-bold text-dark m-0', 'fw-bold m-0\" style={{ color: \\'var(--text-color)\\' }}')
        content = content.replace('fw-bold text-dark mb-4 border-start border-primary', 'fw-bold mb-4 border-start border-primary\" style={{ color: \\'var(--text-color)\\' }}')
        content = content.replace('display-6 fw-bolder text-dark mb-2', 'display-6 fw-bolder mb-2\" style={{ color: \\'var(--text-color)\\' }}')
        content = content.replace('fw-bold text-dark text-truncate', 'fw-bold text-truncate\" style={{ color: \\'var(--text-color)\\' }}')

    # AdminDashboard.tsx fixes
    if 'AdminDashboard.tsx' in file_path:
        content = content.replace('display-6 fw-bolder text-dark mb-5', 'display-6 fw-bolder mb-5\" style={{ color: \\'var(--text-color)\\' }}')
        content = content.replace('fw-bold text-dark m-0', 'fw-bold m-0\" style={{ color: \\'var(--text-color)\\' }}')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixes applied successfully")
