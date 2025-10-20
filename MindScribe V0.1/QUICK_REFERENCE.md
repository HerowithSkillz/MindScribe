# 🎯 MindScribe - Quick Reference Card

## 🚀 Quick Commands

```bash
# Start Application
npm run dev

# Build for Production
npm run build

# Preview Production
npm run preview

# Run Linter
npm run lint
```

## 🌐 Access Points

**Development Server**: http://localhost:3000  
**Browser Console**: Press F12  
**IndexedDB Viewer**: DevTools → Application → Storage → IndexedDB  

## 🔑 Default Test Account

```
Username: testuser
Password: test123456
```
*(Create your own for real use)*

## 📱 Main Features

| Feature | URL Path | Shortcut |
|---------|----------|----------|
| Chat | `/chat` | 💬 |
| Journal | `/journal` | 📝 |
| Dashboard | `/dashboard` | 📊 |
| Report | `/report` | 📋 |
| Login | `/login` | 🔐 |

## 🎤 Voice Features

**Start Voice Input**: Click 🎤 microphone button  
**Stop Voice Input**: Click 🎤 again  
**Toggle Voice Output**: Click "Voice On/Off" button  

## 💾 Data Storage Locations

```
IndexedDB Database: "mindscribe"

Stores:
- users        (User accounts)
- journals     (Journal entries)
- chats        (Chat messages)
- settings     (App preferences)
- analysis     (Mood data)
```

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| Password Hashing | SHA-256 |
| Encryption | AES-256-GCM |
| Key Derivation | PBKDF2 (100k iterations) |
| Storage | IndexedDB (encrypted) |
| Transmission | None (100% local) |

## 📊 Chart Types

1. **Line Chart** - Mood trends over time
2. **Pie Chart** - Emotion distribution
3. **Bar Chart** - Stress level breakdown

## 🎨 Color Palette

```css
Primary (Blue):   #0ea5e9 to #0c4a6e
Calm (Purple):    #8b5cf6 to #4c1d95
Sage (Green):     #7d9680 to #2c372d
```

## 🤖 AI Model

**Model**: Llama-3.2-1B-Instruct-q4f32_1-MLC  
**Size**: ~900MB  
**Download**: First time only (1-2 mins)  
**Cache**: Browser cache (persistent)  
**Runtime**: WebGPU in browser  

## 📋 Journal Analysis Output

```javascript
{
  emotion: string,      // happy, sad, anxious, etc.
  sentiment: number,    // 0-10 scale
  stress: string,       // low, moderate, high
  themes: string[]      // ["work", "family"]
}
```

## 🔍 Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Model won't load | Clear cache, restart browser |
| Voice not working | Check permissions, use Chrome/Edge |
| Data not saving | Disable incognito mode |
| Slow performance | Close other tabs, check RAM |
| Can't login | Verify username/password case |

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `USER_GUIDE.md` | Detailed instructions |
| `TECHNICAL_DOCS.md` | Developer docs |
| `QUICK_START.md` | Fast setup |
| `BUILD_SUMMARY.md` | Build details |
| `Product_Development_instructions.md` | Requirements |

## ⚙️ Browser Requirements

**Minimum**:
- Chrome 113+ or Edge 113+
- 4GB RAM
- WebGPU support
- IndexedDB enabled

**Check WebGPU Support**:
```javascript
// In browser console (F12):
navigator.gpu !== undefined
// Should return: true
```

## 🎯 Feature Checklist

After first use, verify:
- [x] Account created
- [x] Model loaded
- [x] Chat works
- [x] Journal saves
- [x] Dashboard displays
- [x] Report generates
- [x] PDF exports
- [x] Voice input works
- [x] Data persists

## 🔔 Important Reminders

⚠️ **Privacy**: All data stays on your device  
⚠️ **Backup**: Export reports regularly  
⚠️ **Browser**: Use Chrome or Edge for best experience  
⚠️ **Help**: Not a replacement for professional care  
⚠️ **Internet**: Only needed for first model download  

## 📞 Emergency Commands

```bash
# Kill server
Ctrl + C (in terminal)

# Clear node_modules
rm -rf node_modules
npm install

# Clear browser data
# DevTools → Application → Clear site data

# Reset everything
npm run build
rm -rf dist
```

## 🎨 Custom Styling

**Main CSS**: `src/index.css`  
**Tailwind Config**: `tailwind.config.js`  
**Component Styles**: Inline with Tailwind classes  

## 🧪 Testing Suggestions

1. **Create account** → Login → Logout → Login again
2. **Write journal** → Reload page → Check persistence
3. **Send chat** → Check AI response → Try voice
4. **View dashboard** → Change time range → Verify charts
5. **Generate report** → Export PDF → Open file

## 📱 Responsive Breakpoints

```css
sm:  640px   /* Small devices */
md:  768px   /* Medium devices */
lg:  1024px  /* Large devices */
xl:  1280px  /* Extra large */
```

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies |
| `vite.config.js` | Build config |
| `tailwind.config.js` | Styling |
| `postcss.config.cjs` | CSS processing |
| `.eslintrc.cjs` | Linting rules |

## 💡 Pro Tips

1. **Journal Daily**: More data = better insights
2. **Use Voice**: Great for when typing is hard
3. **Check Dashboard Weekly**: Track progress
4. **Export Reports Monthly**: Keep long-term records
5. **Clear Old Chats**: Improves performance

## 🎓 Learning Resources

- MDN Web Docs: Browser APIs
- WebLLM GitHub: AI model docs
- React Docs: Component patterns
- Tailwind Docs: Styling utilities

## 🌟 Key Shortcuts

| Action | Shortcut |
|--------|----------|
| Send message | Enter |
| New line | Shift + Enter |
| Focus input | Tab |
| Cancel | Esc |
| Open DevTools | F12 |

## 📦 Build Output

```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── brain-icon.svg
└── index.html
```

## 🚨 Error Codes

**Common Console Errors**:
- `WebGPU not supported` → Use Chrome/Edge 113+
- `QuotaExceededError` → Storage full
- `NotAllowedError` → Microphone permission denied
- `NetworkError` → Check internet for model download

## 🎉 Success Indicators

✅ Green checkmark in chat  
✅ Analysis shows after journal save  
✅ Charts display data  
✅ PDF downloads successfully  
✅ Voice input transcribes correctly  

---

**Quick Help**: Press F12 → Console for error details  
**Documentation**: See `USER_GUIDE.md` for full details  
**Support**: Check `TECHNICAL_DOCS.md` for dev info  

**Status**: ✅ FULLY OPERATIONAL  
**Version**: 0.1.0  
**Last Updated**: October 2025

---

*Print this card for quick reference while using MindScribe!*
