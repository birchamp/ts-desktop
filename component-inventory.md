# Component Inventory - Polymer to React Migration

## Overview
This document catalogs all Polymer components that need to be migrated to React + TypeScript.

## Component Categories

### 1. Main Application Components (`ts-main/`)
- **ts-dashboard.html** (1438+ lines) - Main application container
  - Dependencies: ts-app-titlebar, ts-profile, ts-home, ts-new, ts-review, ts-translate, ts-settings, ts-updates, ts-print, and all dialogs
  - Complexity: HIGH - Main app router and state manager

- **ts-app-titlebar.html** - Application title bar
- **ts-academy-titlebar.html** - Academy window title bar
- **ts-splash.html** - Splash screen component
- **app-theme.html** - Global theme definitions

### 2. Core Feature Components (`ts-home/`, `ts-new/`, `ts-review/`, `ts-translate/`, `ts-settings/`)
- **ts-home.html** (423+ lines) - Home screen with project list
- **ts-new.html** - New project creation flow
- **ts-review.html** - Project review interface
- **ts-translate.html** - Main translation interface
- **ts-settings.html** - Application settings

### 3. Dialog Components (`ts-dialogs/`)
- ts-conflict.html - Conflict resolution dialog
- ts-container-confirm.html - Container confirmation
- ts-export-options.html - Export configuration
- ts-feedback.html - User feedback form
- ts-import-confirm.html - Import confirmation
- ts-import-options.html - Import configuration
- ts-loading.html - Loading spinner
- ts-print-options.html - Print configuration
- ts-repo-search.html - Repository search
- ts-update-options.html - Update settings

### 4. Supporting Components
- **ts-profile/** - User profile management
- **ts-print/** - Print functionality
- **ts-updates/** - Update management
- **ts-legal/** - Legal documents (terms, license, etc.)
- **ts-icons/** - Icon definitions

## Migration Priority Strategy

### Phase 1: Foundation Components (Week 1-2)
1. **ts-app-titlebar** → `TitleBar.tsx`
2. **ts-splash** → `SplashScreen.tsx`
3. **app-theme** → Global CSS variables + ThemeProvider
4. **ts-loading** → `LoadingDialog.tsx`

### Phase 2: Core Navigation (Week 3-4)
1. **ts-dashboard** → `Dashboard.tsx` (Router component)
2. **ts-home** → `HomeScreen.tsx`
3. **ts-profile** → `ProfileScreen.tsx`

### Phase 3: Feature Components (Week 5-8)
1. **ts-new** → `NewProjectFlow.tsx`
2. **ts-settings** → `SettingsScreen.tsx`
3. **ts-review** → `ReviewScreen.tsx`
4. **ts-translate** → `TranslationScreen.tsx`

### Phase 4: Dialogs & Modals (Week 9-10)
1. Convert all `ts-dialogs/` components to Material-UI Dialogs
2. Implement proper state management for dialogs
3. Add form validation and error handling

### Phase 5: Advanced Features (Week 11-12)
1. **ts-print** → Print functionality with React
2. **ts-updates** → Update management system
3. **ts-legal** → Legal document display

## Component Dependencies Analysis

### External Dependencies (Polymer)
- `neon-animation` - Page transitions → React Transition Group
- `iron-signals` - Event system → React Context/EventEmitter
- `paper-*` components - Material Design → Material-UI
- `iron-*` behaviors - Utilities → Custom hooks

### Internal Dependencies
- **High Coupling**: ts-dashboard depends on almost everything
- **State Management**: Need to implement global state for user session, projects, settings
- **Navigation**: Current system uses neon-animated-pages → React Router

## State Management Requirements

### Current State (Implicit in Polymer)
- User session data
- Project list and current project
- UI state (dialogs, loading states)
- Application settings
- Translation progress

### Proposed Solution
```typescript
// Context providers needed:
- UserContext
- ProjectContext
- SettingsContext
- DialogContext
- TranslationContext
```

## File Structure Migration Plan

### Current Structure
```
src/
├── elements/
│   ├── ts-main/
│   ├── ts-home/
│   └── ...
├── js/
│   ├── bootstrap.js
│   ├── database.js
│   └── ...
└── views/
    ├── index.html
    └── ...
```

### Target Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── TitleBar.tsx
│   │   ├── Dashboard.tsx
│   │   └── Sidebar.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── TranslationScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── dialogs/
│   │   ├── LoadingDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   └── ...
│   └── ui/
│       ├── Button.tsx
│       └── ...
├── hooks/
│   ├── useProjects.ts
│   ├── useSettings.ts
│   └── ...
├── contexts/
│   ├── UserContext.tsx
│   ├── ProjectContext.tsx
│   └── ...
├── types/
│   ├── index.ts
│   └── api.ts
├── utils/
│   ├── database.ts
│   ├── fileSystem.ts
│   └── ...
└── App.tsx
```

## Migration Checklist

### Pre-Migration Tasks
- [x] TypeScript setup
- [x] ESLint configuration
- [x] Build system updates
- [x] Component inventory (THIS DOCUMENT)
- [x] State management design
- [ ] Testing strategy

### Migration Tasks
- [x] Create base component structure
- [x] Implement routing system
- [x] Convert simple components first
- [x] Implement state management
- [ ] Convert complex components
- [x] Update HTML entry points
- [ ] Test integration
- [ ] Performance optimization

## Risk Assessment

### High Risk Components
1. **ts-dashboard** - Complex routing and state management
2. **ts-translate** - Complex translation interface
3. **ts-review** - Multi-step workflow

### Medium Risk Components
1. Dialog components - Many similar patterns
2. Settings components - Form handling
3. Print components - Browser print API integration

### Low Risk Components
1. Static legal components
2. Icon components
3. Simple UI components

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook logic tests
- Utility function tests

### Integration Tests
- Screen navigation
- Form submissions
- API interactions

### E2E Tests
- Complete user workflows
- Cross-platform compatibility
- Performance benchmarks

## Success Metrics

### Code Quality
- [ ] 80%+ TypeScript coverage
- [ ] Zero ESLint errors
- [ ] Comprehensive test coverage

### Performance
- [ ] Bundle size < current size
- [ ] Startup time < current time
- [ ] Memory usage optimized

### Functionality
- [ ] All current features work
- [ ] Same user experience
- [ ] Improved error handling



