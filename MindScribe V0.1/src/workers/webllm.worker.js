// worker.js - Web Worker for WebLLM to prevent UI blocking
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Create a handler that resides in the worker thread
const handler = new WebWorkerMLCEngineHandler();

// Handle messages from the main thread
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
