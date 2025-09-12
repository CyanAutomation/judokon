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

| Priority | Feature | Description |
|----------|---------|-------------|
| P1 | Core Character Design | Fundamental appearance specifications including proportions, colors, and style |
| P1 | Facial Features and Expressions | Detailed facial design with expression variations for different contexts |
| P1 | Default Outfit and Variations | Primary judo gi design with alternative clothing options |
| P1 | Color Palette Standards | Exact color specifications for consistent reproduction |
| P2 | Pose Library | Standard poses for common game scenarios and interactions |
| P2 | Scene-Specific Adaptations | Character variations for different game contexts and backgrounds |
| P3 | Accessory and Prop Guidelines | Optional items and tools for specific scenarios |

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

This PRD consolidates content from the following design/characterDesign files:
- `kgCharacterDesignDocument.md` - Comprehensive character specifications including proportions, features, and style guidelines
- `kgCharacterPromptSheet.md` - Scene-specific prompts, color references, and implementation guidelines for character artwork creation
