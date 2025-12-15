# VisualAI User Guide

Complete guide for using VisualAI's image generation and design features through Claude Desktop.

## Table of Contents

- [Getting Started](#getting-started)
- [User Story 1: Iterative Design Refinement](#user-story-1-iterative-design-refinement)
- [User Story 2: Variant Generation & Selection](#user-story-2-variant-generation--selection)
- [User Story 3: Wireframe Composition](#user-story-3-wireframe-composition)
- [Common Workflows](#common-workflows)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before using VisualAI with Claude Desktop, ensure you have:

- Claude Desktop installed (latest version)
- VisualAI MCP Server installed and configured
- MLX Python environment with Flux model cached
- Python 3.8+ installed on your system

See the Quickstart Guide for detailed installation instructions.

### Using VisualAI with Claude Desktop

When VisualAI is configured as an MCP server in Claude Desktop, you'll see image generation and design tools available as part of the conversation interface. These tools appear as interactive buttons alongside the message input field.

**Basic workflow:**
1. Describe what you want to create in natural language
2. Claude will suggest appropriate tools based on your request
3. Select or confirm tool usage
4. Review results directly in the conversation
5. Refine or export as needed

### Understanding Sessions and Iterations

VisualAI works with **sessions** (project containers) and **iterations** (versions of your work within a session).

- **Session:** A project workspace containing all assets, variants, and history
- **Iteration:** A specific state or version of your work (snapshots for undo/redo)
- Each session persists across Claude Desktop restarts
- Session history includes all iterations with timestamps

---

## User Story 1: Iterative Design Refinement

**Use Case:** Refine a design through multiple iterations with AI feedback and precise control.

### Complete Workflow

#### Step 1: Generate Initial Design

Use the `generate-image` tool to create your base design.

**Tool Parameters:**
- `prompt`: Clear, descriptive description of the desired design
- `dimensions`: Width x Height (e.g., 512x512)
- `sessionId`: Your project session identifier

**Example:**
```
Prompt: "modern minimalist logo for a tech startup, geometric shapes, monochrome"
Dimensions: 512x512
Session: "tech-startup-branding"
```

**What you get:**
- Generated image as Base64 PNG embedded in conversation
- Iteration metadata (dimensions, generation time, seed)
- Saved automatically to your session

#### Step 2: Refine the Design

Use the `refine-design` tool to iteratively improve the current design.

**Tool Parameters:**
- `sessionId`: Your session
- `refinementInstructions`: Specific, actionable changes desired
- `iterations`: Number of refinement passes (optional, default 1)

**Example Refinements:**
```
"make it more colorful and add geometric shapes"
"increase the contrast and add a subtle gradient"
"rotate the main element 45 degrees and add a border"
```

**What happens:**
- New iteration created based on current design
- Instructions applied through AI-guided refinement
- Previous version remains in history (undo available)

#### Step 3: Compare Iterations

Use the `compare-iterations` tool to validate changes.

**Tool Parameters:**
- `sessionId`: Your session
- `iterationA`: First version to compare (e.g., "iteration-1" or "@previous")
- `iterationB`: Second version to compare (e.g., "iteration-2" or "@current")

**Example:**
```
Compare: iteration-1 vs iteration-2
Output: Side-by-side visual comparison with highlighted differences
```

**Use this to:**
- Verify refinements had desired effect
- Spot unwanted changes
- Make informed decision on rollback

#### Step 4: Rollback if Needed

Use the `rollback-iteration` tool to restore a previous version.

**Tool Parameters:**
- `sessionId`: Your session
- `targetIteration`: Version to restore ("iteration-1", "@previous", "@first", etc.)

**Rollback automatically:**
- Restores design to specified iteration
- Creates new iteration pointing to restored state
- Maintains full history (no data loss)

### Practical Example: Logo Refinement

**Project:** Coffee shop brand logo

```
Step 1 - Initial Generation
  Prompt: "minimal coffee cup icon, line art style"
  Result: Simple line-drawn cup [image-1]

Step 2 - First Refinement
  Instruction: "add steam wisps above the cup"
  Result: Cup with flowing steam lines [image-2]

Step 3 - Second Refinement
  Instruction: "make it warmer with brown tones instead of black"
  Result: Warm-toned cup with brown steam [image-3]

Step 4 - Compare
  Compare iteration-2 vs iteration-3
  Result: Brown version looks better, retain this

Step 5 - Final Refinement
  Instruction: "add a subtle coffee bean as a badge in bottom right"
  Result: Cup with steam and coffee bean accent [image-4]

Step 6 - Optional Rollback
  If iteration-4 over-complicated it, rollback to iteration-3
```

### Best Practices for Iterative Design

**Starting Simple:**
- Begin with core concept only
- Add details incrementally
- Keep early refinement instructions simple and single-focused

**Refinement Instructions:**
- Be specific: "add steam wisps" vs "make it better"
- One change per instruction for clarity
- Use positional language: "left", "bottom", "center"
- Avoid contradictory instructions

**Iteration Management:**
- Compare frequently to catch unwanted drift
- Name iterations after significant milestones (e.g., "@final-version")
- Use rollback liberally - experimentation is low-cost

**Dimensions:**
- Start with 512x512 for quick iterations
- Scale to 1024x1024 for final high-quality version
- Larger dimensions mean longer generation time

---

## User Story 2: Variant Generation & Selection

**Use Case:** Generate multiple style variations of the same concept to explore options before committing to refinement.

### Complete Workflow

#### Step 1: Generate Variants

Use the `generate-variants` tool to create multiple style variations.

**Tool Parameters:**
- `sessionId`: Your session identifier
- `assetType`: "icon" | "illustration" | "pattern" | "component"
- `assetDescription`: Detailed description of what to create
- `variantCount`: Number of variations to generate (3-5 recommended)
- `dimensions`: Width x Height

**Example:**
```
Asset Type: "icon"
Description: "rocket ship launching, futuristic"
Variant Count: 4
Dimensions: 256x256
Session: "space-app-assets"
```

**What you get:**
- Multiple variations with different visual styles
- Each variant has unique ID for reference
- All variants stored in session
- Displayed side-by-side in conversation (first variant shown)

#### Step 2: Select Preferred Variant

Use the `select-variant` tool to choose which variant to work with.

**Tool Parameters:**
- `sessionId`: Your session
- `variantId`: ID of variant to select (from generated list)

**What happens:**
- Selected variant becomes "active" for subsequent operations
- Other variants remain available in session history
- Can switch between variants anytime

**Example:**
```
Available variants: variant-1, variant-2, variant-3, variant-4
Selection: variant-2 (preferred minimalist style)
Result: variant-2 now active for refinement
```

#### Step 3: Refine Selected Variant

Use the `refine-asset` tool to improve the selected variant.

**Tool Parameters:**
- `sessionId`: Your session
- `refinementInstructions`: Specific improvements

**Example:**
```
Instructions: "make it more colorful and vibrant"
Result: Selected variant refined with applied changes
```

This works like iterative refinement but focused on the selected variant.

#### Step 4: Export in Multiple Formats

Use the `export-asset` tool to download the final asset.

**Tool Parameters:**
- `sessionId`: Your session
- `variantId`: Which variant to export
- `formats`: ["png"] | ["svg"] | ["webp"] | ["png", "svg", "webp"]

**Example:**
```
Export variant-2 in formats: PNG, SVG, WebP
Result:
  - PNG (256x256) - web use
  - SVG (vector) - design files
  - WebP (256x256) - optimized web
All files ready for download
```

**Format guidance:**
- **PNG:** Web use, raster, universal support
- **SVG:** Editing, vector scaling, smallest file size
- **WebP:** Modern web, best compression
- Export PNG for production, SVG for design collaboration

### Alternative: Banner Generation

For marketing and promotional assets, use `generate-banner` tool.

**Tool Parameters:**
- `sessionId`: Your session
- `bannerDescription`: What the banner should show
- `layout`: Component arrangement description
- `dimensions`: Width x Height (common: 1200x400)

**Example:**
```
Description: "Product launch banner with CTA"
Layout: "hero text on left, product image on right, CTA button at bottom"
Dimensions: 1200x400
Session: "product-launch"
```

**What you get:**
- Single banner image with parsed layout
- Layout components recognized and saved as metadata
- Ready for export or further refinement

### Practical Example: Marketing Icon Set

**Project:** E-commerce mobile app icons

```
Step 1 - Generate Icon Variants
  Asset Type: "icon"
  Description: "shopping cart icon, modern minimalist"
  Variant Count: 4
  Dimensions: 128x128
  Result: 4 different icon styles generated

Step 2 - Evaluate Variants
  Variant 1: Outline style
  Variant 2: Filled minimalist (PREFERRED)
  Variant 3: Detailed realistic
  Variant 4: 3D perspective

Step 3 - Select Variant 2
  Selection: variant-2 (minimalist filled)
  Action: Set as active for refinement

Step 4 - Refine Selected
  Instruction: "add a notification badge in top-right corner with number"
  Result: Icon with badge refinement

Step 5 - Export Multiple Formats
  Export to: PNG (for app), SVG (for design system), WebP (for web)
  Usage:
    - PNG: Mobile app assets
    - SVG: Design system library
    - WebP: Web component preview
```

### Practical Example: Marketing Banner

```
Step 1 - Generate Banner
  Description: "product launch announcement with hero text and product showcase"
  Layout: "announcement text top-center, product image center-right, discount badge left"
  Dimensions: 1200x600
  Result: Complete marketing banner generated

Step 2 - Compare with alternatives
  Optional: Generate another variant with different layout

Step 3 - Export
  Format: PNG (for all platforms)
  Usage: Email, social media, website
```

### Best Practices for Variants

**Number of Variants:**
- 3 variants: Quick decision
- 4-5 variants: Good diversity of styles
- More than 5: Diminishing returns

**Descriptions:**
- Be detailed about style: "minimalist", "geometric", "organic"
- Include context: "modern tech startup", "luxury lifestyle"
- Avoid vague terms: Not "nice icon" but "clean outline icon"

**Selection Strategy:**
- Review all variants before selecting
- Consider use case and context
- Trust first impression often valuable

**Refinement After Selection:**
- Keep refinements simple and targeted
- Refine only selected variant to avoid confusion
- Export once satisfied

---

## User Story 3: Wireframe Composition

**Use Case:** Create structured layouts with named components that can be independently updated and refined.

### Complete Workflow

#### Step 1: Generate Wireframe

Use the `generate-wireframe` tool to create structured layout.

**Tool Parameters:**
- `sessionId`: Your session
- `description`: Detailed layout description with component names
- `dimensions`: Width x Height

**Layout Description Format:**

Describe your wireframe using named components:

```
"dashboard with:
- sidebar (left, dark, navigation)
- header (top, light, with logo)
- main content area (center, grid layout with cards)
- right panel (stats and metrics)"
```

**Components recognized:**
- sidebar, header, footer, content, main, container
- grid, card, panel, section
- layout, view, page, screen
- Any descriptive name you provide

**Example:**
```
Description: "mobile app screen with header, tab bar, scrollable content area"
Dimensions: 375x812 (mobile)
Session: "mobile-app-design"
```

**What you get:**
- Structured wireframe with named components
- Each component has unique ID
- Layout metadata saved for component updates
- Image visualization in conversation

#### Step 2: Update Component Properties

Use the `update-component` tool to adjust specific component properties.

**Tool Parameters:**
- `sessionId`: Your session
- `componentId`: Component to update (from wireframe structure)
- `properties`: Object with CSS-like properties

**Supported Properties:**
- `width`, `height`: Numeric dimensions
- `backgroundColor`: Color value (hex, rgb, named)
- `padding`: Spacing inside component
- `margin`: Spacing outside component
- `borderRadius`: Corner rounding
- `borderColor`, `borderWidth`: Border styling
- `opacity`: Transparency (0-1)
- `zIndex`: Layering order

**Example:**
```
Component: "sidebar"
Properties: {
  backgroundColor: "#2c3e50",
  width: 280,
  borderRadius: 4
}
Result: Sidebar updated with new styling
```

#### Step 3: Refine Component (Natural Language)

Use the `refine-component` tool for conceptual changes using plain English.

**Tool Parameters:**
- `sessionId`: Your session
- `componentId`: Component to refine
- `refinementInstructions`: Natural language instructions

**Example Instructions:**
```
"make the sidebar darker and wider"
"add more padding inside the content area"
"make the header sticky at the top with shadow"
```

**When to use refine-component vs update-component:**
- **refine-component:** Conceptual, subjective changes ("make it wider", "more space")
- **update-component:** Precise, numerical properties (width: 300, backgroundColor: "#fff")

#### Step 4: Adjust Proportions

Use the `adjust-proportions` tool to resize components.

**Tool Parameters:**
- `sessionId`: Your session
- `componentId`: Component to resize
- `newDimensions`: { width: number, height: number }

**Example:**
```
Component: "right-panel"
New Dimensions: { width: 350, height: 768 }
Result: Panel resized, wireframe updated
```

#### Step 5: Inspect Component

Use the `show-component` tool to view detailed information.

**Tool Parameters:**
- `sessionId`: Your session
- `componentId`: Component to inspect

**Output includes:**
- Component type and hierarchy
- Current properties and values
- Dimensions and position
- Styling information
- Usage notes

### Component Workflow with Undo/Redo

**Undo Last Operation:**
```
Tool: undo-wireframe
Effect: Reverts last component update or wireframe modification
History: Full history available, can undo multiple steps
```

**Redo Last Undo:**
```
Tool: redo-wireframe
Effect: Re-applies last undone operation
Workflow: Safe experimentation, no permanent mistakes
```

### Practical Example: Dashboard Wireframe

**Project:** Analytics dashboard

```
Step 1 - Generate Wireframe
  Description: "dashboard layout with sidebar navigation,
               top header with filters, main content area
               with 2x2 grid of chart cards"
  Dimensions: 1440x900
  Result: Dashboard structure created

Step 2 - Update Sidebar
  Component: "sidebar"
  Properties: {
    backgroundColor: "#2c3e50",
    width: 280,
    padding: 16
  }
  Result: Sidebar styled with dark background

Step 3 - Update Header
  Component: "header"
  Properties: {
    backgroundColor: "#ecf0f1",
    height: 64,
    borderBottom: "1px solid #bdc3c7"
  }
  Result: Header with light background and border

Step 4 - Refine Main Content
  Component: "main-content"
  Instructions: "add more spacing between chart cards"
  Result: Charts repositioned with better spacing

Step 5 - Adjust Right Panel
  Component: "metrics-panel"
  New Dimensions: { width: 300, height: 900 }
  Result: Right panel resized to match viewport

Step 6 - Inspect Final Layout
  Use show-component to verify all properties
  Result: Dashboard ready for export

Step 7 - Export
  Format: PNG for presentation, SVG for design files
```

### Practical Example: Mobile App Screen

**Project:** E-commerce mobile app

```
Step 1 - Generate Mobile Wireframe
  Description: "mobile app with:
               - status bar at top (minimal)
               - header with back button and title
               - tab navigation at bottom
               - scrollable product list in middle"
  Dimensions: 375x812 (iPhone standard)
  Result: Mobile layout created

Step 2 - Update Header Component
  Component: "header"
  Properties: {
    height: 56,
    backgroundColor: "#fff",
    padding: 12,
    borderBottom: "1px solid #f0f0f0"
  }

Step 3 - Refine Tab Bar
  Component: "tab-bar"
  Instructions: "make it more prominent with larger icons"

Step 4 - Adjust List Area
  Component: "product-list"
  New Dimensions: { width: 375, height: 700 }

Step 5 - Export
  Format: PNG for stakeholder review
```

### Best Practices for Wireframes

**Initial Description:**
- Be specific about layout structure
- Name components descriptively
- Describe relative positioning
- Include any size constraints

**Iterative Updates:**
- Update one component at a time
- Verify each change before next
- Use compare or show-component to validate

**Component Naming:**
- Use clear, descriptive names
- Avoid generic names (use "sidebar" not "area1")
- Consistency with team conventions

**Dimensions:**
- **Web:** 1440x900, 1920x1080, responsive breakpoints
- **Mobile:** 375x812 (iOS), 412x915 (Android)
- **Tablet:** 768x1024 (portrait), 1024x768 (landscape)

**Export Strategy:**
- Export as PNG for presentations
- Export as SVG for design tool import
- Use wireframes as design starting point

---

## Common Workflows

### Session Management

#### Create New Session

Sessions are created automatically when you start working, but you can explicitly create one:

```
Request: "Create a new design session for [project name]"
Result: New session created with unique ID
Effect: All subsequent operations use this session
```

#### List All Sessions

View all your active design projects:

```
Tool: list-sessions
Output: Session list with:
  - Session ID
  - Creation date
  - Last modified date
  - Asset type (image, variants, wireframe)
  - Number of iterations
```

#### Resume Previous Session

Switch between projects:

```
Tool: load-session (or specify sessionId in requests)
Input: Session ID from list-sessions
Effect: All operations now target that session
Benefit: Restore full iteration history
```

#### View Iteration History

See all versions within a session:

```
Tool: list-iterations
Input: sessionId
Output: Complete version history with:
  - Iteration number
  - Timestamp
  - Operation performed
  - Asset details
```

### Quick Design Export

**From Iteration:**
```
Tool: export-image
Input: sessionId (uses current iteration)
Formats: PNG, SVG, or WebP
Output: File download ready
```

**From Variant:**
```
Tool: export-asset
Input: sessionId, variantId, formats
Output: All requested formats
Usage: Batch export for design system
```

### Common Undo/Redo Patterns

**After Refinement Mistake:**
```
Result: Looks wrong
Action: undo (reverts last refinement)
Continue: Try different instruction
```

**Explore Options:**
```
Action 1: Refine design
Check: Not satisfied
Action 2: undo
Action 3: Refine with different instruction
Pattern: Risk-free exploration
```

**Rollback to Milestone:**
```
Multiple iterations done
Realize iteration-3 was best
Tool: rollback-iteration with targetIteration: "iteration-3"
Result: Restored to that version
Continue: Refine from known good state
```

---

## Best Practices

### Prompt and Description Writing

**Good Descriptions (Specific):**
- "modern minimalist logo with geometric shapes, monochrome"
- "dashboard with sidebar navigation, header, and 2x3 grid of cards"
- "warm sunset landscape with mountains and lake, golden hour lighting"
- "shopping cart icon, filled style, modern minimalist"

**Better Descriptions (Very Specific):**
- "tech startup logo: abstract geometric shapes arranged in circular pattern, modern sans-serif font below, monochrome dark blue"
- "analytics dashboard: dark sidebar (280px), light header (64px), 2x2 grid of chart cards in main area, right metrics panel (300px)"
- "landscape illustration at sunset: mountain range mid-ground with lake in foreground, golden orange sky, warm lighting, style: digital painting"

**Avoid (Too Vague):**
- "nice logo" (too broad)
- "something cool" (no direction)
- "make it better" (subjective)
- "design page" (no specifics)

**Refinement Descriptions (Actionable):**
- "add steam wisps above the cup" (specific addition)
- "make it warmer with brown tones" (color change)
- "increase contrast by 20%" (quantifiable)
- "rotate main element 45 degrees" (precise transformation)

**Avoid Refinement (Vague):**
- "make it look better" (subjective)
- "improve it" (no direction)
- "change the vibe" (unclear intent)

### Workflow Efficiency

**Session Planning:**
- One session per project
- Session name should describe project
- Maintain consistent naming convention

**Iteration Strategy:**
1. Generate initial design simply
2. Refine incrementally (small steps)
3. Compare often to track changes
4. Export when satisfied
5. Keep session for future tweaks

**Variant Evaluation:**
- Always compare variants before selection
- Note preferred aspects of each
- Consider context and use case
- Don't overthink - good enough moves forward

**Refinement Tempo:**
- Quick iterations for exploration (5-10 refinements)
- Slow iterations for precision (careful evaluation between steps)
- Use comparison when direction unclear

### Dimension Selection

**Icons:**
- 128x128: Small UI icons (toolbar, buttons)
- 256x256: Medium assets (larger buttons, cards)
- 512x512: Large assets (app launcher, social media)

**Illustrations:**
- 512x512: Web article images
- 1024x1024: Print/high-quality web
- 2048x2048: Poster-sized assets

**Marketing Assets:**
- 1200x400: Standard web banner
- 1920x600: Wide web banner
- 1080x1080: Social media square
- 1200x628: Open Graph (link preview)

**Wireframes:**
- 1440x900: Desktop standard
- 1920x1080: Large desktop
- 375x812: Mobile (iPhone)
- 768x1024: Tablet portrait

### File Format Strategy

**For Web Development:**
- PNG: Raster format, universal support, good compression
- WebP: Modern format, smaller file size, modern browser support
- SVG: Icons and simple illustrations, infinitely scalable

**For Design Collaboration:**
- SVG: Share with designers for editing
- PNG: Export for review and presentation

**For Print:**
- PNG: High resolution (2x or 3x your display size)
- SVG: Vector format when possible (cleaner scaling)

**For Social Media:**
- PNG: Standard, universal support
- WebP: Modern platforms (Facebook, Instagram)
- Correct dimensions: Square (1:1), vertical (4:5), landscape (16:9)

### Performance and Caching

**Generation Speed:**
- First generation: Slightly slower (model loading)
- Subsequent generations: Faster (cached model)
- Larger dimensions = longer generation
- 512x512 < 1024x1024 < 2048x2048 in speed

**Cache Optimization:**
- Identical requests reuse cache (faster second time)
- Similar descriptions use cache (slight speedup)
- Different dimensions = different generation

**Optimization Strategies:**
- Use smaller dimensions for iteration (512x512)
- Scale up for final export (1024x1024)
- Batch similar requests to leverage cache
- Reuse session IDs for related assets

---

## Troubleshooting

### Generation Takes Too Long

**Symptoms:** Generation stuck, waiting over 2 minutes

**Solutions:**
1. Reduce dimensions (use 512x512 instead of 1024x1024)
2. Simplify prompt (fewer requirements)
3. Clear model cache and restart (if available)
4. Check Python environment is properly configured

**Expected Times:**
- 512x512: 20-40 seconds
- 1024x1024: 40-90 seconds
- Complex prompts: 30-60% longer

### Refinement Not Working as Expected

**Symptoms:** Refined design doesn't show requested changes

**Diagnosis:**
1. Compare iterations to confirm actual changes
2. Review refinement instructions for clarity
3. Check if instructions were contradictory

**Solutions:**
1. Make instructions more specific and detailed
2. Try smaller, single-focus refinements
3. Use compare-iterations to see what changed
4. Rollback and try different approach

**Example:**
- Vague: "make it more modern"
- Clear: "simplify shapes, remove decorative elements"

### Variants Look Too Similar

**Symptoms:** Generated variants aren't diverse enough

**Solutions:**
1. Increase variant count (generate 5 instead of 3)
2. Use more descriptive assetDescription
3. Specify different styles explicitly: "minimalist style", "detailed style", "geometric style"
4. Try different asset types (icon vs illustration)

**Example:**
- Generic: "rocket icon"
- Better: "rocket icon in minimalist style with few details"

### Wireframe Components Don't Update

**Symptoms:** Component update has no effect, properties unchanged

**Diagnosis:**
1. Verify component ID is correct
2. Check property values are valid
3. Confirm component exists in wireframe

**Solutions:**
1. Use show-component to verify component details
2. Try simpler properties first
3. Use refine-component for conceptual changes
4. Use undo-wireframe if update broke layout

**Troubleshooting Steps:**
```
1. List all components: show-component for each
2. Verify component ID exactly
3. Try updating single property first
4. If still fails: undo and try different approach
```

### Session Not Found

**Symptoms:** Error: "Session does not exist"

**Causes:**
- Wrong session ID
- Session expired (rare, check storage)
- Session deleted accidentally

**Solutions:**
1. List all sessions: list-sessions command
2. Copy correct session ID from list
3. Create new session if necessary
4. Check ~/.visualai/sessions/ directory (if accessible)

### Export Failed

**Symptoms:** Export returns error or incomplete file

**Diagnosis:**
1. Verify variant ID exists
2. Check format is supported
3. Ensure sufficient disk space

**Supported Formats:**
- PNG (raster, always available)
- SVG (vector, text-based)
- WebP (modern raster)

**Solutions:**
1. Try exporting as PNG first (most compatible)
2. Verify variant ID from list of variants
3. Check system disk space
4. Review detailed error message

### Design Quality Issues

**Output Looks Pixelated:**
- Increase dimensions (512→1024)
- Re-generate if quality varies

**Colors Don't Match Description:**
- Adjust prompt with specific color names
- Refine with color instructions: "warmer tones", "more saturated"

**Composition Seems Off:**
- Add specific positioning: "left side", "centered"
- Use refinement to adjust: "move element to center"

**Text Rendering Issues:**
- Wireframes: Use component labels for text
- Illustrations: Avoid detailed text in images

### Performance Issues

**Slow Session Loading:**
- Sessions with many iterations load slower
- Create new session if project feels sluggish
- Archive or export old sessions

**Memory Usage:**
- Large images (2048x2048+) use more memory
- Close other applications if memory constrained
- Reduce variant counts if memory issues

### Getting Help

**Still Stuck?**

1. **Review examples:** Check practical examples in each user story
2. **Compare iterations:** Use comparison tool to debug
3. **Check documentation:** API Reference for detailed tool docs
4. **Simplify:** Start with simplest possible request
5. **Reset:** Create new session and start fresh

**Useful Debug Steps:**
```
1. list-sessions → verify you have right session
2. list-iterations → check what versions exist
3. show-component (for wireframes) → verify state
4. compare-iterations → see what changed
5. rollback-iteration → go to known good state
```

---

## Next Steps

- **[Quickstart Guide](./quickstart.md)** - Installation and setup instructions
- **[API Reference](./API_REFERENCE.md)** - Detailed tool documentation and type definitions
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Contributing, extending, and advanced customization
- **[MCP Integration](../specs/001-visualai-mvp/)** - Technical specifications for Claude Desktop integration

### Quick Links

- **Installation:** See Quickstart for step-by-step setup
- **Troubleshooting:** Common issues and solutions above
- **Tool Specifications:** Detailed contracts in `/specs/001-visualai-mvp/contracts/`
- **Type Definitions:** TypeScript types in API Reference
