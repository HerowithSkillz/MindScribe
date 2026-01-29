# MindScribe Database Schema

## Overview

MindScribe uses a **client-side storage architecture** with no backend server. All data is stored locally in the user's browser using **IndexedDB** (via LocalForage) and **SessionStorage**. This ensures complete privacy and offline functionality.

### Storage Technologies

| Technology | Purpose | Persistence | Encryption |
|------------|---------|-------------|------------|
| **IndexedDB** | Primary data storage (via LocalForage) | Persistent across sessions | AES-256-GCM |
| **SessionStorage** | Temporary session data | Cleared on browser close | None |
| **localStorage** | Model preferences only | Persistent | None |

---

## Database Name: `mindscribe`

**Version:** 7  
**Engine:** IndexedDB (wrapped by LocalForage library)

---

## Storage Architecture

### 1. LocalForage Stores (IndexedDB)

LocalForage creates separate object stores within the `mindscribe` database:

```javascript
Database: mindscribe
├── users          // User accounts and authentication
├── journals       // Journal entries
├── chats          // Chat conversation history
├── settings       // User preferences
├── analysis       // AI analysis results
├── assessments    // DASS-21 assessment results
└── voiceSessions  // Voice therapy session transcripts
```

---

## Store Schemas

### Store 1: `users`

**Purpose:** User account management and authentication  
**Encryption:** ✅ AES-256-GCM  
**Key Structure:** `user_{username}` and `salt_{username}`

#### Data Format

```javascript
// User Account Entry
Key: `user_{username}` (e.g., "user_john_doe")
Value: {
  username: String,          // Unique identifier
  email: String,             // User's email (optional)
  password: String,          // PBKDF2 hashed password (100,000 iterations)
  createdAt: ISO8601String,  // Account creation timestamp
  lastLogin: ISO8601String   // Last login timestamp
}

// User Salt Entry (per-user encryption salt)
Key: `salt_{username}` (e.g., "salt_john_doe")
Value: Array<Number>       // 16-byte salt as array [0-255, ...]
```

#### Security Implementation

- **Password Hashing:** PBKDF2-SHA256 with 100,000 iterations
- **Encryption Salt:** Unique 16-byte salt per user (stored unencrypted)
- **Encryption Key Derivation:** User password + salt → AES-256-GCM key
- **Session Management:** SessionStorage stores current user (cleared on logout)

---

### Store 2: `journals`

**Purpose:** Personal journal entries with AI analysis  
**Encryption:** ✅ AES-256-GCM (user-specific key)  
**Key Structure:** `journal_{username}_{timestamp}`

#### Data Format

```javascript
Key: `journal_{username}_{timestamp}` (e.g., "journal_alice_1738156800000")
Value: {
  content: String,           // Journal entry text (encrypted)
  date: ISO8601String,       // Entry creation date
  wordCount: Number,         // Word count for statistics
  analysis: {                // AI-generated analysis (encrypted)
    emotion: String,         // Primary emotion (e.g., "happy", "anxious")
    sentiment: Number,       // Sentiment score 1-10
    stress: String,          // Stress level ("low", "moderate", "high")
    themes: Array<String>,   // Identified themes (e.g., ["work", "family"])
    summary: String,         // Brief AI-generated summary
    recommendations: Array<String> // Therapeutic recommendations
  }
}
```

#### Example Entry

```javascript
{
  content: "Today was challenging but I managed to complete my tasks...",
  date: "2026-01-29T14:30:00.000Z",
  wordCount: 127,
  analysis: {
    emotion: "stressed",
    sentiment: 4,
    stress: "moderate",
    themes: ["work", "productivity", "self-care"],
    summary: "User experienced stress but demonstrated resilience",
    recommendations: ["Take regular breaks", "Practice mindfulness"]
  }
}
```

---

### Store 3: `chats`

**Purpose:** AI chatbot conversation history  
**Encryption:** ✅ AES-256-GCM  
**Key Structure:** `chat_{username}`

#### Data Format

```javascript
Key: `chat_{username}` (e.g., "chat_john_doe")
Value: Array<Message> // Array of conversation messages

// Message Object
{
  role: String,              // "user" or "assistant"
  content: String,           // Message text (encrypted)
  timestamp: ISO8601String,  // Message timestamp
  model: String              // AI model used (e.g., "Llama-3.2-1B")
}
```

#### Example Chat History

