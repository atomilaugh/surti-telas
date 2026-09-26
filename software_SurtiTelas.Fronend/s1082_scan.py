import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

TARGET_FILES = [
    "src/presentation/components/AddTagInput.tsx",
    "src/presentation/components/CartDrawer.tsx",
    "src/presentation/components/CheckoutModal.tsx",
    "src/presentation/components/common/ImageWithFallback.tsx",
    "src/presentation/components/ProductDetailModal.tsx",
    "src/presentation/pages/admin/AdminCompras.tsx",
    "src/presentation/pages/admin/AlertasAsignacionProduccion.tsx",
    "src/presentation/pages/admin/AlertasRegistroTalleres.tsx",
    "src/presentation/pages/admin/AlertasSeguimientoProduccion.tsx",
    "src/presentation/pages/admin/GestionRolesPermisos.tsx",
    "src/presentation/pages/admin/GestionUsuariosAsesores.tsx",
    "src/presentation/pages/admin/Insumos.tsx",
    "src/presentation/pages/admin/Inventario.tsx",
    "src/presentation/pages/admin/Pagos.tsx",
    "src/presentation/pages/admin/PedidosPersonalizados.tsx",
    "src/presentation/pages/admin/Permisos.tsx",
    "src/presentation/pages/admin/Produccion.tsx",
    "src/presentation/pages/admin/RegistroTalleres.tsx",
    "src/presentation/pages/admin/Roles.tsx",
    "src/presentation/pages/admin/RutaDelDiaAdmin.tsx",
    "src/presentation/pages/admin/SeguimientoProduccion.tsx",
    "src/presentation/pages/admin/StockDevuelto.tsx",
    "src/presentation/pages/cliente/MisPedidos.tsx",
    "src/presentation/pages/cliente/quotation-steps/ProductStep.tsx",
    "src/presentation/pages/components/FilterDrawer.tsx",
    "src/presentation/pages/domiciliario/DomiciliarioEntregas.tsx",
    "src/presentation/pages/domiciliario/MisEntregas.tsx",
    "src/presentation/pages/features/CheckoutPage.tsx",
    "src/shared/layouts/Sidebar.tsx",
    "src/shared/ui/AdminModal.tsx",
    "src/shared/ui/Combobox.tsx",
    "src/shared/ui/Drawer.tsx",
    "src/shared/ui/FileUpload.tsx",
]

def get_full_tag(content, start_pos):
    i = start_pos
    brace_depth = 0
    in_string = None
    while i < len(content):
        ch = content[i]
        if in_string:
            if ch == '\\' and i + 1 < len(content):
                i += 2
                continue
            if ch == in_string:
                in_string = None
        elif ch in ('"', "'", '`'):
            in_string = ch
        elif ch == '{':
            brace_depth += 1
        elif ch == '}':
            brace_depth -= 1
        elif ch == '>' and brace_depth == 0 and not in_string:
            break
        i += 1
    return content[start_pos:i+1]

def find_jsx_elements(content, tag_names):
    elements = []
    for tag_name in tag_names:
        for m in re.finditer(rf'<{tag_name}\b', content, re.DOTALL):
            full_tag = get_full_tag(content, m.start())
            line_num = content[:m.start()].count('\n') + 1
            elements.append((line_num, tag_name, full_tag, m.start()))
    return elements

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    tag_names = ['img', 'div', 'span', 'p', 'article', 'section', 'figure', 'main', 'nav', 'header', 'footer', 'aside', 'td', 'th', 'a']
    elements = find_jsx_elements(content, tag_names)
    
    issues = []
    for line_num, tag_name, full_tag, start in elements:
        has_onclick = bool(re.search(r'onClick\s*=', full_tag))
        has_tabindex = bool(re.search(r'tabIndex\s*=', full_tag))
        has_onkeydown = bool(re.search(r'onKeyDown\s*=', full_tag))
        has_role = bool(re.search(r'role\s*=', full_tag))
        has_interactive_role = bool(re.search(r'role=["\']button["\']', full_tag))
        has_aria_hidden = bool(re.search(r'aria-hidden=["\']true["\']', full_tag))
        is_native = tag_name in ('a', 'button', 'input', 'select', 'textarea')
        
        if is_native or has_aria_hidden:
            continue
        
        if has_onclick and not has_tabindex and not has_onkeydown and not has_role and not has_interactive_role:
            issues.append((line_num, tag_name, full_tag))
    
    return issues

total = 0
for f in TARGET_FILES:
    if os.path.exists(f):
        issues = check_file(f)
        if issues:
            print(f"\n{f}:")
            for line_num, tag_name, full_tag in issues:
                print(f"  Line {line_num}: <{tag_name}> onClick missing keyboard support")
                total += 1
    else:
        print(f"\n{f}: FILE NOT FOUND")

print(f"\n=== TOTAL S1082 ISSUES FOUND: {total} ===")
