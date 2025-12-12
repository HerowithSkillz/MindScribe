# 🧠 Mindscribe – Project Requirements Document

## 📋 Functional & Non-Functional Requirements

| Requirement_ID | Description | User Story | Expected Behaviour / Outcome |
|-----------------|--------------|-------------|-------------------------------|
| FR-001 | **User Registration & Authentication (Local)** | As a user, I want to create an account and log in locally so that my data stays private and secure. | The system should allow local user registration, login, and logout without cloud dependency. Credentials should be stored securely on the client side (IndexedDB / LocalStorage). |
| FR-002 | **Offline Mode Support** | As a user, I want the application to work even without internet so I can use it anytime. | The entire web app (frontend, LLM, and user data) should function locally using WebLLM and local storage. |
| FR-003 | **Chatbot Interaction (Text)** | As a user, I want to chat with an AI companion who feels like a friendly, professional psychiatrist. | The chatbot should provide empathetic, concise, and positive responses in a conversational tone. Avoid long explanations or clinical jargon. |
| FR-004 | **Chatbot Interaction (Voice Input)** | As a user, I want to talk to the chatbot using my voice for a more natural experience. | The system should include speech-to-text functionality that converts audio input to text and responds accordingly. |
| FR-005 | **Voice Response (Optional)** | As a user, I want to hear the chatbot’s replies aloud so that it feels more interactive. | The chatbot can optionally read responses using text-to-speech synthesis. |
| FR-006 | **Journal Entry Page** | As a user, I want to write daily journal entries to express my emotions. | The system should provide a text area with options to save, edit, and delete entries locally. |
| FR-007 | **Automatic Journal Analysis** | As a user, I want my journal entries to be analyzed automatically for my mental state. | The system should use local NLP/LLM processing to extract mood, stress level, entire-journal-summary-in-10-words and emotional tone. |
| FR-008 | **Mood & Sentiment Dashboard** | As a user, I want to view visual summaries of my emotional state over time. | The system should display charts showing mood trends, emotional balance, and journaling consistency. |
| FR-009 | **Mental Health Screening Report** | As a user, I want to receive a summarized mental health screening report based on my chats and journals. | The report should summarize emotional patterns, probable mood disorders, and suggestions for therapy or self-care. |
| FR-010 | **Privacy & Security (Local Data Only)** | As a user, I want assurance that my data never leaves my device. | The app should store all information locally and explicitly inform the user that no cloud storage or data transmission occurs. |
| FR-011 | **Model Management (WebLLM)** | As a developer, I want to load and cache small, resource-efficient models locally. | The application should use WebLLM and WebGPU to run the model in the browser, caching it in the session or local storage. |
| FR-012 | **User Interface – Journaling Page** | As a user, I want a calming, minimalist journaling interface. | UI should use soft color palettes, clean typography, and provide a distraction-free writing space. |
| FR-013 | **User Interface – Chat Page** | As a user, I want the chat interface to resemble a messaging app with friendly design. | The chat should display user and AI messages distinctly, with options for audio or text input. |
| FR-014 | **Positive Psychology Engine** | As a user, I want the chatbot to promote positivity and emotional resilience. | The LLM prompt should be optimized for empathetic, encouraging, and solution-focused responses. |
| FR-015 | **Data Visualization Components** | As a user, I want to see my mental health progress visually. | The dashboard should include mood trends, journal frequency, and positive/negative sentiment ratios. |
| FR-016 | **Local Report Export** | As a user, I want to export my mental health report for personal review or therapist sharing. | The system should allow exporting reports in PDF format locally. |
| FR-017 | **Session Management** | As a user, I want to resume my previous session. | The system should autosave chats and journals locally and restore them when I reopen the app. |
| FR-018 | **Model Optimization & Performance** | As a developer, I want to ensure smooth model operation without lag. | Use lightweight, quantized models optimized for WebGPU and load balancing between journaling and chat tasks. |
| FR-019 | **Therapy Recommendation System (Non-Clinical)** | As a user, I want gentle guidance or coping strategies based on my mood trends. | The app should suggest daily self-care practices or mindfulness prompts derived from emotional analysis. |
| FR-020 | **Interactive Prompt Design** | As a developer, I want the AI to respond interactively and contextually. | Prompts should ensure continuity, empathy, and concise responses during multi-turn conversations. |
| NFR-001 | **Performance Requirement** | The app should load quickly and run smoothly even on mid-range devices. | The model should initialize within 10 seconds and maintain real-time response under 2 seconds for most inputs. |
| NFR-002 | **Accessibility Requirement** | The app should be usable by all users, including those with limited motor or visual abilities. | Include keyboard shortcuts, voice support, and screen reader compatibility. |
| NFR-003 | **UI/UX Requirement** | The app should promote calmness and comfort. | Use pastel themes, friendly typography, and micro-animations to enhance emotional comfort. |


