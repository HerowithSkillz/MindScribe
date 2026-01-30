# MindScribe 🧠

A fully offline, privacy-preserving mental health journaling and conversational companion built with React and WebLLM.

## Features

✨ **Privacy-First Design**
- All data stored locally on your device
- No cloud storage or data transmission
- End-to-end encryption for your journal entries

🤖 **AI-Powered Companion**
- Natural conversations with an empathetic AI therapist
- Automatic mood and sentiment analysis
- Personalized mental health insights

📝 **Smart Journaling**
- Beautiful, distraction-free writing interface
- Automatic emotional analysis of entries
- Track mood patterns over time

📊 **Insightful Dashboard**
- Visual mood trends and patterns
- Emotion distribution charts
- Stress level tracking

📋 **Mental Health Reports**
- AI-generated summaries of your mental state
- Personalized self-care recommendations
- Export reports to PDF

🎤 **Voice Support**
- Voice input for natural conversations
- Optional text-to-speech responses
- Hands-free journaling

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **AI**: WebLLM (browser-based AI inference)
- **Storage**: IndexedDB via LocalForage
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Security**: Web Crypto API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "MindScribe V0.1"
```

2. Install dependencies:
```bash
npm install
```

> **Note**: The postinstall script automatically fixes a known issue with the `piper-wasm` package (missing `expressions.js` file). If you see any errors related to this, run `node scripts/fix-piper-wasm.js` manually.

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### First Time Setup

1. Create an account (stored locally on your device)
2. Wait for the AI model to download (first time only, ~1-2 minutes)
3. Start chatting or journaling!

## Usage

### Chat
- Talk to your AI companion about your feelings
- Use the microphone button for voice input
- Enable voice responses for a more interactive experience

### Journal
- Write daily journal entries
- Entries are automatically analyzed for mood and sentiment
- View all past entries with emotional insights

### Dashboard
- View mood trends over different time periods
- See emotion distribution and stress levels
- Get quick insights about your mental health journey

### Report
- Generate comprehensive mental health reports
- Get AI-powered analysis and recommendations
- Export reports to PDF for personal use or sharing with therapist

## Privacy & Security

🔒 **Your data never leaves your device**
- All processing happens locally in your browser
- Journal entries encrypted with your password
- No servers, no cloud, no tracking

⚠️ **Important**: MindScribe is not a substitute for professional mental health care. If you're experiencing persistent mental health concerns, please consult a licensed therapist or healthcare provider.

## Browser Requirements

- Chrome 113+ or Edge 113+ (for WebGPU support)
- At least 4GB of available RAM
- Stable internet connection for initial model download only

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory. You can serve them with any static file server.

## Troubleshooting

**Model not loading?**
- Ensure you have a WebGPU-compatible browser
- Check browser console for errors
- Try clearing browser cache and reloading

**Slow performance?**
- Close unnecessary browser tabs
- Ensure your device has sufficient RAM
- The model is optimized for mid-range devices

**Voice features not working?**
- Check browser permissions for microphone access
- Ensure you're using HTTPS (required for Web Speech API)
- Try a different browser if issues persist

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [WebLLM](https://github.com/mlc-ai/web-llm) for in-browser AI inference
- Inspired by the need for accessible, privacy-preserving mental health tools

---

Made with ❤️ for mental health awareness

📋 [TASK] Initializing AI Engine... 

webllm.js:111 ℹ️ [INFO] Analyzing hardware capabilities... 

webllm.js:111 ⚠️ [WARNING] Model is already loading 

hardwareCheck.js:19 [HardwareCheck] Max Buffer Size: 2048.00 MB

webllm.js:111 ✅ [SUCCESS] Hardware Analysis: MEDIUM Tier detected. 

webllm.js:111 ℹ️ [INFO] Recommended Model: Phi-3-mini-4k-instruct-q4f16_1-MLC 

webllm.js:111 📋 [TASK] Loading Model: Phi-3-mini-4k-instruct-q4f16_1-MLC 