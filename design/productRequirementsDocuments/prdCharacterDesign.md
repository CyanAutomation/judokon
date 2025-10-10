# PRD: Character Design

## TL;DR

This PRD defines the comprehensive design specifications for "KG," the friendly guide character in JU-DO-KON!. KG serves as the game's mascot and helper, providing advice, encouragement, and tips to players aged 8-12. The character follows a chibi (super-deformed) cartoon style with consistent visual identity, expression guidelines, and scene-specific variations. This PRD ensures consistent character representation across all game interfaces, promotional materials, and user interactions.

---

## Problem Statement

The JU-DO-KON! game requires a consistent, appealing character identity to serve as a guide and mascot for young players. Without standardized character design specifications, different implementations of KG could vary significantly in appearance, personality expression, and visual quality. This inconsistency would confuse players, weaken brand identity, and reduce the character's effectiveness as a friendly guide. Clear design standards are essential for maintaining KG's visual appeal and ensuring consistent user experience across all game contexts.

---

## Goals

- **Visual Consistency**: Establish unified character appearance across all game implementations
- **Age Appropriateness**: Ensure character design appeals to target audience of ages 8-12
- **Brand Identity**: Create memorable, distinctive mascot that represents JU-DO-KON! values
- **Emotional Connection**: Design character that feels friendly, approachable, and encouraging
- **Implementation Clarity**: Provide detailed specifications for developers and artists
- **Cultural Authenticity**: Represent Japanese martial arts heritage appropriately and respectfully

---

## User Stories

- As a young player, I want an encouraging character guide so that I feel supported while learning the game
- As a game developer, I want clear character specifications so that I can implement KG consistently
- As an artist, I want detailed design guidelines so that I can create appropriate KG artwork
- As a parent, I want age-appropriate character design so that my child enjoys a safe gaming experience
- As a brand manager, I want consistent character representation so that KG strengthens our game identity

---

## Prioritized Functional Requirements

| Priority | Feature                         | Description                                                                    |
| -------- | ------------------------------- | ------------------------------------------------------------------------------ |
| P1       | Core Character Design           | Fundamental appearance specifications including proportions, colors, and style |
| P1       | Facial Features and Expressions | Detailed facial design with expression variations for different contexts       |
| P1       | Default Outfit and Variations   | Primary judo gi design with alternative clothing options                       |
| P1       | Color Palette Standards         | Exact color specifications for consistent reproduction                         |
| P2       | Pose Library                    | Standard poses for common game scenarios and interactions                      |
| P2       | Scene-Specific Adaptations      | Character variations for different game contexts and backgrounds               |
| P3       | Accessory and Prop Guidelines   | Optional items and tools for specific scenarios                                |

---

## Functional Requirements

### 1. Core Character Design (P1)

**Character Identity:**

- **Name**: KG
- **Role**: Friendly, energetic guide character providing advice and encouragement
- **Target Appeal**: Ages 8-12 with universal approachability
- **Personality**: Confident, encouraging, slightly exaggerated for expressiveness

**Design Style:**

- **Art Style**: Chibi (super-deformed) cartoon style
- **Proportions**: 3 heads tall with large head relative to body
- **Head-to-body Ratio**: Head approximately 1/3 of total height
- **Build**: Stout, strong build with wide torso and thick limbs
- **Extremities**: Large hands and feet for expressiveness and visual balance

**Visual Treatment:**

- **Outlines**: Bold, dark black outlines around character
- **Shading**: Flat cell shading style with slight warm lighting
- **Highlights**: Soft highlights for dimensional depth
- **Background Integration**: Character design works across varied backgrounds

### 2. Facial Features and Expressions (P1)

**Facial Structure:**

- **Head Shape**: Rounded head with broad, expressive face
- **Eyes**: Large, rounded eyes with thick black eyebrows
- **Mouth**: Wide mouth capability for various expressions
- **Beard**: Full, dark, neatly groomed beard matching thick eyebrows
- **Hair**: Bald on top (shaved) with hair around the sides
- **Skin Tone**: Light to medium tone representing Japanese ethnicity (HEX `#F0C8A0` to `#D9A57E`)

**Expression Variations:**

