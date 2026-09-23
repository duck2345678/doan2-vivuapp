# Gemini AI Setup Guide

## Overview

This guide explains how to enable **Google Gemini AI** for intelligent itinerary generation in your app.

**Current Status:** Using **MOCK RESPONSES** (fake data for testing UI)

**When API is enabled:** Real AI-powered itinerary suggestions based on user preferences

---

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click **"Get API Key"**
3. Sign in with your Google account
4. Click **"Create API Key"**
5. Copy your API key (starts with `AIza...`)

**Note:** Gemini API is currently FREE for testing with generous quotas!

---

## Step 2: Configure Your Project

### 2.1 Add to .env File

Create or edit `.env` file in your project root:

```bash
# Add this line with your actual API key
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyD...your_key_here
```

### 2.2 Restart Expo

After adding the API key, restart your Expo server:

```bash
npm start -- --clear
```

---

## Step 3: Enable Real API

Open `src/lib/ai/geminiService.ts` and:

1. **Comment out** the "MOCK RESPONSE" section (lines ~40-80)
2. **Uncomment** the "REAL API CALL" section (lines ~90-140)

Before:
```typescript
// ============================================================
// MOCK RESPONSE (Currently Active)
// ============================================================
const mockDestinations = [...];
return {
  title: activityTitles[request.activity],
  destinations: mockDestinations,
};

// ============================================================
// REAL API CALL (Currently Commented Out)
// ============================================================
/*
try {
  const apiKey = env.GEMINI_API_KEY;
  ...
*/
```

After:
```typescript
// ============================================================
// MOCK RESPONSE (Disabled)
// ============================================================
/*
const mockDestinations = [...];
return {
  title: activityTitles[request.activity],
  destinations: mockDestinations,
};
*/

// ============================================================
// REAL API CALL (Currently Active)
// ============================================================
try {
  const apiKey = env.GEMINI_API_KEY;
  ...
}
```

---

## Step 4: Test It Out

1. Open your app
2. Go to **"Lịch trình"** tab
3. Click **"Gợi ý bằng AI"** button
4. Complete the wizard:
   - Choose activity type
   - Select transportation
   - Pick budget
5. Click **"Gợi ý cho tôi ngay!"**
6. Wait for AI to generate your itinerary!

---

## Features

| Feature | Mock Data | Real Gemini AI |
|---------|-----------|----------------|
| Activity-based suggestions | ❌ Generic | ✅ Customized |
| Transport-aware routing | ❌ Static | ✅ Smart distance |
| Budget-appropriate venues | ❌ Random | ✅ Price-filtered |
| Real location data | ❌ Fake coords | ✅ Real places |
| Descriptions | ❌ Hardcoded | ✅ AI-generated |
| Multiple destinations | ✅ 2 places | ✅ 2-4 places |

---

## API Limits & Pricing

### Free Tier (Current)
- **60 requests per minute**
- **1,500 requests per day**
- **1 million tokens per month**

This is **MORE THAN ENOUGH** for development and testing!

### Pricing (if you exceed free tier)
- Gemini Pro: **FREE** (as of 2024)
- Input: **$0.00** per 1K tokens
- Output: **$0.00** per 1K tokens

💡 **Tip:** Gemini is much cheaper than GPT-4!

---

## Troubleshooting

### Error: "GEMINI_API_KEY not found"
- Make sure you added `EXPO_PUBLIC_GEMINI_API_KEY` to `.env`
- Restart Expo with `npm start -- --clear`
- Check the key starts with `AIza`

### Error: "Gemini API error: 403"
- Your API key is invalid or expired
- Generate a new key from [Google AI Studio](https://ai.google.dev/)

### Error: "No response from Gemini AI"
- Check your internet connection
- Verify the API endpoint is correct
- Check API status at [Google Cloud Status](https://status.cloud.google.com/)

### Still Getting Mock Data
- Make sure you uncommented the REAL API CALL section
- Check `env.GEMINI_API_KEY` is not empty in your code
- Add a `console.log(env.GEMINI_API_KEY)` to debug

---

## Advanced Customization

### Adjust AI Temperature

In `geminiService.ts`, modify the `temperature` parameter:

```typescript
generationConfig: {
  temperature: 0.7,  // 0 = deterministic, 1 = creative
  topK: 40,
  topP: 0.95,
}
```

- **0.3-0.5**: Consistent, predictable results
- **0.7-0.8**: Balanced creativity (recommended)
- **0.9-1.0**: More random, diverse suggestions

### Customize Prompt

Edit the `buildPrompt()` function to change how AI generates itineraries:

```typescript
function buildPrompt(request: ItineraryRequest): string {
  return `
    You are an AI assistant specialized in creating travel itineraries for students in Ho Chi Minh City.
    
    User preferences:
    - Activity: ${request.activity}
    - Transport: ${request.transport}
    - Budget: ${request.budget}
    
    Suggest 2-4 locations near VNUHCM...
  `;
}
```

---

## Future Enhancements

Once the basic AI is working, consider adding:

1. **🗣️ Natural Language Input**: "Tìm quán cà phê yên tĩnh gần trường"
2. **📍 Location-Aware**: Use current GPS to suggest nearby places
3. **👤 Personalized**: Learn from user's past trips and preferences
4. **🌐 Multi-language**: Support English, Vietnamese, etc.
5. **🖼️ Image Generation**: AI-generated preview images for destinations
6. **⭐ Reviews Integration**: Fetch real reviews from Google Places API

---

## Resources

- [Google AI Studio](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service) (for enhanced location data)

---

## Support

If you encounter issues:

1. Check the console logs in Expo
2. Verify your API key is correct
3. Test the API directly with curl:

```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

**Happy coding! 🚀**