```javascript
[
  {
    role: "user",
    content: "I'm feeling overwhelmed today",
    timestamp: "2026-01-29T10:15:00.000Z",
    model: "Llama-3.2-1B"
  },
  {
    role: "assistant",
    content: "I understand you're feeling overwhelmed. Can you tell me more?",
    timestamp: "2026-01-29T10:15:05.000Z",
    model: "Llama-3.2-1B"
  }
]
```

---

### Store 4: `settings`

**Purpose:** User preferences and application settings  
**Encryption:** ❌ No encryption (non-sensitive data)  
**Key Structure:** `settings_{username}` or specific setting keys

#### Data Format

```javascript
// User-specific settings
Key: `settings_{username}`
Value: {
  theme: String,             // "light" or "dark"
  language: String,          // "en", "es", etc.
  notifications: Boolean,    // Enable notifications
  autoSave: Boolean,         // Auto-save journal entries
  voiceEnabled: Boolean      // Enable voice features
}

// Global settings
Key: "mindscribe_selected_model" (stored in localStorage, not IndexedDB)
Value: String // Selected WebLLM model ID (e.g., "Llama-3.2-1B-Instruct-q4f16_1-MLC")
```

---

### Store 5: `analysis`

**Purpose:** Cached AI analysis results for dashboard  
**Encryption:** ✅ AES-256-GCM  
**Key Structure:** `analysis_{entryId}`

#### Data Format

```javascript
Key: `analysis_{entryId}` (e.g., "analysis_journal_alice_1738156800000")
Value: {
  entryId: String,           // Reference to journal entry
  date: ISO8601String,       // Analysis date
  emotion: String,           // Primary emotion detected
  sentiment: Number,         // Sentiment score 1-10
  stress: String,            // Stress level
  themes: Array<String>,     // Identified themes
  summary: String,           // AI-generated summary
  recommendations: Array<String> // Therapeutic suggestions
}
```

**Note:** Analysis is performed **once** when a journal entry is created/edited. Results are cached to avoid re-running expensive AI analysis.

---

### Store 6: `assessments`

**Purpose:** DASS-21 psychological assessment results  
**Encryption:** ✅ AES-256-GCM  
**Key Structure:** `dass21_{username}`

#### Data Format

```javascript
Key: `dass21_{username}` (e.g., "dass21_john_doe")
Value: {
  date: ISO8601String,       // Assessment completion date
  scores: {
    depression: Number,      // Depression score (0-42)
    anxiety: Number,         // Anxiety score (0-42)
    stress: Number           // Stress score (0-42)
  },
  severity: {
    depression: {
      level: String,         // "Normal", "Mild", "Moderate", "Severe", "Extremely Severe"
      color: String          // UI color indicator
    },
    anxiety: { /* same structure */ },
    stress: { /* same structure */ }
  },
  responses: Object,         // Question ID → Answer mapping (0-3)
  completedAt: ISO8601String // Completion timestamp
}
```

#### DASS-21 Severity Ranges

| Category | Normal | Mild | Moderate | Severe | Extremely Severe |
|----------|--------|------|----------|--------|------------------|
| **Depression** | 0-9 | 10-13 | 14-20 | 21-27 | 28+ |
| **Anxiety** | 0-7 | 8-9 | 10-14 | 15-19 | 20+ |
| **Stress** | 0-14 | 15-18 | 19-25 | 26-33 | 34+ |

---

### Store 7: `voiceSessions`

**Purpose:** Voice therapy session transcripts and metadata  
**Encryption:** ✅ AES-256-GCM (conversation history only)  
**Key Structure:** Auto-incremented ID (keyPath: `id`)  
**Indexes:** `timestamp`, `date`, `userId`

#### Data Format

```javascript
// Object Store Configuration
{
  keyPath: "id",             // Auto-incremented primary key
  autoIncrement: true
}

// Indexes
- timestamp (non-unique)     // For chronological sorting
- date (non-unique)          // For date-based queries (YYYY-MM-DD)
- userId (non-unique)        // For multi-user support

// Session Entry
{
  id: Number,                // Auto-generated ID
  timestamp: ISO8601String,  // Session start time
  date: String,              // Date only (YYYY-MM-DD)
  userId: String,            // User identifier (default: "default")
  duration: Number,          // Session duration in seconds
  messageCount: Number,      // Number of exchanges
  conversationHistory: Array<Message> | EncryptedData, // Conversation (encrypted)
  encrypted: Boolean,        // Encryption status flag
  processingMetrics: {       // Performance metrics
    stt: Number,             // Speech-to-text latency (ms)
    llm: Number,             // LLM generation latency (ms)
    tts: Number              // Text-to-speech latency (ms)
  },
  metadata: {
    vadEnabled: Boolean,     // Voice Activity Detection status
    whisperModel: String,    // Whisper model used (e.g., "base.en")
    piperVoice: String,      // Piper voice used (e.g., "lessac-medium")
    averageLatency: Number   // Average total latency (ms)
  }
}
```

