# CAIC Field Report Aggregator - Design Guidelines

## Design Approach: Material Design System

**Justification**: This is a data-intensive professional tool for avalanche forecasters requiring efficient information processing, clear data visualization, and functional interfaces. Material Design provides:
- Strong hierarchy for complex data layouts
- Excellent data table and form components
- Clear visual feedback for interactive elements
- Professional, trustworthy aesthetic suitable for safety-critical work

**Key Design Principles**:
- Clarity over decoration - every element serves a purpose
- Immediate access to controls - no scrolling to reach date picker
- Scannable data hierarchy - critical metrics stand out
- Functional sophistication - looks professional, not generic

---

## Typography

**Font Stack**: Roboto (via Google Fonts CDN)
- **Headlines/Metrics**: Roboto Medium, 24px-32px
- **Section Headers**: Roboto Medium, 18px-20px
- **Data Labels**: Roboto Regular, 14px-16px
- **Body Text/Summaries**: Roboto Regular, 14px, line-height 1.6
- **Chart Labels**: Roboto Regular, 12px
- **Chat Interface**: Roboto Regular, 14px

**Hierarchy Rules**:
- Large numeric metrics use 32px bold to draw attention
- Section headers use 20px medium weight with subtle spacing
- Data tables use 14px for optimal density and readability

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 8** consistently
- Component padding: p-6 or p-8
- Section spacing: mb-6 or mb-8
- Tight groupings: gap-2 or gap-4
- Card internal spacing: p-6

**Container Structure**:
- Max width: max-w-7xl (main content)
- Responsive padding: px-4 on mobile, px-6 on desktop
- Consistent vertical rhythm: space-y-6 for major sections

---

## Component Library

### Core Layout Components

**Control Panel** (Top Section):
- Date picker with clear label "Select Date"
- Submit button prominently placed
- Current selection display showing active date
- Minimal vertical space (p-6) - user shouldn't scroll to see data

**Metrics Dashboard** (Grid Layout):
- 3-column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Card-based metric displays with:
  - Large number (32px bold)
  - Descriptive label below (14px)
  - Subtle card elevation
  - Consistent padding (p-6)

### Data Visualization Components

**Aggregation Tables**:
- Clean bordered tables with header row styling
- Alternating row backgrounds for scannability
- Compact row height (py-3) for data density
- Right-aligned numbers, left-aligned labels
- Two-column tables for elevation/aspect breakdowns

**Chart Containers**:
- Use Chart.js for bar charts showing avalanche distributions
- Charts placed in cards with headers
- Responsive height (h-64 on mobile, h-80 on desktop)
- Clear axis labels and legends

**Summary Sections**:
- Distinct cards for each summary type (Observation/Snowpack/Weather)
- Clear section headers (18px medium)
- Readable text blocks with max-width prose
- Light background differentiation between summaries

### Interactive Components

**Chat Interface**:
- Fixed bottom or side panel approach
- Clear text input with send button
- Chat history display with:
  - User messages aligned right with subtle background
  - AI responses aligned left with different background
  - Timestamps (12px, muted)
  - Scrollable history area
- "Ask about today's data" placeholder text

**Error/Empty States**:
- Centered message cards for "No reports available"
- Clear iconography (use Material Icons)
- Helpful next-step guidance

---

## Images

**No Hero Image**: This is a utility application where immediate access to controls and data takes priority. The interface leads with the date picker control panel, not visual storytelling.

**Icons Only**:
- Material Icons via CDN for:
  - Avalanche warning symbols near metrics
  - Weather icons in summaries
  - Chat send button
  - Calendar icon for date picker
  - Direction indicators (compass) for aspect data

---

## Responsive Behavior

**Mobile Strategy**:
- Stack all grid columns to single column
- Maintain table functionality with horizontal scroll if needed
- Persistent date picker at top
- Collapsible chat interface (expandable panel)

**Desktop Optimization**:
- Multi-column metric grids for at-a-glance scanning
- Side-by-side chart comparisons
- Chat panel can be persistent sidebar (right side, w-96)

---

## Accessibility & Clarity

- High contrast text for all data displays
- Clear focus states on all interactive elements
- Keyboard navigation for date picker and chat
- ARIA labels for charts and metrics
- Screen reader friendly table structures with proper headers