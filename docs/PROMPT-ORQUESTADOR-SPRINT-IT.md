# Prompt — Agente orquestador Sprint-IT (3 tracks en paralelo)

Copiá **todo este archivo** al chat del agente orquestador.

---

## Rol

Sos el **agente orquestador**. No implementás los tres tracks vos: creás hasta **3 subagentes en paralelo**, les pasás el bloque de prompt que corresponda (**SA**, **SB** o **SC**), y al final armás un **informe consolidado** para el usuario.

**Reglas globales**

- **NO commits. NO push.** Ni vos ni los subagentes. Solo cambios locales + informes.
- **NO merge a `main`** ni a `develop`. Los subagentes no integran ramas entre sí.
- Cada subagente trabaja en **su propia rama** (ver convención abajo).
- No commitear `.env` ni secrets.
- Archivos `.rest`: HTTPYac — variables **nunca vacías** (usar `REPLACE_*`).

---

## Convención de ramas (obligatoria)

Partimos de las ramas **actuales del equipo** (no de `main`). Cada subagente crea una rama hija con el **sufijo del agente**:

| Repo                 | Rama base (ya existente)    | Rama del subagente                     |
| -------------------- | --------------------------- | -------------------------------------- |
| `agroideas-in-api`   | `feature/sprint-it-backend` | **SA:** `feature/sprint-it-backend-sa` |
| `agroideas-in-api`   | `feature/sprint-it-backend` | **SB:** `feature/sprint-it-backend-sb` |
| `agroideas-in-front` | `feature/sprint-it-ui`      | **SC:** `feature/sprint-it-ui-sc`      |

**Cómo crear la rama (cada subagente):**

```bash
git checkout feature/sprint-it-backend   # o feature/sprint-it-ui en front
git pull   # si aplica
git checkout -b feature/sprint-it-backend-sa   # reemplazar sufijo según agente
```

**Al cerrar**, cada subagente debe reportar en el informe:

- Nombre exacto de la rama
- Repo
- Commit base desde el que partió (hash o mensaje)
- Confirmación: no hizo merge a `main` ni a la rama base

**Integración (solo humanos, después de revisar):** el usuario revisa los tres informes y, cuando confirme, **trae** cada rama hija a la rama feature correspondiente (`feature/sprint-it-backend` o `feature/sprint-it-ui`). Los agentes **no** hacen ese merge.

---

## Estado actual

| Repo                 | Rama base                   | Commit de referencia | Hecho en base                      |
| -------------------- | --------------------------- | -------------------- | ---------------------------------- |
| `agroideas-in-api`   | `feature/sprint-it-backend` | `1ebd9ed`            | Wave 0+1 backend                   |
| `agroideas-in-front` | `feature/sprint-it-ui`      | (HEAD actual)        | Pendiente                          |
| `sprint-it`          | —                           | —                    | Spec: `docs/SPEC-SPRINT-IT-E2E.md` |

---

## Plan paralelo

| ID     | Track                        | Repo                 | Rama de trabajo (crear)        | Parte desde                 |
| ------ | ---------------------------- | -------------------- | ------------------------------ | --------------------------- |
| **SA** | Wave 2 (WS + mutations + IA) | `agroideas-in-api`   | `feature/sprint-it-backend-sa` | `feature/sprint-it-backend` |
| **SB** | ETL Firestore → DEV          | `agroideas-in-api`   | `feature/sprint-it-backend-sb` | `feature/sprint-it-backend` |
| **SC** | Wave -1 Vuetify + infra F4   | `agroideas-in-front` | `feature/sprint-it-ui-sc`      | `feature/sprint-it-ui`      |

**Dependencias**

- SA y SB: ramas distintas, mismo repo — no checkout la rama del otro.
- SC: repo distinto, sin conflicto con API.
- F5 (UI completa) y F5.7 (store optimista): después de que el usuario integre la rama **-sa** en `feature/sprint-it-backend`.

---

## Flujo del orquestador

1. Verificar ramas base: `feature/sprint-it-backend` (api) y `feature/sprint-it-ui` (front).
2. Indicar a cada subagente su rama exacta (`-sa`, `-sb`, `-sc`).
3. Lanzar **SA**, **SB**, **SC** en paralelo con los prompts de abajo.
4. Recibir informes con **rama reportada** + archivos + tests (sin secrets).
5. Consolidar para el usuario. **No** proponer merge a `main`.

---

## Informe final (formato obligatorio del orquestador)

Por cada subagente (**SA**, **SB**, **SC**):

- **Rama de trabajo** (nombre exacto, ej. `feature/sprint-it-backend-sa`)
- Repo
- Rama base desde la que partió
- Archivos creados/modificados
- Comandos ejecutados (ok / fail)
- Tests y resultado
- Pendientes / riesgos
- Confirmación: sin commits, sin push, sin merge a `main` ni a rama base

Cierre: nota de integración manual sugerida (ej. merge `feature/sprint-it-backend-sa` → `feature/sprint-it-backend` cuando el usuario apruebe).

---

## Prompt para subagente SA

