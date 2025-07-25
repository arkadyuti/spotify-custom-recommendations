# 🎵 Spotify RecoEngine

AI-powered music discovery platform that analyzes your Spotify listening history to generate personalized recommendations using custom multi-strategy algorithms.

## ✨ Features

- **Smart Authentication**: Secure Spotify OAuth integration with MongoDB session persistence
- **Advanced Track Selection**: Browse your top tracks, recently played, and saved music
- **Multi-Strategy AI Recommendations**: Artist-based, genre-based, and keyword-based discovery algorithms
- **Dual Mode Operation**: Independent mode (no user data) or user-based mode (leverages listening history)
- **Playlist Management**: Create new playlists or update existing ones directly in Spotify
- **Beautiful UI**: Modern React interface with glass morphism design and shadcn/ui components
- **Lean Data Storage**: 90%+ storage reduction through optimized data transformation

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- MongoDB database
- Spotify Developer Account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd spotify-recoengine
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Spotify API credentials and MongoDB URI
```

4. Start the development server:
```bash
yarn dev
```

5. Open your browser and navigate to `http://localhost:3005`

## 🛠️ Development

### Available Scripts

- `yarn dev` - Start development server (Express + React)
- `yarn build` - Build for production (frontend + backend)
- `yarn start` - Start production server
- `yarn lint` - Run ESLint

### Project Structure

```
src/
├── backend/
│   ├── auth.ts              # OAuth 2.0 + session management
│   ├── spotify-api.ts       # Spotify Web API client
│   ├── data-collector.ts    # User data collection
│   ├── data-transformer.ts  # Lean data transformation
│   ├── database/           # MongoDB integration
│   ├── engines/            # Recommendation algorithms
│   ├── routes/             # API endpoints
│   └── server.ts           # Express server
├── components/
│   ├── layout/             # Layout components
│   ├── music/              # Music-specific components
│   └── ui/                 # shadcn/ui component library
├── contexts/               # React contexts
├── pages/                  # Application pages
└── services/               # API client
```

## 🎯 Technology Stack

- **Frontend**: React 18 + TypeScript + esbuild
- **Backend**: Express + TypeScript + Node.js
- **Database**: MongoDB with session persistence
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: React Query + Context API
- **Build System**: esbuild for frontend, TypeScript for backend
- **Deployment**: Docker + GitHub Actions

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=your_ngrok_url/auth/callback
SESSION_SECRET=your_secure_session_secret
MONGODB_URI=mongodb://localhost:27017/spotify-recoengine
PORT=3005
NODE_ENV=development
```

### Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add your redirect URI (e.g., `https://your-ngrok-url.ngrok.io/auth/callback`)
4. Copy your Client ID and Client Secret to `.env`

## 🎨 Design System

The application features a sophisticated design system with:

- **Glass Morphism**: Modern translucent design elements
- **Music-Themed Colors**: Custom color palette for music applications
- **Smooth Animations**: CSS transitions and keyframes
- **Responsive Layout**: Mobile-first design approach

## 🚀 Deployment

The project includes Docker configuration and GitHub Actions for automated deployment:

```bash
# Build Docker image
docker build -t spotify:latest .

# Run with Docker Compose
docker compose up -d
```

## 🏗️ Core Architecture

### Single Server Design
- Express server serves both React frontend and API endpoints
- No CORS needed - everything runs on port 3005
- MongoDB session persistence across server restarts
- esbuild for fast frontend compilation

### Recommendation Algorithms
1. **Artist-based discovery** (40% weight user mode, 50% independent)
2. **Genre-based discovery** (30% weight, user mode only)
3. **Keyword-based discovery** (30% weight user mode, 50% independent)

### Data Optimization
- Custom lean data structures storing only essential fields
- 90%+ storage reduction compared to full Spotify objects
- Optimized for performance and reduced memory usage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for music data
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Lucide](https://lucide.dev/) for icons
