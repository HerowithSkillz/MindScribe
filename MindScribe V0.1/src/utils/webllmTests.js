import webLLMService from '../services/webllm';

/**
 * WebLLM Integration Test Suite
 * 
 * Run these tests to verify WebLLM is working correctly
 * Open browser console (F12) to see test results
 */

class WebLLMTests {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const styles = {
      info: 'color: blue',
      success: 'color: green; font-weight: bold',
      error: 'color: red; font-weight: bold',
      test: 'color: purple; font-weight: bold'
    };
    console.log(`%c${message}`, styles[type]);
  }

  async test(name, fn) {
    this.log(`\n🧪 Testing: ${name}`, 'test');
    try {
      await fn();
      this.passed++;
      this.log(`✅ PASSED: ${name}`, 'success');
      this.results.push({ name, status: 'PASSED' });
    } catch (error) {
      this.failed++;
      this.log(`❌ FAILED: ${name}`, 'error');
      this.log(`Error: ${error.message}`, 'error');
      this.results.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runAll() {
    this.log('\n='.repeat(60), 'info');
    this.log('🚀 WebLLM Integration Test Suite', 'test');
    this.log('='.repeat(60) + '\n', 'info');

    // Test 1: Model Info
    await this.test('Model Information', async () => {
      const info = webLLMService.getModelInfo();
      console.log('Model Info:', info);
      
      if (!info.modelId) throw new Error('Model ID not set');
      if (!info.availableModels) throw new Error('No available models');
      if (!Array.isArray(info.availableModels)) throw new Error('Available models should be an array');
    });

    // Test 2: Initialization
    await this.test('Model Initialization', async () => {
      const startTime = Date.now();
      
      const success = await webLLMService.initialize((progress) => {
        console.log(`Progress: ${progress.text} - ${Math.round(progress.progress * 100)}%`);
      });
      
      const loadTime = (Date.now() - startTime) / 1000;
      console.log(`Model loaded in ${loadTime.toFixed(2)} seconds`);
      
      if (!success) throw new Error('Initialization failed');
      
      const info = webLLMService.getModelInfo();
      if (!info.isInitialized) throw new Error('Model not marked as initialized');
    });

    // Test 3: Simple Chat
    await this.test('Simple Chat Response', async () => {
      const response = await webLLMService.chat('Hello!', []);
      console.log('AI Response:', response);
      
      if (!response) throw new Error('No response received');
      if (response.length < 10) throw new Error('Response too short');
    });

    // Test 4: Streaming Chat
    await this.test('Streaming Chat', async () => {
      let streamedContent = '';
      let chunkCount = 0;
      
      const response = await webLLMService.chat(
        'Tell me something positive.',
        [],
        (chunk) => {
          streamedContent += chunk;
          chunkCount++;
        }
      );
      
      console.log('Streamed response:', response);
      console.log('Chunks received:', chunkCount);
      
      if (chunkCount === 0) throw new Error('No streaming chunks received');
      if (streamedContent !== response) throw new Error('Streamed content mismatch');
    });

    // Test 5: Conversation Context
    await this.test('Conversation Context', async () => {
      const history = [
        { role: 'user', content: 'My name is Alex.' },
        { role: 'assistant', content: 'Nice to meet you, Alex! How can I help you today?' }
      ];
      
      const response = await webLLMService.chat('What is my name?', history);
      console.log('Context-aware response:', response);
      
      const lowerResponse = response.toLowerCase();
      if (!lowerResponse.includes('alex')) {
        throw new Error('AI did not remember the name from context');
      }
    });

    // Test 6: Journal Analysis
    await this.test('Journal Analysis', async () => {
      const journalEntry = "Had a wonderful day today! Got promoted at work and celebrated with my family. Feeling grateful and excited about the future.";
      
      const analysis = await webLLMService.analyzeJournal(journalEntry);
      console.log('Analysis result:', analysis);
      
      if (!analysis.emotion) throw new Error('No emotion detected');
      if (typeof analysis.sentiment !== 'number') throw new Error('Sentiment should be a number');
      if (!analysis.stress) throw new Error('No stress level detected');
      if (!Array.isArray(analysis.themes)) throw new Error('Themes should be an array');
      
      // Verify positive sentiment for positive entry
      if (analysis.sentiment < 7) {
        console.warn('Expected higher sentiment for positive entry');
      }
    });

    // Test 7: Negative Emotion Analysis
    await this.test('Negative Emotion Analysis', async () => {
      const journalEntry = "Feeling overwhelmed and anxious. Can't stop worrying about everything. Couldn't sleep last night.";
      
      const analysis = await webLLMService.analyzeJournal(journalEntry);
      console.log('Negative analysis:', analysis);
      
      // Verify negative sentiment
      if (analysis.sentiment > 5) {
        console.warn('Expected lower sentiment for negative entry');
      }
      
      const validEmotions = ['anxious', 'stressed', 'worried', 'sad', 'overwhelmed'];
      if (!validEmotions.includes(analysis.emotion.toLowerCase())) {
        console.warn(`Expected negative emotion, got: ${analysis.emotion}`);
      }
    });

    // Test 8: Therapy Recommendations
    await this.test('Therapy Recommendations', async () => {
      const moodData = {
        avgSentiment: 4,
        stressLevel: 'moderate: 5, high: 3, low: 2',
        commonEmotions: ['anxious', 'stressed', 'worried']
      };
      
      const recommendations = await webLLMService.generateTherapyRecommendations(moodData);
      console.log('Recommendations:', recommendations);
      
      if (!recommendations) throw new Error('No recommendations generated');
      if (recommendations.length < 50) throw new Error('Recommendations too brief');
    });

    // Test 9: Mental Health Report
    await this.test('Mental Health Report Generation', async () => {
      const userData = {
        journalCount: 15,
        avgSentiment: 6.5,
        stressDistribution: 'Low: 5, Moderate: 7, High: 3',
        topEmotions: ['calm', 'happy', 'anxious'],
        timePeriod: 'Last 30 days'
      };
      
      const report = await webLLMService.generateMentalHealthReport(userData);
      console.log('Mental health report:', report);
      
      if (!report) throw new Error('No report generated');
      if (report.length < 100) throw new Error('Report too brief');
    });

    // Test 10: Runtime Stats
    await this.test('Runtime Statistics', async () => {
      const stats = await webLLMService.runtimeStatsText();
      console.log('Runtime stats:', stats);
      
      if (!stats) throw new Error('No stats returned');
    });

    // Test 11: Chat Reset
    await this.test('Chat Context Reset', async () => {
      await webLLMService.resetChat();
      console.log('Chat context reset successfully');
    });

    // Print Summary
    this.printSummary();
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('📊 Test Summary', 'test');
    this.log('='.repeat(60), 'info');
    
    this.log(`Total Tests: ${this.passed + this.failed}`, 'info');
    this.log(`Passed: ${this.passed}`, 'success');
    this.log(`Failed: ${this.failed}`, this.failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`, 'info');
    
    if (this.failed === 0) {
      this.log('\n🎉 All tests passed! WebLLM integration is working perfectly!', 'success');
    } else {
      this.log('\n⚠️ Some tests failed. Check the errors above.', 'error');
    }
    
    this.log('\n' + '='.repeat(60) + '\n', 'info');
    
    return this.results;
  }

  async quickTest() {
    this.log('🚀 Quick WebLLM Test', 'test');
    
    try {
      // Initialize
      this.log('Initializing model...', 'info');
      await webLLMService.initialize((progress) => {
        console.log(`${progress.text}: ${Math.round(progress.progress * 100)}%`);
      });
      
      // Simple chat
      this.log('\nSending test message...', 'info');
      const response = await webLLMService.chat('Hi! How are you?', []);
      
      this.log('\n✅ WebLLM is working!', 'success');
      this.log(`AI Response: ${response}`, 'info');
      
      return true;
    } catch (error) {
      this.log('\n❌ WebLLM test failed!', 'error');
      this.log(`Error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Export test runner
const webLLMTests = new WebLLMTests();

// Auto-run in development
if (import.meta.env.DEV) {
  console.log('WebLLM Test Suite loaded. Run tests with:');
  console.log('  webLLMTests.quickTest() - Quick verification');
  console.log('  webLLMTests.runAll() - Full test suite');
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  window.webLLMTests = webLLMTests;
}

export default webLLMTests;
