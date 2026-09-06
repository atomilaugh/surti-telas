with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '              <form id="createOrdenForm" className={f.form} onSubmit={handleCreateOrden}>\n            <div className={s.createPanel}>'

if old in content:
    print('FOUND create form')
    new = '              <form id="createOrdenForm" className={f.form} onSubmit={handleCreateOrden}>\n                <div className={s.createPanel}>'
    content = content.replace(old, new)
    with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('REPLACED')
else:
    print('NOT FOUND')
