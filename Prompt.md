## probando el software Fase 1


http://localhost:5173/admin/gestion-roles-permisos
Gestión de Roles y Permisos

Primer falencia cuando un usario crea un nuevo rol y le asigna los permisos a ese rol "Permisos del rol" el permiso  no se esta cuando entonces cuando voy a editar un rol no se que permisos tiene actualmente ese rol prioridad alta 

http://localhost:5173/admin/gestion-usuarios
Gestión de Usuarios

En el modal de Nuevo Usuario en la sección de Acceso y permisos cuando seleciono el aceceso e¿que en ese caso es el rol que va tener el nuevo usuario el software esta teniendo problemas al cargar todos los permisos ya que no carga todos los permisos que hay en el software actualmente ademas de al asiganarle un permiso a un usuario el no se estan guardo y el usuario cuando entra asu panel no le aparece el modulo (permiso) selecionado prioridad Alta

http://localhost:5173/admin/empleados
Gestión de Empleados

me salen este mensaje "estado: Invalid enum value. Expected 'ACTIVO' | 'INACTIVO', received 'Activo'" al intentar edidtar un empleado que fue creado en el formulario de usuarios este es el error que sale en la consola "Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
:5173/api/v1/employees/cmtfufkfc0007igwoied2v0p0/status?_t=1788096539237:1  Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
:5173/api/v1/employees/cmtfufkfc0007igwoied2v0p0/status?_t=1788096548256:1  Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
:5173/api/v1/employees/cmtfufkfc0007igwoied2v0p0/status?_t=1788096694221:1  Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)"

http://localhost:5173/admin/compras
Gestión de Compras

Gran falencia  el modal es de Nueva compra es dificil de usar dado a que el usuario no sabe que va en cada campo es decir el campo de Número * acepta tambien TEXTO y abajo en la secion de  agregar item solo se el nombre del campo que dice Nombre insumo tambien al intentar generar un pdf me sale este mensaje "No se pudo generar el PDF
" y este error en la consola ":5173/api/v1/purchases/cmtfutirt000jigwoxcsvqzhf/pdf:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:5173/api/v1/purchases/cmtfutirt000jigwoxcsvqzhf/pdf:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)"


http://localhost:5173/admin/insumos
Gestión de Insumos

en el modal de  Nuevo Insumo en el campo de categorias no esta listado los  categorias de insumos creados en el la pagina de Categorías de insumos 

http://localhost:5173/admin/gestion-ventas
Gestión de Ventas

Me salen estos errores en la consola "[vite] connecting...
client:618 [vite] connected.
httpClient.ts:143  GET http://localhost:5173/api/v1/admin/orders?_t=1788100135857&search=r&limit=100 400 (Bad Request)
doFetch @ httpClient.ts:143
(anonymous) @ httpClient.ts:235
(anonymous) @ ordersApi.ts:240
(anonymous) @ GestionVentas.tsx:75
(anonymous) @ GestionVentas.tsx:94
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
(anonymous) @ scheduler.development.js:533
postMessage
(anonymous) @ scheduler.development.js:574
(anonymous) @ scheduler.development.js:538
postMessage
(anonymous) @ scheduler.development.js:574
requestHostCallback @ scheduler.development.js:588
unstable_scheduleCallback @ scheduler.development.js:441
scheduleCallback$1 @ react-dom.development.js:27576
ensureRootIsScheduled @ react-dom.development.js:25722
scheduleUpdateOnFiber @ react-dom.development.js:25570
dispatchSetState @ react-dom.development.js:16708
(anonymous) @ useDebouncedValue.ts:7
setTimeout
(anonymous) @ useDebouncedValue.ts:7
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
commitRootImpl @ react-dom.development.js:26974
commitRoot @ react-dom.development.js:26721
performSyncWorkOnRoot @ react-dom.development.js:26156
flushSyncCallbacks @ react-dom.development.js:12042
flushSync @ react-dom.development.js:26240
finishEventHandler @ react-dom.development.js:3976
batchedUpdates @ react-dom.development.js:3994
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430"


http://localhost:5173/admin/pagos
Pagos, abonos y financiación
Registro y gestión de pagos parciales y planes de financiación

