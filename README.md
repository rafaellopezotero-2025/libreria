# Store Flow

Quiero desarrollar una aplicación web completa para la gestión de una librería/papelería con servicio de fotocopias e impresiones.

El objetivo es reemplazar una gestión realizada actualmente mediante planillas Excel por un sistema web sencillo, rápido y mucho más robusto.

No quiero un ERP complejo. Quiero una aplicación pensada para un negocio pequeño/mediano, donde una persona pueda registrar una venta en pocos segundos y donde el administrador pueda controlar productos, stock, compras, proveedores, caja y reportes.

La aplicación debe ser intuitiva, moderna, responsive y especialmente cómoda para utilizar desde una PC durante la atención al público.

1. OBJETIVO GENERAL

El sistema debe permitir administrar:

Ventas de productos de librería/papelería.

Servicios de fotocopias.

Servicios de impresión.

Productos e insumos.

Stock.

Punto de reposición.

Compras.

Proveedores.

Caja.

Usuarios.

Roles y permisos.

Reportes.

Auditoría.

Configuración general del negocio.

Debe poder responder rápidamente preguntas como:

¿Cuánto vendí hoy?

¿Cuánto vendí este mes?

¿Qué productos vendí?

¿Cuántas unidades vendí de cada producto?

¿Cuántas fotocopias hice?

¿Qué productos están por agotarse?

¿Qué productos necesitan reposición?

¿Cuánto debería comprar?

¿A qué proveedor debo comprar?

¿Cuánto gasté?

¿Cuánto tengo en caja?

¿Qué productos se venden más?

¿Cuánto gané aproximadamente?

¿Qué usuario realizó cada venta?

¿Cómo fueron las ventas durante un rango determinado de fechas?

2. PRINCIPIO DE DISEÑO

La aplicación debe tener la simplicidad de un Excel, pero las ventajas de un sistema de gestión.

Priorizar:

Simplicidad.

Rapidez.

Claridad.

Facilidad de aprendizaje.

Pocos clics para realizar operaciones.

Información histórica.

Integridad de los datos.

Seguridad.

Escalabilidad.

Evitar funcionalidades innecesariamente complejas.

3. AUTENTICACIÓN Y USUARIOS

Implementar autenticación segura mediante login.

Cada usuario debe tener:

ID.

Nombre y apellido.

Usuario/email.

Contraseña.

Rol.

Estado activo/inactivo.

Fecha de creación.

Último acceso.

Roles

Administrador

Acceso completo:

Dashboard.

Ventas.

Productos.

Categorías.

Stock.

Reposición.

Compras.

Proveedores.

Caja.

Reportes.

Usuarios.

Configuración.

Auditoría.

Vendedor

Puede:

Registrar ventas.

Registrar fotocopias.

Consultar productos.

Consultar precios.

Consultar stock.

Consultar sus ventas.

Realizar operaciones de caja autorizadas.

No puede:

Gestionar usuarios.

Modificar configuraciones críticas.

Eliminar información histórica.

Modificar precios sin permiso.

Realizar ajustes de stock sin autorización.

Registrar siempre qué usuario realizó cada operación.

4. DASHBOARD

Después del login mostrar un dashboard sencillo.

Mostrar tarjetas con:

Ventas del día.

Ventas del mes.

Cantidad de operaciones.

Total de fotocopias.

Ingresos del día.

Ingresos del mes.

Productos con stock bajo.

Productos en punto de reposición.

Productos sin stock.

Mostrar gráficos:

Ventas por día.

Ventas por categoría.

Productos más vendidos.

Fotocopias por día.

Ventas por método de pago.

Permitir seleccionar:

Hoy.

Ayer.

Últimos 7 días.

Últimos 30 días.

Este mes.

Mes anterior.

Rango personalizado.

5. PRODUCTOS

Crear un ABM completo de productos.

Cada producto debe tener:

ID.

Código interno/SKU.

Código de barras opcional.

Nombre.

Descripción.

Categoría.

Marca opcional.

Proveedor principal.

Precio de costo.

Precio de venta.

Stock actual.

Stock mínimo.

Punto de reposición.

Stock objetivo.

Unidad de venta.

Estado activo/inactivo.

Fecha de alta.

Fecha de modificación.

Ejemplos:

Lapicera azul.

Lapicera negra.

Lápiz.

