# 🤖 Model Selection - Quick Reference Card

## Access Points

### 1️⃣ Header Button (Global)
```
┌─────────────────────────────────────────────────────┐
│ MindScribe           🤖 Llama 3.2 1B ● ▼   Welcome │
└─────────────────────────────────────────────────────┘
```
**Location**: Top-right corner, always visible  
**Click**: Opens model selector modal  
**Indicator**: Green dot (●) = Model active

### 2️⃣ Chat Page Button
```
┌─────────────────────────────────────────────────────┐
│ Chat with MindScribe                                │
│ Your supportive AI companion • Using Llama 3.2 1B  │
│                     [🤖 Change Model] [🎤 Voice]    │
└─────────────────────────────────────────────────────┘
```
**Location**: Chat page header  
**Click**: Opens model selector modal  
**Shows**: Current model in subtitle

## 5 Available Models

```
┌─────────────┬──────────┬────────────┬──────────┬────────────────────┐
│ Model       │ Size     │ Speed      │ Quality  │ Best For           │
├─────────────┼──────────┼────────────┼──────────┼────────────────────┤
│ Llama 3.2   │ ~900MB   │ ⚡⚡⚡       │ ⭐⭐⭐     │ Quick start        │
│ 1B ⭐       │          │ Very Fast  │ Good     │ Limited bandwidth  │
├─────────────┼──────────┼────────────┼──────────┼────────────────────┤
│ Qwen 2.5    │ ~1.2GB   │ ⚡⚡⚡       │ ⭐⭐⭐     │ Compact choice     │
│ 1.5B        │          │ Very Fast  │ Good     │ General chat       │
├─────────────┼──────────┼────────────┼──────────┼────────────────────┤
│ Gemma 2     │ ~1.5GB   │ ⚡⚡        │ ⭐⭐⭐     │ Natural            │
│ 2B          │          │ Fast       │ Good     │ conversations      │
├─────────────┼──────────┼────────────┼──────────┼────────────────────┤
│ Phi-3       │ ~2GB     │ ⚡⚡        │ ⭐⭐⭐⭐    │ Balanced           │
│ Mini        │          │ Fast       │ Better   │ speed & quality    │
├─────────────┼──────────┼────────────┼──────────┼────────────────────┤
│ Llama 3.1   │ ~4.5GB   │ ⚡         │ ⭐⭐⭐⭐⭐   │ Best quality       │
│ 8B          │          │ Moderate   │ Best     │ Complex analysis   │
└─────────────┴──────────┴────────────┴──────────┴────────────────────┘
```

## Quick Selection Guide

### By Priority
🏃 **Speed** → Llama 3.2 1B  
🎯 **Quality** → Llama 3.1 8B  
⚖️ **Balance** → Phi-3 Mini or Gemma 2 2B  
📱 **Limited Storage** → Llama 3.2 1B  

### By Use Case
💬 **Casual Chat** → Llama 3.2 1B, Qwen 2.5 1.5B  
📝 **Journal Analysis** → Phi-3 Mini, Llama 3.1 8B  
📊 **Detailed Reports** → Llama 3.1 8B  
🚀 **First Time User** → Llama 3.2 1B (Recommended)  

## Switching Models

### Scenario A: No Active Model
```
1. Click 🤖 button
2. Click desired model card
3. Modal closes
4. Selection saved ✓
```

### Scenario B: Active Model
```
1. Click 🤖 button
2. Click different model card
3. Confirmation dialog appears:
   ┌────────────────────────────┐
   │ ⚠️  Switch Model?          │
   │ Chat context will clear    │
   │ [Cancel] [Switch Model]    │
   └────────────────────────────┘
4. Click "Switch Model"
5. Current model unloads
6. New model selected ✓
```

## Visual Indicators

