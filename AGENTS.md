# AGENTS.md

## Project Overview

-   Stack: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Vuetify (si aplica)
-   Entry points: `src/main.ts`, `src/App.vue`
-   Architecture: `src/components/`, `src/views/`, `src/stores/`, `src/composables/`, `src/services/`

## Setup & Commands

-   Install: `pnpm i`
-   Dev: `pnpm dev`
-   Build: `pnpm build`
-   Lint: `pnpm lint`
-   Test: `pnpm test:unit` (Vitest)
-   Type-check: `pnpm typecheck`

## Code Style (follow strictly)

-   **Functions:** prefer arrow functions always; names in camelCase; async functions end with 'Async'; max 20-30 lines per function.
-   **Strings:** **double quotes** only.
-   **Control flow:** avoid `else` when posible; use early returns; single-line if without braces; prefer `if (condition) return action();` or `if (condition) continue;` over multi-line blocks. Always prefer early returns over else statements. Use `if (condition) return action();` for simple cases.
-   **DRY Principle:** Don't Repeat Yourself - extract common logic into reusable functions; avoid code duplication.
-   **Imports:** absolute via `@/`; no default barrels ocultando tipos.
-   **TypeScript:** explicit types on public APIs; no `any`; enable `strict`.
-   **Vue:** `<script setup lang="ts">`; Composition API; no Options API.
-   **Component Structure:** Template first, then Script, then Style (orden: `<template>`, `<script>`, `<style>`).
-   **Props/Emits:** typed, `defineProps`/`defineEmits`. Emit names in kebab-case.
-   **Components:** PascalCase files; 1 componente por archivo; template minimal.
-   **State:** Pinia stores en `src/stores/` con `defineStore`, tipado fuerte.
-   **Composables:** en `src/composables/` prefijo `useX`; sin efectos colaterales.
-   **Styling:** SCSS modules o estilos scoped; evita global leaks.
-   **Naming:** variables camelCase, tipos/interfaces PascalCase con sufijo `Props`, `State`, etc.
-   **Comments:** breves, solo donde agreguen intención.

## File/Folder Conventions

-   `src/services/` para HTTP (fetch/axios) con clientes tipados.
-   `src/types/` contratos compartidos (`.d.ts` o `.ts`).
-   `src/constants/` para literales.
-   `src/assets/` estáticos (sin lógica).
-   Evitar circular deps.

## API & Errors

-   Centralizar HTTP en `services/apiClient.ts` con interceptors.
-   Manejo de errores: funciones puras que devuelven `Result<T, E>` o lanzan `AppError`.

## Testing

-   Vitest + Vue Test Utils.
-   Requerido al crear un composable o store: mínimo 1 test de comportamiento.

## Commits & Branches

-   Conv. commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`.
-   Branches: `feature/<scope>`, `fix/<scope>`.

## Security & Secrets

-   Nunca exponer claves; usar `.env` + `import.meta.env` (documentar variables).

## User Management

### Creating Users

Para crear un nuevo usuario en el sistema:

1. **Crear archivo temporal**: Copia `create-user-template.js` y modifícalo con los datos del nuevo usuario
2. **Configurar usuario**: Edita la sección `userConfig` con:
    - `name`: Nombre del usuario
    - `lastName`: Apellido del usuario
    - `username`: Nombre de usuario único
    - `email`: Email del usuario
    - `password`: Contraseña (se encriptará automáticamente)
3. **Ejecutar script**: `node create-user-template.js`
4. **Eliminar archivo**: Borra el archivo después de la ejecución para no dejar rastro en el repositorio

**Nota**: Requiere tener `config.json` en la raíz del proyecto.

## Agent Tasks (you may run)

-   “Create a Vue 3 component with props typed and arrow functions.”
-   “Add a Pinia store named useUserStore with persistent state.”
-   “Refactor functions to early-return style and double quotes.”

## Do / Don't

-   DO: prefer functional utilities; small components; usar `ContextMenu.vue` para menús contextuales reutilizables.
-   DON'T: side effects in composables durante import; no `any`; no Options API; no implementar lógica de menú contextual directamente en componentes - usar `ContextMenu.vue`.

## Component Import Rules

-   **ALWAYS import ALL components used in templates**: Before using any component in a Vue template, ensure it is explicitly imported in the `<script setup>` section. Missing imports will cause runtime errors like "Failed to resolve component".
-   **Check imports after renaming components**: When renaming or moving components, update ALL import statements across the codebase immediately.
-   **Use absolute imports**: Always use `@/` for imports to maintain consistency and avoid path resolution issues.
-   **Import validation**: After making changes to component usage or imports, run `npx vue-tsc --noEmit` to verify no import errors exist.

## Project-Specific Rules (Lucas)

-   Arrow functions only.
-   Double quotes, never single.
-   Avoid `else`; prefer early return.
-   Prefer explicit types everywhere.
-   Language preference: Communicate in Spanish always.
