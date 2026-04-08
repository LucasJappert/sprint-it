# Changelog

Todos los cambios del proyecto se registran aquí por versión y fecha.

---

## v1.1.40 - 2026-04-08

### Mejoras

- **Soporte para archivos Markdown**: Ahora es posible adjuntar archivos `.md` en tasks e items.
    - Se agregaron MIME types `text/markdown` y `text/plain`
    - Extensiones permitidas: `.md` y `.txt`

---

## v1.1.39 - 2026-03-31

### Nuevas Funciones

- **Sistema de Notas Personales**: Nueva funcionalidad de notas flotantes accesible desde un botón en la esquina superior derecha del dashboard.
    - Botón flotante con icono de nota y título "Mis Notas"
    - Dialog de 98% x 98% con dos secciones principales:
        - **Borrador (70% superior)**: Editor de texto enriquecido (TipTap) con soporte para negrita, subrayado e imágenes
        - **Notas guardadas (30% inferior)**: Grid de cards con preview, fecha y acciones
    - **Autoguardado del borrador**: Guardado automático 500ms después de dejar de escribir (debounce)
    - **Recuperación automática**: Al abrir el dialog se carga el borrador guardado
    - **Notas privadas por usuario**: Cada usuario solo ve sus propias notas
    - **Edición completa**: Dialog modal para ver y editar notas guardadas
    - **Borrado lógico**: Confirmación antes de eliminar con soft delete
    - **Formato argentino**: Fechas en formato dd/mm/yyyy
    - **ID autonumérico**: Numeración descendente basada en orden de creación
    - Botón "Guardar Nota" con estilo consistente (azul celeste, igual que "Nuevo Item")
    - Contenedor de botones flotantes que agrupa "Mis Notas" y "Actividad de usuarios"
    - Botones flotantes ocultos al 50% con animación de deslizamiento al hacer hover
    - Diálogos renderizados con Teleport al body para correcto z-index sobre el header

### Estructura Técnica

- Nuevas colecciones en Firestore: `notes` y `drafts`
- Nuevas interfaces TypeScript: `Note` y `Draft`
- Nuevo composable: `useNotes.ts` con watch para autoguardado
- Nuevos componentes: `MyNotesButton.vue`, `MyNotesDialog.vue`, `MyNoteEditDialog.vue`
- Funciones CRUD completas en `firestore.ts`

---

## v1.1.38 - 2026-03-28

### Nuevas Funciones

- **Monitor de Actividad de Usuarios**: Nueva funcionalidad accesible desde un botón flotante en el dashboard que permite visualizar la actividad reciente de los usuarios del equipo.
    - Botón flotante ubicado en la esquina inferior derecha
    - Muestra todos los cambios realizados por cada usuario en los últimos 7 días
    - Incluye: cambios de estado, prioridad, esfuerzos, asignaciones, ediciones de títulos y detalles, creación de items/tasks
    - Formato de fecha/hora argentino: "Hoy HH:mm" para el día actual, "DD/MM/YYYY HH:mm" para días anteriores
    - Distintivo de color en cada actividad según el tipo de cambio (estado, prioridad, esfuerzo, asignación, etc.)
    - Contador de actividades totales por usuario
    - Interfaz intuitiva con selector de usuario y navegación fluida

---

## v1.1.37 - 2026-03-24

### Nuevas Funciones

- **Sistema de Limpieza de Storage**: Nueva funcionalidad para eliminar archivos antiguos del storage de Supabase con diálogo completo de validación, preview detallado y estadísticas de limpieza. Optimizado con consultas batch y verificación paralela de imágenes.

- **Optimización de descargas en paralelo para respaldos completos**: Implementada nueva función `batchDownload` para procesar archivos adjuntos e imágenes en paralelo.

### Cambios

- **Aumento del límite de tamaño de archivos adjuntos**: El tamaño máximo permitido para archivos adjuntos se ha aumentado de 3MB a 20MB.
- Mejoras de rendimiento en descargas (15 archivos simultáneos, 60-80% más rápido)
- Actualización de estimación de tiempo a ~200 archivos por minuto
- Limpieza de código en UserProgressChart.vue (eliminadas variables no utilizadas)

---

## v1.1.36 - 2026-03-14

### Nuevas Funciones

- **Sistema de actualización automática**: Detecta nuevas versiones mediante Service Worker y muestra diálogo para actualizar (ahora/más tarde).
    - Compatible con Android y Desktop (Chrome/Firefox/Edge)
    - iOS/Safari puede tener limitaciones en la detección automática

