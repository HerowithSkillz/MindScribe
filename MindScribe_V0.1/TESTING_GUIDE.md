# 🧪 Testing Guide - Debug & Task Queue Features

## Quick Start

Your dev server is running at: **http://localhost:3000/**

---

## 🎯 Test Scenarios

### Test 1: Debug Console Access
**Goal**: Verify the new Debug tab is accessible

1. Login to MindScribe
2. Look for **🐛 Debug** tab in navigation
3. Click on Debug tab
4. Should see:
   - Status bar (Model Status, Total Logs, Errors, Tasks)
   - Filter buttons (All, Info, Tasks, Success, Warning, Error)
   - Control buttons (Auto-scroll, Refresh, Clear)
   - Dark console interface

✅ **Expected**: Debug page loads with live console interface

---

### Test 2: Task Queue Prevention (Critical!)
**Goal**: Ensure only ONE AI task runs at a time

#### Steps:
1. Go to **Chat** page
2. Select an AI model if not already selected
3. Send a message like "Hello, how are you?"
4. **Immediately** switch to **Debug** tab (while chat is generating)
5. Watch the logs in real-time
6. You should see logs like:
   - `📋 Starting chat task...`
   - `ℹ️ Calling AI engine...`
   - `✅ Chat completed successfully`
   - `ℹ️ Chat task completed`

7. Now while STILL generating (or immediately after), go to **Report** page
8. Click **"Generate AI Analysis & Report"**
9. Switch to **Debug** tab
10. You should see:
    - `⚠️ Waiting for current task to complete...` (if chat still running)
    - OR `📋 Starting report generation...` (if chat finished)

✅ **Expected**: 
- Tasks run one at a time (never simultaneously)
- Debug logs show "waiting" when task queue is blocked
- No race conditions or conflicts

❌ **Old Behavior**: 
- Both would run simultaneously
- Chat would slow down
- Report might get stuck

---

### Test 3: Report Generation with Debug Details
**Goal**: See detailed progress during report generation

#### Steps:
1. Make sure you have some journal entries (create 2-3 if needed)
2. Go to **Report** page
3. Click **"Generate AI Analysis & Report"** button
4. Watch the progress bar and steps
5. Click **"🐛 Show Technical Details"** button (below progress bar)
6. You should see:
   - Live debug console embedded in the page
   - Real-time logs appearing as AI processes
   - Timestamps with milliseconds
   - Color-coded messages (blue info, green success, red errors)

7. If report gets stuck or has errors, you'll see them in red:
   - `❌ Error: [detailed error message]`

8. Click **"→ View Full Debug Console"** link
9. Should navigate to full Debug page with all logs

✅ **Expected**: 
- Can see exactly what the AI is doing
- Errors are immediately visible
- Progress goes smoothly through all stages (0% → 10% → 30% → 60% → 80% → 100%)
- No more mysterious "stuck at 30%"

---

### Test 4: Error Visibility
**Goal**: Verify errors are clearly shown

#### Simulate Error:
1. Go to Debug page
2. Clear logs (click 🗑️ Clear button, confirm)
3. Go to Chat page
4. Try to send a message WITHOUT selecting a model (if possible)
5. Switch to Debug page
6. Should see error log:
   - `❌ AI engine not initialized`

✅ **Expected**: 
- Errors show up in red
- Filter by "Error" works
- Error count increases in status bar

---

### Test 5: Live Log Updates
**Goal**: Verify real-time event updates

#### Steps:
1. Open Debug page in one tab
2. Open Chat page in another tab/window
3. Send a chat message
4. **Immediately** switch back to Debug page
5. Watch logs appear in real-time (no need to refresh!)

✅ **Expected**: 
- Logs update automatically via window events
- No need to click "Refresh"
- Auto-scroll keeps latest logs visible

---

### Test 6: Filter and Clear Functions
**Goal**: Test debug console controls

#### Steps:
1. Go to Debug page with some logs
2. Click filter buttons:
   - **All** - shows everything
   - **Info** - only blue ℹ️ logs
   - **Tasks** - only purple 📋 logs
   - **Success** - only green ✅ logs
   - **Errors** - only red ❌ logs
3. Click **🔄 Refresh** - should reload logs
4. Click **📌 Auto-scroll OFF** - scroll should stop
5. Send new chat message
6. New logs appear but page doesn't auto-scroll
7. Click **📌 Auto-scroll ON** - scrolls to bottom
8. Click **🗑️ Clear** - confirm dialog appears
9. Confirm - all logs cleared

✅ **Expected**: All controls work as described

---

## 🐛 What to Watch For

### Signs Task Queue is Working:
- ✅ Only one spinner/loading at a time
- ✅ Chat responses feel faster (no interference)
- ✅ Report generation completes smoothly
- ✅ Debug logs show tasks queuing up ("Waiting for...")

### Signs of Issues:
- ❌ Multiple spinners at once
- ❌ Chat still feels slow
- ❌ Report gets stuck (check Debug page for errors)
- ❌ Debug logs don't appear
- ❌ Errors not shown in red

---

## 📊 Success Metrics

After testing, you should have:

1. ✅ Debug tab accessible and functional
2. ✅ Only one AI task running at a time
3. ✅ Real-time log updates working
4. ✅ Report generation shows technical details
5. ✅ Errors clearly visible in red
6. ✅ All filter buttons working
7. ✅ Auto-scroll, refresh, clear work properly
8. ✅ No more "stuck at 30%" issues

---

## 🔍 Troubleshooting

### Debug Page Shows No Logs
- Try generating a chat message or report
- Check that model is initialized
- Logs start appearing after first AI interaction

### Logs Not Updating in Real-Time
- Hard refresh page (Ctrl+Shift+R)
- Check browser console for errors
- Verify window.addEventListener is working

### Report Still Gets Stuck
1. Go to Debug page
2. Look for red error logs
3. Share the error message for investigation
4. Check that model is properly loaded

### Task Queue Not Working
- Check Debug logs for "Waiting for..." messages
- If both tasks run simultaneously, there may be a code issue
- Check browser console for JavaScript errors

---

## 💡 Pro Tips

1. **Keep Debug tab open** while testing other features
2. **Use filters** to focus on specific log types
3. **Check error count** in status bar for quick health check
4. **Export logs** by copy-pasting from console (future: download feature)
5. **Auto-scroll OFF** is useful when analyzing past logs

---

## 🎉 Expected Results

After all tests pass:
- **Chat** should be fast and responsive
- **Report** should generate without getting stuck
- **Debug** page should show everything happening
- **Errors** should be clear and actionable
- **No more mystery delays** or silent failures

**You now have full visibility into the AI's operations! 🚀**

---

## 📸 Screenshots to Take (Optional)

1. Debug page with logs
2. Report page with "Show Technical Details" expanded
3. Task queue "waiting" message in logs
4. Error logs in red
5. Status bar with counts

Share these if reporting issues or showing off the feature!
