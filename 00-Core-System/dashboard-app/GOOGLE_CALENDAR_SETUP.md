# 📅 Google Calendar Integration - Setup Guide

## 🎯 What This Enables

- **Two-way sync** between your dashboard and Google Calendar
- **Auto-import** calendar events as time blocks
- **Create events** from time blocks
- **Sync frog tasks** to calendar
- **Meeting awareness** - see upcoming meetings in dashboard
- **Focus time blocking** - block calendar for deep work

## 🚀 Quick Setup (10 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Cymatic OS Dashboard"
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Configure consent screen:
   - User Type: External (or Internal if workspace)
   - App name: "Cymatic OS"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `../auth/calendar` and `../auth/calendar.events`
4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Cymatic OS Dashboard"
   - Authorized redirect URIs:
     - `http://localhost:8080/auth/google/callback`
     - `http://localhost:3000/auth/google/callback` (if using different port)
5. Download JSON credentials

### Step 3: Configure Dashboard

1. Save credentials as `google-credentials.json` in dashboard-app folder
2. Create `.env` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# Optional: Specify calendar ID (default: primary)
GOOGLE_CALENDAR_ID=primary

# Sync settings
CALENDAR_SYNC_INTERVAL=300000  # 5 minutes in ms
AUTO_CREATE_EVENTS=true
SYNC_PAST_DAYS=7
SYNC_FUTURE_DAYS=30
```

3. Install dependencies:

```bash
npm install googleapis dotenv
```

### Step 4: Start Server

```bash
npm start
```

You'll see:
```
📅 Google Calendar: Not authenticated
📊 Dashboard: http://localhost:8080
🔗 Authenticate: http://localhost:8080/auth/google
```

### Step 5: Authenticate

1. Open: `http://localhost:8080/auth/google`
2. Sign in with Google account
3. Grant calendar permissions
4. You'll be redirected back with success message
5. Dashboard will show: `📅 Google Calendar: Connected ✓`

## 🔄 How Sync Works

### Dashboard → Google Calendar

**Time Blocks:**
- Create time block in dashboard
- Automatically creates calendar event
- Updates: title, time, duration
- Deletes: removes from calendar

**Frog Task:**
- Set frog task with deadline
- Creates all-day or timed event
- Marked with 🐸 emoji
- Completing frog marks event as complete

**Focus Sessions:**
- Start focus mode
- Creates "Focus Time" event with 🧘 emoji
- Blocks calendar for duration
- Updates when you pause/complete

### Google Calendar → Dashboard

**Meetings/Events:**
- Imports as time blocks
- Shows in "Time Blocks" section
- Synced events marked with 📅 icon
- Can't delete from dashboard (edit in Calendar)

**Changes:**
- Event updated in Calendar → Updates time block
- Event deleted in Calendar → Removes time block
- New event created → Adds time block

**Meeting Reminders:**
- 15 min before: Browser notification
- Shows in "Upcoming" section
- Suggests energy level based on meeting type

### Sync Frequency

- **Real-time**: Dashboard → Calendar (immediate)
- **Polling**: Calendar → Dashboard (every 5 min)
- **Manual**: Click "🔄 Sync Calendar" button

## 📋 Usage Examples

### Example 1: Time Block → Calendar Event

**In Dashboard:**
```
Create Time Block:
- Time: 2:00 PM
- Task: "Client presentation"
- Duration: 60 min
```

**In Google Calendar:**
```
Event Created:
- Title: "🎯 Client presentation"
- Start: 2:00 PM
- End: 3:00 PM
- Description: "Created from Cymatic OS"
```

### Example 2: Frog Task → All-Day Event

**In Dashboard:**
```
Set Frog Task:
- Task: "Complete security audit"
- Deadline: 6:00 PM
- Why: "Unblocks release"
```

**In Google Calendar:**
```
Event Created:
- Title: "🐸 Complete security audit"
- All-day event
- Reminder: 6:00 PM
- Description: "WHY: Unblocks release"
```

### Example 3: Calendar → Dashboard Import

**In Google Calendar:**
```
Meeting Scheduled:
- Title: "Team standup"
- Time: 9:00 AM - 9:30 AM
- Recurring: Daily
```

**In Dashboard:**
```
Time Block Created:
- 📅 Team standup
- 9:00 AM (30 min)
- [Synced from Google]
- Suggested Energy: Low (it's a meeting)
```

