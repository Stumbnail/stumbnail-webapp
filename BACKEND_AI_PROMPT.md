# Backend Intelligence Layer Specification

## Overview

Stumbnail requires a backend AI intelligence layer that enhances user requests into optimal image generation prompts. This layer sits between the frontend and the image generation models, ensuring every thumbnail generation—whether from Smart Merge or simple prompt input—produces the best possible results.

---

## Frontend Sends

### Smart Merge Request
```json
{
  "type": "smart_merge",
  "project_id": "uuid",
  "config": {
    "content_type": "gaming | tech | vlog | reaction | comedy | educational | music | news | custom",
    "focus_subject_index": 0,
    "include_text": "none | ai | custom",
    "video_title": "User's video title for AI context",
    "text_content": "User's custom text if include_text is 'custom'",
    "text_placement": "top | center | bottom | auto",
    "text_style": "bold | outlined | shadow | minimal",
    "emotional_tone": "intense | friendly | curiosity | shocking | professional | fun"
  },
  "reference_images": ["url1", "url2", "url3"],
  "aspect_ratio": "16:9",
  "resolution": "2K"
}
```

### Simple Generation Request
```json
{
  "type": "generate",
  "project_id": "uuid",
  "prompt": "User's raw prompt text",
  "reference_images": ["url1"],
  "aspect_ratio": "16:9",
  "resolution": "2K",
  "model": "nano-banana-pro"
}
```

---

## Backend Must Do

### 1. Receive and Validate Request
- Accept both `smart_merge` and `generate` request types
- Validate required fields based on type
- Load reference images for AI analysis

### 2. Call AI Intelligence Layer (Gemini 2.5 Flash)
Send the user's request to `google/gemini-2.5-flash` with the system prompt below and receive a structured response.

### 3. Construct Final Generation Prompt
- Use the AI's enhanced prompt output
- Append text instructions if applicable
- Pass reference images to image generation model

### 4. Call Image Generation Model
- Send enhanced prompt + reference images to the selected image model
- Handle generation response

### 5. Return Result
- Store generated thumbnail
- Deduct credits
- Return thumbnail URL to frontend

---

## AI Intelligence Layer System Prompt

Use this as the system prompt for Gemini 2.5 Flash:

```
You are Stumbnail AI, the intelligence layer for a YouTube thumbnail generation platform.

Your role is to interpret user requests and construct precise image generation prompts. You receive context about what the user wants—such as video title, content genre, text preferences, reference images, and emotional tone—and you produce a structured JSON output that the image generation model will consume.

You do not dictate visual aesthetics. You do not specify colors, contrast, lighting, gradients, or styling unless the user explicitly requests it. The image generation model will infer appropriate aesthetics based on the genre, the fact that it is generating a YouTube thumbnail, and the reference images provided.

Your job is to provide clarity on intent, not to steer creative direction.

When constructing the prompt:
- Always include "YouTube thumbnail" in the prompt
- Always include the content genre when known
- If the user's input is vague or does not mention thumbnails, infer that they want a YouTube thumbnail and add that context
- If a focus subject is specified, indicate which reference image should be primary
- If the user wants text on the thumbnail, specify the exact text, placement, and style
- If text should be AI-generated, analyze the video title and genre to suggest 1-4 impactful words
- If no text is wanted, explicitly state "no text on thumbnail"
- Do not add aesthetic instructions unless the user provides them

When generating thumbnail text suggestions:
- Keep suggestions to 1-4 words maximum
- Use power words that create curiosity, urgency, or emotion
- Base suggestions on the video title and content type
- Provide 2-3 alternatives with brief reasoning

Always respond with a JSON object in this format:

{
  "prompt": "The enhanced prompt for image generation",
  "thumbnail_text": {
    "content": "The suggested or provided text",
    "placement": "top | center | bottom | auto",
    "style": "bold | outlined | shadow | minimal"
  },
  "text_suggestions": [
    {"text": "SUGGESTED TEXT", "reasoning": "Why this works"}
  ],
  "inferred_genre": "The detected content genre"
}

If no text is required, set thumbnail_text to null and omit text_suggestions.
```

---

## Processing Logic

### For Smart Merge Requests

1. Build AI input message:
```
Content type: {config.content_type}
Video title: {config.video_title}
Text preference: {config.include_text}
{If custom text: "Custom text: {config.text_content}"}
Text placement: {config.text_placement}
Text style: {config.text_style}
Emotional tone: {config.emotional_tone}
Focus subject: Reference image {config.focus_subject_index + 1}
Number of reference images: {reference_images.length}
```

2. Attach reference images to AI request

3. Parse AI JSON response

4. Construct final prompt:
```
{ai_response.prompt}
{If thumbnail_text: "Include text '{thumbnail_text.content}' with {thumbnail_text.style} style at {thumbnail_text.placement} position."}
```

### For Simple Generation Requests

1. Build AI input message:
```
User prompt: {prompt}
Number of reference images: {reference_images.length}
```

2. Attach reference images if any

3. Parse AI JSON response

4. Use `ai_response.prompt` directly for image generation

---

## Key Behaviors

| Scenario | Backend Behavior |
|----------|------------------|
| User says "make a gaming thumbnail" | AI adds YouTube thumbnail context, infers gaming aesthetics |
| User says "make an image for my video" | AI detects intent, adds "YouTube thumbnail" and genre context |
| User says "tech review style" | AI infers tech genre, does not add color/style directives |
| AI text requested with video title | AI suggests 2-3 short text options based on title |
| AI text requested without video title | AI generates generic impactful text for the genre |
| Custom text provided | AI includes exact text in prompt with specified placement/style |
| No text requested | AI explicitly states "no text on thumbnail" |

---

## Credit Costs

| Operation | Credits |
|-----------|---------|
| Smart Merge | 15 |
| Simple Generation | Based on model and resolution |

---

## Error Handling

- If AI layer times out (10s), fall back to basic prompt construction without enhancement
- If AI returns malformed JSON, log error and use user's raw prompt
- If image generation fails, return error to frontend, do not deduct credits
