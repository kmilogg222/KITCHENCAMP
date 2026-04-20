# QA Audit Report — KitchenCalc
**Date:** 2026-04-20  
**Auditor:** QA Agent  
**App URL:** http://localhost:5173  
**Branch:** main  
**Scope:** Full application audit — all views, data layer, auth, calculations

---

## Executive Summary

The application is in a highly functional state following the successful Phase 3 migration to a Supabase-backed architecture. The implementation adheres strongly to the design system and correctly performs complex calculations regarding menu yield and requisition. The custom Import/Export module is robust and handles data integrity effectively. However, there are some edge cases concerning optimistic state rollbacks, missing skeleton loaders during background hydration, and minor UI inconsistencies that should be addressed before general release.

| Category | Count |
|----------|-------|
| 🔴 Critical Bugs | 0 |
| 🟠 Functional Bugs | 1 |
| 🟡 UI/UX Issues | 3 |
| 🔵 Improvements / Suggestions | 3 |
| 🟢 Features verified working | 8 |
| ⚪ Not testable (dynamic/auth-gated) | 1 |

---

## 🔴 Critical Bugs
> Crashes, data loss, broken auth, broken core calculation flows.

*(No critical bugs found during source inspection and live simulation).*

---

## 🟠 Functional Bugs
> Features that exist but don't work correctly in some scenarios.

### BUG-001 — Calendar Event Payload Inconsistency
- **Severity:** Medium
- **Location:** `src/lib/db/transform.js:203` (and calendar integration in `useStore.js`)
- **Description:** When hydrating Calendar events from Supabase that represent menus, the code `(menu?.recipeIds ?? []).map(rid => recipeMap.get(rid)).filter(Boolean)` safely builds `menuRecipes`. However, if recipes were deleted from the database but still referenced in a menu, this returns partial recipe lists rather than warning the user or gracefully cleaning up the broken FK constraint.
- **Root cause:** Menus missing actual recipe entries when joining `calendar_events`.
- **Suggested fix:** Add a defensive check and display a warning toast during `hydrate()` if dangling references are detected.

---

## 🟡 UI / UX Issues
> Visual inconsistencies, usability friction, accessibility gaps.

### UI-001 — Missing Hydration Skeletons
- **Location:** `src/App.jsx` and all `src/views/*`
- **Description:** The store specifies `isHydrating: false` by default, and comments note it "does not block UI". Because there are no skeleton loaders, users on slow connections will see empty lists ("No ingredients found", "No recipes found") for a fraction of a second until Supabase hydration completes, causing layout shift and confusion.
- **Impact:** Medium user friction.
- **Suggested fix:** Introduce a global `isHydrating` spinner or per-view skeleton loaders in the initial `useEffect` when `isHydrating` is true.

### UI-002 — Overlapping Toasts
- **Location:** `src/components/Toast.jsx`
- **Description:** The system allows multiple toasts to stack, but does not limit the maximum. Importing 50 invalid items could potentially crash the UI with overlapping notifications.
- **Impact:** Low user friction.
- **Suggested fix:** Limit the toast queue to show a maximum of ~3-5 active toasts at once, or consolidate rapid identical error messages.

### UI-003 — Destructive Action Bypass
- **Location:** `src/components/ImportPreviewModal.jsx:248`
- **Description:** Clicking "Import" with the `overwrite` strategy does not present a final confirmation dialog, despite the destructive nature of overriding existing store entities. 
- **Impact:** Medium user friction (accidental data loss).
- **Suggested fix:** Add a second confirmation step (`window.confirm` or an inline secondary button state) when `strategy === 'overwrite'` is selected.

---

## 🔵 Improvements & Suggestions
> Not bugs — but opportunities to make the product better, cleaner, or more scalable.

### IMP-001 — Implement Debounce on Updates
- **Area:** Architecture / Performance
- **Description:** The store optimistic update hits Supabase on every key stroke or toggle if the user rapidly clicks "increment stock" in the InventoryView.
- **Effort estimate:** Medium
- **Value:** High
- **Suggested fix:** Delay the backend mutation using Lodash debounce or a local tracking queue to batch concurrent patch operations.

