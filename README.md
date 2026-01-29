# MindScribe 🧠✨

> **A Privacy-First, Fully Offline AI Mental Health Companion**

MindScribe is a revolutionary mental health journaling and voice therapy application that runs **entirely in your browser** — no cloud, no servers, no data transmission. Your thoughts stay yours.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-brightgreen.svg)
![AI](https://img.shields.io/badge/AI-WebLLM%20%7C%20Whisper%20%7C%20Piper-purple.svg)

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🔒 **100% Offline** | All AI processing happens locally in your browser |
| 🎙️ **Voice Therapy** | Natural voice conversations with AI therapist |
| 📝 **Smart Journaling** | AI-powered mood analysis and insights |
| 📊 **Mental Health Dashboard** | Track emotions, mood trends, and stress levels |
| 🔐 **Privacy-First** | No data leaves your device, ever |
| 🌐 **No Internet Required** | Works offline after initial setup |

---

## 📋 System Requirements

### Minimum Requirements
- **RAM**: 8GB (16GB recommended for smooth experience)
- **Storage**: 2GB free space for AI models
- **GPU**: WebGPU-compatible graphics card (integrated GPU works)
- **Internet**: Required only for initial model download

### Supported Browsers

| Browser | Minimum Version | WebGPU Support | Recommended |
|---------|----------------|----------------|-------------|
| **Google Chrome** | 113+ | ✅ Full | ⭐ Best Experience |
| **Microsoft Edge** | 113+ | ✅ Full | ⭐ Recommended |
| **Chrome Canary** | Latest | ✅ Full | For latest features |
| **Firefox** | 🚧 Nightly only | ⚠️ Experimental | Not recommended |
| **Safari** | 🚧 Technology Preview | ⚠️ Limited | Not recommended |

> ⚠️ **Important**: WebGPU is required for AI model inference. Standard Firefox and Safari do not support WebGPU yet.

---

## 🚀 Installation Guide

### Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18.0.0 or higher)
2. **npm** (v9.0.0 or higher) or **yarn**
3. **Git**

---

## 💻 Platform-Specific Installation

### 🪟 Windows

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS version (v18 or v20)
   - Run the installer and follow the prompts
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

2. **Install Git**
   - Download from [git-scm.com](https://git-scm.com/download/win)
   - Run installer with default options
   - Verify installation:
     ```powershell
     git --version
     ```

3. **Clone and Run MindScribe**
   ```powershell
   # Clone the repository
   git clone https://github.com/your-username/MindScribe.git

   # Navigate to project directory
   cd MindScribe/MindScribe_V0.1

   # Install dependencies
   npm install

   # Start the development server
   npm run dev
   ```

4. **Open in Browser**
   - Open **Google Chrome** or **Microsoft Edge**
   - Navigate to `http://localhost:3000`

---

### 🍎 macOS

1. **Install Homebrew** (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js and Git**
   ```bash
   brew install node git
   ```

3. **Verify Installation**
   ```bash
   node --version
   npm --version
   git --version
   ```

4. **Clone and Run MindScribe**
   ```bash
   # Clone the repository
   git clone https://github.com/your-username/MindScribe.git

   # Navigate to project directory
   cd MindScribe/MindScribe_V0.1

   # Install dependencies
   npm install

   # Start the development server
   npm run dev
   ```

5. **Open in Browser**
   - Open **Google Chrome** (Safari does not fully support WebGPU)
   - Navigate to `http://localhost:3000`

---

### 🐧 Linux (Ubuntu/Debian)

1. **Install Node.js via NodeSource**
   ```bash
   # Update package list
   sudo apt update

   # Install curl if not present
   sudo apt install -y curl

   # Add NodeSource repository (Node.js 20.x)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

   # Install Node.js
   sudo apt install -y nodejs

   # Verify installation
   node --version
   npm --version
   ```

2. **Install Git**
   ```bash
   sudo apt install -y git
   git --version
   ```

3. **Clone and Run MindScribe**
   ```bash
   # Clone the repository
   git clone https://github.com/your-username/MindScribe.git

   # Navigate to project directory
   cd MindScribe/MindScribe_V0.1

   # Install dependencies
   npm install

   # Start the development server
   npm run dev
   ```

4. **Open in Browser**
   - Open **Google Chrome** or **Chromium**
   - Navigate to `http://localhost:3000`

---

### 🐧 Linux (Fedora/RHEL)

1. **Install Node.js**
   ```bash
   # Enable NodeSource repository
   sudo dnf install -y nodejs npm

   # Or use NodeSource for latest version
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo dnf install -y nodejs
   ```

2. **Install Git**
   ```bash
   sudo dnf install -y git
   ```

3. **Clone and Run** (same as Ubuntu)
   ```bash
   git clone https://github.com/your-username/MindScribe.git
   cd MindScribe/MindScribe_V0.1
   npm install
   npm run dev
   ```

---

## 🎯 First-Time Setup

After starting the application:

1. **Create Account**
   - Enter a username and password
   - Credentials are stored locally (not transmitted anywhere)

2. **Wait for AI Model Download**
   - First launch downloads AI models (~500MB - 2GB)
   - This is a one-time download
   - Models are cached in your browser for offline use

3. **Enable Microphone** (for Voice Therapy)
   - Allow microphone access when prompted
   - Required for voice-to-voice conversations

4. **Start Using MindScribe!**
   - 💬 **Chat**: Text conversations with AI therapist
   - 🎙️ **Voice Therapy**: Natural voice conversations
   - 📝 **Journal**: Write and analyze your thoughts
   - 📊 **Dashboard**: View mood trends and insights

---

## 🏗️ Building for Production

```bash
# Build optimized production version
npm run build

# Preview production build locally
npm run preview
```

The built files will be in the `dist/` directory.

---

## 🔧 Troubleshooting

### "WebGPU not supported" Error
- Ensure you're using Chrome 113+ or Edge 113+
- Check if WebGPU is enabled: `chrome://flags/#enable-unsafe-webgpu`
- Update your graphics drivers

### Model Loading Fails
- Clear browser cache and try again
- Ensure stable internet for initial download
- Check browser console for specific errors

### Voice Features Not Working
- Grant microphone permissions in browser settings
- Use HTTPS (localhost is exempt)
- Check system microphone settings

### Slow Performance
- Close other browser tabs
- Ensure sufficient RAM (8GB+)
- Use a dedicated GPU if available

---

## 📁 Project Structure

```
MindScribe/
└── MindScribe_V0.1/
    ├── public/           # Static assets & WASM files
    ├── src/
    │   ├── components/   # React UI components
    │   ├── contexts/     # React contexts (Auth, Voice, WebLLM)
    │   ├── pages/        # Page components
    │   ├── services/     # Core services (Piper, Whisper, WebLLM)
    │   └── utils/        # Helper utilities
    ├── package.json
    └── vite.config.js
```

---

## 🛡️ Privacy & Security

- ✅ **Zero Data Transmission** — All processing is local
- ✅ **No Telemetry** — We don't track anything
- ✅ **Encrypted Storage** — Journal entries are encrypted
- ✅ **Open Source** — Audit the code yourself

> ⚠️ **Disclaimer**: MindScribe is not a substitute for professional mental health care. If you're experiencing persistent mental health concerns, please consult a licensed therapist or healthcare provider.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [WebLLM](https://github.com/mlc-ai/web-llm) — Browser-based LLM inference
- [Piper TTS](https://github.com/rhasspy/piper) — Neural text-to-speech
- [Whisper](https://github.com/openai/whisper) — Speech recognition
- [Transformers.js](https://github.com/xenova/transformers.js) — ML in the browser

---

<div align="center">

## 👥 Development Team

### **C2 Group — Terna Engineering College**

*Building technology for mental wellness*

---

Made with ❤️ for Mental Health Awareness

**© 2026 C2 Group, Terna Engineering College**

</div>
