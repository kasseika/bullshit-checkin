# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a facility management system for Ofunato Telework Center (大船渡テレワークセンター) consisting of:
- Self-service check-in kiosk for visitors
- Facility booking/reservation system
- Usage statistics dashboard
- PWA support for offline functionality

## Key Commands

### Development
```bash
npm run dev              # Main app on port 3000
npm run dev:booking      # Booking app on port 3001
```

### Testing
```bash
npm test                 # Run all tests (silent mode)
npm run test:watch       # Watch mode for TDD
npm run test:coverage    # Generate coverage report
```

### Building & Deployment
```bash
npm run build            # Build main app + functions
npm run build:all        # Build both main and booking apps
npm run deploy:all       # Build all and deploy to Firebase
npm run deploy:checkin   # Deploy only checkin app
npm run deploy:booking   # Deploy only booking app
```

### Code Quality
```bash
npm run lint             # Run ESLint
```

## Architecture

### Application Flow
1. **Check-in Process** (`/src/app/checkin/`):
   - Multi-step wizard: Welcome → Parking → Room Selection → Purpose → Count → Time → Survey → Confirm
   - Each step validates and stores data in context before proceeding
   - Offline support via IndexedDB

2. **Data Flow**:
   - **Firestore**: Primary data storage for check-ins, bookings, and analytics
   - **IndexedDB**: Offline queue for check-ins when network unavailable
   - **Firebase Functions**: Backend logic for data processing
   - **Google Calendar API**: Integration for facility availability

3. **State Management**:
   - React Context for check-in flow state
   - Local state for individual components
   - Firestore real-time listeners for dashboard

### Key Technical Decisions
- **Static Export**: Next.js configured for static export (`output: 'export'`)
- **PWA**: Service worker with offline-first strategy
- **Component Library**: shadcn/ui components with Radix UI primitives
- **Testing**: Co-located tests in `__tests__` directories
- **Firebase**: Separate hosting targets for checkin and booking apps

## Testing Requirements

Follow TDD approach - write tests before implementation:

```typescript
/**
 * 機能の説明をコメントで記述
 */
export function myFunction(param: Type): ReturnType {
  // implementation
}

// 対応するテストファイル
describe('myFunction', () => {
  test('期待される動作', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

Always verify tests pass after modifications:
```bash
npm test
```

## Firebase Configuration

- **Firestore Indexes**: Defined in `firestore.indexes.json`
- **Security Rules**: Defined in `firestore.rules`
- **Functions**: TypeScript source in `/functions/src/`
- **Hosting**: Multiple sites (checkin, booking) configured in `firebase.json`

## Common Development Tasks

### Adding New Check-in Step
1. Create new page in `/src/app/checkin/[step-name]/page.tsx`
2. Add corresponding test in `__tests__/[step-name].test.tsx`
3. Update navigation logic in previous step
4. Add step to check-in context if needed

### Modifying Dashboard Statistics
1. Update query in `/src/lib/dashboardFirestore.ts`
2. Add/modify tests in `/src/lib/__tests__/dashboardFirestore.test.ts`
3. Update UI components in `/src/app/dashboard/`
4. Ensure timezone handling (JST) is consistent

### Working with Offline Support
1. Check-ins queue in IndexedDB when offline
2. Automatic sync when connection restored
3. Test offline behavior by disabling network in DevTools