encotre multiples problemas de usabilidad lo primero es que la tabla los campos que se encuentran visibles para el usuario son puros "id" no trae nifechas de pago ni saldos pendientes ni nombres del cliente tenemos unos filtro para buscar cuandto le palta par teminar de pagar a cuotas solo sirve por medio de aid y la idea es que se por el nombre de cliente lo mismopasa con el filtro de cotizacion en el momento la pagina no es facil de usasar lo otro es que en el modal Registrar abono - cmt689v100001igyggi539s7r como se ve en el nombre trae un id automatico al cual sere registrara un nuevo abono eso esta mal ademas que al llenar todos los campos del registro sale este mensaje "No se pudo registrar el abono
"  y este  error "client:495 [vite] connecting...
client:618 [vite] connected.
react-dom.development.js:29895 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
:5173/api/v1/payments?_t=1788102199171:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)"

http://localhost:5173/admin/pedidos
Pedidos

Reparacion de logica del software cuando un pedido entra a estado de entregado el pedido pasa a una seccion que se llama ver entregados que parece en la misma pagina el objetivo es hacer que los pedidos entregados pasen diretamente a la pagina de  http://localhost:5173/admin/gestion-ventas (Gestión de Ventas) otra obserbasion hay que eliminar el estado de "En proceso" dado a que no es muy practico por que cuando se acepta el pedido se supone el pedido ya esta preparado y esta listo para enviar 

http://localhost:5173/admin/clientes
Clientes

En el modal de Nuevo Cliente ha un problema grande no es un error mira al intentara registra un nuevo cliente me sale este mesaje "Contraseña es obligatoria" aun que haya llenado todos los datos del registro  no se la razon hay que encotrarla y solucionarla 


http://localhost:5173/admin/pedidos-personalizados
Cotizaciones

No es nesesaria la columa de cliente en la tabla oculta es columna de la tabla lo unico que deb de apareser son estas columnas: Solucitud, Productos, Cantidad, Estado, Cotización, Total, Fecha, Ver detalle, ACCIONES.El otro problema es que la aun hat problemas con caracteres epeciales como la tilde ya que aparece asi � solucionar el prolema con las tildes en esa pagina y el ptro problema es que el modal de Nuevo Pedido Personalizado
esta mal ya que no es el mismo que ve el cliente ose el modal que hay en  la pagina http://localhost:5173/cliente/pedidos-personalizados que el modal se llama Solicitar cotización es el modal que debe de aparecer en la pagina de http://localhost:5173/admin/pedidos-personalizados


http://localhost:5173/admin/produccion
Producción

En el modal de Nueva Orden de Producción no esta el registro completo ya que no me deja ingresar tipo de tela agregar insumos a esa producción tampoco puedo poenr los colores en los quiro que tenga esa producion y muchomenos poner las tallas el modal debe de agregar todos esos campos 

http://localhost:5173/catalogo
Al usuario realizar un filtrado por categoria de productos no se puede restableser el catalo go despues hay que solucionar lo antes posible 

En el panel del cliente no funciona el sistema de notificasiones corregirde imediatamente 

http://localhost:5173/cliente/pedidos-personalizados
Mis Cotizaciones


En el modal de Solicitar cotización al darle al boton de solicitar cotización sale este mensaje y este error en la consola "[vite] connecting...
client:618 [vite] connected.
react-dom.development.js:29895 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
:5173/api/v1/auth/login?_t=1788105414318:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:5173/api/v1/notifications/cmtfwlu1k000aigh8rdzz52xw/read?_t=1788105474068:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/orders/cmtb9l0yi001rigmg146gqzwn?_t=1788105474224:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/orders/cmtb9l0yi001rigmg146gqzwn?_t=1788105474225:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/notifications/cmtfwlu1k000aigh8rdzz52xw/read?_t=1788105481251:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/orders/cmtb9l0yi001rigmg146gqzwn?_t=1788105481279:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/orders/cmtb9l0yi001rigmg146gqzwn?_t=1788105481279:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/notifications/cmtc4d6fg003nigl4iatn2mqm/read?_t=1788105485147:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/api/v1/notifications/cmtc4bens002xigl403s7y1sl/read?_t=1788105487786:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:5173/unauthorized:1 [Intervention] Images loaded lazily and replaced with placeholders. Load events are deferred. See https://go.microsoft.com/fwlink/?linkid=2048113
:5173/api/v1/custom-orders?_t=1788105713063:1  Failed to load resource: the server responded with a status of 409 (Conflict)"

http://localhost:5173/cliente/recibos
Historial de pagos
Mis Recibos

hay un problema es que de la unica manera que pueda ver el usuario el recibo es si lo descarga por ende no puede ver el resibo si le da click 

e



  



hau un problema grande  lo que pasa es que me gustaria que diceño del Botón Asignar Producción  sea el mismo  que hay en el modal Asignar repartidor ademas en la columna Acciones ya no estan apareciendo las otras asiones que habian ver detalle, editar y Eliminar