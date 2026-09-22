# VoxaBoard - AAC Communication App

A modern Augmentative and Alternative Communication (AAC) application built with Next.js, TypeScript, and Tailwind CSS. This app helps individuals with communication difficulties express themselves through visual cards and text-to-speech functionality.

This repo is the web app: the card board itself, plus the vendor/admin side (creating `Location`s, generating their QR codes and FAQ lists). A companion Android app, [Voxaboard Mobile](../SBXDynamics/voxaboard-mobile), scans those QR codes to build an on-device vocabulary board — see that repo's README for its side of the architecture.

## Architecture

### Vendor / location flow
A vendor creates a `Location` with free-text `instructions` (e.g. "Pay before you consume. No pets are allowed."). At creation time, the server calls **Gemini** once (`src/lib/faqGenerationService.ts`) to turn those instructions into a short list of concrete questions an AAC user might want to ask on-site — not a literal restatement of each rule, but questions inferred from the *topic* each rule raises (Gricean implicature, not extractive question generation): "No pets allowed" generates not just "Can I bring my pet?" but genuinely useful practical follow-ups like "Is a dog walker provided?" and "Are service animals allowed?", while "Please don't spit in the sink" generates "Where can I spit?" rather than mirroring the restriction as a permission question nobody would actually ask. The vendor's location page renders a QR code (just the location's UUID) that the mobile app scans to fetch this list.

### Gemini touchpoints (all server-side; the API key never leaves this server)
- **FAQ generation** (`src/lib/faqGenerationService.ts`) — once per location, at creation (or on manual regenerate).
- **Word explanation** (`src/lib/wordExplanationService.ts`, `POST /api/vocabulary/explain`) — on-demand, called by the mobile app only when its own on-device matching finds a genuinely new word with no match on the user's board. Requires a logged-in mobile user (see Auth below) since this is the one endpoint that costs a real API call per request.
- **`/api/interpret`** — unrelated promotion-phrase decomposition feature, requires a web session.

### Auth: two independent systems
- **Web session** (`src/lib/session.ts`) — Google OAuth only, no passwords. A stateless HMAC-signed cookie with **no server-side record** — it can expire but can't be revoked before that. Used for the vendor dashboard and `/api/interpret`.
- **Mobile JWT + refresh token** (`src/lib/mobileAuth.ts`, `src/lib/mobileAuthDatabase.ts`, `src/app/api/auth/mobile/*`) — built specifically for the mobile app, and the first genuinely *revocable* auth in this project. The mobile app hands off to this same Google login in a system browser (PKCE, `client=mobile`), gets a short-lived one-time code back via a verified Android App Link (`public/.well-known/assetlinks.json`) or a custom-scheme fallback for local dev, and exchanges it for a short-lived JWT access token plus a long-lived, revocable refresh token (hashed at rest in its own SQLite file, `data/mobile_auth.db`). Logging out — or an admin revoking a lost device — deletes that refresh-token row, which takes effect on the device's next refresh attempt.

## Features

### 🗣️ Communication Cards
- **Pre-built Cards**: Includes essential communication cards like greetings, politeness, needs, and emergency responses
- **Custom Cards**: Add your own cards with custom text, symbols (emojis), categories, and colors
- **Category Filtering**: Filter cards by category (Greetings, Politeness, Needs, Emergency, Responses, etc.)
- **Visual Design**: Color-coded cards with emoji symbols for easy recognition

### 📝 Sentence Building
- **Drag & Drop Interface**: Tap cards to build sentences
- **Visual Sentence Builder**: See your message being built in real-time
- **Easy Editing**: Remove individual words from your sentence
- **Clear Function**: Reset your sentence with one click

### 🔊 Text-to-Speech
- **Audio Output**: Built-in speech synthesis to speak your sentences
- **Accessible Design**: Large, easy-to-tap interface suitable for all users
- **Rate Control**: Optimized speech rate for better understanding

### 🎨 User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **View Modes**: Switch between grid and list view
- **Modern UI**: Clean, accessible design with smooth animations
- **Color Coding**: Different colors for different card categories

### ⚙️ Card Management
- **Add New Cards**: Create custom communication cards
- **Edit Existing Cards**: Modify text, symbols, categories, and colors
- **Delete Cards**: Remove cards you no longer need
- **Category Organization**: Organize cards into meaningful categories

## Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Web Speech API** - Built-in text-to-speech functionality
- **SQLite** - Default server-side database (better-sqlite3) — separate files per domain: cards, locations, users, and mobile auth
- **PostgreSQL** - Optional production database with migration support
- **Google OAuth** - Sign-in for both the vendor dashboard (session cookie) and the mobile app (JWT + refresh token)
- **`jose`** - JWT signing/verification for the mobile app's access tokens
- **Gemini API** (`gemini-2.5-flash`) - Location FAQ generation and on-demand word explanations, called server-side only

## Database Configuration