- **Default**: Cheerful and friendly with wide smile showing visible teeth
- **Determined**: Brows furrowed with serious mouth for important moments
- **Surprised**: Wide eyes with open mouth for unexpected events
- **Confident**: Arms crossed posture with slight smile
- **Thinking**: Hand on chin with curious, contemplative expression

**Expression Usage Guidelines:**

- Default cheerful expression for 80% of appearances
- Determined expression for challenge introductions and serious advice
- Surprised expression for achievement celebrations and unexpected events
- Confident expression for game rule explanations
- Thinking expression for puzzle-solving and strategy tips

### 3. Default Outfit and Variations (P1)

**Primary Outfit (Default):**

- **Gi Color**: Blue judo gi (HEX `#3C7DC4` - Pantone 285M)
- **Belt**: Black belt tied at waist with proper knot detail (HEX `#1A1A1A`)
- **Insignia**: Japan flag patch on left chest of gi
- **Footwear**: Barefoot by default for authentic martial arts representation

**Alternative Outfits:**

- **Casual Variation**: Red t-shirt and blue shorts for informal scenes
- **Gi Color Alternatives**: Red or white gi for special contexts (black belt remains constant)
- **Seasonal Adaptations**: Lightweight variations for outdoor scenes
- **Ceremonial**: Formal gi presentation for awards and achievements

**Outfit Usage Guidelines:**

- Default blue gi for 90% of game interactions
- Casual clothes for non-martial arts contexts (tutorials, celebrations)
- Alternative gi colors for special events or opponent matching
- Maintain black belt across all variations for rank consistency

### 4. Color Palette Standards (P1)

**Primary Colors:**

- **Gi Blue**: HEX `#3C7DC4` (Pantone 285M)
- **Belt Black**: HEX `#1A1A1A`
- **Skin Tone Range**: HEX `#F0C8A0` to `#D9A57E`
- **Hair/Beard**: HEX `#2C2C2C` (dark brown-black)
- **Eye Color**: HEX `#4A4A4A` (dark gray-brown)

**Secondary Colors:**

- **Casual Shirt Red**: HEX `#D32F2F`
- **Casual Shorts Blue**: HEX `#1976D2`
- **Japan Flag Red**: HEX `#BC002D`
- **Japan Flag White**: HEX `#FFFFFF`

**Color Usage Requirements:**

- All colors must maintain WCAG AA contrast ratios against backgrounds
- Color consistency across all digital and print media
- Accessibility consideration for colorblind users
- Proper color reproduction in various lighting conditions

### 5. Pose Library (P2)

**Standard Poses:**

- **Default Dynamic**: Pointing upward with confident expression
- **Thumbs Up**: Encouraging gesture with bright smile
- **Energetic Jump**: Mid-air with fists raised in triumph
- **Arms Crossed**: Confident standing pose for explanations
- **Thinking Pose**: Hand on chin for contemplative moments
- **Cheering**: Fists in air for celebrations and victories

**Prop Interaction Poses:**

- **Holding Signs**: Large signboards with pointer stick
- **Award Presentation**: Holding trophies, scrolls, or certificates
- **Teaching Gesture**: Demonstrating techniques or pointing to information
- **Welcome Pose**: Open arms for greetings and introductions

**Pose Selection Guidelines:**

- Match pose to emotional context of interaction
- Ensure stable foot placement for visual balance
- Maintain open, confident posture across all poses
- Consider background and UI element placement

### 6. Scene-Specific Adaptations (P2)

**Background Integration:**

- **Dojo Scenes**: Tatami mats and wooden walls, slightly blurred
- **Stadium Context**: Crowd backgrounds for celebrations
- **Outdoor Training**: Grassy areas with blue sky
- **Stage Presentations**: Spotlights and formal backgrounds
- **UI Integration**: Plain backgrounds for interface elements

**Contextual Adaptations:**

- **Giving Advice**: Pointing gesture with dojo background
- **Victory Celebration**: Trophy holding with cheering crowd
- **Casual Interaction**: Relaxed pose with informal background
- **Tutorial Context**: Clear, uncluttered backgrounds for focus
- **Achievement Moments**: Spotlight emphasis with celebration elements