#### Conversation Message Format

```javascript
{
  role: String,              // "user" or "assistant"
  content: String,           // Message text
  timestamp: ISO8601String,  // Message timestamp
  processingTime: Number     // Processing latency (ms)
}
```

---

## Session Storage (Temporary)

### Purpose
Store temporary session data that should not persist after browser close.

### Data Stored

```javascript
// Current User Session
Key: "currentUser"
Value: JSON.stringify({
  username: String,
  email: String
})
```

**Lifecycle:**
- Set: On successful login/registration
- Cleared: On logout or browser close
- Used: Authentication state management

---

## Local Storage (Unencrypted)

### Purpose
Store non-sensitive application preferences.

### Data Stored

```javascript
// Selected WebLLM Model
Key: "mindscribe_selected_model"
Value: String // Model ID (e.g., "Llama-3.2-1B-Instruct-q4f16_1-MLC")
```

**Note:** Used to remember model selection across sessions.

---

## Encryption Implementation

### Encryption Algorithm
**AES-256-GCM** (Galois/Counter Mode)

### Key Derivation

```javascript
// Step 1: Generate user-specific salt (16 bytes)
salt = crypto.getRandomValues(new Uint8Array(16))

// Step 2: Derive encryption key from password + salt
key = PBKDF2(
  password: user_password,
  salt: salt,
  iterations: 100000,
  hash: "SHA-256",
  keyLength: 256 bits
)

// Step 3: Encrypt data with random IV (12 bytes)
iv = crypto.getRandomValues(new Uint8Array(12))
encrypted = AES-GCM-Encrypt(data, key, iv)
```

### Encrypted Data Format

```javascript
{
  iv: Array<Number>,         // 12-byte initialization vector
  data: Array<Number>        // Encrypted data bytes
}
```

### Stores with Encryption

| Store | Encrypted | Reason |
|-------|-----------|--------|
| `users` | ✅ | Contains sensitive account data |
| `journals` | ✅ | Private mental health entries |
| `chats` | ✅ | Private conversations |
| `settings` | ❌ | Non-sensitive preferences |
| `analysis` | ✅ | Mental health analysis |
| `assessments` | ✅ | Psychological assessment data |
| `voiceSessions` | ✅ | Private therapy transcripts |

---

## Data Access Patterns

### User Registration Flow

```javascript
1. Generate unique salt for user
2. Store salt: `salt_{username}` → [salt bytes]
3. Hash password with PBKDF2
4. Store user: `user_{username}` → {username, email, hashedPassword, ...}
5. Initialize encryption keys for all encrypted stores
```

### User Login Flow

```javascript
1. Retrieve user's salt: `salt_{username}`
2. Derive encryption key from password + salt
3. Set encryption keys for: journals, chats, analysis, assessments
4. Verify password hash
5. Store session in SessionStorage
```

### Journal Entry Creation

```javascript
1. User writes journal entry
2. AI analyzes content (WebLLM)
3. Encrypt entry content and analysis
4. Save to journals: `journal_{username}_{timestamp}`
5. Cache analysis: `analysis_{journal_id}`
```

### Voice Session Workflow

```javascript
1. User starts voice session
2. Record audio → Whisper STT → Transcription
3. Send to WebLLM → Generate response
4. Piper TTS → Synthesize speech
5. Save session to voiceSessions store with metrics
6. Encrypt conversation history if encryption key available
```

---

## Storage Limits

### Browser Quotas

| Browser | IndexedDB Limit | Notes |
|---------|----------------|-------|
| Chrome | 60% of available disk | Dynamic quota |
| Firefox | 50% of available disk | Dynamic quota |
| Safari | 1 GB | Fixed limit |
| Edge | 60% of available disk | Dynamic quota |

### Recommended Data Management

- **Voice Sessions:** ~1-2 MB per hour (transcripts only)
- **Journal Entries:** ~1-5 KB per entry
- **Chat History:** ~100-500 KB per user
- **AI Models:** 1-2 GB (cached separately, not in IndexedDB)

