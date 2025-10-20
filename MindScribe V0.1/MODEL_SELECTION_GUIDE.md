# AI Model Selection Guide

## Overview

MindScribe allows you to choose from multiple AI models based on your needs. Each model offers different trade-offs between speed, quality, and download size.

## Available Models

### 🌟 Llama 3.2 1B (Recommended)
- **Size**: ~900MB
- **Speed**: Very Fast
- **Quality**: Good
- **Best For**: Quick responses, users with limited bandwidth/storage
- **Description**: The smallest and fastest model, ideal for everyday conversations

### Phi-3 Mini
- **Size**: ~2GB
- **Speed**: Fast
- **Quality**: Better
- **Best For**: Users wanting a balance between speed and quality
- **Description**: Microsoft's efficient model with improved reasoning

### Llama 3.1 8B
- **Size**: ~4.5GB
- **Speed**: Moderate
- **Quality**: Best
- **Best For**: Users prioritizing response quality over speed
- **Description**: Most capable model with highest quality responses

### Qwen 2.5 1.5B
- **Size**: ~1.2GB
- **Speed**: Very Fast
- **Quality**: Good
- **Best For**: Compact alternative with good performance
- **Description**: Alibaba's efficient model optimized for general chat

### Gemma 2 2B
- **Size**: ~1.5GB
- **Speed**: Fast
- **Quality**: Good
- **Best For**: Natural conversations with good context understanding
- **Description**: Google's lightweight model designed for chat applications

## How to Choose

### Consider Your Priorities:

1. **Speed Priority**
   - Choose: Llama 3.2 1B or Qwen 2.5 1.5B
   - Fast responses, minimal latency
   - Great for real-time conversations

2. **Quality Priority**
   - Choose: Llama 3.1 8B
   - Most nuanced and context-aware responses
   - Better understanding of complex emotions

3. **Balanced Approach**
   - Choose: Phi-3 Mini or Gemma 2 2B
   - Good quality without excessive download time
   - Reasonable speed for most use cases

4. **Limited Storage/Bandwidth**
   - Choose: Llama 3.2 1B
   - Smallest download size
   - Quick initial setup

## Changing Models

### Via Header Button
1. Click the **🤖 AI Model** button in the top-right header
2. Browse available models with detailed specs
3. Click on a model to select it
4. If a model is already loaded, you'll be prompted to confirm switching

### Via Chat Page
1. Navigate to the **Chat** page
2. Click the **🤖 Change Model** button
3. Select your preferred model

### Important Notes
- ⚠️ Changing models will unload the current model and clear chat context
- ✅ Your saved journal entries and chat history remain intact
- 💾 Models are cached in your browser after first download
- 🔄 Switching to a previously downloaded model is instant

## Technical Details

### Model Caching
- Models are downloaded once and stored in IndexedDB
- Subsequent loads are instant (no re-download)
- Cache persists across browser sessions
- Can be cleared via browser settings (Application > IndexedDB)

### Model Sizes Explained
- **Quantized Models**: All models use 4-bit quantization (q4)
- **Trade-off**: Smaller size with minimal quality loss
- **Format**: MLC (Machine Learning Compilation) optimized for web

### Performance Factors
1. **Device Hardware**
   - GPU capabilities affect speed
   - More RAM = better performance
   - WebGPU support required

2. **Network Connection**
   - Only matters for first download
   - Subsequent loads are offline

3. **Browser**
   - Chrome/Edge recommended
   - Requires WebGPU support

## Best Practices

### First-Time Setup
1. Start with **Llama 3.2 1B** (recommended, fastest download)
2. Test the chat functionality
3. If you want higher quality, try **Phi-3 Mini**
4. For best results, upgrade to **Llama 3.1 8B**

### Regular Usage
- Stick with one model for consistent experience
- Only change if you need different capabilities
- Consider download time when switching

### Storage Management
- Check browser storage usage periodically
- Remove unused models via IndexedDB if needed
- Keep at least 5GB free for smooth operation

## Troubleshooting

### Model Won't Load
1. Check internet connection (first download only)
2. Ensure sufficient storage space
3. Verify WebGPU support in browser
4. Try clearing browser cache and reloading

### Slow Performance
1. Try a smaller model (Llama 3.2 1B)
2. Close unnecessary browser tabs
3. Check device GPU availability
4. Update browser to latest version

### Model Switch Failed
1. Wait for current operations to complete
2. Try unloading the model manually
3. Refresh the page if stuck
4. Check console for error messages

## FAQ

**Q: Can I use multiple models simultaneously?**  
A: No, only one model can be active at a time.

**Q: Do I need to re-download models after browser restart?**  
A: No, models are cached permanently until you clear browser data.

**Q: Which model is best for mental health conversations?**  
A: All models are suitable. Start with Llama 3.2 1B, upgrade if you want more nuanced responses.

**Q: Will my data be lost when switching models?**  
A: No, only the chat context is cleared. All saved data (journals, history) remains intact.

**Q: How much internet data does each model consume?**  
A: Only on first download:
- Llama 3.2 1B: ~900MB
- Phi-3 Mini: ~2GB
- Llama 3.1 8B: ~4.5GB
- Qwen 2.5 1.5B: ~1.2GB
- Gemma 2 2B: ~1.5GB

**Q: Can I download models on Wi-Fi and use offline later?**  
A: Yes! After initial download, all models work completely offline.

## Model Update Policy

Models are versioned (e.g., `-q4f32_1-MLC`). When new versions are released:
1. Check the model selector for updates
2. New versions appear as separate options
3. Old versions remain available
4. You can switch to new versions anytime

## Privacy & Security

- ✅ All models run 100% in your browser
- ✅ No data sent to external servers
- ✅ Models downloaded from official MLC AI repository
- ✅ Open-source and auditable
- ✅ Your conversations never leave your device

## Getting Help

If you experience issues with model selection:
1. Check browser console for errors (F12)
2. Verify WebGPU support at: https://webgpureport.org/
3. Try a smaller model first
4. Ensure browser is up to date
5. Check available storage space

---

**Enjoy exploring different AI models with MindScribe! 🧠✨**