Goma.

Regla.

Cuaderno.

Carpeta.

Resaltador.

Marcador.

Cartulina.

Papel afiche.

Corrector.

Pegamento.

Tijera.

Hojas.

Etc.

Los productos deben poder venderse por unidad o por la unidad de medida configurada.

6. CATEGORÍAS

Crear ABM de categorías.

Ejemplos:

Escritura.

Papelería.

Cuadernos.

Carpetas.

Dibujo.

Manualidades.

Oficina.

Escolar.

Impresión.

Fotocopias.

Otros.

Permitir:

Crear.

Editar.

Desactivar.

No eliminar categorías que tengan productos asociados.

7. VENTAS / PUNTO DE VENTA

Crear una pantalla de ventas extremadamente rápida.

Debe funcionar como un pequeño POS.

El usuario debe poder:

Buscar producto por nombre.

Buscar por código.

Buscar por código de barras si existe lector.

Seleccionar producto.

Indicar cantidad.

Agregar al carrito.

Modificar cantidad.

Eliminar producto.

Agregar servicios de fotocopias.

Agregar servicios de impresión.

Aplicar descuento si tiene permiso.

Seleccionar método de pago.

Confirmar venta.

Mostrar siempre:

Subtotal.

Descuento.

Total.

Métodos de pago iniciales:

Efectivo.

Transferencia.

Tarjeta de débito.

Tarjeta de crédito.

Mercado Pago.

Otro.

Al confirmar:

Generar número único de venta.

Registrar fecha.

Registrar hora.

Registrar usuario.

Registrar productos.

Registrar cantidades.

Registrar precio unitario.

Registrar subtotal.

Registrar descuento.

Registrar total.

Registrar método de pago.

Descontar stock automáticamente.

No permitir vender sin stock salvo que el administrador habilite explícitamente la opción de stock negativo.

8. HISTORIAL DE VENTAS

Cada venta debe tener un número único.

Ejemplo:

VENTA-000001

Mostrar:

Número.

Fecha.

Hora.

Usuario.

Productos.

Cantidades.

Precio unitario.

Subtotal.

Descuento.

Total.

Método de pago.

Estado.

Estados:

Confirmada.

Anulada.

Nunca eliminar físicamente una venta.

Si se necesita corregir una venta, debe realizarse mediante una anulación registrada.

Una venta histórica debe conservar el precio al que se vendió el producto, aunque posteriormente cambie el precio actual.

9. FOTOCOPIAS

Crear un módulo específico para gestionar fotocopias.

Debe poder agregarse una fotocopia directamente al carrito de una venta.

Crear configuración de tipos de fotocopias.

Datos:

Tipo de papel.

Tamaño.

Color.

Simple faz / doble faz.

Precio unitario.

Tipos iniciales:

A4 blanco y negro simple.

A4 blanco y negro doble.

A4 color simple.

A4 color doble.

A3 blanco y negro.

A3 color.

Los precios deben ser configurables.

Al registrar una fotocopia permitir:

Tipo.

Cantidad de páginas.

Cantidad de copias.

Precio unitario.

Total.

Ejemplo:

50 fotocopias A4 B/N × $60 = $3.000.

Debe ser posible realizar una venta como:

2 lapiceras.

1 cuaderno.

50 fotocopias A4 B/N.

Y registrar todo dentro de una única venta.

10. IMPRESIONES

Dejar preparada la estructura para servicios de impresión.

Permitir configurar:

Tamaño.

Color.

Simple/doble faz.

Precio.

Registrar las impresiones como servicios, igual que las fotocopias.

11. INSUMOS

Separar conceptualmente:

Productos

Elementos que se venden al cliente.

Servicios

Fotocopias e impresiones.

Insumos

Materiales utilizados para brindar servicios.

Ejemplos:

Resmas A4.

Resmas A3.

Tóner negro.

Tóner color.

Otros insumos.

Cada insumo debe tener:

Código.

Nombre.

Descripción.

Unidad.

Proveedor.

Costo.

Stock actual.

Stock mínimo.

Punto de reposición.

Stock objetivo.

Estado.

12. CONTROL DE STOCK

Crear un módulo completo de stock.

Mostrar:

Producto/insumo.

Stock actual.

Stock mínimo.

Punto de reposición.

Stock objetivo.

Estado.

Permitir:

