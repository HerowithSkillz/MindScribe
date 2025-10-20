# Quick Start Guide - MindScribe

## ⚡ 5-Minute Setup

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Chrome 113+ or Edge 113+ browser
- ✅ 4GB+ available RAM
- ✅ Internet connection (for first-time model download)

### Installation Steps

#### Step 1: Navigate to Project
```bash
cd "e:\Work\Web development\personal_git_maintained_proj\MindScribe V0.1"
```

#### Step 2: Install Dependencies (Already Done!)
```bash
npm install
```

#### Step 3: Start Development Server (Already Running!)
```bash
npm run dev
```

#### Step 4: Open in Browser
Open Chrome or Edge and navigate to:
```
http://localhost:3000
```

---

## 🎯 First Use

### 1. Create Account
- Click "Register" tab
- Username: `testuser` (or any name you like)
- Password: `password123` (minimum 6 characters)
- Click "Create Account"

### 2. Wait for AI Model
- First time only: ~1-2 minutes download
- Progress bar shows status
- Model cached for future use

### 3. Try Each Feature

#### Chat (💬)
1. Type: "Hi, how are you?"
2. Press Enter or click Send
3. AI responds with empathy
4. Try voice input: Click 🎤 and speak

#### Journal (📝)
1. Write a short entry about your day
2. Click "Save Entry"
3. AI analyzes emotion, sentiment, stress
4. View entry with analysis below

#### Dashboard (📊)
1. View your mood statistics
2. See emotion distribution
3. Check stress levels
4. Change time range (7/30/90/365 days)

#### Report (📋)
1. Click "Generate AI Analysis"
2. Wait for AI summary
3. Review recommendations
4. Click "Export to PDF" to save

---

## 🔍 Verification Checklist

After setup, verify everything works:

- [ ] Can create account and login
- [ ] AI model loads successfully
- [ ] Can send chat messages and get responses
- [ ] Can write and save journal entries
- [ ] Journal entries show analysis (emotion, sentiment)
- [ ] Dashboard displays charts
- [ ] Can generate and export report
- [ ] Voice input works (click 🎤)
- [ ] Voice output works (toggle "Voice On")
- [ ] Can logout and login again
- [ ] Data persists after page reload

---

## 🚨 Troubleshooting

### Model Won't Load
**Error**: "Failed to initialize AI model"

**Solutions**:
1. Ensure using Chrome 113+ or Edge 113+
2. Check if WebGPU is available:
   ```javascript
   // Open browser console (F12) and type:
   navigator.gpu
   // Should return an object, not undefined
   ```
3. Try clearing browser cache
4. Restart browser

### Voice Input Not Working
**Error**: Microphone button doesn't respond

**Solutions**:
1. Grant microphone permissions
2. Check browser supports Web Speech API
3. Ensure using HTTPS (or localhost)
4. Test microphone in other apps

### Data Not Saving
**Error**: Entries disappear on reload

**Solutions**:
1. Don't use private/incognito mode
2. Check IndexedDB is enabled in browser
3. Ensure sufficient storage space
4. Open DevTools → Application → IndexedDB → mindscribe

### Slow Performance
**Issue**: App is laggy

**Solutions**:
1. Close unnecessary browser tabs
2. Wait for model to fully load
3. Check system has 4GB+ available RAM
4. Try closing other applications

---

## 📊 System Requirements

### Minimum
- CPU: Dual-core 2.0 GHz
- RAM: 4GB available
- GPU: Integrated graphics with WebGPU support
- Storage: 2GB free space
- Browser: Chrome 113+ or Edge 113+

### Recommended
- CPU: Quad-core 2.5 GHz+
- RAM: 8GB+ available
- GPU: Dedicated graphics card
- Storage: 5GB+ free space
- Browser: Latest Chrome or Edge

---

## 🔒 Privacy & Data

### What's Stored Locally
```
Browser IndexedDB:
├── User credentials (encrypted)
├── Chat messages (encrypted)
├── Journal entries (encrypted)
├── Mood analysis (encrypted)
└── AI model cache (~900MB)
```

### What's NOT Stored
- ❌ No cloud backup
- ❌ No server communication (after model download)
- ❌ No tracking or analytics
- ❌ No cookies
- ❌ No external data transmission

### Backup Your Data
To backup your data:
1. Go to Report page
2. Click "Export to PDF"
3. Save PDF somewhere safe
4. Repeat monthly for records

---

## 🎓 Learning Path

### Day 1: Basics
1. ✅ Create account
2. ✅ Send first chat message
3. ✅ Write first journal entry
4. ✅ Explore dashboard

### Week 1: Regular Use
1. Journal daily
2. Chat when needed
3. Review dashboard weekly
4. Export first report

### Month 1: Insights
1. Notice mood patterns
2. Track stress triggers
3. Follow AI recommendations
4. Share report with therapist (optional)

---

## 📚 Additional Resources

### Documentation
- `README.md` - Project overview
- `USER_GUIDE.md` - Detailed user instructions
- `TECHNICAL_DOCS.md` - Developer documentation
- `Product_Development_instructions.md` - Requirements

### Keyboard Shortcuts
- `Enter` - Send message / Save
- `Tab` - Navigate fields
- `Esc` - Cancel/Close
- `Ctrl+K` - Focus search (future)

### Voice Commands
Just speak naturally:
- "I'm feeling anxious today"
- "Had a great day at work"
- "Can't sleep, too stressed"

---

## 🎉 You're All Set!

MindScribe is now ready to use. Remember:

💜 **Take your time** - There's no rush
🔒 **Your privacy matters** - All data stays on your device
🌟 **Be honest** - The more open you are, the better insights you'll get
🤝 **Seek help** - MindScribe supplements, doesn't replace, professional care

---

## 📞 Need Help?

1. **Check Browser Console**: Press F12 → Console tab
2. **Review Errors**: Look for red error messages
3. **Check Documentation**: Review USER_GUIDE.md
4. **Test Different Browser**: Try Chrome if using Edge, or vice versa
5. **Clear Cache**: Sometimes helps with loading issues

---

## 🚀 Next Steps

Now that you're set up:

1. **Write your first journal entry** - Share how you're feeling today
2. **Have a conversation** - Chat with the AI about your day
3. **Check your dashboard** - After a few entries, explore your insights
4. **Set a routine** - Journal daily for best results
5. **Export reports** - Monthly exports help track long-term progress

---

**Welcome to MindScribe! Your mental health journey starts here. 🧠💜**

---

*For detailed feature explanations, see USER_GUIDE.md*  
*For technical details, see TECHNICAL_DOCS.md*  
*For project overview, see README.md*
