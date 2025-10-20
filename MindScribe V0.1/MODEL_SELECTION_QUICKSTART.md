# Model Selection Feature - Quick Start

## ✨ What's New

You can now **choose which AI model to download and use** in MindScribe! Pick the model that best suits your needs based on speed, quality, and download size.

## 🎯 How to Access

### Option 1: Header Button (Anywhere in the App)
1. Look for the **🤖 AI Model** button in the top-right corner of the header
2. Click it to open the model selector
3. You'll see the current model and its status (green dot = active)

### Option 2: Chat Page Button
1. Go to the **Chat** page
2. Click the **🤖 Change Model** button next to the voice toggle
3. The model selector will open

## 📱 Model Selector Interface

The model selector shows:
- **Model Cards** with detailed information:
  - Model name and description
  - Download size
  - Speed rating (Very Fast / Fast / Moderate)
  - Quality rating (Good / Better / Best)
  - Recommended badge (⭐) for best all-around choice
  - Active badge (✓) if currently loaded

### Visual Layout
```
┌─────────────────────────────────────────────────────────┐
│  🤖 Choose AI Model                              ✕      │
│  Select the model that best fits your needs             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  ⭐ Recommended                                │    │
│  │  Llama 3.2 1B                              ●  │    │
│  │  Smallest and fastest model...                 │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐                 │    │
│  │  │ Size │ │Speed │ │Quality│                 │    │
│  │  │~900MB│ │V.Fast│ │ Good │                 │    │
│  │  └──────┘ └──────┘ └──────┘                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Phi-3 Mini                                ○  │    │
│  │  Balanced model with good quality...          │    │
│  │  [Size: ~2GB] [Speed: Fast] [Quality: Better] │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [More models...]                                       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  ℹ️ Note: Models are downloaded once and cached        │
│     First-time download requires internet connection    │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Switching Models

### If No Model is Active
1. Click any model card
2. Model is immediately selected
3. Model selector closes
4. Next time you initialize AI, your chosen model will load

### If a Model is Already Active
1. Click a different model card
2. Confirmation dialog appears:
   ```
   ┌─────────────────────────────────┐
   │  ⚠️  Switch Model?              │
   │                                 │
   │  This will unload Llama 3.2 1B │
   │  and load the new model.        │
   │  Chat history will be cleared.  │
   │                                 │
   │  [Cancel]  [Switch Model]       │
   └─────────────────────────────────┘
   ```
3. Click **Switch Model** to confirm
4. Current model unloads
5. New model is selected
6. You can now initialize the new model

## 📊 Model Comparison at a Glance

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Llama 3.2 1B** ⭐ | ~900MB | ⚡⚡⚡ | ⭐⭐⭐ | Quick responses, limited bandwidth |
| **Qwen 2.5 1.5B** | ~1.2GB | ⚡⚡⚡ | ⭐⭐⭐ | Compact with good performance |
| **Gemma 2 2B** | ~1.5GB | ⚡⚡ | ⭐⭐⭐ | Natural conversations |
| **Phi-3 Mini** | ~2GB | ⚡⚡ | ⭐⭐⭐⭐ | Balanced speed & quality |
| **Llama 3.1 8B** | ~4.5GB | ⚡ | ⭐⭐⭐⭐⭐ | Highest quality responses |

## 💡 Recommendations by Use Case

### 🏃 "I want the fastest experience"
→ **Llama 3.2 1B** (Recommended)
- 900MB download
- Instant responses
- Great for real-time conversations

### 🎯 "I want the best quality"
→ **Llama 3.1 8B**
- 4.5GB download (need good connection)
- Most nuanced understanding
- Best for complex emotional analysis

### ⚖️ "I want a balance"
→ **Phi-3 Mini** or **Gemma 2 2B**
- 1.5-2GB download
- Good quality without long waits
- Recommended for most users after trying Llama 3.2 1B

### 📱 "I have limited storage/bandwidth"
→ **Llama 3.2 1B**
- Smallest download
- Still very capable
- Perfect for mobile or slow connections

## 🔍 Visual Indicators

### In Header
```
🤖 AI Model
   Llama 3.2 1B ● 
```
- Green dot (●) = Model is active and ready
- No dot = Model selected but not yet initialized

### In Model Selector
- **⭐ Recommended** badge = Best all-around choice
- **✓ Active** badge = Currently loaded and running
- **Selected** (blue border + checkmark) = Your current choice
- **Hover effect** = Interactive, click to select

## ⚠️ Important Notes

1. **Chat Context Clearing**: Switching models clears the current chat conversation in memory, but:
   - ✅ Saved chat history remains intact
   - ✅ Journal entries are preserved
   - ✅ All your data stays safe

2. **Download Once**: 
   - Models download once and cache permanently
   - Switching to a cached model is instant
   - No re-download needed after browser restart

3. **Storage Requirements**:
   - Keep at least 5GB free in browser storage
   - Check usage: DevTools → Application → Storage

4. **Internet Connection**:
   - Only needed for first-time model download
   - After download, works 100% offline

## 🛠️ Technical Details

### Model Storage
- Location: Browser IndexedDB (cache://mlc_model_cache)
- Persistence: Permanent until manually cleared
- Sharing: Each model cached independently

### Model Format
- Type: MLC-compiled ONNX models
- Quantization: 4-bit (q4) for size reduction
- Acceleration: WebGPU for fast inference

### Browser Compatibility
- ✅ Chrome 113+ (recommended)
- ✅ Edge 113+
- ⚠️ Firefox (experimental WebGPU support)
- ❌ Safari (WebGPU not yet stable)

## 🎨 Design Features

### Beautiful UI
- Smooth animations (Framer Motion)
- Responsive design (mobile-friendly)
- Clear visual hierarchy
- Accessible color contrast

### User-Friendly
- No technical jargon in descriptions
- Clear size/speed/quality metrics
- Confirmation dialogs prevent accidents
- Helpful tooltips and notes

## 📝 Usage Examples

### Scenario 1: First-Time User
```
1. Open MindScribe
2. Click "Start Chatting" (uses default Llama 3.2 1B)
3. Model downloads (~900MB, 2-5 minutes)
4. Start chatting immediately
5. Later, click 🤖 to try other models
```

### Scenario 2: Quality-Focused User
```
1. Open MindScribe
2. Click 🤖 AI Model button before initializing
3. Select "Llama 3.1 8B"
4. Click "Start Chatting"
5. Model downloads (~4.5GB, 10-15 minutes)
6. Enjoy highest quality responses
```

### Scenario 3: Experimenting User
```
1. Start with Llama 3.2 1B (fast setup)
2. Test chat functionality
3. Try Phi-3 Mini for better quality
4. Compare response styles
5. Stick with preferred model
```

## 🆘 Troubleshooting

### Model selector doesn't open?
- Check browser console (F12) for errors
- Refresh the page
- Clear browser cache

### Model download fails?
- Check internet connection
- Verify sufficient storage space
- Try a smaller model first
- Check WebGPU support at webgpureport.org

### Switch model not working?
- Wait for current AI operation to finish
- Close any active analyses
- Refresh page if stuck

## 🎉 Benefits

✅ **Flexibility** - Choose based on your needs  
✅ **Transparency** - See exactly what you're downloading  
✅ **Control** - Switch anytime, models stay cached  
✅ **Privacy** - All models run locally, zero cloud dependency  
✅ **Performance** - Optimal model for your device  

---

**Enjoy the freedom to choose your AI companion! 🧠✨**

For detailed model comparisons, see: [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md)