### Cambios

- **Indicadores de color en opciones de mover a sprint**: Las opciones del submenú "Move to sprint" en el menú contextual ahora muestran colores distintivos:
    - Sprint siguiente: Color verde (`#4caf50`) en icono y texto
    - Sprint anterior: Color amarillo medio transparentado (`rgba(255, 235, 59, 0.7)`) en icono y texto
    - Eliminado el texto "(Prev)" y "(Next)" que se mostraba anteriormente, ahora solo se diferencian por color

---

## v1.1.35 - 2026-03-13

### Nuevas Funciones

- **Copiar imagen al portapapeles**: Nueva funcionalidad para copiar imágenes de comentarios y descripciones directamente al portapapeles.
    - Botón con icono `mdi-content-copy` en cada imagen
    - Funciona en comentarios y descripciones (Rich Text)

### Cambios

- **Logo en el header (solo desktop)**: Mejorado el diseño del header agregando el logo a la izquierda del selector de sprints.
    - El logo es un enlace al dashboard
    - Solo visible en desktop (resolución > 800px)
    - Ocultado automáticamente en dispositivos móviles

- **Timer de progreso en diálogos**: Se muestra el timer de progreso en los diálogos de items y tasks.
    - Ubicado a la izquierda del botón cerrar
    - Solo visible en desktop (ocultar en móviles)
    - Mismo estilado que el timer del listado

---

## v1.1.34 - 2026-03-12

### Nuevas Funciones

- **Destacar item/task en progreso para el usuario actual**: Los items y tasks que están en estado "In Progress" y asignados al usuario logueado ahora se muestran con un efecto visual destacado.
    - Fondo azul claro con borde azul y efecto glow
    - Animación de pulso para llamar la atención
    - El efecto se aplica tanto al item padre como a las tasks individuales

---

## v1.1.33 - 2026-03-12

### Nuevas Funciones

- Sistema de Exportación de Base de Datos Completa: Nueva funcionalidad para exportar toda la información del sistema.
    - Exportar JSON: Descarga un archivo JSON con toda la base de datos (sprints, items, tasks, usuarios, comentarios, historial de cambios, adjuntos)
    - Generar Respaldo Completo (ZIP): Genera un archivo ZIP que incluye: base de datos (JSON con todos los datos), adjuntos (todos los archivos subidos), imagenes items (imágenes embebidas en descripciones), imagenes tasks (imágenes embebidas en descripciones), imagenes comentarios (imágenes embebidas en comentarios)
    - Acceso desde el menú del avatar (submenú "Exportar")

- Diálogo de estadísticas previo a la exportación: Antes de generar el respaldo, se muestra un diálogo con:
    - Cantidad de sprints, items, tasks, usuarios, comentarios
    - Cantidad de archivos adjuntos
    - Cantidad total de imágenes (descripciones + comentarios)
    - Tamaño estimado del archivo
    - Tiempo estimado de exportación

- Diálogo de progreso durante la exportación:
    - Barra de progreso con porcentaje
    - Etapa actual de la exportación
    - Contador de tiempo transcurrido en formato mm:ss (o hh:mm:ss)
    - Indicadores visuales de las etapas completadas

- Notificación de tiempo al finalizar: Al completar la exportación, se muestra el tiempo total que tomó

### Cambios

- exportAllData(): Mejorada para incluir también los attachments (metadatos de archivos)

- Cálculo de tiempo estimado: Fórmula mejorada basada en ~50 archivos por minuto para mayor precisión

### Dependencias

- Agregadas: jszip, file-saver, @types/file-saver

---

## v1.1.32 - 2026-03-11

### Cambios

