# VocaTrail - AAC Communication App

A modern Augmentative and Alternative Communication (AAC) application built with Next.js, TypeScript, and Tailwind CSS. This app helps individuals with communication difficulties express themselves through visual cards and text-to-speech functionality.

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
- **SQLite** - Default server-side database (better-sqlite3)
- **PostgreSQL** - Optional production database with migration support

## Database Configuration

VocaTrail supports both SQLite (default) and PostgreSQL databases with easy migration between them.

### Default (SQLite)
No configuration required. Uses `./data/vocatrail.db` by default.

### PostgreSQL
Set the `DATABASE_URL` environment variable:
```bash
DATABASE_URL=postgres://username:password@localhost:5432/vocatrail
```

### Migration
```bash
# Migrate from SQLite to PostgreSQL
npm run migrate sqlite-to-postgresql ./data/vocatrail.db postgres://user:pass@localhost:5432/vocatrail

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
cd VocaTrail
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

VocaTrail supports multiple database backends with automatic fallback:

### Local Development
- **SQLite** - File-based database (`./data/vocatrail.db`)
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

### Environment Variables

```bash
# Use PostgreSQL (recommended for production)
DATABASE_URL=postgres://username:password@host:port/database

# Vercel automatically uses in-memory database
# No additional configuration needed
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

**VocaTrail** - Empowering communication through technology 🌟