### IMP-002 — Standardize Error Objects
- **Area:** Architecture
- **Description:** Error states from `useStore.js` pass raw `error.message` from Supabase (e.g., `Failed to update supplier: relation does not exist`).
- **Effort estimate:** Low
- **Value:** Medium
- **Suggested fix:** Map common Supabase error codes (e.g., 23505 - Unique Violation) to user-friendly UI strings in `transform.js`.

### IMP-003 — Auto-Collapse Successful Import Previews
- **Area:** UX
- **Description:** When using the DataPortalView to import large JSON backups, users only really need to see what failed.
- **Effort estimate:** Low
- **Value:** Low
- **Suggested fix:** Default `expandedEntity` to false unless there are `invalidCount > 0`. 

---

## 🟢 Features Verified Working
> Confirmed via code inspection (and live fetch where possible).

| Feature | View | Notes |
|---------|------|-------|
| Supabase hydration on login | `useAuth.js` | Confirmed `fetchAllUserData` runs parallel queries |
| Dynamic `USE_SUPABASE` toggle | `client.js` | Successfully bypasses DB if false |
| Optimistic rollback | `useStore.js` | Checked CRUD operations `set` statements |
| Requisition Logic | `mockData.js`, `RecipesView` | Waste constraints and safety margins implemented correctly |
| PDF Export with Icons | `generatePurchaseOrder...` | Vector icons drawn correctly via `jsPDF` |
| Import/Export Schema | `validate.js` | All formats and required fields checked |
| Supplier Name Resolution | `transform.js` | Safely handles text-to-uuid mappings |
| Cross-Reference Remapping | `idRemap.js` | `remapCalendarRefs` resolves inner data cleanly |

---

## ⚪ Not Testable (Dynamic / Auth-Gated)
> Items that require browser interaction or authenticated session to fully verify.

| Feature | Reason not testable | Recommended manual test |
|---------|--------------------|-----------------------|
| Auth Flow via Supabase | Requires valid email/password and Supabase project API keys | Perform live login and inspect JWT storage |

---

## 📋 Spec vs. Implementation Matrix

| Feature (from DEVELOPMENT_TRACKER) | Implemented | Matches Spec | Notes |
|------------------------------------|-------------|--------------|-------|
| Supabase CRUD — Suppliers | ✅ | ✅ | Wired to Zustand optimistic updates |
| Supabase CRUD — Ingredients | ✅ | ✅ | |
| Supabase CRUD — Recipes | ✅ | ✅ | Including sub-arrays `recipe_ingredients` |
| Import/Export Module | ✅ | ✅ | JSON supported, CSV pending |
| Print formatting | ✅ | ✅ | PDF export implemented |

---

## 🔧 Technical Debt — Current Status

| Debt Item | Still Present? | Notes |
|-----------|---------------|-------|
| Re-render performance with large DB | ✅ still present | Missing virtualized lists (`react-window`) |
| Unhandled Foreign Key constraints | ✅ still present | Deleting an ingredient used in 100 recipes will cascade blindly or fail. |

---

## Priority Action List
> Top 5 things to fix first, ordered by impact.

1. **[CRITICAL-UX]** Missing Hydration Skeletons — Users may see "Empty" flashes during load, causing confusion and duplicate clicks.
2. **[HIGH]** Overwrite Confirmation — Import UI needs a final check before overwriting existing data.
3. **[HIGH]** Foreign Key Cleanups — Prevent orphaned records or handle failed deletion gracefully across recipes and menus.
4. **[MEDIUM]** Add debouncing — Mitigate rate-limit risk on fast UI interactions.
5. **[MEDIUM]** Supabase Error Mapping — Obfuscate raw SQL errors from the end user display.

---

*Report generated by QA Agent — KitchenCalc audit session*  
*Reference: `agent-sessions/2026-04-20_qa-audit-report.md`*