Copiá desde la línea siguiente hasta `--- FIN SA ---`.

    Rol: Backend Sprint-IT Wave 2.

    Repo: agroideas-in-api
    Rama base: feature/sprint-it-backend (commit 1ebd9ed o HEAD actual)
    Rama de trabajo (obligatoria): feature/sprint-it-backend-sa
      → git checkout feature/sprint-it-backend && git checkout -b feature/sprint-it-backend-sa

    Spec: sprint-it/docs/SPEC-SPRINT-IT-E2E.md — §4.2, §4.3, D7–D10, B2.0, B2.0b, B3.1–B3.3

    Objetivo:
    - server/sprint-it/sprint-it-mutations.ts (mutationId TTL 60s, whitelist patch, entity server-side)
    - sprint-it-websocket.ts: sprint-it-apply, sprint-it-confirmed, sprint-it-rollback
    - Integrar mutations + WS en PATCH items/tasks (y reorder si aplica §4.2)
    - sprint-it-prompt.builder.ts + sprint-it-ai.services.ts → POST/GET ai-summary vía api-core (reemplazar 501)
    - Extender server/tests/sprint-it.integration.test.js si es razonable

    No hacer: ETL, front, merge a main o a feature/sprint-it-backend, reescribir Wave 0+1.

    Convenciones: arrow functions, double quotes, early return, @/ imports. RowVersion → HTTP 409 SendConflict. autoUpdateParent solo servidor (§4.3b).

    Verificación: npm run build && npm run lint && npm run test:sprint-it:integration

    Cierre obligatorio en informe:
    - Rama trabajada: feature/sprint-it-backend-sa
    - Sin commits / sin push / sin merge
    - Archivos, comandos, tests, pendientes

--- FIN SA ---

---

## Prompt para subagente SB

Copiá desde la línea siguiente hasta `--- FIN SB ---`.

    Rol: ETL Sprint-IT Firestore → SQL DEV.

    Repo: agroideas-in-api
    Rama base: feature/sprint-it-backend
    Rama de trabajo (obligatoria): feature/sprint-it-backend-sb
      → git checkout feature/sprint-it-backend && git checkout -b feature/sprint-it-backend-sb

    Spec: sprint-it/docs/SPEC-SPRINT-IT-E2E.md — §6, B3.5, B3.6

    Objetivo:
    - Localizar o pedir export JSON Firestore
    - node scripts/sprint-it-migrate-from-firestore.js EXPORT.json --dry-run → conteos
    - Si el usuario autoriza: insert DEV y validar UserIdMapping
    - Solo modificar scripts/ si hay bugs; no tocar server/sprint-it/*.ts salvo bug crítico

    No hacer: Wave 2, WS, IA, front, merge a main o a feature/sprint-it-backend.

    Cierre obligatorio en informe:
    - Rama trabajada: feature/sprint-it-backend-sb
    - Sin commits / sin push / sin merge
    - Comandos, conteos, warnings, diff del script si hubo cambios

--- FIN SB ---

---

## Prompt para subagente SC

Copiá desde la línea siguiente hasta `--- FIN SC ---`.

    Rol: Front Agroideas-In — Wave -1 Vuetify + infra Sprint-IT (F4).

    Repo: agroideas-in-front
    Rama base: feature/sprint-it-ui
    Rama de trabajo (obligatoria): feature/sprint-it-ui-sc
      → git checkout feature/sprint-it-ui && git checkout -b feature/sprint-it-ui-sc

    Spec: sprint-it/docs/SPEC-SPRINT-IT-E2E.md — W-1.1–W-1.3, F4.1–F4.6, §14–§15

    Objetivo (en orden):
    1) Wave -1: upgrade vuetify + vite-plugin-vuetify; smoke; pnpm build
    2) F4.1–F4.6: allowlist, menú, /sprint-it shell, api service, store, deps
    No hacer: F5 completo, autoUpdateParentItem en store, backend, merge a main o a feature/sprint-it-ui.

    Verificación: pnpm lint && pnpm build; /sprint-it con guard OK.

    Cierre obligatorio en informe:
    - Rama trabajada: feature/sprint-it-ui-sc
    - Sin commits / sin push / sin merge
    - Vuetify antes/después, archivos, smoke, pendientes

--- FIN SC ---

---

## Checklist para el usuario (post-orquestación)

- [ ] Revisar informe SA en rama `feature/sprint-it-backend-sa`
- [ ] Revisar informe SB en rama `feature/sprint-it-backend-sb`
- [ ] Revisar informe SC en rama `feature/sprint-it-ui-sc`
- [ ] Tests manuales / integración
- [ ] Si aprueba: integrar cada rama **-sa / -sb** → `feature/sprint-it-backend` y **-sc** → `feature/sprint-it-ui` (vos o con ayuda, no los agentes)

## Modelo por subagente (al crear cada Task)

| Subagente         | Modelo                       |
| ----------------- | ---------------------------- |
| SA                | Claude Sonnet 4.6 (thinking) |
| SB                | Auto                         |
| SC                | Claude Sonnet 4.6 (thinking) |
| Orquestador (vos) | Auto                         |
