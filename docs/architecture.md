# PANTAU Architecture

## Data Flow

```
Screen (UI Layer)
    ↓
Hook (Custom hooks — useSearch, useMonitor, useNote)
    ↓
Context (AppContext — state management)
    ↓
Repository (Single source of truth)
    ├── UserRepository
    ├── MonitorRepository
    ├── NoteRepository
    ├── SettingsRepository
    └── SyncRepository
        ↓
API Client / AsyncStorage
    ├── Cloudflare Worker (online)
    └── AsyncStorage (offline)
        ↓
Cloudflare D1 (SQLite)
```

## Directory Structure

```
pantau/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout + splash
│   ├── onboarding/         # First-run setup
│   └── (tabs)/             # Main navigation
│       ├── index.tsx       # Beranda
│       ├── pantau.tsx      # Monitors
│       ├── catatan.tsx     # Notes
│       └── profil.tsx      # Profile
├── src/
│   ├── api/                # API Client (Cloudflare)
│   ├── components/         # Reusable UI components
│   ├── config/             # Configuration & constants
│   ├── context/            # React Context (state)
│   ├── engine/             # Core engines
│   │   ├── monitoring/     # Monitor implementations
│   │   └── plugins/        # Provider plugin system
│   ├── hooks/              # Custom React hooks
│   ├── native/             # Android native integrations
│   ├── repository/         # Data access layer
│   ├── services/           # Service layer
│   ├── storage/            # AsyncStorage persistence
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utilities
└── worker/                 # Cloudflare Worker
    ├── src/index.mjs       # API endpoints
    └── migrations/         # Database schema
```

## Key Patterns

- **Offline-first**: AsyncStorage is primary store, D1 is backup
- **Provider-agnostic AI**: Switch between NVIDIA, OpenAI, Gemini via config
- **Plugin architecture**: All data providers are pluggable
- **Repository pattern**: Single entry point for all data operations
- **Observability**: All services through Logger, Analytics, Performance interfaces
