# Backend Intelligence Layer Specification

## Overview

Stumbnail requires a backend AI intelligence layer that enhances user requests into optimal image generation prompts. This layer sits between the frontend and the image generation models, ensuring every thumbnail generation—whether from Smart Merge or simple prompt input—produces the best possible results.

**IMPORTANT: The JSON schema defined in this document is final and must not be changed.**

---

## Canonical JSON Schema (DO NOT CHANGE)

This is the definitive JSON schema that the AI intelligence layer must always produce, regardless of whether the request is Smart Merge or simple prompt-based generation:

```json
{
  "generation_type": "YouTube thumbnail",
  "prompt": "The enhanced prompt for image generation",
  "category": "The content category (exact user wording if custom)",
  "tone": "The emotional tone (exact user wording if custom)",
  "text": {
    "include": true,
    "mode": "ai | custom",
    "content": "The text to display",
    "placement": "top | center | bottom | auto",
    "style": "bold | outlined | shadow | minimal | 3d | gradient | neon | grunge | comic | handwritten",
    "color": "User-provided color (red, #FF5500, linear-gradient(...), etc.) or omit if empty",
    "font": "User-provided font (Impact, Bebas, etc.) or omit if empty"
  },
  "text_suggestions": [
    {"text": "SUGGESTED TEXT", "reasoning": "Why this works"}
  ],
  "custom_instructions": "User's custom instructions (preserved exactly)",
  "include_youtube_logo": false,
  "optimized_for_ctr": true
}
```

