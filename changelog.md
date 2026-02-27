# Changelog

Todos los cambios del proyecto se registran aquí por versión y fecha.

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