### 7. Scenario Prompt Reference (P2)

**Base Prompt Template:**

A chibi-style cartoon character, 3-heads tall, with a large head and stout body. He has a bald head with thick black beard and eyebrows, big round eyes, and a wide, friendly smile with visible teeth. Skin tone is light-medium beige, representing Japanese ethnicity. He wears a blue judo gi with a black belt and a small Japan flag patch on the left chest. Art style uses bold black outlines, flat cell shading, and warm ambient lighting to emphasize a confident, friendly personality.

**Scene-Specific Prompt Table:**

| Scenario              | Pose & Gesture                                                                 | Background & Props                                                                                   | Expression & Mood                                | Prompt Accents                                                                                  |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Giving Advice         | Right hand pointing upward, left hand on hip for a confident teaching stance. | Dojo interior with tatami mats, wooden walls, and soft depth blur.                                   | Wide grin with bright eyes, eyebrows lifted.     | Add “subtle floating kanji for ‘focus’ near the pointer” to emphasize guidance.                  |
| Dynamic Jump          | Mid-air tuck with both fists raised above head, knees bent for energy.         | Stadium crowd with motion blur and confetti ribbons.                                                 | Mouth open in triumphant yell, excited eyebrows. | Include “camera angled slightly upward to capture the leap, subtle action lines around figure.”  |
| Thinking Pose         | Hand resting on beard, elbow supported by opposite arm.                        | Clean white background with soft vignette and faint shadow beneath feet.                            | Brows gently furrowed, half-smile of curiosity.  | Append “floating question mark hologram beside head for problem-solving mood.”                   |
| Holding a Sign        | Both hands gripping a wide wooden sign, pointer tucked under arm.              | Dojo bulletin board behind KG with pinned match schedules.                                          | Friendly smile with closed mouth, attentive gaze. | Add “sign text: ‘Welcome to Ju-Do-Kon!’ in bold friendly lettering.”                             |
| Casual Clothes        | Left hand waving, right hand holding water bottle at hip.                      | Grassy outdoor training yard with practice dummies and blue sky.                                    | Relaxed smile, eyes slightly squinted in sunlight. | Mention “gentle breeze moving gi sleeves tied around waist; sandals resting nearby on tatami mat.” |
| Trophy Celebration    | Trophy lifted overhead with both hands, feet planted shoulder-width apart.     | Award stage with spotlights, confetti shower, and blurred cheering crowd.                           | Beaming grin showing teeth, sparkle highlights.   | Include “dramatic rim light from stage spotlights and celebratory sparkles.”                     |
| Meditation Companion  | Seated cross-legged on cushion, hands in gasshō (palms together).             | Minimalist meditation alcove with shoji screens and soft lantern glow.                              | Peaceful closed-mouth smile, relaxed eyelids.     | Add “soft incense smoke trails and floating cherry blossom petals.”                              |
| Tech Briefing         | Holding tablet in left hand, gesturing to floating UI panel with right hand.   | Futuristic briefing room with translucent HUD panels hovering in the air.                           | Determined smile, eyebrows angled with focus.     | Append “light blue holographic interface elements showing match stats and tips.”                 |
| Weather Update        | Clutching small umbrella over shoulder, other hand extended to feel rain.      | Outdoor courtyard with gentle rain, wet stone tiles, and distant torii gate.                        | Cheerful resilience, soft smile with bright eyes. | Add “raindrops splashing around feet and subtle reflective puddles catching warm lantern light.” |
| Safety Reminder       | Arms in wide welcoming pose while leaning slightly forward for emphasis.       | Practice hall with warning banners, safety mats, and stored gear racks.                             | Warm encouraging smile, eyebrows arched kindly.   | Include “floating caution icons near banners reading ‘Respect • Balance • Safety’.”              |

**Detailed Prompt Examples:**