Entrada de stock.

Salida de stock.

Ajuste de inventario.

Corrección por diferencia.

Consulta de movimientos.

Cada movimiento debe registrar:

Fecha.

Hora.

Usuario.

Tipo.

Cantidad.

Motivo.

Producto/insumo relacionado.

No eliminar movimientos históricos.

13. PUNTO DE REPOSICIÓN

Implementar un sistema de alertas de reposición.

Cada producto e insumo debe tener:

Stock mínimo.

Punto de reposición.

Stock objetivo.

Estados

Stock normal

Stock actual > punto de reposición.

Mostrar:

🟢 Stock normal

Reponer próximamente

Stock actual <= punto de reposición.

Mostrar:

🟡 Reponer próximamente

Stock crítico

Stock actual <= stock mínimo.

Mostrar:

🟠 Stock crítico

Sin stock

Stock actual = 0.

Mostrar:

🔴 Sin stock

14. CANTIDAD SUGERIDA DE COMPRA

Cuando un producto alcance el punto de reposición calcular:

Cantidad sugerida = Stock objetivo - Stock actual

Ejemplo:

Producto: Lapicera azul

Stock actual: 8

Punto de reposición: 10

Stock objetivo: 30

Mostrar:

⚠️ Reposición necesaria

Cantidad sugerida: 22 unidades.

La cantidad sugerida debe poder ser modificada manualmente antes de generar una compra.

15. PANTALLA DE REPOSICIÓN

Crear una sección llamada:

Reposición

Mostrar una tabla con:

Producto.

Proveedor.

Stock actual.

Stock mínimo.

Punto de reposición.

Stock objetivo.

Cantidad sugerida.

Estado.

Permitir filtrar:

Todos.

Reposición.

Stock crítico.

Sin stock.

Por proveedor.

Por categoría.

Agregar botón:

Generar compra

Al seleccionarlo, crear un borrador de compra con los productos seleccionados y sus cantidades sugeridas.

16. PROVEEDORES

Crear módulo de proveedores.

Datos:

ID.

Nombre / razón social.

CUIT opcional.

Teléfono.

Email.

Dirección.

Persona de contacto.

Observaciones.

Estado.

Relacionar proveedores con productos e insumos.

Cada producto debe poder tener:

Proveedor principal.

Otros proveedores opcionales.

17. COMPRAS

Crear módulo de compras.

Una compra debe permitir:

Seleccionar proveedor.

Fecha.

Número de comprobante.

Productos.

Insumos.

Cantidades.

Precio de costo.

Descuento.

Total.

Observaciones.

Al confirmar:

Aumentar stock.

Registrar movimiento de stock.

Actualizar costo si corresponde.

Las compras generadas desde la pantalla de reposición deben poder editarse antes de confirmar.

18. CAJA

Crear un módulo sencillo de caja.

Apertura

Registrar:

Usuario.

Fecha.

Hora.

Monto inicial.

Movimientos

Registrar:

Ventas.

Ingresos manuales.

Retiros.

Gastos.

Ajustes.

Cada movimiento:

Fecha.

Hora.

Usuario.

Concepto.

Tipo.

Medio de pago.

Importe.

Cierre

Mostrar:

Monto inicial.

Ventas en efectivo.

Ventas por transferencia.

Ventas con débito.

Ventas con crédito.

Mercado Pago.

Otros ingresos.

Retiros.

Gastos.

Total esperado.

Permitir ingresar:

Dinero contado

Y calcular:

Diferencia = Caja real - Caja esperada

19. REPORTES

Crear un módulo de reportes completo.

Todos los reportes deben permitir:

Fecha desde.

Fecha hasta.

Y filtros opcionales:

Usuario.

Producto.

Categoría.

Proveedor.

Método de pago.

Tipo de operación.

Reporte de ventas

Mostrar:

Cantidad de ventas.

Total vendido.

Promedio por venta.

Ventas por día.

Ventas por usuario.

Ventas por método de pago.

Productos más vendidos

Mostrar:

Producto.

Cantidad vendida.

Precio promedio.

Total generado.

Ordenar de mayor a menor.

Fotocopias

Mostrar:

Cantidad total.

B/N.

Color.

A4.

A3.

Simple faz.

Doble faz.

Total generado.

Stock

Mostrar:

Stock actual.

Productos bajo mínimo.

