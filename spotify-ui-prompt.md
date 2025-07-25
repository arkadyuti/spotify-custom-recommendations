# UI Design Prompt for Spotify Custom Recommendations

## Project Overview
Build a modern, responsive web interface for a Spotify music recommendation application. This is a UI-only implementation - no backend logic required. The design should be clean, intuitive, and optimized for music discovery.

## Design Requirements

### Visual Style
- **Theme**: Modern Spotify-inspired design with dark/light mode support
- **Colors**: Primary green (#1db954), dark backgrounds, clean whites
- **Typography**: Clean, readable fonts (Inter, SF Pro, or similar)
- **Icons**: Music-themed icons (play, pause, heart, playlist, etc.)
- **Layout**: Responsive grid system, mobile-first approach

### Key Pages/Views

## 1. Landing/Home Page
**Layout**: Split-screen design
- **Left Panel**: Authentication status and quick actions
- **Right Sidebar**: User music profile summary (when logged in)
- **Header**: App title "🎵 Spotify Recommendation Engine"
- **Components**:
  - Login button (prominent, Spotify green)
  - User profile card (avatar, name, stats)
  - Quick stats: track counts, top genres, recent activity
  - Action buttons: "Sync Data", "Get Recommendations"

## 2. Track Selection Interface
**Layout**: Two-column layout
- **Left Panel**: Track selection with categories
- **Right Panel**: Settings and controls

### Left Panel - Track Selector:
- **Category tabs**: "Top Tracks - 4 Weeks", "Top Tracks - 6 Months", "Recently Played", "Saved Tracks"
- **Bulk controls**: "Select All" / "None" per category
- **Track items**: Checkbox + album art + track name + artist + popularity bar
- **Selection counter**: "X tracks selected" with visual indicator
- **Search/filter**: Quick filter within tracks

### Right Panel - Settings:
- **Recommendation count**: Dropdown (10, 20, 30, 50 tracks)
- **Playlist URL input**: Text field for Spotify playlist URL
- **Generate button**: Large, prominent CTA button
- **Tips section**: Usage guidelines and recommendations

## 3. Recommendations Display
**Layout**: Full-width results section
- **Header**: "🎯 Your Custom Recommendations" with metadata
- **Track list**: Grid/list view toggle
- **Each track item**:
  - Album artwork thumbnail
  - Track name (clickable to Spotify)
  - Artist name
  - Album name
  - Duration, popularity score
  - Preview play button (if available)
  - Custom relevance score

### Playlist Management Section:
- **Create new playlist**: Name input + create button
- **Update existing**: URL input + replace button
- **Success states**: Confirmation with Spotify link

## 4. Loading States
- **Data sync**: Progress bar with status messages
- **Recommendation generation**: Animated music-themed loader
- **Playlist operations**: Button loading states

## Interactive Components

### Track Selection Cards
```
┌─────────────────────────────────────┐
│ ☐ [Album Art] Track Name            │
│              by Artist Name         │
│              ████████░░ 78% popular │
└─────────────────────────────────────┘
```

### Recommendation Cards
```
┌─────────────────────────────────────┐
│ [Album Art] Track Name        [▶️]   │
│            Artist • Album           │
│            3:24 • 85% • Score: 0.9  │
│            [🎵 Preview] [🔗 Spotify] │
└─────────────────────────────────────┘
```

### Navigation Elements
- **Breadcrumb**: Home → Recommendations → Results
- **Progress indicator**: Step-by-step flow visualization
- **Back buttons**: Clear navigation between sections

## Responsive Design Requirements

### Desktop (1200px+)
- Two-column layout for track selection
- Side-by-side panels
- Larger album artwork
- Extended metadata display

### Tablet (768px-1199px)
- Stacked panels
- Collapsible sidebar content
- Touch-optimized controls

### Mobile (< 768px)
- Single column layout
- Swipe gestures for categories
- Bottom sheet for settings
- Larger touch targets

## User Experience Features

### Interactive Elements
- **Hover effects**: Subtle animations on cards and buttons
- **Selection feedback**: Visual confirmation when tracks selected
- **Progress indicators**: Show loading states clearly
- **Success animations**: Celebrate completed actions
- **Error states**: Clear error messages with retry options

### Accessibility
- **Keyboard navigation**: Tab through all interactive elements
- **Screen reader support**: Proper ARIA labels
- **Color contrast**: WCAG AA compliance
- **Focus indicators**: Clear visual focus states

## Data Display Components

### Music Profile Sidebar
```
┌─────────────────────────────────┐
│ 📊 Your Music Profile           │
│                                 │
│ 👤 John Doe (US)               │
│                                 │
│ 📈 Library Stats:              │
│ • Top Tracks: 150              │
│ • Top Artists: 75              │
│ • Recently Played: 50          │
│ • Saved Tracks: 500            │
│                                 │
│ 🎵 Top Genres:                 │
│ • indie rock (45)              │
│ • alternative (32)             │
│ • pop (28)                     │
│                                 │
│ 🎤 Recent Plays:               │
│ • Song 1 by Artist A           │
│ • Song 2 by Artist B           │
│                                 │
│ Last updated: 2 hours ago      │
└─────────────────────────────────┘
```

### Stats Dashboard
- **Circular progress**: Show completion percentages
- **Mini charts**: Simple bar/pie charts for genre distribution
- **Activity timeline**: Recent listening activity
- **Comparison metrics**: vs. previous periods

## Error & Empty States

### No Data States
- **No tracks selected**: Helpful illustration + guidance
- **No recommendations**: Retry button with suggestions
- **Empty playlist**: Create first playlist prompt

### Error States
- **Authentication failed**: Clear retry button
- **API errors**: User-friendly error messages
- **Network issues**: Offline indicator

## Animation & Micro-interactions

### Loading Animations
- **Skeleton screens**: For loading track lists
- **Pulse effects**: For loading cards
- **Music visualizer**: Animated bars during generation
- **Spotify-style**: Green pulse effects

### Transitions
- **Smooth page transitions**: Between sections
- **Card animations**: Hover and selection states
- **Button feedback**: Press and success states
- **Modal animations**: Slide-in/fade effects

## Component Library Needs

### Buttons
- Primary (Spotify green)
- Secondary (gray/outline)
- Danger (red for destructive actions)
- Loading states with spinners

### Form Elements
- Text inputs with validation
- Dropdowns/selects
- Checkboxes (music-themed)
- Toggle switches

### Layout Components
- Grid system
- Card containers
- Modal/dialog boxes
- Sidebar panels

### Music-Specific Components
- Track list items
- Album art display
- Popularity bars
- Play/pause buttons
- Volume controls (future)

## Technical Specifications

### Framework Preferences
- React/Next.js components preferred
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI for accessible components

### Asset Requirements
- SVG icons for scalability
- Placeholder images for missing album art
- Loading spinners and animations
- Spotify brand-compliant colors

### Performance Considerations
- Lazy loading for track lists
- Virtual scrolling for large lists
- Image optimization
- Smooth 60fps animations

## Content & Copy

### Microcopy
- Button labels: "Sync My Data", "Get Recommendations", "Create Playlist"
- Status messages: "Analyzing your music taste...", "Finding similar tracks..."
- Success messages: "Playlist updated with 20 new tracks!"
- Tips: "Select 5-15 tracks for best results", "Mix different genres for variety"

### Placeholder Content
- Sample track names and artists
- Demo user profile data
- Example recommendation results
- Mock playlist names

## Integration Points (UI Only)

### Data Binding Areas
- User profile information
- Track lists with metadata
- Recommendation results
- Playlist operation status
- Loading/error states

### Action Triggers
- Login/logout buttons
- Track selection checkboxes
- Generate recommendations button
- Playlist management actions
- Settings updates

This UI should feel modern, intuitive, and music-focused while being completely functional for demonstration purposes with mock data. The design should inspire confidence in the recommendation system and make music discovery feel effortless and enjoyable.