# MindScribe - User Guide

## 🎯 Getting Started

### First Launch

1. **Open the application** at `http://localhost:3000`
2. **Create your account**:
   - Click "Register" tab
   - Enter a unique username
   - Enter a password (minimum 6 characters)
   - Optionally add an email
   - Click "Create Account"

3. **Wait for AI model to load** (first time only):
   - The AI model (~900MB) will download automatically
   - This takes 1-2 minutes depending on your internet speed
   - Progress bar shows the download status
   - Model is cached in your browser for future use

4. **Start using MindScribe!**
   - Once logged in, you'll see the Chat page
   - Navigate between pages using the top menu

---

## 💬 Chat Feature

### Basic Chat
- Type your message in the input field
- Press Enter or click "Send" to send your message
- The AI companion will respond with empathy and support
- Messages are saved automatically

### Voice Input
- Click the 🎤 microphone button
- Speak your message clearly
- Click microphone again to stop recording
- Your speech will be converted to text

### Voice Output
- Toggle "Voice On/Off" button in top-right
- When enabled, AI responses will be read aloud
- Great for hands-free interaction

### Tips
- Be honest about your feelings
- Ask follow-up questions
- The AI is trained to be supportive and non-judgmental
- Chat history is saved locally and encrypted

---

## 📝 Journal Feature

### Writing an Entry
1. Click "Journal" in the top navigation
2. Type your thoughts in the large text area
3. Click "Save Entry" when done
4. The AI will automatically analyze your entry for:
   - Primary emotion (happy, sad, anxious, etc.)
   - Sentiment score (0-10 scale)
   - Stress level (low, moderate, high)
   - Key themes

### Viewing Entries
- All your entries appear below the writing area
- Each entry shows:
  - Date and time
  - Detected emotion (with emoji)
  - Sentiment score
  - Stress level
  - Preview of content
  - Theme tags

### Editing Entries
1. Click "Edit" on any entry
2. Content loads into the editor
3. Make your changes
4. Click "Update Entry"

### Deleting Entries
1. Click "Delete" on any entry
2. Confirm deletion
3. Entry and its analysis are removed

---

## 📊 Dashboard Feature

### Overview Cards
- **Journal Entries**: Total number of entries in selected timeframe
- **Average Mood**: Your overall sentiment score
- **Most Common Emotion**: Your predominant emotional state

### Mood Trend Chart
- Line graph showing sentiment scores over time
- See how your mood changes day by day
- Identify patterns and triggers

### Emotion Distribution
- Pie chart showing breakdown of all emotions
- Understand your emotional patterns
- See which emotions are most frequent

### Stress Levels
- Bar chart showing low, moderate, and high stress days
- Track your stress management progress

### Time Range Selection
- Choose from: Last 7 days, 30 days, 90 days, or 1 year
- Dashboard updates automatically

---

## 📋 Report Feature

### Generating Reports

1. Click "Report" in navigation
2. System automatically analyzes your data:
   - Journal entry count
   - Average mood score
   - Top emotions
   - Stress distribution
   - Date range covered

3. Click "Generate AI Analysis" (if not auto-generated)
4. Wait for AI to create:
   - Personalized summary
   - Self-care recommendations

### Understanding Your Report

**Overview Section**
- Quick statistics about your mental health journey
- Summary of emotional patterns

**AI Analysis**
- 2-3 paragraph summary of your mental state
- Insights about emotional trends
- Compassionate observations

**Self-Care Recommendations**
- 3 specific, actionable suggestions
- Based on your mood patterns
- Tailored to your stress levels

### Exporting Reports

1. Click "Export to PDF" button
2. PDF is generated with:
   - All statistics
   - AI analysis
   - Recommendations
   - Privacy disclaimer
3. Save PDF to your device
4. Share with therapist or keep for personal records

---

## 🔒 Privacy & Security

### Data Storage
- All data stored in browser's IndexedDB
- Encrypted with your password using AES-256
- No cloud storage or external servers
- No tracking or analytics