- **Tutorial Spotlight — Giving Advice**
  ```
  A chibi-style cartoon character, 3-heads tall, with a large head and stout body. He has a bald head with thick black beard and eyebrows, big round eyes, and a wide, friendly smile with visible teeth. Skin tone is light-medium beige, representing Japanese ethnicity. He wears a blue judo gi with a black belt and a small Japan flag patch on the left chest. Art style uses bold black outlines, flat cell shading, and warm ambient lighting.

  Right hand pointing upward while the left rests on his hip. Dojo interior with tatami mats and wooden walls, slightly blurred for depth. Subtle floating kanji for “focus” near the pointer and soft spotlight highlighting KG as he introduces match tips.
  ```
- **Victory Splash Art — Dynamic Jump**
  ```
  Use the base prompt template above (chibi-style KG with blue gi, black belt, bold outlines, warm lighting).

  Layer on: KG mid-air with knees bent and both fists raised overhead in triumph. Tilt the camera slightly upward to capture the leap. Surround him with a stadium crowd in motion blur, confetti ribbons, and celebratory sparkles. Introduce dramatic rim light from stage spotlights along the gi edges and subtle action lines to amplify motion.
  ```
- **Puzzle Helper — Thinking Pose**
  ```
  Use the base prompt template above (chibi-style KG with blue gi, black belt, bold outlines, warm lighting).

  Layer on: KG supporting one elbow with the opposite hand while gently stroking his beard. Stage him against a clean white background with a soft vignette and faint floor shadow. Float a holographic question mark and translucent puzzle grid beside him to signal brainstorming.
  ```
- **Community Bulletin — Holding a Sign**
  ```
  Use the base prompt template above (chibi-style KG with blue gi, black belt, bold outlines, warm lighting).

  Layer on: KG holding a wide wooden sign reading “Welcome to Ju-Do-Kon!” with both hands, pointer tucked under his arm. Place a dojo bulletin wall with match schedules and polite reminder banners behind him. Keep the warm ambient light and minimal parallax so the signage message remains the focal point.
  ```
- **Zen Interlude — Meditation Companion**
  ```
  Use the base prompt template above (chibi-style KG with blue gi, black belt, bold outlines, warm lighting).

  Layer on: KG seated cross-legged on a cushion with hands in gasshō. Frame the meditation alcove with shoji screens and a soft lantern glow. Add gentle incense smoke trails and drifting cherry blossom petals to underscore calm breathing exercises during the meditation screen.
  ```
- **Systems Briefing — Tech Update**
  ```
  Use the base prompt template above (chibi-style KG with blue gi, black belt, bold outlines, warm lighting).

  Layer on: KG presenting a translucent tablet while gesturing to a floating HUD panel displaying match statistics. Place him in a futuristic briefing room with cool blue lighting and holographic interface elements. Emphasize confident mentorship suitable for onboarding or update screens.
  ```

### 8. Implementation Guidelines (P1)

**Required Design Standards:**

- Maintain the 3-heads tall chibi proportion.
- Use dynamic, energetic poses that reinforce KG's encouraging personality.
- Keep the gi neat with the black belt properly tied when in uniform.
- Match facial expressions to the narrative context while preserving friendliness.
- Retain flat, cartoonish rendering with bold outlines and warm lighting.

**Design Restrictions:**

- Do not render KG with realistic or overly detailed anatomy.
- Do not remove or omit the Japan flag patch when KG wears the gi.
- Do not introduce heavy shading, complex gradients, or textured rendering styles.

**Do & Don't Checklist:**

**Do:**

- Keep line weights bold and consistent around the entire silhouette to preserve the cartoon cut-out style.
- Anchor every pose with planted, balanced foot placement to avoid awkward or unstable silhouettes.
- Pair mouth shapes and eyebrow angles intentionally so emotions read clearly at small sizes.
- Reuse the canonical color palette swatches; document any temporary deviations with rationale and HEX values.
- Stage supporting props so they reinforce KG’s role as coach (clipboards, tablets, trophies) rather than steal focus.
- Provide layered source files (separate outlines, fills, highlights) to support downstream animation or recoloring.

**Don't:**

- Stretch or squash the head-to-body ratio beyond the 3-heads-tall silhouette.
- Swap the black belt for other colors or remove belt knot detailing in the name of simplification.
- Mix rendering styles (e.g., painterly textures, photoreal lighting) that conflict with the flat cel-shaded look.
- Add aggressive weaponry, intimidating facial expressions, or other elements that contradict KG’s mentor tone.
- Place busy background props directly behind KG’s face or hands where they compete with key gestures.
- Export final art without transparent backgrounds or crop margins, which complicates UI placement.