Productos en reposición.

Productos sin stock.

Valorización del inventario.

Rentabilidad

Cuando existan datos suficientes:

Ventas.

Costo.

Ganancia bruta.

Margen bruto.

Diferenciar claramente:

Facturación ≠ Ganancia

20. EXPORTACIÓN

Permitir exportar reportes a:

Excel.

CSV.

PDF cuando sea apropiado.

Priorizar Excel/CSV para datos tabulares.

21. AUDITORÍA

Crear un registro de auditoría.

Registrar:

Usuario.

Fecha.

Hora.

Acción.

Módulo.

Registro afectado.

Descripción.

Ejemplos:

"Juan registró la venta VENTA-000125."

"Administrador modificó el precio de Lapicera azul."

"Juan realizó una entrada de 500 hojas A4."

"Administrador ajustó el stock de Cuaderno A4."

"Juan anuló la venta VENTA-000120."

No permitir modificar silenciosamente información histórica.

22. CONFIGURACIÓN DEL NEGOCIO

Crear una sección de configuración.

Permitir configurar:

Nombre del negocio.

Logo.

Dirección.

Teléfono.

Email.

Moneda.

Métodos de pago.

Categorías.

Tipos de productos.

Tipos de papel.

Precios de fotocopias.

Precios de impresiones.

Unidades de medida.

Parámetros de stock.

23. ALERTAS

Crear un centro de alertas.

Mostrar:

Productos en punto de reposición.

Productos con stock crítico.

Productos sin stock.

Insumos por reponer.

Compras pendientes.

Las alertas deben ser persistentes según el estado del stock y no generar una nueva alerta duplicada cada vez que se registra una venta.

Ejemplo:

"⚠️ La Lapicera azul alcanzó el punto de reposición. Stock actual: 8. Se recomienda comprar 22 unidades."

24. BÚSQUEDA

Todas las tablas deben disponer de:

Buscador.

Filtros.

Ordenamiento.

Paginación.

La búsqueda de productos debe ser especialmente rápida.

Permitir buscar por:

Nombre.

Código.

Código de barras.

Categoría.

25. EXPERIENCIA DE VENTA

La pantalla de ventas es la parte más importante del sistema.

Debe permitir registrar una venta rápidamente.

Ejemplo:

Buscar "Lapicera".

Seleccionar.

Cantidad: 2.

Agregar.

Buscar "Cuaderno".

Cantidad: 1.

Agregar.

Agregar 20 fotocopias.

Ver total.

Seleccionar medio de pago.

Confirmar.

Evitar formularios innecesariamente largos.

Utilizar:

Autocompletado.

Modales.

Atajos de teclado cuando sea posible.

Botones grandes para operaciones frecuentes.

26. DISEÑO VISUAL

Utilizar una interfaz administrativa moderna.

Menú lateral:

Dashboard

Nueva venta

Ventas

Fotocopias

Productos

Stock

Reposición

Compras

Proveedores

Caja

Reportes

Usuarios

Auditoría

Configuración

El diseño debe ser:

Limpio.

Profesional.

Moderno.

Minimalista.

Responsive.

Fácil de leer.

No sobrecargar las pantallas.

27. BASE DE DATOS

Utilizar una base de datos relacional correctamente normalizada.

Entidades mínimas:

usuarios

roles

permisos

productos

categorias

proveedores

productos_proveedores

compras

detalle_compras

ventas

detalle_ventas

servicios

tipos_fotocopias

tipos_impresiones

insumos

movimientos_stock

movimientos_caja

cajas

auditoria

configuracion

Utilizar relaciones y claves foráneas correctamente.

Evitar información redundante.

Mantener integridad referencial.

28. HISTORIAL E INTEGRIDAD

Reglas obligatorias:

Cada venta tiene un identificador único.

No eliminar físicamente ventas.

Las ventas anuladas permanecen en el historial.

Una venta confirmada descuenta stock.

Una compra confirmada aumenta stock.

Un ajuste de stock requiere usuario y motivo.

Los productos con movimientos históricos no deben eliminarse físicamente.

Los usuarios deben tener roles.

Las operaciones importantes deben quedar auditadas.

Los reportes deben trabajar con fechas configurables.

Los precios históricos de las ventas no deben modificarse al cambiar el precio actual.

El precio de costo debe mantenerse separado del precio de venta.

