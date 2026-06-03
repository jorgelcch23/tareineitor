# CLAUDE.md — TaskFlow (Task Manager Interno)

> Handoff document para Claude Code. Lee todo antes de empezar. Construye en el orden de las fases. No te adelantes a features de fases posteriores.

---

## 1. Qué estamos construyendo

Un task manager interno tipo ClickUp pero **mucho más simple**, enfocado solo en tareas. Sin sprints, sin Gantt, sin las limitaciones del plan gratuito de ClickUp. Es para proyectos internos del equipo: crear proyectos, gestionar tareas en vista lista, asignar gente, prioridades, fechas, status y comentarios. Invitar miembros y darles acceso a proyectos específicos.

**Filosofía:** lo justo y necesario, bien hecho. Limpio, rápido, sin trabas.

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (Postgres) |
| Auth | Supabase Auth (email/password + magic link) |
| Permisos | Postgres RLS (Row Level Security) |
| Editor descripción | Tiptap (markdown/rich text) |
| Deploy | Vercel |

Usar `@supabase/ssr` para el manejo de sesión en App Router (server + client components). No usar el patrón viejo de `auth-helpers`.

---

## 3. Decisiones de producto (ya tomadas)

- **Una sola organización / workspace.** Todos los usuarios pertenecen al mismo workspace. NO hay multi-org en el MVP. (Diseñar la DB para que sea fácil agregar multi-org después, pero no implementarlo ahora.)
- **Vista de tareas: solo Lista** (estilo ClickUp List). No Kanban ni Calendar en el MVP.
- **Detalle de tarea con descripción rica** (editor markdown vía Tiptap) + comentarios en realtime.
- Roles: `owner`, `admin`, `member`.

---

## 4. Modelo de datos

```sql
-- Perfiles de usuario (extiende auth.users de Supabase)
profiles
  id            uuid PK (= auth.users.id)
  full_name     text
  avatar_url    text
  role          text  -- 'owner' | 'admin' | 'member' (rol a nivel workspace)
  created_at    timestamptz default now()

-- Proyectos
projects
  id            uuid PK default gen_random_uuid()
  name          text not null
  description   text
  created_by    uuid FK -> profiles.id
  archived      boolean default false
  created_at    timestamptz default now()

-- Acceso a proyectos (quién puede ver/editar cada proyecto)
project_members
  id            uuid PK default gen_random_uuid()
  project_id    uuid FK -> projects.id (on delete cascade)
  user_id       uuid FK -> profiles.id (on delete cascade)
  role          text default 'member'  -- 'admin' | 'member' (rol dentro del proyecto)
  created_at    timestamptz default now()
  UNIQUE(project_id, user_id)

-- Status configurables por proyecto (default: To Do, In Progress, Done)
statuses
  id            uuid PK default gen_random_uuid()
  project_id    uuid FK -> projects.id (on delete cascade)
  name          text not null
  color         text not null   -- hex
  position      int not null    -- orden de columnas/secciones
  is_done       boolean default false  -- marca el estado "terminado"

-- Tareas
tasks
  id            uuid PK default gen_random_uuid()
  project_id    uuid FK -> projects.id (on delete cascade)
  title         text not null
  description   jsonb           -- contenido Tiptap (rich text)
  status_id     uuid FK -> statuses.id
  assignee_id   uuid FK -> profiles.id (nullable)
  priority      text            -- 'urgent' | 'high' | 'normal' | 'low' | null
  due_date      timestamptz     -- nullable
  position      int             -- orden dentro del status (para drag & drop futuro)
  created_by    uuid FK -> profiles.id
  created_at    timestamptz default now()
  updated_at    timestamptz default now()

-- Comentarios
comments
  id            uuid PK default gen_random_uuid()
  task_id       uuid FK -> tasks.id (on delete cascade)
  user_id       uuid FK -> profiles.id
  body          text not null
  created_at    timestamptz default now()
```

**Trigger:** `updated_at` en `tasks` debe actualizarse automáticamente con un trigger `BEFORE UPDATE`.

**Seed:** al crear un proyecto, insertar automáticamente los 3 status default (To Do gris, In Progress azul/amarillo, Done verde con `is_done = true`) y agregar al creador como `project_members` con rol `admin`.

---

## 5. RLS (crítico)

Toda la seguridad de acceso vive en la base de datos, NO solo en el frontend. Reglas:

- **profiles:** todo usuario autenticado puede leer todos los perfiles (workspace único). Solo puede editar el suyo. El `owner`/`admin` puede cambiar roles de otros.
- **projects:** un usuario solo ve un proyecto si existe una fila en `project_members` con su `user_id`, O si es `owner`/`admin` del workspace. Crear proyecto: cualquier `member` autenticado. Editar/archivar: solo `admin` del proyecto u `owner` del workspace.
- **project_members:** legible por los miembros del proyecto. Solo `admin` del proyecto u `owner`/`admin` del workspace pueden insertar/borrar (invitar / quitar acceso).
- **statuses / tasks / comments:** un usuario puede leer y escribir SOLO si es miembro del proyecto al que pertenece la tarea. Usar una función helper SQL `is_project_member(project_id, auth.uid())` para no repetir la lógica.

