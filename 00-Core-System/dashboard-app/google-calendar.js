/**
 * Google Calendar Integration Module for Cymatic OS Dashboard
 *
 * Provides complete OAuth 2.0 authentication and bidirectional sync
 * between Google Calendar and the dashboard's time blocks system.
 *
 * @module google-calendar
 * @requires googleapis
 * @requires fs/promises
 * @requires path
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};

// Data paths
const DATA_DIR = path.join(__dirname, '.dashboard-data');
const TOKENS_PATH = path.join(DATA_DIR, 'google-tokens.json');
const CACHE_PATH = path.join(DATA_DIR, 'calendar-cache.json');

// Event categorization keywords
const categories = {
  high: ['focus', 'deep work', 'coding', 'development', 'writing', 'implementation'],
  low: ['meeting', 'call', 'standup', 'sync', 'check-in', 'review', 'catch-up'],
  creative: ['design', 'brainstorm', 'planning', 'strategy', 'ideation', 'workshop']
};

// Auto-sync state
let syncInterval = null;
let oauth2Client = null;

// ============================================================================
// INITIALIZATION & SETUP
// ============================================================================

/**
 * Initialize OAuth2 client
 * @private
 */
function initOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }
  return oauth2Client;
}

/**
 * Ensure data directory exists
 * @private
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Load tokens from file
 * @private
 * @returns {Promise<Object|null>} Token object or null if not found
 */
async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Save tokens to file
 * @private
 * @param {Object} tokens - Token object from OAuth
 */
async function saveTokens(tokens) {
  await ensureDataDir();
  await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Load calendar cache
 * @private
 * @returns {Promise<Object>} Cached calendar data
 */
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { events: [], lastSync: null };
    }
    throw error;
  }
}

/**
 * Save calendar cache
 * @private
 * @param {Object} cache - Cache data to save
 */
async function saveCache(cache) {
  await ensureDataDir();
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * Check if tokens are expired and refresh if needed
 * @private
 * @returns {Promise<boolean>} True if tokens are valid
 */
async function ensureValidTokens() {
  const client = initOAuth2Client();
  const tokens = await loadTokens();

  if (!tokens) {
    return false;
  }

  client.setCredentials(tokens);

  // Check if token is expired or will expire soon (within 5 minutes)
  const expiryDate = tokens.expiry_date;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryDate && expiryDate - now < fiveMinutes) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await saveTokens(credentials);
      client.setCredentials(credentials);
      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing access token:', error.message);
      return false;
    }
  }

  return true;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 * @returns {string} Authorization URL for user to visit
 */
function getAuthUrl() {
  const client = initOAuth2Client();

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: config.scopes,
    prompt: 'consent' // Force consent to get refresh token
  });
}

/**
 * Handle OAuth callback and exchange code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Promise<Object>} Token object
 * @throws {Error} If token exchange fails
 */
