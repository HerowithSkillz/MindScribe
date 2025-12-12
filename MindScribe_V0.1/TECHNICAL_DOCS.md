# MindScribe - Technical Documentation

## 🏗️ Architecture Overview

MindScribe is a fully client-side web application built with React, utilizing WebLLM for in-browser AI inference and IndexedDB for encrypted local storage.

### Tech Stack

```
Frontend Framework: React 18.3.1
Build Tool: Vite 5.1.0
Styling: Tailwind CSS 3.4.1
Animations: Framer Motion 11.0.0
Routing: React Router DOM 6.22.0
AI Runtime: @mlc-ai/web-llm 0.2.75
Storage: LocalForage 1.10.0
Charts: Recharts 2.12.0
PDF Export: jsPDF 2.5.1
```

### Architecture Layers

```
┌─────────────────────────────────────────────┐
│         React Components (UI Layer)         │
│   Login, Chat, Journal, Dashboard, Report   │
└─────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────┐
│      Context Providers (State Layer)        │
│      AuthContext, WebLLMContext             │
└─────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────┐
│        Services (Business Logic)            │
│  auth.js, webllm.js, voice.js, storage.js  │
└─────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────┐
│         Browser APIs (Platform)             │
│  IndexedDB, WebGPU, Web Crypto, Web Speech  │
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
MindScribe V0.1/
├── public/
│   └── brain-icon.svg          # App icon
├── src/
│   ├── components/             # React components
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   └── Login.jsx           # Auth component
│   ├── contexts/               # React context providers
│   │   ├── AuthContext.jsx    # Authentication state
│   │   └── WebLLMContext.jsx  # AI model state
│   ├── pages/                  # Route pages
│   │   ├── Chat.jsx            # Chat interface
│   │   ├── Journal.jsx         # Journaling page
│   │   ├── Dashboard.jsx       # Analytics dashboard
│   │   └── Report.jsx          # Report generation
│   ├── services/               # Business logic
│   │   ├── auth.js             # Authentication service
│   │   ├── storage.js          # Storage & encryption
│   │   ├── voice.js            # Voice input/output
│   │   └── webllm.js           # AI model service
│   ├── App.jsx                 # Root component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── .eslintrc.cjs               # ESLint config
├── .gitignore                  # Git ignore rules
├── index.html                  # HTML template
├── package.json                # Dependencies
├── postcss.config.cjs          # PostCSS config
├── tailwind.config.js          # Tailwind config
├── vite.config.js              # Vite config
├── README.md                   # Project readme
└── USER_GUIDE.md               # User documentation
```

---

## 🔐 Security Implementation

### Encryption System

**Web Crypto API Implementation**

```javascript
// Key Derivation (PBKDF2)
- Algorithm: PBKDF2
- Hash: SHA-256
- Iterations: 100,000
- Salt: "mindscribe-salt-2025" (should be unique per user in production)

// Encryption (AES-GCM)
- Algorithm: AES-GCM
- Key Length: 256 bits
- IV: Random 12 bytes per encryption
```

**Storage Architecture**

```
IndexedDB Stores:
├── users       # User credentials (encrypted)
├── journals    # Journal entries (encrypted)
├── chats       # Chat messages (encrypted)
├── settings    # App settings (not encrypted)
└── analysis    # Mood analysis data (encrypted)
```

**Authentication Flow**

```
1. User registers/logs in with password
2. Password hashed with SHA-256
3. Encryption key derived from password via PBKDF2
4. Key stored in memory (session only)
5. All user data encrypted with AES-GCM
6. Encrypted data stored in IndexedDB
```

### Security Best Practices

✅ **Implemented**
- Client-side encryption
- Password hashing
- Session management
- No data transmission
- Memory-only key storage

⚠️ **Production Improvements Needed**
- Unique salt per user
- Stronger password requirements
- Rate limiting on login attempts
- Key derivation caching
- Biometric authentication support

---

## 🤖 WebLLM Integration

### Model Configuration

**Current Model**: `Llama-3.2-1B-Instruct-q4f32_1-MLC`

**Why This Model?**
- Lightweight (~900MB)
- Fast inference on consumer hardware
- Good balance of quality and performance
- Optimized for WebGPU
- Suitable for conversational tasks

### Initialization Process

```javascript
1. User logs in
2. WebLLM context initializes
3. Model downloads (first time only)
4. Model compiled for WebGPU
5. Model cached in browser
6. Ready for inference
```

### System Prompt Engineering

The AI uses a carefully crafted system prompt:

