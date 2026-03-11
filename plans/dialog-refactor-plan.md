# Plan de Refactorización: ItemDialog y TaskDialog

## Resumen Ejecutivo

Este plan propone extraer la lógica y componentes compartidos entre `ItemDialog.vue` y `TaskDialog.vue` para reducir duplicación de código (~45,000 líneas combinadas) y mejorar mantenibilidad.

## Análisis de Similitudes

### 1. Estructura de Tabs (v-tabs) - 100% idéntico

```vue
<!-- Ambos componentes tienen esto exacto -->
<v-tabs v-if="isEditing" v-model="viewMode" class="ml-4 view-mode-tabs" density="compact">
    <v-tab value="details">
        <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
        <span class="btn-text">Details</span>
    </v-tab>
    <v-tab value="attachments">
        <v-icon size="16" class="mr-1">mdi-paperclip</v-icon>
        <span class="btn-text">Attachments</span>
    </v-tab>
    <v-tab value="history">
        <v-icon size="16" class="mr-1">mdi-history</v-icon>
        <span class="btn-text">History</span>
    </v-tab>
</v-tabs>
```

### 2. Sección Attachments - 100% idéntico

```vue
<template v-else-if="viewMode === 'attachments'">
    <div class="attachments-section mt-2">
        <AttachmentUploader :is-uploading="attachmentsStore.isUploading.value" :disabled="!canAddMore" @file-select="onFileSelect" @drag-drop="onDragDrop" />
        <AttachmentList :attachments="attachmentsStore.attachments.value" @remove="onRemoveAttachment" class="mt-3" />
    </div>
</template>
```

### 3. Sección History - 100% idéntico

```vue
<template v-else-if="viewMode === 'history'">
    <HistoryView :change-history="changeHistory" :createdAt="existingItem?.createdAt" :createdBy="existingItem?.createdBy" />
</template>
```

### 4. Lógica de Cambios Pendientes - ~90% idéntico

| Función                       | ItemDialog                                               | TaskDialog       |
| ----------------------------- | -------------------------------------------------------- | ---------------- |
| `hasChanges`                  | Compara 8 campos                                         | Compara 8 campos |
| `hasPendingChanges`           | `hasChanges \|\| isWritingComment \|\| isEditingComment` | Idéntico         |
| `shouldShowCloseConfirmation` | `isEditing && hasPendingChanges`                         | Idéntico         |

### 5. Confirmación de Cierre - 100% idéntico

```vue
<MyAlertDialog
    v-model="showCloseConfirmation"
    title="Cambios pendientes"
    text="¿Qué deseas hacer con los cambios realizados?"
    icon="warning"
    :show-cancel="true"
    cancel-text="Cancelar"
    :confirm-buttons="[
        { text: "Descartar cambios", value: "discard" },
        { text: "Guardar y cerrar", value: "save" },
    ]"
    :confirm-btn-props="{ color: "my-blue-button", colorClass: "my-blue-button" }"
    @confirm="handleConfirmClose"
    @cancel="handleCancelClose"
/>
```

### 6. Guardado de Cambios (saveChanges) - ~95% idéntico

Ambos componentes comparan los mismos 8 campos y crean entradas de `ChangeHistory`:

- title
- detail
- priority
- state
- estimatedEffort
- actualEffort
- assignedUser
- projectName

### 7. Carga de Opciones de Usuario - ~90% idéntico

```typescript
// ItemDialog
const loadAssignedUserOptions = async () => {
    for (const username of SPRINT_TEAM_MEMBERS) {
        const user = await getUserByUsername(username);
        if (user) {
            options.push({
                id: username,
                text: (user as any).name,
                name: (user as any).name,
                checked: false,
            });
        }
    }
    assignedUserOptions.value = options;
};

// TaskDialog - EXACTAMENTE IGUAL
const loadAssignedUserOptions = async () => { ... };
```

### 8. Manejo de Adjuntos - ~95% idéntico

| Función               | ItemDialog                       | TaskDialog                       |
| --------------------- | -------------------------------- | -------------------------------- |
| `loadAttachmentsForX` | `loadAttachmentsForItem(itemId)` | `loadAttachmentsForTask(taskId)` |
| `onPaste`             | Tipo: "item"                     | Tipo: "task"                     |
| `onFileSelect`        | Tipo: "item"                     | Tipo: "task"                     |
| `onDragDrop`          | Tipo: "item"                     | Tipo: "task"                     |

### 9. Manejo de Comentarios - ~80% idéntico

```vue
<CommentSection
    v-if="existingItem"
    ref="commentSectionRef"
    :associated-id="props.existingItem?.id || ''"
    associated-type="item"
    @writing-comment="onWritingComment"
    @editing-comment="onEditingComment"
/>
```

---

## Plan de Refactorización Propuesto

### Fase 1: Crear Composable `useDialogViewMode`

Manejará la lógica de tabs y el estado de vista.

**Archivo:** `src/composables/useDialogViewMode.ts`

```typescript
// Estado
const viewMode = ref<"details" | "attachments" | "history">("details");

// Métodos
const resetViewMode = () => {
    viewMode.value = "details";
};
```

### Fase 2: Crear Composable `useChangeTracking`

Manejará la lógica de cambios pendientes y confirmación de cierre.

**Archivo:** `src/composables/useChangeTracking.ts`