async function handleCallback(code) {
  const client = initOAuth2Client();

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    await saveTokens(tokens);

    console.log('Google Calendar authentication successful');
    return tokens;
  } catch (error) {
    console.error('Error exchanging authorization code:', error.message);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Disconnect Google Calendar (remove stored tokens)
 * @returns {Promise<void>}
 */
async function disconnect() {
  try {
    await fs.unlink(TOKENS_PATH);
    oauth2Client = null;
    console.log('Google Calendar disconnected');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Check if user is authenticated with Google Calendar
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated() {
  return await ensureValidTokens();
}

// ============================================================================
// CALENDAR EVENT OPERATIONS
// ============================================================================

/**
 * Get calendar instance with authenticated client
 * @private
 * @returns {Promise<Object>} Google Calendar API instance
 * @throws {Error} If not authenticated
 */
async function getCalendar() {
  if (!await ensureValidTokens()) {
    throw new Error('Not authenticated with Google Calendar');
  }

  const client = initOAuth2Client();
  return google.calendar({ version: 'v3', auth: client });
}

/**
 * Fetch events from Google Calendar
 * @param {Date|string} timeMin - Start time for events
 * @param {Date|string} timeMax - End time for events
 * @returns {Promise<Array>} Array of formatted calendar events
 */
async function getCalendarEvents(timeMin, timeMax) {
  try {
    const calendar = await getCalendar();

    const response = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: timeMin instanceof Date ? timeMin.toISOString() : timeMin,
      timeMax: timeMax instanceof Date ? timeMax.toISOString() : timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    });

    const events = response.data.items || [];

    // Update cache
    const cache = await loadCache();
    cache.events = events;
    cache.lastSync = new Date().toISOString();
    await saveCache(cache);

    // Format for dashboard
    return events.map(formatCalendarEvent);
  } catch (error) {
    return handleApiError(error, 'fetching events');
  }
}

/**
 * Create a new calendar event
 * @param {Object} timeBlock - Time block data from dashboard
 * @param {string} timeBlock.title - Event title
 * @param {Date|string} timeBlock.start - Start time
 * @param {Date|string} timeBlock.end - End time
 * @param {string} [timeBlock.description] - Event description
 * @param {string} [timeBlock.category] - Event category
 * @returns {Promise<string>} Created event ID
 */
async function createCalendarEvent(timeBlock) {
  try {
    const calendar = await getCalendar();

    const event = {
      summary: timeBlock.title,
      description: buildDescription(timeBlock),
      start: {
        dateTime: timeBlock.start instanceof Date ? timeBlock.start.toISOString() : timeBlock.start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: timeBlock.end instanceof Date ? timeBlock.end.toISOString() : timeBlock.end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: getCategoryColorId(timeBlock.category),
      extendedProperties: {
        private: {
          source: 'cymatic-os',
          createdAt: new Date().toISOString()
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event
    });

    console.log(`Created calendar event: ${timeBlock.title} (${response.data.id})`);
    return response.data.id;
  } catch (error) {
    return handleApiError(error, 'creating event');
  }
}

/**
 * Update an existing calendar event
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated event
 */
async function updateCalendarEvent(eventId, updates) {
  try {
    const calendar = await getCalendar();

    // First, get the existing event
    const existing = await calendar.events.get({
      calendarId: config.calendarId,
      eventId: eventId
    });

    // Merge updates
    const event = { ...existing.data };

    if (updates.title) {
      event.summary = updates.title;
    }

    if (updates.start) {
      event.start = {
        dateTime: updates.start instanceof Date ? updates.start.toISOString() : updates.start,
        timeZone: event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    if (updates.end) {
      event.end = {
        dateTime: updates.end instanceof Date ? updates.end.toISOString() : updates.end,
        timeZone: event.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    if (updates.description !== undefined) {
      event.description = updates.description;
    }

    if (updates.category) {
      event.colorId = getCategoryColorId(updates.category);
    }

    const response = await calendar.events.update({
      calendarId: config.calendarId,
      eventId: eventId,
      requestBody: event
    });

    console.log(`Updated calendar event: ${eventId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'updating event');
  }
}

/**
 * Delete a calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteCalendarEvent(eventId) {
  try {
    const calendar = await getCalendar();

    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId: eventId
    });

    console.log(`Deleted calendar event: ${eventId}`);
    return true;
  } catch (error) {
    return handleApiError(error, 'deleting event');
  }
}

// ============================================================================
// SMART SYNC LOGIC
// ============================================================================

/**
 * Sync a time block to Google Calendar
 * @param {Object} timeBlock - Time block from dashboard
 * @returns {Promise<string>} Event ID (existing or newly created)
 */
async function syncTimeBlockToCalendar(timeBlock) {
  try {
    // Check if time block already has an event ID
    if (timeBlock.eventId) {
      // Update existing event
      await updateCalendarEvent(timeBlock.eventId, timeBlock);
      return timeBlock.eventId;
    } else {
      // Create new event
      const eventId = await createCalendarEvent(timeBlock);
      return eventId;
    }
  } catch (error) {
    console.error('Error syncing time block to calendar:', error.message);
    throw error;
  }
}

/**
 * Import events from Google Calendar and convert to time blocks
 * @param {Date} [startDate] - Start date (defaults to today)
 * @param {number} [daysAhead=7] - Number of days to import
 * @returns {Promise<Array>} Array of time blocks
 */
async function importCalendarEvents(startDate = new Date(), daysAhead = 7) {
  try {
    const timeMin = startDate instanceof Date ? startDate : new Date(startDate);
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + daysAhead);
    timeMax.setHours(23, 59, 59, 999);

    const events = await getCalendarEvents(timeMin, timeMax);

    // Convert to time blocks
    const timeBlocks = events
      .filter(event => !isFromCymaticOS(event))
      .map(eventToTimeBlock);

    console.log(`Imported ${timeBlocks.length} calendar events as time blocks`);
    return timeBlocks;
  } catch (error) {
    console.error('Error importing calendar events:', error.message);
    throw error;
  }
}

/**
 * Sync a frog task (eat the frog) to Google Calendar
 * @param {Object} frogTask - Frog task data
 * @param {string} frogTask.task - Task description
 * @param {string} frogTask.why - Why this task is important
 * @param {Date|string} frogTask.deadline - Task deadline
 * @param {boolean} [frogTask.allDay=true] - Create as all-day event
 * @returns {Promise<string>} Created event ID
 */
async function syncFrogToCalendar(frogTask) {
  try {
    const calendar = await getCalendar();

    const event = {
      summary: `🐸 ${frogTask.task}`,
      description: buildFrogDescription(frogTask),
      colorId: '11', // Red for important tasks
      extendedProperties: {
        private: {
          source: 'cymatic-os',
          type: 'frog-task',
          createdAt: new Date().toISOString()
        }
      }
    };

    // Handle all-day vs timed events
    if (frogTask.allDay !== false) {
      const date = frogTask.deadline instanceof Date ? frogTask.deadline : new Date(frogTask.deadline);
      const dateStr = date.toISOString().split('T')[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else {
      const deadline = frogTask.deadline instanceof Date ? frogTask.deadline : new Date(frogTask.deadline);
      // Create 1-hour block before deadline
      const start = new Date(deadline.getTime() - 60 * 60 * 1000);

      event.start = {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: deadline.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Add reminder
      event.reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }
        ]
      };
    }

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event
    });

    console.log(`Created frog task calendar event: ${frogTask.task} (${response.data.id})`);
    return response.data.id;
  } catch (error) {
    return handleApiError(error, 'creating frog task event');
  }
}

/**
 * Block focus time on calendar
 * @param {number} duration - Duration in minutes
 * @param {Date|string} [startTime] - Start time (defaults to now)
 * @returns {Promise<string>} Created event ID
 */
async function blockFocusTime(duration, startTime = new Date()) {
  try {
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const calendar = await getCalendar();

    const event = {
      summary: 'Focus Time 🧘',
      description: 'Deep work session - Do not disturb\n\nCreated from Cymatic OS',
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      transparency: 'opaque', // Shows as busy
      colorId: '9', // Blue for focus time
      extendedProperties: {
        private: {
          source: 'cymatic-os',
          type: 'focus-session',
          createdAt: new Date().toISOString()
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 5 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event
    });

    console.log(`Blocked focus time: ${duration} minutes (${response.data.id})`);
    return response.data.id;
  } catch (error) {
    return handleApiError(error, 'blocking focus time');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find free time slots in calendar
 * @param {number} duration - Required duration in minutes
 * @param {Date|string} [afterTime] - Search after this time (defaults to now)
 * @param {Date|string} [beforeTime] - Search before this time (defaults to end of day)
 * @returns {Promise<Array>} Array of free time slots
 */
async function findFreeSlots(duration, afterTime = new Date(), beforeTime = null) {
  try {
    const start = afterTime instanceof Date ? afterTime : new Date(afterTime);
    const end = beforeTime
      ? (beforeTime instanceof Date ? beforeTime : new Date(beforeTime))
      : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);

    const events = await getCalendarEvents(start, end);

    // Sort events by start time
    const sortedEvents = events
      .filter(e => e.start && e.end)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const freeSlots = [];
    let currentTime = start;

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check gap between current time and event start
      const gapMinutes = (eventStart - currentTime) / (1000 * 60);

      if (gapMinutes >= duration) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(eventStart),
          duration: gapMinutes
        });
      }

      // Move current time to end of this event
      if (eventEnd > currentTime) {
        currentTime = eventEnd;
      }
    }

    // Check remaining time until end of search period
    const remainingMinutes = (end - currentTime) / (1000 * 60);
    if (remainingMinutes >= duration) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(end),
        duration: remainingMinutes
      });
    }

    return freeSlots;
  } catch (error) {
    console.error('Error finding free slots:', error.message);
    throw error;
  }
}

/**
 * Get upcoming meetings
 * @param {number} [hours=24] - Look ahead this many hours
 * @returns {Promise<Array>} Array of upcoming meetings
 */
async function getUpcomingMeetings(hours = 24) {
  try {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const events = await getCalendarEvents(now, end);

    return events
      .filter(event => {
        const category = categorizeEvent(event.title);
        return category === 'low'; // Meetings are categorized as 'low' energy
      })
      .map(event => ({
        title: event.title,
        start: event.start,
        end: event.end,
        duration: (new Date(event.end) - new Date(event.start)) / (1000 * 60),
        attendees: event.attendees || []
      }));
  } catch (error) {
    console.error('Error getting upcoming meetings:', error.message);
    throw error;
  }
}

/**
 * Get daily meeting summary
 * @param {Date} [date] - Date to summarize (defaults to today)
 * @returns {Promise<Object>} Meeting summary statistics
 */
async function getDailyMeetingSummary(date = new Date()) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await getCalendarEvents(startOfDay, endOfDay);

    const meetings = events.filter(event => {
      const category = categorizeEvent(event.title);
      return category === 'low';
    });

    const totalMinutes = meetings.reduce((sum, event) => {
      const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
      return sum + duration;
    }, 0);

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalMeetings: meetings.length,
      totalMinutes: totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      meetings: meetings.map(m => ({
        title: m.title,
        start: m.start,
        duration: (new Date(m.end) - new Date(m.start)) / (1000 * 60)
      })),
      percentageOfDay: ((totalMinutes / (24 * 60)) * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error getting daily meeting summary:', error.message);
    throw error;
  }
}

/**
 * Categorize event by keywords in title
 * @param {string} eventTitle - Event title
 * @returns {string} Category: 'high', 'low', 'creative', or 'other'
 */
function categorizeEvent(eventTitle) {
  const title = eventTitle.toLowerCase();

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => title.includes(keyword))) {
      return category;
    }
  }

  return 'other';
}

/**
 * Convert Google Calendar event to dashboard time block
 * @param {Object} calendarEvent - Google Calendar event
 * @returns {Object} Time block for dashboard
 */
function eventToTimeBlock(calendarEvent) {
  const start = calendarEvent.start?.dateTime || calendarEvent.start?.date;
  const end = calendarEvent.end?.dateTime || calendarEvent.end?.date;

  return {
    id: `gcal-${calendarEvent.id}`,
    eventId: calendarEvent.id,
    title: `📅 ${calendarEvent.summary || 'Untitled Event'}`,
    start: start ? new Date(start) : null,
    end: end ? new Date(end) : null,
    description: calendarEvent.description || '',
    category: categorizeEvent(calendarEvent.summary || ''),
    synced: true,
    source: 'google-calendar',
    link: calendarEvent.htmlLink
  };
}

/**
 * Convert dashboard time block to Google Calendar event format
 * @param {Object} timeBlock - Dashboard time block
 * @returns {Object} Google Calendar event format
 */
function timeBlockToEvent(timeBlock) {
  return {
    summary: timeBlock.title.replace(/^📅\s*/, ''), // Remove calendar emoji if present
    description: buildDescription(timeBlock),
    start: {
      dateTime: timeBlock.start instanceof Date ? timeBlock.start.toISOString() : timeBlock.start,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: timeBlock.end instanceof Date ? timeBlock.end.toISOString() : timeBlock.end,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    colorId: getCategoryColorId(timeBlock.category),
    extendedProperties: {
      private: {
        source: 'cymatic-os',
        createdAt: new Date().toISOString()
      }
    }
  };
}

/**
 * Build event description with Cymatic OS tag
 * @private
 * @param {Object} timeBlock - Time block data
 * @returns {string} Formatted description
 */
function buildDescription(timeBlock) {
  let description = timeBlock.description || '';

  if (!description.includes('Created from Cymatic OS')) {
    if (description) {
      description += '\n\n';
    }
    description += '---\nCreated from Cymatic OS';
  }

  return description;
}

/**
 * Build frog task description
 * @private
 * @param {Object} frogTask - Frog task data
 * @returns {string} Formatted description
 */
function buildFrogDescription(frogTask) {
  let description = `🐸 Eat the Frog Task\n\n`;

  if (frogTask.why) {
    description += `Why: ${frogTask.why}\n\n`;
  }

  description += '---\nCreated from Cymatic OS';

  return description;
}

/**
 * Get Google Calendar color ID for category
 * @private
 * @param {string} category - Event category
 * @returns {string} Google Calendar color ID
 */
function getCategoryColorId(category) {
  const colorMap = {
    'high': '9',      // Blue (focus/deep work)
    'low': '8',       // Gray (meetings)
    'creative': '5',  // Yellow (creative work)
    'other': '1'      // Lavender (default)
  };

  return colorMap[category] || colorMap.other;
}

/**
 * Check if event was created by Cymatic OS
 * @private
 * @param {Object} event - Calendar event
 * @returns {boolean} True if created by Cymatic OS
 */
function isFromCymaticOS(event) {
  return event.extendedProperties?.private?.source === 'cymatic-os';
}

/**
 * Format calendar event for display
 * @private
 * @param {Object} event - Raw Google Calendar event
 * @returns {Object} Formatted event
 */
function formatCalendarEvent(event) {
  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map(a => a.email) || [],
    location: event.location,
    link: event.htmlLink,
    creator: event.creator?.email,
    organizer: event.organizer?.email,
    status: event.status,
    extendedProperties: event.extendedProperties
  };
}

// ============================================================================
// AUTO-SYNC SCHEDULER
// ============================================================================

/**
 * Start automatic calendar synchronization
 * @param {number} [intervalMs=300000] - Sync interval in milliseconds (default: 5 minutes)
 * @returns {void}
 */
function startAutoSync(intervalMs = 300000) {
  if (syncInterval) {
    console.log('Auto-sync already running');
    return;
  }

  syncInterval = setInterval(async () => {
    try {
      if (await isAuthenticated()) {
        await importCalendarEvents();
        console.log('📅 Calendar auto-sync completed at', new Date().toLocaleTimeString());
      } else {
        console.log('⚠️ Auto-sync skipped - not authenticated');
      }
    } catch (error) {
      console.error('Auto-sync error:', error.message);
    }
  }, intervalMs);

  console.log(`📅 Auto-sync started (interval: ${intervalMs / 1000}s)`);
}

/**
 * Stop automatic calendar synchronization
 * @returns {void}
 */
function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('📅 Auto-sync stopped');
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle Google Calendar API errors with retry logic
 * @private
 * @param {Error} error - Error object
 * @param {string} operation - Operation being performed
 * @returns {null} Returns null on error
 */
function handleApiError(error, operation) {
  console.error(`Error ${operation}:`, error.message);

  // Handle specific error types
  if (error.code === 401) {
    console.error('Authentication error - tokens may be invalid');
    return null;
  }

  if (error.code === 403) {
    console.error('Permission denied - check OAuth scopes');
    return null;
  }

  if (error.code === 429) {
    console.error('Rate limit exceeded - please try again later');
    return null;
  }

  if (error.code === 404) {
    console.error('Resource not found');
    return null;
  }

  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    console.error('Network error - check internet connection');
    return null;
  }

  // Log full error for debugging
  console.error('Full error:', error);

  return null;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  // Authentication
  getAuthUrl,
  handleCallback,
  disconnect,
  isAuthenticated,

  // Event Operations
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,

  // Smart Sync
  syncTimeBlockToCalendar,
  importCalendarEvents,
  syncFrogToCalendar,
  blockFocusTime,

  // Helper Functions
  findFreeSlots,
  getUpcomingMeetings,
  getDailyMeetingSummary,
  categorizeEvent,
  eventToTimeBlock,
  timeBlockToEvent,

  // Auto-Sync Control
  startAutoSync,
  stopAutoSync
};
