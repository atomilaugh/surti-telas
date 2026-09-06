with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix create modal form indentation - the form content was not properly nested
# because the createPanel divs had same indentation as form tag
old_create = """              <form id="createOrdenForm" className={f.form} onSubmit={handleCreateOrden}>
            <div className={s.createPanel}>"""

new_create = """              <form id="createOrdenForm" className={f.form} onSubmit={handleCreateOrden}>
                <div className={s.createPanel}>"""

content = content.replace(old_create, new_create)

# Fix edit modal form indentation
old_edit = """               <form id="editOrdenForm" className={f.form} onSubmit={handleSubmitOrden}>
            <div className={s.createPanel}>"""

new_edit = """               <form id="editOrdenForm" className={f.form} onSubmit={handleSubmitOrden}>
                <div className={s.createPanel}>"""

content = content.replace(old_edit, new_edit)

with open(r'C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend\src\presentation\pages\admin\Produccion.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed indentation')