**Schema Rules:**
- `generation_type`: ALWAYS "YouTube thumbnail" - this context is critical
- `optimized_for_ctr`: ALWAYS true - primary goal is maximizing CTR
- `include_youtube_logo`: ALWAYS false unless user explicitly requests it
- `text`: Set to `null` if no text is required; omit `text_suggestions` in that case
- `text.color`: Pass through exactly as user provides (red, #FF5500, gradients, etc.); omit field if empty
- `text.font`: Pass through exactly as user provides (Impact, Bebas, etc.); omit field if empty
- `category`: Use exact user wording for custom content types (no "custom:" prefix)
- `tone`: Use exact user wording for custom emotional tones (no "custom:" prefix)
- `custom_instructions`: Pass through exactly as provided, do not modify

---

## Frontend Sends

### Smart Merge Request
```json
{
  "type": "smart_merge",
  "project_id": "uuid",
  "config": {
    "content_type": "gaming | tech | vlog | reaction | comedy | educational | music | news | custom",
    "custom_content_description": "User's exact description when content_type is 'custom'",
    "focus_subject_index": 0,
    "include_text": true,
    "text_mode": "ai | custom",
    "video_title": "User's video title for AI context",
    "text_content": "User's custom text if text_mode is 'custom'",
    "text_placement": "top | center | bottom | auto",
    "text_style": "bold | outlined | shadow | minimal | 3d | gradient | neon | grunge | comic | handwritten",
    "text_color": "Any color - word (red, blue), hex (#FF5500), or gradient (linear-gradient(90deg, #FF4500, #FFD700))",
    "text_font": "Any font name (Impact, Bebas, Montserrat, etc.)",
    "emotional_tone": "intense | friendly | curiosity | shocking | professional | fun | custom",
    "custom_emotional_tone": "User's exact emotional tone phrase",
    "custom_instructions": "User's custom instructions for composition, layout, or context"
  },
  "reference_images": ["url1", "url2", "url3"],
  "aspect_ratio": "16:9",
  "resolution": "2K"
}
```

### Simple Prompt-Based Generation Request
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
Send the user's request to `google/gemini-2.5-flash` with the system prompt below and receive the canonical JSON response.

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

CRITICAL RULES (NEVER VIOLATE):
1. generation_type is ALWAYS "YouTube thumbnail" - this context is critical for the image model
2. optimized_for_ctr is ALWAYS true - the primary goal is maximizing click-through rate
3. include_youtube_logo is ALWAYS false unless the user EXPLICITLY requests a YouTube logo
4. Do NOT include a YouTube logo unless explicitly asked
5. When the user provides a custom content type or emotional tone, use their EXACT wording - do not prefix with "custom:" or modify it in any way
6. custom_instructions must be passed through EXACTLY as provided - do not interpret, summarize, or modify
7. text_color and text_font must be passed through EXACTLY as the user provides them - accept any format (words, hex, gradients for color; any font name for font)

When constructing the prompt:
- Always include "YouTube thumbnail" in the prompt
- Always include the content genre/category when known (use exact user wording for custom types)
- If the user's input is vague or does not mention thumbnails, infer that they want a YouTube thumbnail and add that context
- If a focus subject is specified, indicate which reference image should be primary
- If the user wants text on the thumbnail, specify the exact text, placement, style, color, and font
- **For text color**: Accept ANY color format from the user - color words (red, blue), hex codes (#FF5500), or CSS gradients (linear-gradient(...)). Pass through EXACTLY as provided. If empty, omit from output.
- **For text font**: Accept ANY font name or description from the user. Pass through EXACTLY as provided. If empty, omit from output.
- If text should be AI-generated, analyze the video title and genre to suggest 1-4 impactful words
- If no text is wanted, explicitly state "no text or characters on thumbnail"
- Do not add aesthetic instructions unless the user provides them
- Append any custom_instructions at the end of the prompt - these are important user context

When generating thumbnail text suggestions:
- Keep suggestions to 1-4 words maximum
- Use power words that create curiosity, urgency, or emotion
- Base suggestions on the video title and content type
- Provide 2-3 alternatives with brief reasoning

ALWAYS respond with this EXACT JSON structure (do not deviate):

{
  "generation_type": "YouTube thumbnail",
  "prompt": "The enhanced prompt for image generation",
  "category": "The content category (exact user wording if custom, or inferred category)",
  "tone": "The emotional tone (exact user wording if custom, or inferred tone)",
  "text": {
    "include": true,
    "mode": "ai | custom",
    "content": "The text to display on the thumbnail",
    "placement": "top | center | bottom | auto",
    "style": "bold | outlined | shadow | minimal | 3d | gradient | neon | grunge | comic | handwritten",
    "color": "EXACT user color (red, #FF5500, linear-gradient(...), etc.) or omit if empty",
    "font": "EXACT user font (Impact, Bebas, etc.) or omit if empty"
  },
  "text_suggestions": [
    {"text": "SUGGESTED TEXT", "reasoning": "Why this works"}
  ],
  "custom_instructions": "User's custom instructions passed through exactly",
  "include_youtube_logo": false,
  "optimized_for_ctr": true
}

If no text is required, set "text" to null and omit "text_suggestions".
If no custom instructions were provided, set "custom_instructions" to null.

This schema is FINAL and must not be modified.
```

---

## Processing Logic

### For Smart Merge Requests

1. Build AI input message:
```
Generation type: YouTube thumbnail
Content type: {config.content_type}
{If custom content type: "Custom content description: {config.custom_content_description}"}
Video title: {config.video_title}
Include text: {config.include_text}
{If include_text is true: "Text mode: {config.text_mode}"}
{If text_mode is custom: "Custom text: {config.text_content}"}
Text placement: {config.text_placement}
Text style: {config.text_style}
Text color: {config.text_color}
Text font: {config.text_font}
Emotional tone: {config.emotional_tone}
{If emotional_tone is custom: "Custom tone: {config.custom_emotional_tone}"}
Focus subject: Reference image {config.focus_subject_index + 1}
Number of reference images: {reference_images.length}
{If custom_instructions: "Custom instructions: {config.custom_instructions}"}
```

2. Attach reference images to AI request

3. Parse AI JSON response (must match canonical schema)

4. Construct final prompt:
```
{ai_response.prompt}
{If text.include is true:
  "Include text '{text.content}' with {text.style} style" +
  {If text.color exists: ", {text.color} color"} +
  {If text.font exists: ", {text.font} font"} +
  ", at {text.placement} position."
}
{If text.include is false or text is null: "Do not include any text or characters in the thumbnail."}
Do not include a YouTube logo unless explicitly requested.
{If custom_instructions: "\n\nAdditional context: {custom_instructions}"}
```

### For Simple Prompt-Based Generation Requests

1. Build AI input message:
```
Generation type: YouTube thumbnail
User prompt: {prompt}
Number of reference images: {reference_images.length}
```

2. Attach reference images if any

3. Parse AI JSON response (must match canonical schema)

4. Construct final prompt:
```
{ai_response.prompt}
{If text.include is true:
  "Include text '{text.content}' with {text.style} style" +
  {If text.color exists: ", {text.color} color"} +
  {If text.font exists: ", {text.font} font"} +
  ", at {text.placement} position."
}
{If text.include is false or text is null: "Do not include any text or characters in the thumbnail."}
Do not include a YouTube logo unless explicitly requested.
{If custom_instructions: "\n\nAdditional context: {custom_instructions}"}
```

**Both request types produce the same canonical JSON schema from the AI layer.**

---

## Key Behaviors

| Scenario | Backend Behavior |
|----------|------------------|
| User says "make a gaming thumbnail" | AI adds YouTube thumbnail context, infers gaming category |
| User says "make an image for my video" | AI detects intent, adds "YouTube thumbnail" context, infers category |
| User says "tech review style" | AI infers tech category, does not add color/style directives |
| User provides custom content type "minimalist travel vlog" | AI uses exact phrase "minimalist travel vlog" as category |
| User provides custom emotional tone "nostalgic" | AI uses exact phrase "nostalgic" as tone |
| AI text requested with video title | AI suggests 2-3 short text options based on title |
| AI text requested without video title | AI generates generic impactful text for the category |
| Custom text provided | AI includes exact text in prompt with specified placement/style/color/font |
| No text requested (include_text: false) | AI sets text to null, states "no text or characters on thumbnail" |
| User provides color "red" | AI outputs `"color": "red"` in text object |
| User provides color "#FF5500" | AI outputs `"color": "#FF5500"` in text object |
| User provides gradient "linear-gradient(90deg, #FF4500, #FFD700)" | AI outputs exact gradient string in text object |
| User provides font "Impact" | AI outputs `"font": "Impact"` in text object |
| User leaves color/font empty | AI omits color/font fields from text object |
| Custom instructions provided | AI passes through exactly in custom_instructions field |
| Simple prompt "epic gaming thumbnail" | AI returns canonical schema with inferred category="gaming", appropriate tone |

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

---

## Schema Version

**Version: 1.0 (FINAL)**

This schema structure is locked and must not be modified. Any future enhancements must be additive (new optional fields) and backward compatible.