## ⚙️ Advanced Features

### Smart Categorization

Events are auto-categorized based on title keywords:

- **Focus Time** → High Energy bucket
  - Keywords: "focus", "deep work", "coding", "writing"
- **Meetings** → Low Energy bucket
  - Keywords: "meeting", "call", "standup", "sync"
- **Creative Work** → Creative bucket
  - Keywords: "design", "brainstorm", "planning", "strategy"

### Meeting-Aware Scheduling

Dashboard suggests time blocks:
```javascript
// Finds free slots between meetings
GET /api/calendar/free-slots?duration=90&after=2:00PM

Response:
[
  { start: "2:00 PM", end: "3:30 PM", duration: 90 },
  { start: "4:00 PM", end: "5:30 PM", duration: 90 }
]
```

### Focus Time Protection

```javascript
// Blocks calendar for focus work
POST /api/calendar/block-focus
{
  "title": "Deep Work",
  "duration": 90,
  "time": "auto"  // Finds next free slot
}
```

### Multi-Calendar Support

```javascript
// Sync multiple calendars
GOOGLE_CALENDARS=primary,work@company.com,personal@gmail.com

// View combined or separate
GET /api/calendar/events?calendar=work
GET /api/calendar/events  // All calendars
```

## 🔐 Security & Privacy

### What We Access

✅ Read calendar events
✅ Create/update/delete events
❌ **NO** access to email
❌ **NO** access to other Google services
❌ **NO** data stored on external servers

### Data Storage

- **Tokens:** Stored in `.dashboard-data/google-tokens.json` (local only)
- **Events:** Cached in `.dashboard-data/calendar-cache.json`
- **Sync:** Only metadata synced, full details in Google
- **Offline:** Uses cache, syncs when online

### Revoke Access

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "Cymatic OS Dashboard"
3. Click "Remove Access"
4. Or in dashboard: Settings → Calendar → Disconnect

## 🛠️ Troubleshooting

### "OAuth error: invalid_client"

- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Verify redirect URI matches in Google Console
- Ensure API is enabled

### "Calendar not syncing"

- Check server logs for errors
- Verify token file exists: `.dashboard-data/google-tokens.json`
- Try re-authenticating: `/auth/google`
- Check quota limits in Google Console

### "Events showing twice"

- Dashboard auto-deduplicates by event ID
- If persists, clear cache: `rm .dashboard-data/calendar-cache.json`
- Restart server

### "Can't create events"

- Verify scope includes `calendar.events` (not just `calendar.readonly`)
- Re-authenticate with correct scopes
- Check calendar permissions in Google

## 📊 API Endpoints

### Authentication
```
GET  /auth/google               # Initiate OAuth flow
GET  /auth/google/callback      # OAuth callback
POST /auth/google/disconnect    # Disconnect calendar
GET  /auth/google/status        # Check connection status
```

### Calendar Operations
```
GET  /api/calendar/events                    # List all events
GET  /api/calendar/events/:id                # Get event details
POST /api/calendar/events                    # Create event
PUT  /api/calendar/events/:id                # Update event
DELETE /api/calendar/events/:id              # Delete event
```

### Sync & Analysis
```
POST /api/calendar/sync                      # Manual sync
GET  /api/calendar/free-slots                # Find free time
POST /api/calendar/block-focus               # Block focus time
GET  /api/calendar/meeting-summary           # Daily meeting summary
```

## 🎨 UI Components

### Calendar View (New)

Access: Sidebar → 📅 Calendar

**Features:**
- Week view with events
- Drag-to-create time blocks
- Color-coded by type
- Click event to see details
- Create from dashboard or import from Calendar

### Calendar Widget (Dashboard)

Shows on main dashboard:
- Next 3 meetings
- Free time remaining today
- Sync status
- Quick "Block Focus Time" button

### Notifications

- Browser notifications for:
  - Upcoming meetings (15 min before)
  - Sync failures
  - Event conflicts
- In-app toasts for:
  - Successful sync
  - Events created
  - Changes detected

## 🚀 Next Steps

1. ✅ Complete OAuth setup
2. ✅ Authenticate with Google
3. ✅ Create first time block → See it in Calendar
4. ✅ Add meeting in Calendar → See it in Dashboard
5. ✅ Set frog task → See all-day event created
6. ✅ Explore calendar view and analytics

---

**Google Calendar is now your productivity command center's external brain!** 📅🧠