- **Vista previa de imágenes en comentarios y descripciones**:
    - Botones de pantalla completa y eliminar ahora solo visibles al pasar el mouse sobre la imagen (desktop)
    - Estilado alinhado con los botones de editar/eliminar comentarios: `v-btn` de Vuetify, iconos outline, colores verde (#008035) y rojo (#f44336)
    - Confirmación antes de eliminar una imagen

---

## v1.1.31 - 2026-03-11

### Cambios

- **Permitir archivos adjuntos del tipo .csv**

## v1.1.29 - 2026-03-11

### Nuevas Funciones

- **Sistema de Adjuntos**: Nueva funcionalidad para adjuntar archivos a items y tasks.
    - Subida de archivos mediante: pegado desde portapapeles (Ctrl+V), arrastrar y soltar, o botón selector
    - Almacenamiento en Supabase Storage (bucket `sprint-it`, carpeta `detalles/`)
    - Límites: máximo 3MB por archivo, máximo 4 archivos por item/task
    - Tipos permitidos: PDF, Excel, Word, imágenes, ZIP, RAR, JSON
    - Confirmación antes de subir archivos
    - Indicador visual durante la subida

- **Pestañas en Diálogos**: Reemplazo del `v-btn-toggle` por `v-tabs` en ItemDialog y TaskDialog.
    - Tres pestañas: Details, Attachments, History
    - Componente reutilizable `DialogTabs.vue`

### Cambios

- **Detección de comentarios vacíos**: Mejorada la lógica para detectar contenido de comentarios.
    - Se ignoran bloques `<p></p>` vacíos al validar si hay contenido pendiente
    - Actualizado el comportamiento del botón "Add Comment" según el contenido real

- **Historial de cambios**: Nuevo composable `useChangeHistory.ts` para gestionar el registro de modificaciones.

### Arreglos

- **Confirmación de cierre con comentarios pendientes**: Corregido el comportamiento al intentar cerrar con comentarios en edición.
    - Ahora detecta correctamente cuando hay contenido de comentario sin guardar
    - Funciona tanto para escribir nuevos comentarios como para editar existentes

---

## v1.1.28 - 2026-03-10

### Nuevas Funciones

- **Sección Changelog**: Nueva página /changelog accesible desde el menú del avatar y la notificación de actualización. Muestra el historial de versiones con categorías (Nuevas Funciones, Cambios, Arreglos). Incluye botón para volver al dashboard.

- **Vista previa de imágenes**: Imágenes en descripciones y comentarios ahora se muestran como miniaturas (200-800px). Click central abre en nueva pestaña. Botón verde para pantalla completa, rojo para eliminar (solo en descripciones).

---

## v1.1.27 - 2026-03-10

### Nuevas Funciones

- **Timer de tiempo en estado InProgress**: Para tasks e items que están en estado "InProgress", ahora se muestra un relojito que indica el tiempo transcurrido desde que entró en ese estado.
    - Se muestra en formato dinámico: `hh:mm:ss` (horas), `mm:ss` (minutos), o `00:ss` (segundos)
    - Se actualiza en tiempo real cada segundo
    - Aparece flotando a la derecha del card (centrado verticalmente)
    - Icono de reloj (`mdi-clock-outline`) seguido del tiempo transcurrido
    - Solo se muestra cuando el estado es "InProgress"
    - Utiliza el historial de cambios para calcular el tiempo exacto

---

## v1.1.26 - 2026-03-01

### Cambios

- **Indicadores (Prev)/(Next) en opciones de mover a sprint**: Al mover un item a otro sprint desde el menú contextual, ahora se muestra "(Prev)" o "(Next)" junto al nombre del sprint para indicar si es el sprint inmediatamente anterior o siguiente al actual.
    - (Prev): Sprint inmediatamente anterior al actual
    - (Next): Sprint inmediatamente siguiente al actual
    - Los demás sprints no muestran indicador

- **Error al crear task**: Corregido error de consola "TypeError: Cannot read properties of null (reading 'id')" que ocurría al crear una nueva task.
    - El problema era que el eventBus emitía el evento con valor null
    - Agregada verificación defensiva en `useTaskManagement.ts` antes de emitir el evento
    - Actualizado handler en `DashboardView.vue` para aceptar y manejar valores nulos

---

## v1.1.24 - 2026-02-27

### Nuevas Funciones

- **Sección de Items/Tareas Eliminadas**: Nueva sección al final del dashboard que muestra los items y tareas eliminadas del sprint actual.
    - Se puede expandir/colapsar haciendo click en el encabezado
    - Muestra un contador de elementos eliminados
    - **Items eliminados**: Lista de items con `deletedAt !== null`, incluyendo sus tareas eliminadas
    - **Tareas eliminadas de items activos**: Items con `deletedAt === null` pero que tienen tareas con `deletedAt !== null`
    - **Restaurar**: Botón para restaurar un item o tarea eliminada, estableciendo `deletedAt` a `null`
    - **Eliminar permanentemente**: Botón para eliminar un item de forma definitiva (sin posibilidad de recuperación)
    - Ambas acciones muestran confirmación usando el módulo `MyAlerts`

### Cambios

- **Eliminación de columna de prioridad en dashboard**: Se eliminó la columna de prioridad del dashboard.
    - Ahora las banderitas de prioridad (🔴 alta, 🟡 media, 🟢 baja) se muestran al final del título de cada item/task
    - Las banderitas solo se visualizan cuando la prioridad es diferente de "Normal"
    - El diseño es más limpio y reduce el espacio horizontal necesario

- **Lógica de actualización de estado de item padre**: Ajustada la lógica para determinar el estado de un item cuando sus tasks cambian.
    - Anterior: InProgress > Ready for Test > Done > Waiting > To Do
    - Nuevo: InProgress > Ready for Test > **To Do** > Done > Waiting
    - El estado "To Do" ahora tiene mayor prioridad que "Done" y "Waiting"
    - Esto refleja mejor el flujo de trabajo donde un item con al menos una tarea pendiente debe mostrarse como pendiente

- **Duplicar item/task**: Al duplicar un item o tarea, ahora solo se copia el título (y otros campos relevantes como detail, priority, projectName). Ya no se copia la persona asignada ni los esfuerzos.
    - Persona asignada (`assignedUser`) se establece a `null`
    - Esfuerzos (`estimatedEffort`, `actualEffort`) se establecen a `0`
    - Estado (`state`) se resetea a "To Do"
    - Aplica tanto para duplicar item completo como item sin tasks, y para duplicar tareas individuales

- **Export Sprint optimizado para IA**: Mejorado el JSON exportado para facilitar el cálculo de horas por proyecto.
    - Agregado objeto `projectEffortSummary` pre-calculado con: `projectName`, `totalHours`, `percentage` (suma 100%), `itemCount`, `taskCount`
    - Agregado campo `totalSprintHours` con el total de horas del sprint
    - Eliminado `estimatedEffort` del export (solo se incluye `actualEffort`)
    - El cálculo usa la misma lógica que el gráfico "Effort by Project": si el item tiene tasks, usa el esfuerzo de las tasks; si no tiene tasks, usa el esfuerzo del item
    - Prompt actualizado para que la IA use directamente `projectEffortSummary` sin necesidad de calcular

### Arreglos

- **Actualización automática del item padre al cambiar estado de task**: Corregido bug donde el item padre no se actualizaba automáticamente al cambiar el estado de una task a "Done" (sí funcionaba con "In Progress").
    - El problema era que existían dos métodos para guardar tasks: `sprintStore.updateTask()` (sí actualizaba padre) y `useTaskManagement.saveTask()` (no actualizaba padre)
    - Ahora `saveTask` delega en `sprintStore.updateTask()`, eliminando duplicación y garantizando consistencia
- **Ajustar ancho del dashboard para mobile**

---

## v1.1.23 - 2026-02-25

### Nuevas Funciones

- **Prefijo de proyecto en títulos del dashboard**: Ahora se muestra el ícono del nombre del proyecto como prefijo en los títulos de items y tasks en el dashboard. Permite identificar rápidamente el proyecto al que pertenece cada item/task

---

## v1.1.22 - 2026-02-23

### Nuevas Funciones

- **Aviso antes de cerrar con cambios pendientes**: Al intentar cerrar un Item o Task existente que tiene cambios sin guardar, ahora se muestra un diálogo de confirmación.
    - Opciones: "Guardar y cerrar" (guarda cambios y cierra), "Descartar cambios" (cierra sin guardar), "Cancelar" (vuelve al diálogo)
    - Funciona al hacer click en botón X, botón Cancel, o presionar Escape
    - Cuando el diálogo de confirmación está activo, presionar Escape no cierra el diálogo principal (permite择"Cancelar" para volver)
    - Solo se activa para Items/Tasks existentes con cambios pendientes

- **Campos calculados automáticamente para items con tasks**: Cuando un item tiene tasks, los campos Estado, Assigned User y Esfuerzos ahora se calculan automáticamente y no son editables manualmente.
    - Estado: InProgress > Ready for Test > Done > Waiting > To Do (prioridad de mayor a menor)
    - Assigned User: Prioridad a task en estado In Progress, o el usuario con más tasks asignadas
    - Esfuerzos: Suma automática de los esfuerzos de todas las tasks
    - Los campos se actualizan automáticamente al crear, editar, mover o eliminar tasks
    - En ItemDialog se muestra un mensaje informativo indicando que estos campos se calculan automáticamente

- **Barra de porcentajes de esfuerzo por proyecto**: Nueva barra horizontal ubicada debajo del gráfico de esfuerzos que muestra visualmente el porcentaje de esfuerzo de cada proyecto.
    - Barra del 100% de ancho dividida en secciones proporcionales al porcentaje de horas de cada proyecto
    - Cada sección pintada con el color correspondiente del proyecto
    - Líneas divisorias negras (2px) entre cada sección
    - Estilo con box-shadow inset para efecto de profundidad
    - Tooltip al hacer hover mostrando: nombre del proyecto, porcentaje y horas de esfuerzo
    - Ejemplo: "📋 Dashboard Sprint-It: 45.2% (24h)"

### Cambios

- **MySelect**: Agregada propiedad `disabled` para deshabilitar interactuación con el select.
    - Agregado estilo visual de opacidad reducida y cursor no permitido cuando está deshabilitado

- **MyDialog**: Agregada propiedad `closeOnEscape` para controlar el comportamiento de la tecla Escape.
    - Por defecto es `true` (comportamiento anterior)
    - Se establece en `false` cuando el diálogo de confirmación de cierre está activo

- **ItemDialog y TaskDialog**: Integración del aviso antes de cerrar con cambios pendientes.
    - Diálogo de confirmación aparece al intentar cerrar con cambios pendientes
    - Prop `closeOnEscape` configurada dinámicamente según el estado del diálogo de confirmación

---

## v1.1.21 - 2026-02-22

### Nuevas Funciones

- **Columna de Proyecto en Dashboard**: Nueva columna Project para mostrar el nombre del proyecto en items y tasks.
    - Columna de 160px de ancho
    - Mostrada tanto en ItemCard como en TaskCard
    - Ajuste de columna effort de 100px a 70px para mantener el balance del layout

### Cambios

- **ProjectSelector**: Mejorado el comportamiento del dropdown.
    - Oculta el dropdown cuando el texto de búsqueda coincide exactamente con una opción
    - Mantiene el dropdown abierto después de borrar la selección para mejor UX

- **Gráfico de Effort by Project**: Nuevo gráfico de barras en el dashboard que muestra el esfuerzo real por proyecto.
    - Ubicado debajo del gráfico "User Progress in the Sprint"
    - Muestra solo proyectos con esfuerzo > 0
    - No se renderiza si no hay proyectos con esfuerzos
    - Colores obtenidos de PROJECTS en useProjectName.ts (incluye Meetings y Varios)
    - Color gris (#ecebeb) por defecto para proyectos no reconocidos
    - Si el item tiene tasks, usa el esfuerzo de las tasks (ignora el item padre)
    - Si el item no tiene tasks, usa el esfuerzo del item directamente

- **Actualización de PROJECTS**: Proyectos predefinidos actualizados:
    - 📋 Dashboard Sprint-It (#4CAF50)
    - 🟢 APIX (#00ab22)
    - 🔵 Agroideas-In (#2196F3)
    - 🟣 Meetings (#9b44f8)
    - ⚫ Varios (#282828)

- **Función getProjectColor()**: Nueva función en useProjectName.ts para obtener el color de un proyecto.
    - Retorna el color de PROJECTS si existe
    - Compara nombres removiendo emojis para mejor matching
    - Retorna color gris por defecto si no encuentra coincidencia

### Arreglos

- **Visualización de projectName en tasks**: Corregido bug visual en TaskCard donde se mostraba el `projectName` del item padre en lugar del `projectName` de cada task individual.
    - Ahora cada task muestra su propio `projectName` en la columna de proyecto

- **Propagación de projectName a tasks**: Al editar el `projectName` de un item, ahora se aplica automáticamente a las tasks contenidas que no tengan `projectName` seteado.
    - Las tasks que ya tienen un `projectName` configurado NO se modifican
    - Implementado en `sprintStore.updateItem()`

- **Preseteo de projectName al crear tasks**: Al crear una nueva task dentro de un item, ahora se usa el `projectName` del item padre como valor por defecto.
    - Prioridad: 1) `projectName` del item, 2) último proyecto usado (localStorage)
    - Implementado en `TaskDialog.resetFormForNew()`

- **Conversión de newlines a `<br>` en comentarios**: Los saltos de línea ahora se convierten correctamente a etiquetas `<br>` para una visualización adecuada en HTML.
    - Implementado en `processCommentHtml()` y `saveChangelogComment()`

- **Notificación errónea de portapapeles**: Corregido bug donde mostraba notificación de éxito incluso cuando fallaba el copiado al portapapeles.

---

## v1.1.20 - 2026-02-21

### Nuevas Funciones

- **Agregar comentario desde Changelog**: Nueva funcionalidad para facilitar el pegado de detalles desde un changelog.
    - Botón "From Changelog" ubicado a la izquierda del botón "Add Comment" en la sección de comentarios
    - Abre un modal con un label predefinido: "Tarea realizada, así quedó el detalle en el changelog:"
    - El textarea obtiene el foco automáticamente al abrir el modal
    - Al guardar, se genera el comentario con formato: `Tarea completada, así quedó el detalle en el changelog:<br>[contenido pegado]`
    - Disponible tanto en items como en tasks

- **Copy to Clipboard**: Nueva funcionalidad para copiar título y descripción de items y tasks al portapapeles.
    - Icono `mdi-content-copy` ubicado a la derecha del campo de título en ItemDialog y TaskDialog
    - Al hacer click, copia el título y la descripción en formato texto plano
    - Elimina etiquetas HTML (p, u, strong, b, br) y las convierte a texto
    - Muestra notificación de éxito: "Copied to clipboard"

- **Ctrl+S para guardar sin cerrar**: Atajo de teclado para guardar items/tasks sin cerrar el diálogo.
    - Presionando Ctrl+S se guardan los cambios sin cerrar la ventana
    - Guarda solo los campos principales (title, description, assigned person, state, effort, etc.)
    - Ignora comentarios pendientes (ya que estos se manejan independientemente)

- **Efecto Pulse en diálogos**: Indicador visual de cambios pendientes en item/task.
    - Efecto de pulso animado en el borde del diálogo cuando hay cambios sin guardar
    - Se activa cuando: hay cambios en el formulario, se está escribiendo un comentario, o se está editando un comentario

- **Clasificación de items/tasks por proyectos**: Nueva funcionalidad para clasificar items y tasks por proyecto.
    - Nuevo componente `ProjectSelector.vue` con input editable y autocompletado
    - Las opciones se cargan desde los proyectos usados en los últimos 10 sprints
    - Proyectos por defecto siempre disponibles: APIX/front, APIX/back-node, APIX/back-python, Agroideas-In/front, Agroideas-In/back
    - Permite crear nuevos proyectos escribiéndolos directamente
    - Selector ubicado a la derecha del select Priority en ItemDialog y TaskDialog
    - Se guarda el último proyecto usado en localStorage para pre-llenar en nuevos items/tasks
    - Campo `projectName` incluido en el historial de cambios
    - Compatible con Export Data e Import Data

### Cambios

- **Header**: Agregado limitador de ancho máximo (max-width: 1100px) para mantener consistencia con el dashboard en resoluciones amplias

- **MyDialog**: Agregada prop `pulse` para mostrar indicador visual de cambios pendientes

- **ProjectSelector**: Agregadas propiedades `density` y mejoras en la detección de cambios en tiempo real

---

## v1.1.19 - 2026-02-19

### Nuevas Funciones

- **Export Sprint**: Nueva opción en el header para exportar los datos del sprint actual en formato JSON. Incluye:
    - Items con tareas completadas (estado Done)
    - Solo las tareas completadas de cada item
    - Comentarios asociados a items y tasks
    - Propiedad `prompt` con instrucción para ChatGPT generar resumen para colegas no técnicos

### Cambios

- **Import Data**: Renombrado de "Importar items" a "Import Data" en el menú de usuario
- **UI**: Eliminada línea separadora entre "Export Data" e "Import Data" en el menú

---

## v1.1.18 - 2026-02-18

### Cambios

- Mejoras en la UI del selector de sprints

---

## v1.1.17 - 2026-02-17

### Nuevas Funciones

- Sistema de instalación PWA

---

### Formato de entradas

Para agregar una nueva versión:

```markdown
## v1.X.X - YYYY-MM-DD

### Nuevas Funciones

- Descripción de nuevas funcionalidades

### Cambios

- Descripción de cambios existentes

### Arreglos

- Descripción de errores corregidos
```

---

_Este changelog se actualiza con cada versión del proyecto._
