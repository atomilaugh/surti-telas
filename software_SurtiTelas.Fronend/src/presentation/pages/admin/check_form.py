with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '              <form id="editOrdenForm" className={f.form} onSubmit={handleSubmitOrden}>\n            <div className={s.createPanel}>'

if old in content:
    print('FOUND')
    new = '              <form id="editOrdenForm" className={f.form} onSubmit={handleSubmitOrden}>\n                <div className={s.createPanel}>'
    content = content.replace(old, new)
    with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('REPLACED')
else:
    idx = content.find('<form id="editOrdenForm"')
    if idx >= 0:
        print('NOT FOUND, showing actual:')
        print(repr(content[idx:idx+150]))
    else:
        print('FORM NOT FOUND AT ALL')
