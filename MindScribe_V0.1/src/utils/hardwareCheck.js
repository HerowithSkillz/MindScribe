// src/utils/hardwareCheck.js

export const getHardwareTier = async () => {
  // 1. Check for WebGPU support
  if (!navigator.gpu) {
    return { tier: 'incompatible', reason: 'no_webgpu' };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { tier: 'incompatible', reason: 'no_adapter' };
    }

    const limits = adapter.limits;
    // maxStorageBufferBindingSize is a good proxy for VRAM capability
    const maxMemory = limits.maxStorageBufferBindingSize; 
    
    console.log(`[HardwareCheck] Max Buffer Size: ${(maxMemory / 1024 / 1024).toFixed(2)} MB`);

    // Tier 3: High Performance (Dedicated GPU or Apple M1/M2/M3)
    // capable of running Llama-3.2-3B
    if (maxMemory >= 2147483648) { // > 2GB buffer
      return { tier: 'high', recommendedModel: 'Llama-3.2-3B-Instruct-q4f16_1-MLC' };
    }

    // Tier 2: Standard (Modern Integrated Graphics, e.g., Intel Iris Xe)
    // Capable of running Llama-3.2-1B with q4f32
    if (maxMemory >= 1073741824) { // > 1GB buffer
      return { tier: 'medium', recommendedModel: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' };
    }

    // Tier 1: Low Power (Older Intel UHD, Mobile)
    // Strictly limited to tiny models
    return { tier: 'low', recommendedModel: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' };

  } catch (error) {
    console.warn("[HardwareCheck] Failed to probe GPU:", error);
    // Safe fallback
    return { tier: 'low', recommendedModel: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' };
  }
};