Implementar una `SECURITY DEFINER` function para `is_project_member` y `is_workspace_admin` y usarlas en las políticas.

---

## 6. Pantallas / Rutas

```
/login                      → auth (Supabase)
/                           → lista de proyectos del usuario + botón "Nuevo proyecto"
/projects/[id]              → vista LISTA de tareas del proyecto
                              (agrupadas por status, estilo ClickUp List)
/projects/[id]/settings     → miembros del proyecto + invitar + editar proyecto
/settings/members           → (solo admin/owner) gestión de usuarios del workspace
```

### Vista lista de proyecto (la pantalla principal)

Replica la referencia de ClickUp List:

- Tareas **agrupadas por status** (secciones colapsables: TO DO, IN PROGRESS, DONE).
- Cada fila muestra: checkbox/icono de status, **título**, assignee (avatar), due date, priority (flag con color), badge de status, contador de comentarios.
- Click en una fila → abre el **detalle de la tarea** (panel lateral derecho o página, preferir panel deslizante).
- Fila "+ Add Task" al final de cada grupo para crear inline (solo escribes el título y enter).
- Header con: nombre del proyecto, botón "Add Task", filtro por assignee.

### Detalle de tarea

- Título editable inline.
- Bloque de propiedades: Status (dropdown con colores), Assignee, Priority, Due date.
- **Descripción** con editor Tiptap (rich text / markdown).
- **Comentarios** en el panel de actividad. Se cargan al abrir la tarea y se actualizan al postear uno nuevo (sin suscripción realtime, para no gastar en el backend).

---

## 7. Fases de construcción

### Fase 0 — Setup
- Crear proyecto Next.js 14 + TypeScript + Tailwind + shadcn/ui.
- Configurar Supabase (`@supabase/ssr`), variables de entorno, cliente server y client.
- Crear las migraciones SQL del esquema + RLS + triggers + funciones helper.
- Layout base con sidebar (lista de proyectos) estilo limpio.

### Fase 1 — Auth + Proyectos
- Login / registro / logout con Supabase Auth.
- Crear `profile` automáticamente al registrarse (trigger en `auth.users`).
- Primer usuario registrado = `owner` del workspace.
- CRUD de proyectos (crear, listar, editar nombre, archivar).
- Sidebar con proyectos a los que el usuario tiene acceso.

### Fase 2 — Tareas (vista lista)
- Vista lista agrupada por status.
- CRUD de tareas: crear inline, editar, eliminar.
- Asignar assignee, priority, due date, cambiar status.
- Detalle de tarea con descripción Tiptap.

### Fase 3 — Comentarios
- Comentarios en detalle de tarea (crear, listar, eliminar los propios).
- Se cargan al abrir la tarea; al postear uno nuevo se agrega a la lista sin recargar la página (optimistic update, no suscripción realtime).

### Fase 4 — Miembros y permisos
- Invitar miembros al workspace (por email).
- Dar/quitar acceso a proyectos específicos (`project_members`).
- Roles: owner/admin/member, con la UI respetando los permisos (que ya están forzados por RLS).
- Página de gestión de miembros.

---

## 8. Convenciones de código

- TypeScript estricto. Tipos generados de Supabase (`supabase gen types typescript`).
- Server Components por defecto; Client Components solo donde haya interactividad/realtime.
- Server Actions para mutaciones cuando aplique; si no, route handlers.
- shadcn/ui para todos los componentes base (Button, Dialog, Dropdown, Avatar, Badge, etc.).
- Optimistic updates en cambios de status/priority para que se sienta instantáneo.
- Manejo de errores con toasts (sonner).
- Nada de `any`. Validar inputs con Zod.

---

## 9. Fuera de alcance (NO construir en el MVP)

- Multi-organización / multi-workspace.
- Vistas Kanban, Calendar, Gantt, Table.
- Subtareas, dependencias, custom fields.
- Time tracking, automatizaciones, integraciones con IA.
- Sprints.
- Notificaciones por email/push.

Diseñar la DB de forma que estas features se puedan agregar después sin migraciones destructivas, pero **no implementarlas ahora**.

---

## 10. Definición de "listo" del MVP

- [ ] Un usuario puede registrarse e iniciar sesión.
- [ ] Puede crear proyectos y ver solo los suyos / a los que tiene acceso.
- [ ] Puede crear tareas en vista lista, agrupadas por status.
- [ ] Puede asignar assignee, priority, due date y cambiar status.
- [ ] Puede abrir el detalle, editar descripción rica y comentar.
- [ ] Puede invitar miembros y darles acceso a proyectos específicos.
- [ ] RLS impide que cualquiera vea proyectos a los que no fue invitado (verificado).