### Model Card States
```
┌──────────────────────────┐
│ ⭐ Recommended           │  ← Top right badge
│                          │
│ Llama 3.2 1B         ●  │  ← Checkmark (selected)
│ Smallest and fastest...  │
│ [Size] [Speed] [Quality] │
│ Llama-3.2-1B-...MLC      │  ← Technical ID
└──────────────────────────┘
```

**Badges:**
- ⭐ Recommended = Best all-around choice
- ✓ Active = Currently loaded and running
- Blue border = Selected model
- Green dot = Model is active

### Header Indicator
```
🤖 AI Model
   Llama 3.2 1B ●    ← Green dot = active
   
🤖 AI Model
   Llama 3.2 1B      ← No dot = selected but not loaded
```

## Important Notes

### ✅ What's Preserved
- Saved chat history
- Journal entries
- Dashboard data
- Settings
- All your data

### ⚠️ What's Cleared
- Current chat conversation (in memory only)
- AI context window
- Streaming state

### 💾 Caching
- Models download once
- Stored in browser permanently
- No re-download needed
- Works offline after first download

### 📦 Storage Requirements
- Keep 5GB+ free in browser
- Check: DevTools → Application → Storage
- Clear old models if needed

## Keyboard Shortcuts

- `ESC` - Close model selector
- `Click outside` - Close modal
- `Tab` - Navigate model cards
- `Enter` - Select focused model

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal won't open | Refresh page, check console |
| Download fails | Check connection, try smaller model |
| Can't switch | Wait for AI to finish current task |
| Slow performance | Try smaller model (Llama 3.2 1B) |
| Model not loading | Clear browser cache, restart |

## Technical Info

### Model Format
- **Type**: MLC-compiled ONNX
- **Quantization**: 4-bit (q4)
- **Acceleration**: WebGPU
- **Storage**: IndexedDB

### Browser Support
- ✅ Chrome 113+
- ✅ Edge 113+
- ⚠️ Firefox (experimental)
- ❌ Safari (not yet)

### Performance
- **First Download**: 2-15 min (depends on size)
- **Subsequent Loads**: Instant
- **Token Speed**: 10-50 tokens/sec (device dependent)

## API Reference (Developers)

### WebLLM Service
```javascript
// Get available models
const models = webLLMService.getAvailableModels();

// Get current model
const current = webLLMService.getCurrentModel();

// Change model (must be uninitialized)
webLLMService.setModel(modelId);

// Get model info
const info = webLLMService.getModelInfo();
```

### WebLLM Context
```javascript
const {
  availableModels,  // Array of model objects
  currentModel,     // Current model object
  selectModel,      // (modelId) => void
  unloadModel,      // () => Promise<void>
  isInitialized     // boolean
} = useWebLLM();
```

## Examples

### Example 1: First-Time Setup
```
User opens app
→ Default model: Llama 3.2 1B
→ Clicks "Start Chat"
→ Model downloads (~900MB)
→ Ready in 2-5 minutes
```

### Example 2: Upgrade for Quality
```
User tried Llama 3.2 1B
→ Wants better responses
→ Clicks 🤖 button
→ Selects Llama 3.1 8B
→ Downloads in background
→ Switches on next chat
```

### Example 3: Switch for Speed
```
User using Llama 3.1 8B
→ Finds it slow
→ Clicks 🤖 button
→ Selects Phi-3 Mini
→ Confirms switch
→ Instant load (already cached)
```

## Quick Stats

- **5 models** to choose from
- **900MB to 4.5GB** download sizes
- **⚡ to ⭐⭐⭐⭐⭐** quality range
- **2 access points** (header + chat page)
- **100% offline** after download
- **Permanent caching** in browser

---

## 🎯 TL;DR

**Click** 🤖 button → **Choose** model → **Done**  
Models download once, work offline forever.  
Start with Llama 3.2 1B (recommended), upgrade later if needed.

**Server**: http://localhost:3000  
**Docs**: MODEL_SELECTION_GUIDE.md

---

*Print this card for quick reference!* 📄