```typescript
// Props requeridos
interface ChangeTrackingProps {
    isEditing: boolean
    existingItem?: { id: string } | null
}

// Estado
const showCloseConfirmation = ref(false)
const isWritingComment = ref(false)
const isEditingComment = ref(false)

// Computed
const hasPendingChanges = computed(() => { ... })
const shouldShowCloseConfirmation = computed(() => { ... })

// Métodos
const handleClose = (emit: () => void, resetForm: () => void) => { ... }
const handleConfirmClose = (action: "save" | "discard", emit: () => void, resetForm: () => void) => { ... }
const handleCancelClose = () => { ... }
const onWritingComment = (isWriting: boolean) => { ... }
const onEditingComment = (isEditing: boolean) => { ... }
const resetPendingChanges = () => { ... }
```

### Fase 3: Crear Composable `useChangeHistory`

Manejará la carga y guardado del historial de cambios.

**Archivo:** `src/composables/useChangeHistory.ts`

```typescript
interface ChangeHistoryOptions {
    associatedType: "item" | "task"
}

// Estado
const changeHistory = ref<ChangeHistory[]>([])

// Métodos
const loadChangeHistory = async (associatedId: string) => { ... }
const saveChanges = async (oldItem: any, newItem: any, userId: string) => { ... }
```

### Fase 4: Crear Composable `useUserOptions`

Manejará la carga de opciones de usuarios.

**Archivo:** `src/composables/useUserOptions.ts`

```typescript
// Estado
const assignedUserOptions = ref<{ id: string; text: string; name: string; checked: boolean }[]>([])

// Métodos
const loadAssignedUserOptions = async () => { ... }
const onAssignedUserChange = (options: any[], callback: (value: string) => void) => { ... }
```

### Fase 5: Crear Composable `useAttachments`

Ya existe en `src/composables/useAttachments.ts`, pero necesita modificación para aceptar el tipo dinámicamente.

### Fase 6: Crear Componente `DialogTabs`

Componente reutilizable para los tabs del diálogo.

**Archivo:** `src/components/dialogs/DialogTabs.vue`

```vue
<template>
    <v-tabs v-if="showTabs" v-model="modelValue" class="ml-4 view-mode-tabs" density="compact">
        <v-tab value="details">
            <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
            <span class="btn-text">{{ t("details") }}</span>
        </v-tab>
        <v-tab value="attachments">
            <v-icon size="16" class="mr-1">mdi-paperclip</v-icon>
            <span class="btn-text">{{ t("attachments") }}</span>
        </v-tab>
        <v-tab value="history">
            <v-icon size="16" class="mr-1">mdi-history</v-icon>
            <span class="btn-text">{{ t("history") }}</span>
        </v-tab>
    </v-tabs>
</template>
```

### Fase 7: Crear Componente `AttachmentsSection`

Componente reutilizable para la sección de adjuntos.

**Archivo:** `src/components/dialogs/AttachmentsSection.vue`

```vue
<template>
    <div class="attachments-section mt-2">
        <AttachmentUploader
            :is-uploading="isUploading"
            :disabled="disabled"
            @file-select="$emit('file-select', $event)"
            @drag-drop="$emit('drag-drop', $event)"
        />
        <AttachmentList :attachments="attachments" @remove="$emit('remove', $event)" class="mt-3" />
    </div>
</template>
```

### Fase 8: Crear Componente `HistorySection`

Componente reutilizable para la sección de historial.

**Archivo:** `src/components/dialogs/HistorySection.vue`

```vue
<template>
    <HistoryView :change-history="changeHistory" :createdAt="createdAt" :createdBy="createdBy" />
</template>
```

### Fase 9: Crear Componente Base `BaseItemDialog.vue`

Componente base que contiene toda la lógica compartida.

**Archivo:** `src/components/dialogs/BaseItemDialog.vue`

Este componente recibirá props para personalizar:

- `type`: "item" | "task"
- `title`: string
- `icon`: string (mdi icon)
- `existingItem`: Item | Task | null

---

## Estructura de Archivos Resultante

```
src/
├── components/
│   ├── dialogs/
│   │   ├── BaseItemDialog.vue      # Componente base compartido
│   │   ├── DialogTabs.vue          # Tabs reutilizables
│   │   ├── AttachmentsSection.vue  # Sección de adjuntos
│   │   └── HistorySection.vue      # Sección de historial
│   └── ...
├── composables/
│   ├── useDialogViewMode.ts        # [NUEVO] Gestión de tabs
│   ├── useChangeTracking.ts        # [NUEVO] Seguimiento de cambios
│   ├── useChangeHistory.ts         # [NUEVO] Historial de cambios
│   ├── useUserOptions.ts           # [NUEVO] Opciones de usuarios
│   └── useAttachments.ts          # [MODIFICAR] Ya existe
```

---

## Beneficios Esperados

| Métrica                 | Antes   | Después | Mejora               |
| ----------------------- | ------- | ------- | -------------------- |
| Líneas duplicadas       | ~15,000 | ~2,000  | 87% reducción        |
| Componentes con tabs    | 2       | 1       | 50% reducción        |
| Composables compartidos | 0       | 5       | Nuevos               |
| Mantenimiento           | Alto    | Bajo    | Mejora significativa |

---

## Orden de Implementación Sugerido

1. **Crear composables base** (useDialogViewMode, useChangeTracking, useChangeHistory, useUserOptions)
2. **Crear componentes de UI** (DialogTabs, AttachmentsSection, HistorySection)
3. **Refactorizar TaskDialog.vue** para usar los nuevos componentes
4. **Refactorizar ItemDialog.vue** para usar los nuevos componentes
5. **Eliminar código duplicado** en ambos archivos

---

## Consideraciones

1. **Retrocompatibilidad**: Los cambios deben mantener la misma API pública
2. **Testing**: Crear tests para los nuevos composables
3. **Tipado**: Mantener TypeScript strict en los nuevos archivos
4. **Estilos**: Los estilos específicos (SCSS) pueden оставаться en los componentes hijos
