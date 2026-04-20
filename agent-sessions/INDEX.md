# Agent Sessions — KitchenCalc

> Archivo de pensamientos, análisis y conversaciones entre agentes.
> Usar cuando se necesite pasar contexto de una sesión anterior a un nuevo agente.

---

## Cómo usar este archivo

Cuando inicies una sesión con un nuevo agente y necesites contexto de trabajo anterior:
1. Busca el documento relevante en la lista de abajo
2. Pásalo al agente: *"Lee `agent-sessions/YYYY-MM-DD_titulo.md` antes de continuar"*
3. El agente tendrá el razonamiento completo, no solo la conclusión

---

## Sesiones registradas

| Fecha | Archivo | Tema | Estado |
|-------|---------|------|--------|
| 2026-04-13 | [2026-04-13_calc-model-analysis.md](2026-04-13_calc-model-analysis.md) | Análisis del modelo de cálculo actual y propuesta yield-first | Análisis completo — supersedido por sesión siguiente |
| 2026-04-13 | [2026-04-13_dual-mode-ingredient-model.md](2026-04-13_dual-mode-ingredient-model.md) | Diseño del modelo dual per-person / yield por ingrediente | Diseño cerrado — listo para implementar |
| 2026-04-14 | [2026-04-14_database-migration-plan.md](2026-04-14_database-migration-plan.md) | Plan completo de migración a Supabase (DB schema, RLS, Auth, fases) | Plan aprobado — pendiente implementación |
| 2026-04-14 | [2026-04-14_execution-plan-supabase-migration.md](2026-04-14_execution-plan-supabase-migration.md) | Análisis crítico del plan original + plan de ejecución paso a paso para agente implementador | Listo para ejecución por agente |
| 2026-04-18 | [2026-04-18_supabase-bug-fixes.md](2026-04-18_supabase-bug-fixes.md) | Corrección de 2 bugs críticos post-Fase 3: `SUPPLIER_IDS` con UUIDs en vez de nombres + calendar crash por campo `slot` vs `slotKey` y objetos faltantes en hydration | ✅ Completado |
| 2026-04-18 | [2026-04-18_import-export-system-plan.md](2026-04-18_import-export-system-plan.md) | Plan completo del sistema de Import/Export: Entity Registry, Format Registry, validación, resolución de conflictos, reasignación de IDs, JSON + CSV, DataPortalView UI — 4 fases de implementación | 📐 Diseño completo — pendiente ejecución |

---

*Agregar una fila a esta tabla cada vez que se guarde una nueva sesión.*