# Backend Intelligence Layer Specification

## Overview

Stumbnail requires a backend AI intelligence layer that enhances user requests into optimal image generation prompts. The intelligence layer produces a **JSON schema that is sent directly to the image generator** (not plain text).

**IMPORTANT: The generator receives JSON directly. The intelligence layer is responsible for merging all context into a self-contained, actionable JSON.**

---

## Generator JSON Schema

This is the JSON that gets sent directly to Fal/Replicate image generators:

```json
{
  "generation_type": "YouTube thumbnail",
  "prompt": "Comprehensive prompt with ALL context merged. Includes subject descriptions, composition, mood, text guidance, and asset preservation rules.",
  "category": "Content category (exact user wording if custom)",
  "tone": "Emotional tone (exact user wording if custom)",
  "text": {
    "include": true,
    "content": "THE ACTUAL TEXT to display",
    "placement": "top | center | bottom | auto",
    "style": "bold | outlined | shadow | minimal | 3d | gradient | neon | grunge | comic | handwritten",
    "color": "User's exact color (red, #FF5500, gradient)",
    "font": "User's exact font (Impact, Bebas, etc)",
    "typography": {
      "lines": ["Line 1", "EMPHASIZED LINE 2"],
      "emphasis": "Which words should be larger",
      "sizing": "Relative size description"
    }
  },
  "include_youtube_logo": false,
  "optimized_for_ctr": true
}
```

**Key Rules:**
- `generation_type`: ALWAYS "YouTube thumbnail" - anchors generator to thumbnail style
- `optimized_for_ctr`: ALWAYS true
- `include_youtube_logo`: ALWAYS false unless user explicitly requests
- `text`: Set to `null` if no text required
- `category` and `tone`: Passed to generator (it uses these for composition)

**NOT sent to generator (internal only):**
- `mode` (ai/custom) - internal field
- `text_suggestions` - for frontend display
- `custom_instructions` - merged INTO prompt by intelligence layer

---

## Intelligence Layer Responsibilities

### 1. Merge Custom Instructions INTO Prompt
The user's `custom_instructions` should be intelligently incorporated into the `prompt` field. The generator should not need to understand "custom_instructions" as a concept.

### 2. Asset Preservation
Reference images contain subjects that must be preserved:
- **NEVER alter** the subject's face, body, features, clothing, or identity
- Background removal, repositioning, and composition adjustments ARE allowed
- Reference images by index: image_1, image_2, etc.
- Include in prompt: "Preserve exact appearance of subjects from reference images"

### 3. Intelligent Text Typography
For long text, apply smart layout:
- Break into multiple lines for readability
- Emphasize key words (larger size, different treatment)
- Example: "When your enemy makes mistakes DO NOT DISTURB"
  - Line 1 (smaller): "When your enemy makes mistakes"
  - Line 2 (LARGE): "DO NOT DISTURB"

### 4. AI-Generated Text
When user wants AI text (provides title, not custom text):
- Analyze the video title
- Generate impactful 1-4 word text
- Put the ACTUAL text in `text.content` (not "generate text")

### 5. YouTube Thumbnail Best Practices
Apply automatically:
- High contrast, bold visuals
- Clear focal point
- Text readable at small sizes
- Emotional expressions draw attention
- Bright colors and high saturation

---

## Request Flow

### Smart Merge Request
```json
{
  "type": "smart_merge",
  "config": {
    "content_type": "gaming | tech | vlog | ... | custom",
    "custom_content_description": "User's exact description",
    "focus_subject_index": 0,
    "include_text": true,
    "text_mode": "ai | custom",
    "video_title": "User's video title",
    "text_content": "Custom text if text_mode is custom",
    "text_placement": "auto",
    "text_style": "bold",
    "text_color": "gradient from yellow to orange",
    "text_font": "Impact",
    "emotional_tone": "intense",
    "custom_instructions": "Place image_2 on the right side..."
  },
  "reference_images": ["url1", "url2", "url3"]
}
```

### Simple Prompt Request
```json
{
  "type": "generate",
  "prompt": "User's raw prompt",
  "reference_images": ["url1"]
}
```

---

## Processing Flow

1. **Intelligence Layer (Gemini 2.5 Flash)**
   - Receives user request + reference images
   - Produces generator JSON with all context merged
   - Returns `generatorJSON` ready for image generator

2. **Image Generator (Fal/Replicate)**
   - Receives JSON directly (stringified)
   - Parses and uses the structured information
   - Generates thumbnail

3. **Storage**
   - Store both `prompt` (string) and `generatorJSON` (full object)
   - Store `systemRefinedPrompt` for internal reference

---

## Example Generator JSON

For a geopolitics thumbnail with custom instructions:

```json
{
  "generation_type": "YouTube thumbnail",
  "prompt": "YouTube thumbnail for Geopolitical commentary, featuring a geopolitical narrative. Donald Trump (image_1) representing America, Xi Jinping (image_4) representing China, and Mark Carney (image_3) representing Canada. The commentator (image_2) is positioned on the right side, observing the scene. The composition conveys a global power balance narrative. Preserve exact appearance of subjects from reference images.",
  "category": "Geopolitical commentary",
  "tone": "intense",
  "text": {
    "include": true,
    "content": "When your enemy makes mistake DO NOT DISTURB",
    "placement": "auto",
    "style": "bold",
    "color": "gradient from yellow to orange, emphasis on DO NOT DISTURB",
    "font": "BOLD",
    "typography": {
      "lines": ["When your enemy makes mistake", "DO NOT DISTURB"],
      "emphasis": "DO NOT DISTURB should be 2x larger and prominent",
      "sizing": "First line smaller, second line large and bold"
    }
  },
  "include_youtube_logo": false,
  "optimized_for_ctr": true
}
```

---

## Schema Version

**Version: 2.0**

This version sends JSON directly to generators instead of plain text prompts.
