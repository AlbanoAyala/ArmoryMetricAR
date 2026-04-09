# ArmoryMetrics AR 🎯

**PWA de trazabilidad, balística y gestión de armería para el mercado de tiro deportivo y profesional en Argentina.**

Cumplimiento ANMaC/RENAVE | Multi-tenant | Data Science integrado | Alertas automáticas

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Edge Functions | TypeScript (Deno) |
| Email | Resend |
| ORM | Supabase JS Client |
| Tipado | TypeScript estricto |

---

## Arquitectura

```
armory-metrics-ar/
├── src/
│   ├── app/
│   │   ├── api/                    # Route Handlers (REST API)
│   │   │   ├── firearms/           # CRUD de armas
│   │   │   ├── sessions/           # Sesiones de tiro (ACID via RPC)
│   │   │   ├── ballistics/         # Cronógrafo + anomaly detection
│   │   │   ├── components/         # Componentes + reemplazos
│   │   │   ├── inventory/          # Insumos de recarga
│   │   │   └── alerts/             # Centro de alertas
│   │   ├── dashboard/              # Dashboard táctico + layout con sidebar
│   │   ├── firearms/new/           # Alta de arma
│   │   ├── sessions/new/           # Carga de disparos
│   │   ├── clinical/               # Historia clínica del armero
│   │   ├── reloading/              # Reloading Lab
│   │   ├── ballistics/             # Balística + MOA
│   │   ├── alerts/                 # Centro de alertas
│   │   └── settings/               # Configuración + ANMaC
│   ├── components/ui/              # Componentes reutilizables
│   ├── lib/
│   │   ├── supabase.ts             # Clientes Supabase (browser/server/admin)
│   │   ├── data-science.ts         # Health Score, SD/ES, anomaly detection
│   │   └── weapon-families.config.json  # Config por familia de arma
│   └── types/index.ts              # Tipos TypeScript completos
├── supabase/
│   ├── migrations/001_initial_schema.sql  # DDL completo + RLS + RPCs
│   └── functions/
│       ├── maintenance-cron/       # Alertas automáticas diarias (Resend)
│       └── inventory-webhook/      # Descuento ACID de inventario
└── public/manifest.json            # PWA manifest
```

---

## Setup

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/armory-metrics-ar.git
cd armory-metrics-ar
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=alertas@tudominio.ar
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Base de datos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar instancia local
supabase start

# Aplicar migraciones
supabase db push
```

O ejecutar manualmente `supabase/migrations/001_initial_schema.sql` en el SQL Editor de tu proyecto Supabase.

### 4. Edge Functions

```bash
# Deploy functions
supabase functions deploy maintenance-cron
supabase functions deploy inventory-webhook

# Configurar cron diario para maintenance-cron
# En el Dashboard de Supabase > Edge Functions > Schedules
# Cron: 0 8 * * *  (todos los días a las 8:00 AM)
```

### 5. Correr localmente

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Funcionalidades implementadas

### Motor de Data Science
- **Health Score (0–100)**: Ponderación de desgaste por componente (pesos diferenciados: cañón 30%, aguja 25%, resorte 20%, extractor 15%, resto 10%) + penalización por días sin mantenimiento + penalización por signos de sobrepresión.
- **Ballistic Stats**: SD (Desviación Estándar) y ES (Extreme Spread) calculados automáticamente sobre array de velocidades del cronógrafo.
- **Anomaly Detection**: Z-score sobre distribución de velocidades, umbral μ + 2.5σ. Trigger automático si anomalía OU ≥2 signos físicos de sobrepresión.
- **MOA Group Radius**: Cálculo del centro de agrupación y radio máximo en MOA.

### Garantía ACID en trazabilidad de munición
Las transacciones críticas se ejecutan via stored procedures PostgreSQL (`register_shooting_session`, `create_reload_batch`) que utilizan bloques BEGIN/COMMIT/ROLLBACK implícitos de PostgreSQL. Si cualquier paso falla (por ejemplo, stock insuficiente), la transacción completa hace rollback y ningún estado queda inconsistente. Esto garantiza que:
1. Los disparos siempre se descuentan del lote correcto.
2. Los contadores de componentes siempre se actualizan junto con la sesión.
3. El inventario nunca queda en negativo.

### Seguridad (RLS)
- Todas las tablas tienen Row Level Security habilitado.
- Función helper `get_user_org()` para aislamiento multi-tenant.
- Notas clínicas: solo INSERT (append-only), sin UPDATE ni DELETE posibles por RLS.
- Event log: append-only enforced.
- Solo armeros (`role = 'gunsmith'`) pueden registrar reemplazos de componentes y notas técnicas.

### Edge Functions
- **maintenance-cron**: Corre diariamente, identifica armas con uso intensivo (>400 disp/7 días) y componentes al 85%+ de vida útil. Envía email HTML via Resend. Registra en `alerts` y `event_log`.
- **inventory-webhook**: Recibe confirmación de nuevo lote de recarga, ejecuta RPC `create_reload_batch` con descuento ACID de inventario. Retorna error estructurado con `insufficient_items[]` en caso de stock insuficiente (HTTP 409).

---

## Convenciones

- Código TypeScript en inglés, UI en español argentino
- Nomenclatura de tablas en snake_case
- Armas sin N° de serie no pueden registrarse (validación a nivel API y DB)
- Armerías sin `anmac_license` válida no pueden operar el sistema

---

## Licencia

MIT — Uso libre para proyectos de tiro deportivo y armería profesional.