---

## ⚙️ Technical Stack & Architecture

| Component | Technology / Tool | Description |
|------------|-------------------|--------------|
| **Frontend Framework** | React.js + Vite | Lightweight, fast development setup for browser-based app. |
| **Styling** | Tailwind CSS + Framer Motion | Clean, minimalist design with smooth transitions and responsive layout. |
| **AI Model Runtime** | [WebLLM](https://github.com/mlc-ai/web-llm?tab=readme-ov-file#full-openai-compatibility) | Client-side inference using WebGPU for running LLMs fully in-browser. |
| **WebLLM Mode** | Advanced Usage | Use WebLLM's advanced APIs for fine-grained model control, prompt customization, and caching strategies. |
| **Local Storage** | IndexedDB / LocalForage | Persistent local data storage for journal entries, chat logs, and reports. |
| **Voice Input** | Web Speech API (SpeechRecognition) | Capture and transcribe user speech for chatbot input. |
| **Voice Output** | Web Speech API (SpeechSynthesis) | Enable the chatbot to reply using voice output. |
| **Charts & Visualization** | Recharts / Chart.js | Display mood trends, emotional patterns, and journaling statistics. |
| **Model Caching** | WebLLM Model Caching (WebGPU memory or local caching) | Store loaded model weights locally to improve performance. |
| **Local Report Generation** | jsPDF / pdfmake | Generate offline PDF reports summarizing user’s mental state. |
| **Security** | Client-side encryption (AES or WebCrypto API) | Secure all stored data locally; prevent external access. |

---

## 🔬 WebLLM Integration Details

| Item | Specification |
|------|----------------|
| **Reference** | [WebLLM GitHub – Full OpenAI Compatibility & Advanced Usage](https://github.com/mlc-ai/web-llm?tab=readme-ov-file#full-openai-compatibility) |
| **Implementation Goal** | Integrate WebLLM using the **Advanced Usage** interface to allow control over model initialization, context caching, and progressive streaming without affecting the UI. |
| **LLM Requirements** | Use a lightweight model (e.g., `Llama-3-8B`, `Phi-3-mini`, or quantized variant) suitable for in-browser WebGPU inference. |
| **Advanced Usage Implementation** | - Load model asynchronously in background threads. <br> - Use progressive message streaming (non-blocking UI). <br> - Cache model and tokenizer in browser session. <br> - Handle memory cleanup automatically when user closes the tab. |
| **Prompt Template Example** | “You are Mindscribe — a friendly, supportive conversational therapist. Speak concisely, with empathy and positivity. Use warm tone and ask follow-up questions to keep the user engaged.” |

---

## 🧩 Architecture Overview

1. **Frontend (React + WebLLM):**
   - Handles UI for chat, journaling, and dashboard.
   - Integrates WebLLM for all AI interactions.
   - Manages local storage for user data.

2. **Local AI Layer (WebLLM + WebGPU):**
   - Executes LLM computations directly in-browser.
   - Analyzes journal entries and conversations to detect mood trends.
   - Runs sentiment analysis and generates summary reports.

3. **Data Layer:**
   - Journals, chat logs, and reports stored in IndexedDB.
   - Model weights cached via WebLLM local cache.

4. **Visualization Layer:**
   - Renders emotion trends and summary insights using Chart.js/Recharts.

5. **Security Layer:**
   - Encrypts local data using WebCrypto.
   - Ensures no data leaves the user’s machine.

---

## 🏁 Summary

**Mindscribe** is a fully offline, privacy-preserving mental health journaling and conversational companion.  
It combines **LLM-based emotional interaction** with **local NLP analysis**, providing a friendly, therapist-like chat experience and insightful personal analytics — all within the browser.

> **Reference:** [WebLLM Advanced Usage and OpenAI Compatibility](https://github.com/mlc-ai/web-llm?tab=readme-ov-file#full-openai-compatibility)
