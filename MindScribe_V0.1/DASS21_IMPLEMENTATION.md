# DASS-21 Assessment Integration

## Overview
MindScribe now includes the industry-standard DASS-21 (Depression, Anxiety, and Stress Scale - 21 items) assessment. This validated psychological tool provides a baseline understanding of the user's mental health status, enabling personalized AI support.

## What is DASS-21?

The DASS-21 is a widely-used, scientifically validated self-report instrument designed to measure three related negative emotional states:

- **Depression**: Dysphoria, hopelessness, devaluation of life, self-deprecation, lack of interest/involvement, anhedonia, and inertia
- **Anxiety**: Autonomic arousal, skeletal muscle effects, situational anxiety, and subjective experience of anxious affect
- **Stress**: Difficulty relaxing, nervous arousal, easily upset/agitated, irritable/over-reactive, and impatient

### Scoring
- Each subscale has 7 questions
- Response scale: 0-3 (Did not apply → Applied very much/most of the time)
- Raw scores are multiplied by 2 to align with DASS-42
- **Total possible score per subscale: 0-42**

### Severity Ranges

**Depression:**
- Normal: 0-9
- Mild: 10-13
- Moderate: 14-20
- Severe: 21-27
- Extremely Severe: 28+

**Anxiety:**
- Normal: 0-7
- Mild: 8-9
- Moderate: 10-14
- Severe: 15-19
- Extremely Severe: 20+

**Stress:**
- Normal: 0-14
- Mild: 15-18
- Moderate: 19-25
- Severe: 26-33
- Extremely Severe: 34+

## Implementation Details

### 1. User Flow
1. **Registration/Login** → User authenticates
2. **DASS-21 Assessment** → Required before accessing main app (if not completed)
3. **Results Display** → Shows scores with interpretation and recommendations
4. **Main Application** → User can access all features

### 2. Components Created

#### `DASS21.jsx`
- Main assessment component with 3 sections (Depression, Anxiety, Stress)
- Progress tracking and section navigation
- Color-coded by subscale (Blue, Amber, Rose)
- Responsive design with smooth animations
- Instructions page before starting

#### `DASS21Results.jsx`
- Results visualization with scores and severity levels
- Color-coded severity indicators
- Personalized recommendations based on results
- Information about how MindScribe will use the data
- Professional warning for moderate-severe cases

### 3. Storage & Encryption

**Storage Key:** `dass21_{username}`
**Storage Type:** `assessmentStorage` (encrypted with user's password)

**Stored Data:**
```javascript
{
  scores: {
    depression: Number,
    anxiety: Number,
    stress: Number
  },
  severityLevels: {
    depression: { level: String, color: String },
    anxiety: { level: String, color: String },
    stress: { level: String, color: String }
  },
  responses: Object, // All 21 question responses
  completedAt: ISO Date String,
  userName: String
}
```

### 4. AI Integration

The DASS-21 baseline is automatically provided to the AI through the system prompt:

```javascript
// In webllm.js
setDassBaseline(dassResults) {
  this.dassBaseline = dassResults;
  this.updateSystemPrompt();
}
```

**System Prompt Enhancement:**
```
User's DASS-21 Baseline Assessment:
- Depression: X/42 (Severity Level)
- Anxiety: X/42 (Severity Level)
- Stress: X/42 (Severity Level)

Tailor your responses based on this baseline...
```

This ensures the AI companion:
- Understands user's mental health baseline
- Provides appropriately tailored responses
- Shows extra empathy for elevated scores
- Offers relevant coping strategies

### 5. Authentication Flow Changes

**Before:**
```
Login → Dashboard/Chat
```

**After:**
```
Login → Check DASS-21 → 
  If not completed: DASS-21 Assessment → Results → Chat
  If completed: Chat
```

**Route Protection:**
- `ProtectedRoute`: Requires authentication
- `AssessmentGatedRoute`: Requires authentication + DASS-21 completion

### 6. Dashboard Integration

The Dashboard now displays:
- DASS-21 baseline scores at the top
- Color-coded severity indicators
- Completion date
- Visual cards for each subscale
- Privacy note

## API Reference

### AuthContext
```javascript
const {
  hasCompletedDASS21,      // Boolean: Assessment completion status
  saveDASS21Results,        // Function: Save assessment results
  getDASS21Results          // Function: Retrieve assessment results
} = useAuth();
```

### Usage Example
```javascript
// Save results
const success = await saveDASS21Results(results);

// Get results
const dassData = await getDASS21Results();
```

## Privacy & Security

1. **Local Storage**: All data stored on user's device
2. **Encryption**: DASS-21 responses encrypted with user's password
3. **No Transmission**: Data never sent to external servers
4. **User Control**: Users own their data completely

## Clinical Considerations

⚠️ **Important Notes:**
- DASS-21 is a screening tool, not a diagnostic instrument
- High scores indicate need for professional assessment
- Results help personalize support but don't replace therapy
- App displays appropriate warnings for moderate-severe scores

## Benefits

1. **Personalized Support**: AI understands user's baseline mental health
2. **Progress Tracking**: Compare future journal entries against baseline
3. **Industry Standard**: Uses validated, widely-accepted assessment
4. **User Awareness**: Helps users understand their mental health status
5. **Appropriate Response**: AI can tailor empathy and suggestions

## Future Enhancements

Potential improvements:
- Periodic re-assessment (monthly/quarterly)
- Progress charts comparing scores over time
- Export assessment reports
- Integration with journal mood analysis
- Trend comparison (DASS vs daily mood)

## Testing Recommendations

1. **Complete Assessment**: Test all 21 questions, 3 sections
2. **Scoring Accuracy**: Verify calculations and severity classifications
3. **Storage**: Confirm encryption and retrieval work correctly
4. **AI Context**: Verify AI receives and uses DASS-21 data
5. **Route Protection**: Ensure users can't bypass assessment
6. **Edge Cases**: Test re-taking assessment, multiple users
7. **Results Display**: Check all severity levels display correctly

## References

- Lovibond, S.H. & Lovibond, P.F. (1995). Manual for the Depression Anxiety Stress Scales. Sydney: Psychology Foundation.
- Available at: [Psychology Foundation of Australia](http://www2.psy.unsw.edu.au/dass/)