**Best Practice:** Implement data pruning for old sessions after 90 days.

---

## Data Export/Import

### Voice Session Export

```javascript
// Export format
{
  exportedAt: ISO8601String,
  sessions: Array<VoiceSession>
}

// Import
voiceSessionStorage.importSessions(jsonData)
```

### User Data Portability

All data can be exported as JSON for:
- **Backup:** User data protection
- **Migration:** Transfer to another device
- **Analysis:** External tools integration

---

## Security Considerations

### ✅ Implemented Security Measures

1. **Unique per-user salt** - Prevents rainbow table attacks
2. **PBKDF2 with 100,000 iterations** - Slows brute-force attacks
3. **AES-256-GCM encryption** - Industry-standard encryption
4. **Random IVs** - Ensures unique ciphertext for identical plaintext
5. **Client-side only** - No data sent to servers

### ⚠️ Limitations

1. **Browser storage accessible** - User can view raw IndexedDB data
2. **Password-based encryption** - Security depends on strong passwords
3. **No key rotation** - Password change requires re-encryption
4. **No backup mechanism** - Data loss if IndexedDB cleared

### 🔒 Recommendations

- **Use strong passwords** - Minimum 12 characters
- **Regular exports** - Backup important data
- **Private browsing** - Avoid on shared devices
- **Browser security** - Keep browser updated

---

## Query Examples

### Get all journal entries for user

```javascript
const allEntries = await journalStorage.getAllItems();
const userEntries = allEntries
  .filter(item => item.key.startsWith(`journal_${username}_`))
  .map(item => ({ id: item.key, ...item.value }));
```

### Get voice sessions for date range

```javascript
const sessions = await voiceSessionStorage.getSessionsByDateRange(
  '2026-01-01',
  '2026-01-31'
);
```

### Get latest DASS-21 assessment

```javascript
const assessment = await assessmentStorage.get(`dass21_${username}`);
```

### Get chat history

```javascript
const chatHistory = await chatStorage.get(`chat_${username}`);
```

---

## Maintenance & Cleanup

### Clear User Data on Logout

```javascript
// Clear encryption keys (data stays encrypted)
journalStorage.encryptionKey = null;
chatStorage.encryptionKey = null;
analysisStorage.encryptionKey = null;
assessmentStorage.encryptionKey = null;

// Clear session
sessionStorage.removeItem('currentUser');
```

### Delete All User Data

```javascript
// Remove all entries for user
await journalStorage.clear();
await chatStorage.remove(`chat_${username}`);
await assessmentStorage.remove(`dass21_${username}`);
await voiceSessionStorage.deleteAllSessions();
```

### Database Version Migration

IndexedDB version is incremented when schema changes (currently v7). Migration logic in `voiceSessionStorage.js` handles upgrades.

---

## Development Tools

### Inspect IndexedDB in Browser

**Chrome/Edge:**
1. Open DevTools (F12)
2. Navigate to: Application → Storage → IndexedDB → mindscribe

**Firefox:**
1. Open DevTools (F12)
2. Navigate to: Storage → IndexedDB → mindscribe

**Safari:**
1. Enable Developer Menu: Preferences → Advanced → Show Develop menu
2. Develop → Show Web Inspector → Storage → IndexedDB

### Clear All Data (Testing)

```javascript
// Open browser console and run:
await indexedDB.deleteDatabase('mindscribe');
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## Future Enhancements

### Planned Improvements

1. **Data Compression** - Reduce storage footprint for large sessions
2. **Automatic Backups** - Cloud sync option (encrypted)
3. **Multi-device Sync** - Share data across devices
4. **Key Rotation** - Periodic encryption key updates
5. **Quota Management** - Automatic old data pruning
6. **Offline Indicators** - Show storage usage to users

---

## Summary

MindScribe's storage architecture prioritizes:

- ✅ **Privacy:** All data encrypted with user-specific keys
- ✅ **Offline-First:** Full functionality without internet
- ✅ **Performance:** Indexed queries for fast access
- ✅ **Security:** Modern encryption standards (AES-256-GCM)
- ✅ **Portability:** JSON export/import for data mobility

**Total Storage Footprint:** ~10-50 MB per active user (excluding AI models)

---

*Last Updated: January 29, 2026*  
*Schema Version: 7*  
*Documentation: Complete*
