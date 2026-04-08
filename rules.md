# 📏 Rules — KitchenCalc Development Standards

> **⚠️ MANDATORY: Every AI agent MUST read this file in full before modifying any code in this repository.**

---

## 1. Stack Tecnológico

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (npm) | Latest LTS |
| Framework | React | 19.x |
| Bundler | Vite | 7.x |
| Styling | TailwindCSS + Custom CSS (`index.css`) | 4.x |
| Language | JavaScript (JSX) | ES2022+ |
| Icons | lucide-react | Latest |
| PDF | jsPDF | 4.x |
| State | Zustand (global) + React hooks nativos (local) | Latest |
| Routing | react-router-dom (v7) + `React.lazy` code-splitting | Latest |

> **Do NOT** introduce TypeScript, Redux, or any additional library without explicit user approval.
> Zustand and react-router-dom were approved on 2026-04-07.

---

## 2. Convenciones de Código

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Components & Views | `PascalCase.jsx` | `MenusView.jsx`, `CreateMenuView.jsx` |
| Custom Hooks | `camelCase.js` with `use` prefix | `useCrudState.js`, `useCartManager.js` |
| Utilities / Functions | `camelCase.js` | `generatePurchaseOrderPDF.js` |
| Constants | `UPPER_SNAKE_CASE` | `MOCK_RECIPES`, `MEAL_SLOTS` |
| CSS classes | `kebab-case` | `.glass-card`, `.menu-recipe-card` |
| Variables & functions | `camelCase` | `selectedRecipe`, `handleSaveMenu` |

### Language

- **JSDoc headers** (file-level `@file`, `@description`): Written in **Spanish**.
- **UI labels, buttons, placeholders**: Written in **English**.
- **Variable names, function names, comments inline**: Written in **English**.

### Code Style

- **Inline styles** for component-specific styling; **CSS classes** (`index.css`) for reusable patterns.
- **Design tokens** centralized in `src/constants/theme.js` — never hardcode brand colors outside this file.
- **Mock data** and calculation functions live in `src/data/mockData.js`.
- **One component per file**. Internal sub-components (e.g., `GroupInput` inside `RecipesView`) are acceptable when they're tightly coupled and not reused elsewhere.
- **Custom hooks** for any reusable stateful logic — keep `App.jsx` as a pure orchestrator.

---

## 3. Manejo de Errores y Logs

### Rules

1. **Never swallow errors silently.** Every caught exception must either:
   - Display user-facing feedback (inline error message, toast, etc.), or
   - Log to console with meaningful context (`console.error` with description).

2. **Null-safe access is mandatory.** Always use optional chaining (`?.`), nullish coalescing (`??`), and `.filter(Boolean)` when working with data that may be undefined.

3. **Form validation** must use an `errors` object pattern:
   ```js
   const [errors, setErrors] = useState({});
   // Validate → populate errors → render inline messages
   ```

4. **No `try/catch` blocks that silently return `null` or empty arrays.** If something fails, the user must know.

5. **Do NOT use `alert()` or `window.confirm()`.** Use custom modals or inline UI feedback instead.

---

## 4. Arquitectura y Estructura

### File Organization

```
src/
├── components/    → Reusable UI components (Sidebar, Toggle, StarRating)
├── constants/     → Design tokens, enums, configuration (theme.js)
├── data/          → Mock data, seed data, calculation engines (mockData.js)
├── hooks/         → Custom React hooks (useCrudState, useCartManager)
├── utils/         → Pure utility functions (PDF generation, formatters)
├── views/         → Full-page view components (RecipesView, MenusView, etc.)
├── assets/        → Static assets (images, fonts)
├── App.jsx        → Root orchestrator — state + navigation only
├── main.jsx       → Entry point
├── index.css      → Global styles + reusable CSS classes
└── App.css        → App-level overrides (minimal)
```

### Data Flow

```
mockData (seed) → useState (App.jsx) → handlers → props → views
```

`App.jsx` is the **single source of truth**. Views receive data and callbacks via props. Views do NOT manage global state.

---

## 5. Interacción de Agentes de IA

> **These rules are NON-NEGOTIABLE for any AI agent working on this codebase.**

1. **Read first, code second.** Before making any change, read `rules.md`, `architecture.md`, and `tasks.md`.

2. **Do NOT commit or push without explicit user instruction.** Git operations (`git commit`, `git push`) are ONLY executed when the user explicitly asks for them. Never auto-commit.

3. **Do NOT install new dependencies** without presenting them to the user first and getting approval.

4. **Do NOT delete or rename existing files** without user approval.

5. **Do NOT refactor working code** unless it's part of the current task. If you see something that should be refactored, note it in `tasks.md` under `[PENDIENTE]` and move on.

6. **Always verify changes compile** by running `npm run build` or checking the dev server before reporting completion.

7. **Update `tasks.md`** when starting, completing, or discovering tasks.

---

## 6. Git Conventions

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: short description of the feature
fix: short description of the bug fix
refactor: short description of the refactor
docs: short description of the documentation change
style: short description of the style change
```

### Branching

- `main` is the production branch.
- Create feature branches only when instructed by the user.

---

*Last updated: 2026-04-03*