### What's Stored Locally
- User credentials (encrypted)
- Chat messages (encrypted)
- Journal entries (encrypted)
- Analysis data (encrypted)
- AI model cache (for performance)

### Clearing Data
To completely remove all data:
1. Use browser's "Clear site data" feature
2. Or delete IndexedDB for localhost:3000
3. This will remove everything permanently

### Security Best Practices
- Use a strong password
- Don't share your account
- Keep browser updated
- Regular backups (export reports)

---

## 🎨 Accessibility Features

### Keyboard Navigation
- Tab: Move between elements
- Enter: Submit forms/send messages
- Escape: Cancel actions

### Voice Features
- Voice input for those with typing difficulties
- Voice output for visual accessibility
- Adjustable speech rate (in browser settings)

### Visual Design
- High contrast text
- Clear, readable fonts
- Responsive design for all screen sizes
- Color-blind friendly visualizations

---

## 🔧 Troubleshooting

### AI Model Not Loading
**Problem**: Model download stuck or failed
**Solutions**:
- Check internet connection
- Clear browser cache
- Try a different browser (Chrome/Edge recommended)
- Ensure WebGPU is enabled in browser

### Voice Input Not Working
**Problem**: Microphone button doesn't work
**Solutions**:
- Grant microphone permissions
- Check browser compatibility (Chrome/Edge recommended)
- Use HTTPS (may not work on HTTP)
- Test microphone in other apps

### Slow Performance
**Problem**: App is laggy or slow
**Solutions**:
- Close unnecessary browser tabs
- Ensure 4GB+ RAM available
- Wait for model to fully load
- Clear old journal entries if too many

### Data Not Saving
**Problem**: Entries/chats not persisting
**Solutions**:
- Check browser storage quota
- Ensure IndexedDB is enabled
- Don't use private/incognito mode
- Check browser console for errors

### Can't Login
**Problem**: "Invalid username or password"
**Solutions**:
- Verify correct username (case-sensitive)
- Ensure correct password
- Try registering a new account
- Clear browser cache if issues persist

---

## 💡 Tips for Best Results

### Journaling
- Write regularly (daily if possible)
- Be honest and open
- Don't worry about grammar or structure
- Include both positive and negative experiences
- Reflect on what triggered emotions

### Chatting
- Start with how you're feeling today
- Ask specific questions
- Share context about situations
- Follow up on previous conversations
- Be patient with AI responses

### Using Insights
- Review dashboard weekly
- Look for patterns in emotions
- Notice stress triggers
- Celebrate positive trends
- Export reports monthly for long-term tracking

### Mental Health
- MindScribe is a tool, not a replacement for therapy
- Seek professional help for serious concerns
- Use insights to inform therapy discussions
- Practice recommended self-care activities
- Be kind to yourself

---

## 📞 Need More Help?

### Browser Requirements
- Chrome 113+ or Edge 113+ (WebGPU support required)
- 4GB+ RAM recommended
- Modern graphics card (for WebGPU)
- Stable internet for first-time model download

### Known Limitations
- AI model works best in English
- Responses may occasionally be generic
- Analysis accuracy depends on entry length
- Large datasets may slow down visualizations

### Privacy Reminder
🔒 **Your data never leaves your device**
- No account on our servers
- No data transmission
- No cookies or tracking
- Completely offline after model download

---

## 🌟 Feature Highlights

✨ **What Makes MindScribe Special**

1. **Completely Private**: Your mental health data stays on your device
2. **Offline Capable**: Works without internet after initial setup
3. **AI-Powered**: Advanced emotion detection and personalized insights
4. **Voice Enabled**: Natural conversations with voice input/output
5. **Beautiful Design**: Calming colors and smooth animations
6. **Export Ready**: Share reports with healthcare providers
7. **Zero Cost**: No subscriptions, no hidden fees
8. **Open Source**: Transparent, trustworthy, and customizable

---

**Remember**: You're taking an important step in your mental health journey. Be patient with yourself and use MindScribe as a tool for self-reflection and growth. 💜

For technical issues, check the browser console (F12) for error messages.