```
You are MindScribe, a warm, empathetic, and supportive mental 
health companion. Your role is to:
- Listen actively and respond with genuine empathy
- Ask thoughtful follow-up questions
- Provide encouragement and validation
- Suggest gentle coping strategies when appropriate
- Keep responses concise (2-4 sentences)
- Use a warm, friendly tone
- Respect feelings and never minimize experiences
- Focus on positivity and emotional resilience
```

### API Usage Patterns

**Chat Completion**
```javascript
const response = await webLLMService.chat(
  userMessage,
  conversationHistory,
  onStreamCallback
);
```

**Journal Analysis**
```javascript
const analysis = await webLLMService.analyzeJournal(text);
// Returns: { emotion, sentiment, stress, themes }
```

**Report Generation**
```javascript
const summary = await webLLMService.generateReport(userData);
const recommendations = await webLLMService.generateRecommendations(moodData);
```

### Performance Optimization

- Streaming responses for better UX
- Context caching for repeated queries
- Prompt optimization for concise outputs
- Token limits to control response length
- Memory management for long sessions

---

## 💾 Data Storage

### LocalForage Configuration

```javascript
// Separate stores for different data types
const userStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'users'
});

const journalStore = localforage.createInstance({
  name: 'mindscribe',
  storeName: 'journals'
});
```

### Storage Service API

```javascript
// Save encrypted data
await storage.save(key, value);

// Retrieve decrypted data
const data = await storage.get(key);

// Delete data
await storage.remove(key);

// Get all items
const items = await storage.getAllItems();
```

### Data Models

**User**
```javascript
{
  username: string,
  email: string,
  password: string (hashed),
  createdAt: ISO string,
  lastLogin: ISO string
}
```

**Journal Entry**
```javascript
{
  content: string,
  date: ISO string,
  analysis: {
    emotion: string,
    sentiment: number (0-10),
    stress: 'low' | 'moderate' | 'high',
    themes: string[]
  },
  wordCount: number
}
```

**Chat Message**
```javascript
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: ISO string
}
```

**Analysis Record**
```javascript
{
  entryId: string,
  date: ISO string,
  emotion: string,
  sentiment: number,
  stress: string,
  themes: string[]
}
```

---

## 🎤 Voice Integration

### Web Speech API

**Speech Recognition**
```javascript
const SpeechRecognition = 
  window.SpeechRecognition || 
  window.webkitSpeechRecognition;

recognition.lang = 'en-US';
recognition.continuous = false;
recognition.interimResults = false;
```

**Speech Synthesis**
```javascript
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = 'en-US';
utterance.rate = 0.9;
utterance.pitch = 1.0;
window.speechSynthesis.speak(utterance);
```

### Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Speech Recognition | ✅ | ✅ | ❌ | ⚠️ |
| Speech Synthesis | ✅ | ✅ | ✅ | ✅ |

---

## 📊 Data Visualization

### Recharts Integration

**Chart Types Used**

1. **Line Chart**: Mood trends over time
2. **Pie Chart**: Emotion distribution
3. **Bar Chart**: Stress level breakdown

**Data Processing**

```javascript
// Group by date
const sentimentByDay = entries.reduce((acc, entry) => {
  const date = formatDate(entry.date);
  if (!acc[date]) acc[date] = { date, sentiments: [] };
  acc[date].sentiments.push(entry.sentiment);
  return acc;
}, {});

// Calculate averages
Object.values(sentimentByDay).forEach(day => {
  day.avg = day.sentiments.reduce((a, b) => a + b) / day.sentiments.length;
});
```

---

## 🎨 Styling System

### Tailwind Configuration

**Custom Color Palette**

```javascript
colors: {
  primary: { /* Blue shades */ },
  calm: { /* Purple/lavender shades */ },
  sage: { /* Green/sage shades */ }
}
```

**Custom Components**

```css
.card        - White card with shadow
.btn-primary - Primary button style
.input-field - Text input styling
.chat-message-user - User message bubble
.chat-message-ai - AI message bubble
```

### Animation Strategy

**Framer Motion**
- Page transitions: fade + slide
- Component mounting: opacity + scale
- List items: staggered children
- Loading states: pulse + dots

---

## 🔄 State Management

### React Context Pattern

**AuthContext**
- User authentication state
- Login/logout functions
- Session management
- Encryption key initialization

**WebLLMContext**
- Model initialization state
- Loading progress
- Chat/analysis functions
- Error handling

### Data Flow

```
User Action → Component
           ↓
     Context Hook
           ↓
      Service Layer
           ↓
     Browser API
           ↓
   Storage/WebGPU
           ↓
     Return Data
           ↓
   Update Context
           ↓
  Re-render UI
```

---

## 🚀 Performance Optimization

### Implemented Optimizations

1. **Code Splitting**: React.lazy for route-based splitting
2. **Memoization**: useCallback, useMemo where beneficial
3. **Streaming**: Progressive AI responses
4. **Lazy Loading**: Charts rendered on demand
5. **Virtual Scrolling**: For long chat/journal lists (future)

