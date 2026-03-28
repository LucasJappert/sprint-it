# Funcionalidad de Actividad de Usuarios

## Descripción

Se ha integrado un botón flotante en la parte inferior derecha de la aplicación que permite visualizar la actividad de los usuarios del sistema durante los últimos 7 días.

## Componentes

### 1. UserActivityButton.vue

- **Ubicación**: `src/components/UserActivityButton.vue`
- **Función**: Botón flotante que abre el diálogo de actividad
- **Características**:
    - Solo visible para usuarios autenticados
    - Diseño flotante en la esquina inferior derecha
    - Efecto hover que muestra el título completo
    - Oculto en dispositivos móviles

### 2. UserActivityDialog.vue

- **Ubicación**: `src/components/UserActivityDialog.vue`
- **Función**: Diálogo para mostrar actividad detallada de usuarios
- **Características**:
    - Usa `MySelect` para selección de usuario
    - Visualización de actividades en orden descendente
    - Formato simplificado y claro de actividades
    - Diseño limpio y minimalista

### 3. useUserActivity.ts (Composable)

- **Ubicación**: `src/composables/useUserActivity.ts`
- **Función**: Lógica para obtener y procesar datos de actividad
- **Características**:
    - Carga lazy de datos (solo cuando se abre el diálogo)
    - Análisis de actividad de últimos 7 días
    - Procesamiento simplificado de items y tasks
    - Filtros para optimizar rendimiento

## Filtros

- **Temporal**: Solo actividades de los últimos 7 días
- **Sprints**: Solo considera los últimos 2 sprints para optimizar rendimiento
- **Usuario**: Seleccionable desde lista de usuarios disponibles
- **Orden**: Descendente por timestamp (más recientes primero)

## Tipos de Actividad Registradas

1. **Items** - Items creados por el usuario: `Item agregado "Título"`
2. **Tasks** - Tasks creadas o asignadas al usuario: `Task agregada "Título" a Item "Título"`
3. **Task asignada** - Tasks asignadas al usuario: `Task asignada "Título"`
4. **Cambios de estado** - Cambios de estado en items/tasks: `Cambio de estado en Task "Título": de "To Do" a "In Progress"`
5. **Cambios de prioridad** - Cambios de prioridad: `Cambio de prioridad en Task "Título": de "Normal" a "High"`
6. **Cambios de esfuerzo** - Modificaciones de esfuerzo estimado/real: `Cambio de esfuerzo real en Task "Título": de 2 a 3`
7. **Reordenamientos** - Cambios en el orden de tasks: `Reordenamiento de Task "Título"`

## Formato de Actividad

Las actividades se muestran en formato simplificado y legible:

```
Item agregado "Título del item"
Task agregada "Título de la task" a Item "Título del item"
Task asignada "Título de la task"
Cambio de estado en Task "Título": de "To Do" a "In Progress"
Cambio de prioridad en Item "Título": de "Normal" a "High"
Cambio de esfuerzo real en Task "Título": de 2 a 3
Reordenamiento de Task "Título"
```

Cada actividad incluye:

- **Acción**: Verbo descriptivo (agregado, asignada)
- **Descripción**: Títulos entre comillas para mayor claridad
- **Tiempo**: Formato relativo (hace X minutos/horas/días)
- **Sprint**: Sprint donde ocurrió la actividad

## Integración

El botón está integrado en `App.vue` y se muestra automáticamente cuando el usuario está autenticado.

## Flujo de Usuario

1. El botón aparece automáticamente para usuarios autenticados
2. Al hacer clic, se abre el diálogo con `MySelect`
3. El usuario selecciona un usuario de la lista desplegable
4. Se muestra la actividad del usuario en formato simplificado
5. Se puede volver a la selección de usuario o cerrar el diálogo

## Consideraciones Técnicas

- Usa el store `useAuthStore` para verificar autenticación
- Accede a datos de Firestore a través de servicios existentes
- Implementa carga lazy para optimizar rendimiento
- Usa `MySelect` del proyecto para consistencia UI
- Formato de actividad simplificado y fácil de leer
- Manejo de errores de forma graceful
- Sigue las convenciones del proyecto (Vue 3, TypeScript, Vuetify)

## Mejoras Realizadas

- ✅ Simplificación del formato de actividad
- ✅ Uso de `MySelect` para selección de usuarios
- ✅ Reducción de complejidad en el composable
- ✅ Mejora del diseño visual del diálogo
- ✅ Formato de tiempo relativo más claro
- ✅ Eliminación de carga innecesaria de comentarios y cambios
- ✅ **Optimización de rendimiento**: Solo procesa los últimos 2 sprints
- ✅ **Batch query optimizado**: Una sola consulta para todos los cambios (N×M → 3 consultas)
- ✅ **Logging mejorado**: Ayuda a depurar problemas de carga
- ✅ **Búsqueda local**: Map para O(1) lookup de cambios por item/task