Las fotocopias deben registrarse como servicios.

Los insumos deben gestionarse independientemente de los productos vendidos.

Las anulaciones deben generar los movimientos de stock correspondientes.

Una compra confirmada debe generar automáticamente los movimientos de entrada de stock.

Los movimientos de stock deben conservar su historial.

29. SEGURIDAD

Implementar:

Autenticación segura.

Contraseñas almacenadas de manera segura.

Protección de rutas.

Control de acceso por roles.

Validación de datos.

Manejo de errores.

Protección contra operaciones no autorizadas.

Auditoría.

Los usuarios vendedores no deben poder acceder a funcionalidades administrativas.

30. TECNOLOGÍA

Si Lovable permite seleccionar el stack, utilizar preferentemente:

React.

TypeScript.

Tailwind CSS.

Supabase.

PostgreSQL.

Utilizar componentes reutilizables.

Separar correctamente:

Interfaz.

Lógica de negocio.

Acceso a datos.

Implementar una arquitectura mantenible.

No crear únicamente mockups.

Quiero una aplicación funcional con base de datos y operaciones reales.

31. DATOS DE PRUEBA

Crear datos iniciales para probar el sistema.

Crear:

Usuarios

1 administrador.

1 vendedor.

Categorías

Al menos 8 categorías.

Productos

Al menos 20 productos de ejemplo.

Proveedores

Al menos 5 proveedores.

Insumos

Al menos 5 insumos.

Servicios

Configurar diferentes tipos de fotocopias e impresiones.

Stock

Crear diferentes situaciones:

Productos con stock normal.

Productos en punto de reposición.

Productos con stock crítico.

Productos sin stock.

Operaciones

Crear algunas:

Ventas.

Compras.

Movimientos de stock.

Movimientos de caja.

Esto debe permitir probar el dashboard y los reportes.

32. FUTURA EVOLUCIÓN DEL PUNTO DE REPOSICIÓN

Por ahora el punto de reposición será configurable manualmente.

Sin embargo, diseñar la estructura para poder incorporar posteriormente un cálculo automático basado en:

Promedio de ventas diarias.

Tiempo promedio de entrega del proveedor.

Stock de seguridad.

En el futuro podría utilizarse:

Punto de reposición = demanda diaria promedio × tiempo de reposición + stock de seguridad.

No implementar esta funcionalidad automática todavía.

33. NO IMPLEMENTAR TODAVÍA

Para mantener el sistema sencillo, no implementar inicialmente:

Facturación electrónica ARCA/AFIP.

Contabilidad completa.

Sueldos.

Gestión de empleados avanzada.

CRM.

E-commerce.

Integraciones complejas.

Gestión de múltiples sucursales.

Dejar la arquitectura preparada para que puedan agregarse posteriormente.

34. DESARROLLO POR ETAPAS

Construir el sistema de forma incremental.

FASE 1 — Núcleo

Implementar completamente:

Login.

Usuarios.

Roles.

Dashboard.

Categorías.

Productos.

Stock.

Punto de reposición.

Nueva venta.

Historial de ventas.

Fotocopias.

FASE 2 — Gestión

Implementar:

Proveedores.

Compras.

Insumos.

Caja.

Movimientos de stock.

Alertas.

FASE 3 — Administración

Implementar:

Reportes.

Exportaciones.

Auditoría.

Configuración.

Mejoras de UX.

Cada fase debe ser funcional antes de continuar con la siguiente.

35. CRITERIO GENERAL DEL SISTEMA

La aplicación debe sentirse como:

"Un Excel profesional convertido en un sistema de gestión."

Debe ser mucho más segura y ordenada que una planilla, pero sin convertirse en un ERP complicado.

La prioridad es que una persona pueda:

vender → cobrar → descontar stock → registrar la operación

en pocos segundos.

Y que el administrador pueda:

consultar → analizar → detectar faltantes → generar compras → controlar caja

desde una única aplicación.

Crear primero la estructura de base de datos, autenticación, roles y navegación principal, y luego implementar los módulos de manera progresiva.

No limitarse a crear pantallas visuales: las operaciones deben estar realmente conectadas a la base de datos y respetar las reglas de negocio indicadas anteriormente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fast-shelf.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18597ef8-19f4-4ec3-92fe-0b4c7c5a0b02).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