### Bundle Size Management

```
Vite Configuration:
- Tree shaking enabled
- Minification: esbuild
- CSS purging: Tailwind
- Asset optimization: built-in
```

### WebGPU Optimization

- Model loaded once, cached in memory
- Efficient tensor operations
- GPU acceleration for inference
- Automatic memory management

---

## 🧪 Testing Strategy

### Recommended Tests

**Unit Tests**
- Service functions (auth, storage, encryption)
- Utility functions (date formatting, data processing)
- Validation logic

**Integration Tests**
- Auth flow (register → login → logout)
- Journal CRUD operations
- Chat message handling
- Data visualization rendering

**E2E Tests**
- User registration flow
- Writing and analyzing journal
- Chat conversation flow
- Report generation and export

### Testing Tools (Not Implemented)

Recommended:
- Jest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests
- MSW for API mocking (if needed)

---

## 🔧 Development Workflow

### Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

### Environment Setup

1. Install Node.js 18+
2. Clone repository
3. Run `npm install`
4. Run `npm run dev`
5. Open http://localhost:3000

### Hot Module Replacement

Vite provides instant HMR for:
- React components
- CSS changes
- Config updates

---

## 🐛 Debugging

### Common Issues

**WebGPU Not Available**
```javascript
// Check support
if (!navigator.gpu) {
  console.error('WebGPU not supported');
}
```

**IndexedDB Quota Exceeded**
```javascript
// Monitor storage
navigator.storage.estimate().then(estimate => {
  console.log(`Used: ${estimate.usage / estimate.quota * 100}%`);
});
```

**Model Loading Failures**
- Check network connection
- Verify WebGPU support
- Clear browser cache
- Check console for errors

### Browser DevTools

**Useful Panels**
- Console: Error messages
- Network: Model download progress
- Application: IndexedDB inspection
- Performance: WebGPU profiling

---

## 📦 Deployment

### Static Hosting

MindScribe is a SPA (Single Page Application) and can be hosted on:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static file server

### Build Process

```bash
npm run build
# Outputs to: dist/

# Deploy dist/ folder to hosting service
```

### HTTPS Requirement

⚠️ **Voice features require HTTPS**
- Web Speech API requires secure context
- Use HTTPS in production
- localhost works over HTTP for development

---

## 🔮 Future Enhancements

### Planned Features

1. **Data Export/Import**
   - JSON export of all data
   - Import from backup
   - Cross-device sync (optional)

2. **Advanced Analytics**
   - Correlations between activities and mood
   - Predictive insights
   - Goal tracking

3. **Customization**
   - Theme selection
   - Custom emotions
   - Personalized prompts

4. **Multi-language Support**
   - i18n integration
   - Multi-language models
   - RTL support

5. **Offline PWA**
   - Service worker
   - Full offline capability
   - Install as desktop app

### Technical Debt

- [ ] Add comprehensive error boundaries
- [ ] Implement proper loading states
- [ ] Add unit test coverage
- [ ] Optimize bundle size further
- [ ] Improve accessibility (ARIA labels)
- [ ] Add keyboard shortcuts
- [ ] Implement data migration system
- [ ] Better error messages for users

---

## 📝 Code Style Guide

### Naming Conventions

```javascript
// Components: PascalCase
function ChatMessage() {}

// Functions: camelCase
function formatDate() {}

// Constants: UPPER_SNAKE_CASE
const API_ENDPOINT = '';

// Files: PascalCase for components, camelCase for services
// ChatMessage.jsx, authService.js
```

### Component Structure

```javascript
import statements

Constants/helpers

Component definition
  - Props destructuring
  - Hooks (useState, useEffect, etc.)
  - Event handlers
  - Render logic

export default Component
```

### Best Practices

- Keep components under 300 lines
- Extract complex logic to services
- Use custom hooks for reusable logic
- Meaningful variable names
- Comments for complex algorithms
- PropTypes or TypeScript (future)

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit with descriptive messages
5. Push and create pull request

### Code Review Checklist

- [ ] Code follows style guide
- [ ] No console errors or warnings
- [ ] Responsive design maintained
- [ ] Accessibility considered
- [ ] Performance impact minimal
- [ ] Documentation updated
- [ ] Privacy/security maintained

---

## 📄 License

MIT License - See LICENSE file for full text.

---

## 📞 Support

For technical questions or issues:
1. Check browser console for errors
2. Verify WebGPU support
3. Review this documentation
4. Check GitHub issues
5. Create new issue with details

---

**Built with ❤️ for mental health awareness**

Last Updated: October 2025
Version: 0.1.0