---

## Acceptance Criteria

- [ ] Character design maintains consistent 3-head proportion across all implementations
- [ ] All facial expressions clearly convey intended emotions and contexts
- [ ] Color palette adheres to exact HEX specifications for brand consistency
- [ ] Default blue gi with black belt appears in 90% of character instances
- [ ] Character design appeals to target age group (8-12) based on user testing
- [ ] All poses maintain visual balance and confident posture
- [ ] Character integrates seamlessly with various background contexts
- [ ] Design specifications are detailed enough for accurate reproduction
- [ ] Cultural representation is respectful and authentic
- [ ] Character appearance is consistent across different artists and developers

---

## Non-Functional Requirements

**Visual Quality:**

- Character design must render clearly at minimum 32x32 pixel resolution
- Scalable design that maintains clarity from small icons to large illustrations
- Consistent appearance across different display technologies and color profiles

**Performance:**

- Character artwork files optimized for web and mobile platforms
- Efficient sprite sheets and animation frame management
- Quick loading times for character appearances in game interfaces

**Accessibility:**

- Character design distinguishable for users with color vision deficiencies
- Clear visual hierarchy and contrast for all expressions and poses
- Alternative text descriptions available for screen reader users

**Cultural Sensitivity:**

- Respectful representation of Japanese martial arts traditions
- Appropriate use of cultural symbols (Japan flag, traditional gi)
- Avoidance of stereotypes while maintaining cultural authenticity

---

## Edge Cases / Failure States

**Design Inconsistency:**

- Documentation of acceptable variation ranges for different implementation contexts
- Guidelines for maintaining character identity when technical limitations require simplification
- Procedures for quality review and approval of new character artwork

**Cultural Appropriateness:**

- Review process for ensuring respectful cultural representation
- Guidelines for adapting character for different cultural contexts if needed
- Sensitivity protocols for character use in marketing and promotional materials

**Technical Limitations:**

- Fallback designs for low-resolution or low-color display scenarios
- Simplified versions for performance-constrained environments
- Alternative representations for accessibility requirements

---

## Dependencies and Open Questions

**Dependencies:**

- Art asset creation and management system
- Brand guidelines and style guide integration
- Cultural consultation for authentic representation
- User testing capabilities for age-appropriate appeal validation

**Open Questions:**

- Should KG have voice acting, and if so, what vocal characteristics?
- How should the character evolve or be updated over time?
- What level of animation is appropriate for different game contexts?
- Should there be multiple character variations or companions?

---

## Mockups / Visual Reference

**Character Sheet Requirements:**

- Full character design sheet showing proportions and construction guidelines
- Expression chart displaying all approved facial expressions
- Color palette swatches with exact HEX values
- Pose library with staging and usage notes
- Context examples showing character in various game scenarios

**Style Guide Integration:**

- Character design elements must align with overall JU-DO-KON! visual identity
- Consistent art direction with game UI and environmental design
- Brand-appropriate character personality expression

---

## Tasks

- [x] Consolidate existing character design documentation into unified PRD
- [ ] Create comprehensive character design sheet with all specifications
- [ ] Develop expression chart with usage guidelines
- [ ] Design pose library with context-specific variations
- [ ] Establish color reproduction standards and testing procedures
- [ ] Create character implementation guide for developers and artists
- [ ] Conduct user testing with target age group for appeal validation
- [ ] Develop character animation guidelines and specifications
- [ ] Create cultural sensitivity review checklist
- [ ] Establish character design approval and quality assurance process

---

## Source Files Consolidated

This PRD now consolidates the full KG character design and prompt guidance that previously lived in separate Character Design Document and Character Prompt Sheet files. Those standalone documents (`design/characterDesign/kgCharacterDesignDocument.md` and `design/characterDesign/kgCharacterPromptSheet.md`) have been formally retired and removed from the repository; reference this PRD for the canonical, end-to-end specifications. Updated October 2024 to capture the consolidation release.
