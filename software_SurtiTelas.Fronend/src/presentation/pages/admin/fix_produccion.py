import re

with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove the leaked create modal footer from inside items modal
old = """             <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>Cancelar</Button>
              <Button type="submit" form="createOrdenForm">Crear orden</Button>
            </div>
          </div>
        </div>
      )}"""

new = """          </div>
        </div>
      )}"""

content = content.replace(old, new)

with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed')
