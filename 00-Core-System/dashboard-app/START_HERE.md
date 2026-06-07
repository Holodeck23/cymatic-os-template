# 🌊 Your Life Dashboard - Start Here

## What This Is

A **simple, beautiful interface** to capture, store, and retrieve EVERYTHING in your life:

- ✅ Tasks & todos
- 💼 Client notes
- 🍳 Recipes
- 💡 Ideas
- 📝 Notes
- 🔗 Links
- ...literally anything

**With Claude Code built right in** so I can help you manage it all.

---

## 🚀 How to Use (Super Simple)

### 1. Open the Dashboard

```bash
cd "Cymatic OS/00-Core-System/dashboard-app"
npm start
```

Then visit: **http://localhost:8080/index-simple.html**

### 2. Quick Capture Anything

Type in the box at the top and press Enter:

- "Client: Schedule follow-ups"
- "Recipe: Mom's lasagna - ricotta, marinara, pasta sheets"
- "Call dentist tomorrow"
- "Idea: What if we automated the intake forms?"
- "https://interesting-article.com"

**It auto-detects what category it is** and saves it instantly!

### 3. Track Your Status (Top Section)

**These are YOUR inputs - edit them directly:**

- **Energy**: How much energy do you have? (1-10)
- **Stress**: How stressed? (1-10)
- **Mood**: How you feeling? (text)
- **Today's Focus**: What's your #1 priority today? (text)

Just type and it saves automatically!

### 4. Chat with Claude (Bottom Right)

Click the **🤖** button to open chat.

Ask me anything:
- "What should I focus on right now?"
- "Show me all my client items"
- "Help me plan my day"
- "What recipes do I have saved?"

I can see everything you've captured and help you organize it!

### 5. Search Everything

Use the search bar to find anything instantly across all your items.

---

## 📱 What You Can Do

### Capture
- Type anything, press Enter
- Auto-categorizes (task/client/recipe/idea/note/link)
- Saves locally AND to server
- Works offline!

### View
- See all items or filter by category
- Click category buttons (All, Tasks, Clients, Recipes, etc.)
- Search to find anything fast

### Edit
- Click "Edit" on any item
- Type directly in the card
- Press Enter or click away to save

### Delete
- Click "Delete" button
- Confirms before removing

### Status
- Edit energy/stress/mood/focus at top
- Tracks your current state
- Claude uses this context to help you

---

## 🎯 Example Workflows

### Morning Routine
1. Update your **Energy** and **Stress** levels
2. Set **Today's Focus**
3. Ask Claude: "What should I tackle first today?"
4. Capture any new tasks

### Capture Client Note
```
Type: "Client: send follow-up notes after today's meeting"
Press Enter → Auto-saved to Clients category
```

### Save a Recipe
```
Type: "Recipe: Chicken Tacos - chicken breast, taco seasoning, tortillas,
       lime juice, cilantro. Cook 20 min at 375°F"
Press Enter → Auto-saved to Recipes
```

### Brain Dump
```
Just type anything on your mind:
- "Need to fix the garage door"
- "Idea for new marketing campaign"
- "Buy milk and eggs"
- "https://cool-article.com"

Everything gets captured and categorized automatically!
```

### Ask Claude for Help
```
You: "I have low energy today, what should I do?"
Claude: "Based on your energy level of 3/10, I suggest focusing on
         your low-effort tasks. You have 5 items in your task list -
         let me show you the quick wins..."
```

---

## 💾 Where Your Data Lives

### Local (Instant)
- Browser localStorage (works offline)
- `.dashboard-data/life-items.json` (backup)
- `.dashboard-data/current-status.json` (your status)

### Synced
- Saves to server automatically
- Real-time updates across devices
- All data in your Cymatic OS vault

### Private
- Everything stays on YOUR machine
- No cloud services
- You control your data

---

## 🤖 About the Claude Integration

The floating chat button (🤖) connects you directly to me!

### What I Can Do:
- ✅ See all your captured items
- ✅ Know your current energy/stress/mood
- ✅ Help you prioritize
- ✅ Find things you've saved
- ✅ Suggest next actions
- ✅ Organize your thoughts

### What I Can't Do:
- ❌ Judge you for anything you capture
- ❌ Share your data anywhere
- ❌ Work without you asking

**I'm here to help make sense of the chaos!**

---

## 🎨 Customization

### Add New Categories

Edit `app-simple.js` around line 40:

```javascript
const categories = {
    task: '✅',
    client: '💼',
    recipe: '🍳',
    idea: '💡',
    note: '📝',
    link: '🔗',
    workout: '💪',  // Add this
    finance: '💰'   // And this
};
```

Then add detection in `detectCategory()` function.

### Change Colors

Edit the CSS in `index-simple.html`:
```css
/* Find this gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to your colors */
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

---

## 🔧 Troubleshooting

### "Nothing saves"
- Check server is running (npm start)
- Look for errors in terminal
- Data still saves to localStorage as backup

### "Can't see chat"
- Click the 🤖 button in bottom right
- If not there, refresh page
- Check browser console for errors

### "Categories wrong"
- Edit `detectCategory()` in app-simple.js
- Add your own keyword patterns
- Or just edit the category after capture

### "Want to move to another category"
- Click Edit
- Change the content to trigger new category
- Or manually drag to different category (coming soon)

---

## 🚀 What's Next

This is YOUR life dashboard. It's meant to be simple and flexible.

**Capture everything.** Don't overthink categories - the system learns from your keywords and gets smarter.

**Track your state.** The energy/stress/mood helps me (Claude) give you better suggestions.

**Chat with me.** I'm here to help you make sense of it all and take action.

**Keep it simple.** The best productivity system is the one you actually use.

---

## 🎯 The Philosophy

Unlike all those complex productivity apps with GTD, time blocking, energy matrices, Pomodoros, etc...

**This is just:**

1. **Capture** - Get it out of your head
2. **Find** - Search when you need it
3. **Act** - Do the thing (with Claude's help)

That's it. Everything else is noise.

---

**Now go capture something!** 🌊

Type anything in that box at the top and press Enter. Watch the magic happen.

And if you need me, just click the 🤖 button.

- Claude