VoxaBoard supports both SQLite (default) and PostgreSQL databases with easy migration between them.

### Default (SQLite)
No configuration required. Uses `./data/voxaboard.db` by default.

### PostgreSQL
Set the `DATABASE_URL` environment variable:
```bash
DATABASE_URL=postgres://username:password@localhost:5432/voxaboard
```

### Migration
```bash
# Migrate from SQLite to PostgreSQL
npm run migrate sqlite-to-postgresql ./data/voxaboard.db postgres://user:pass@localhost:5432/voxaboard

# Export/Import data
npm run migrate export-json ./backup/cards.json
npm run migrate import-json ./backup/cards.json
```

See [DATABASE.md](./DATABASE.md) for detailed configuration and migration instructions.

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional, for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VoxaBoard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Configuration

VoxaBoard supports multiple database backends with automatic fallback:

### Local Development
- **SQLite** - File-based database (`./data/voxaboard.db`)
- **Persistent storage** - Data saved to disk
- **No configuration required**

### Vercel Production
- **In-memory database** - Data resets between function calls
- **Default cards** - Always starts with pre-built communication cards
- **No configuration required**

### PostgreSQL Production (Recommended)
- **Persistent storage** - Data permanently saved
- **Set environment variable**: `DATABASE_URL=postgres://user:pass@host:port/db`
- **Migration support** - Easy data migration from SQLite

### ⚠️ Vendor/location/mobile-auth data is a SEPARATE set of SQLite files with no Postgres support yet
The `DATABASE_URL`/PostgreSQL setup above only covers the original cards database (`./data/voxaboard.db`). The vendor-facing features added later — locations (`locations.db`), users/Google auth (`users.db`), and the mobile app's JWT refresh tokens (`mobile_auth.db`) — are **separate SQLite files** with **no hosted-database option built yet**. Each only supports being pointed at an alternate file path via env var (`LOCATIONS_SQLITE_PATH`, `USERS_SQLITE_PATH`, `MOBILE_AUTH_SQLITE_PATH`), not a different backend entirely.

**On Vercel, this matters a lot**: the filesystem is read-only except for `/tmp`, and `/tmp` is **not persistent** — it doesn't survive cold starts, scale-events, or redeploys, and isn't shared across concurrent instances. Pointing these env vars at `/tmp/*.db` makes the app *start* (no more filesystem-write crash), but user accounts, vendor locations, and — notably — revoked mobile refresh tokens can silently vanish or reappear depending on which instance handles a given request. This is a known, accepted stopgap for demo/staging use, **not** safe for real user data. The real fix is migrating these three files to a hosted database (the same `DATABASE_URL` Postgres instance used for cards would work, or a separate one) — not yet done.

```bash
# Stopgap only — see the warning above before using this in anything but a demo
LOCATIONS_SQLITE_PATH=/tmp/locations.db
USERS_SQLITE_PATH=/tmp/users.db
MOBILE_AUTH_SQLITE_PATH=/tmp/mobile_auth.db
```

### Environment Variables

```bash
# Use PostgreSQL (recommended for production)
DATABASE_URL=postgres://username:password@host:port/database

# Vercel automatically uses in-memory database
# No additional configuration needed

# Gemini API — FAQ generation and word-explanation features (server-side only, never exposed to clients)
GEMINI_API_KEY=

# Google OAuth — required for both the vendor dashboard and the mobile app's login flow
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: secret for the web session cookie. Falls back to GOOGLE_CLIENT_SECRET if unset.
SESSION_SECRET=

# Required for the mobile app's JWT access tokens — keep separate from SESSION_SECRET
MOBILE_JWT_SECRET=

# Comma-separated Google account emails with super-admin access
SUPER_ADMIN_EMAILS=
```

See [DATABASE_DEPLOYMENT.md](./DATABASE_DEPLOYMENT.md) for detailed deployment information.

## Usage

### Building a Message
1. Browse the communication cards
2. Tap on cards to add them to your sentence
3. Use the "Speak" button to hear your message
4. Use the "Clear" button to start over

### Managing Cards
1. Click "Add Card" to create new communication cards
2. Hover over existing cards to see edit/delete options
3. Use the category filter to find specific types of cards
4. Switch between grid and list view using the view toggle

### Customization
- Add your own emojis and symbols
- Create custom categories
- Choose from predefined color schemes
- Organize cards by your specific needs

## Accessibility Features

- **Large Touch Targets**: Cards are designed for easy tapping
- **High Contrast**: Clear visual distinction between elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Semantic HTML structure
- **Visual Feedback**: Clear hover and selection states

## Browser Support

- Chrome/Chromium 33+
- Firefox 49+
- Safari 14+
- Edge 79+

*Note: Text-to-speech functionality requires browser support for the Web Speech API*

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support, feature requests, or bug reports, please open an issue on GitHub.

---

**VoxaBoard** - Empowering communication through technology 🌟