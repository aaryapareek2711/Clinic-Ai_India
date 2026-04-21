# Dashboard Modernization Plan - Complete Strategy

**Date**: November 13, 2025
**Status**: Phase 1 Started - Provider Dashboard Visual Modernization Complete ✅
**Consultants**: Frontend-Developer Agent + Gemini 2.5 Pro

---

## Executive Summary

After comprehensive analysis with frontend-developer agent and validation with Gemini 2.5 Pro, we've developed a 3-phase approach to modernize the healthcare dashboards with template library integration. The key insight: **focus on delivering complete, valuable workflows** rather than building isolated UI widgets.

---

## Consultation Insights

### Frontend-Developer Agent Recommendations
- Modern grid layouts with generous spacing
- Color-coded sections (Blue: appointments, Purple: SOAP, Forest: Appoint-Ready)
- Template library with Personal/Community tabs
- Filter bar with search, category, specialty filters
- Micro-animations and hover effects

### Gemini 2.5 Pro Critical Feedback

**Key Insight**: Avoid the "value gap" - don't build dashboard widgets that point to incomplete functionality.

**Healthcare-Specific Considerations**:
1. **Template Versioning**: Audit trails and version history (critical for compliance)
2. **Three-Level Structure**: My Templates / Practice Templates / Community Templates
3. **PHI Scrubbing**: Automated + manual confirmation for "Save as Template"
4. **RBAC**: Role-based access for organizational templates
5. **Context-Aware Suggestions**: Suggest templates based on appointment type
6. **Template Placeholders**: Auto-populate `[Patient Name]`, `[DOB]` from context

**Architecture Decisions**:
- **PHI Scrubbing**: Hybrid approach (automated regex + manual confirmation with diff view)
- **Suggestions**: Server-side filtering based on metadata tags (not ML)
- **Placeholders**: Rich text editor with custom nodes (TipTap/Slate.js)
- **Mobile**: Template creation desktop-only; mobile optimized for consumption
- **Phase 1 Scope**: "My Templates" only; defer organizational structure to Phase 2

---

## Revised 3-Phase Roadmap

### Phase 1: Core Workflow MVP (Weeks 1-3) ⭐ IN PROGRESS

**Goal**: Deliver complete personal template workflow within SOAP editor

**Completed**:
- ✅ Provider Dashboard Visual Modernization
  - Gradient hero header (slate-900 background)
  - Modernized stat cards with colored icon backgrounds
  - Hover animations (scale-105 on cards)
  - Improved spacing and typography

**In Progress**:
- 🔄 Patient Dashboard Visual Modernization

**To Build**:
1. **TemplateCard Component**
   - Icon + name + description + metadata
   - Usage stats and last used timestamp
   - Preview and Use buttons
   - Personal template indicator

2. **Simple "My Templates" Library Page**
   - Single-page list of personal templates
   - Basic search bar
   - Category filter
   - Grid/list view toggle

3. **"Save as Template" Feature** (Critical)
   - Available within SOAP note editor
   - **Step 1**: Automated PHI scrubbing (regex + context-based)
   - **Step 2**: Manual confirmation modal with diff view
   - **Step 3**: Checkbox: "I confirm no PHI"
   - Save to personal library

4. **"Insert Template" Browser** (Critical)
   - Modal within SOAP editor
   - Browse personal templates
   - Search and filter
   - Context-aware suggestions (based on appointment type)
   - Insert with placeholder auto-population

**Technical Stack**:
- **Rich Text Editor**: TipTap or Slate.js for placeholder support
- **State Management**: React Query for server state, useReducer for local
- **Placeholders**: Custom nodes for `[Patient Name]`, `[Chief Complaint]`, etc.

**Why This Order**:
- Delivers immediate value to providers
- Complete workflow loop (create → save → reuse)
- No "coming soon" features
- Simpler scope (no organizational complexity yet)

---

### Phase 2: Library Expansion & Curation (Weeks 4-5)

**Goal**: Add organizational templates and sharing

**To Build**:
1. **Three-Tab Template Library**
   - My Templates (existing)
   - Practice Templates (official, read-only for most users)
   - Community Templates (shared by users)

2. **FilterBar Component**
   - Search with debouncing (300ms)
   - Category filter dropdown
   - Specialty filter dropdown
   - Sort options (Recent, Popular, Name A-Z)
   - Sticky positioning on scroll

3. **Template Preview Modal**
   - Full-screen on mobile
   - Desktop modal overlay
   - Show template structure with placeholders
   - "Use Template" CTA

4. **RBAC for Practice Templates**
   - Admin role can create/edit Practice templates
   - Providers can only read Practice templates
   - Version history for all Practice templates
   - Approval workflow

5. **Template Metadata System**
   - Appointment type tags
   - Specialty tags
   - Custom tags
   - Version numbers
   - Last updated timestamps

**Technical Requirements**:
- Server-side pagination for large lists
- API endpoints for filtering and search
- Virtualization for long lists (`@tanstack/react-virtual`)
- Template versioning database schema

---

### Phase 3: Polish & Advanced Features (Week 6+)

**Goal**: Enhance UX with secondary features

**To Build**:
1. **Template Quick Access Dashboard Widget** (Now makes sense!)
   - Shows 3-5 recent templates
   - Quick insert from dashboard
   - "View All Templates" link

2. **Template Favorites**
   - Star/unstar templates
   - Favorites section in library
   - Quick access to favorites

3. **Usage Analytics**
   - Track template usage count
   - "Most used" badge
   - Last used timestamp
   - Provider-level analytics dashboard

4. **Micro-Animations**
   - Card hover effects (scale, shadow)
   - Button transitions
   - Loading states with skeletons
   - Success notifications

5. **Keyboard Shortcuts**
   - `Cmd+K`: Quick template search
   - Navigation shortcuts
   - Accessibility improvements

6. **Responsive Optimization**
   - Mobile-friendly filters (bottom sheet)
   - Tap target sizes (44x44px minimum)
   - Touch gestures
   - Full-screen modals on mobile

---

## Provider Dashboard Modernization - COMPLETED ✅

### Visual Changes Applied

**1. Hero Header**
```tsx
// Gradient background with rounded bottom corners
bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
rounded-b-2xl shadow-xl
```

**2. Stat Cards - Before vs After**

**Before**:
- Plain white cards
- Small icons inline with titles
- Basic text styling
- No hover effects

**After**:
- Elevated cards with subtle shadows
- Large colored icon backgrounds (12x12 rounded-xl)
- 3xl bold numbers (increased from 2xl)
- Hover scale animation (scale-105)
- Color-coded by section:
  - **Blue-100**: Patients Today (Users icon)
  - **Amber-100**: Pending Tasks (ListTodo icon)
  - **Forest-100**: Appoint-Ready (Clock icon)
  - **Purple-100**: SOAP Notes (FileText icon)

**3. Layout Improvements**
- Background gradient: `bg-gradient-to-br from-cream-50 via-white to-sand-50`
- Increased gap between cards: `gap-6` (24px)
- Max-width container: `max-w-7xl mx-auto`
- Consistent section spacing: `space-y-8` (32px)

**4. Typography**
- Page title: `text-3xl sm:text-4xl font-bold`
- Stat numbers: `text-3xl font-bold text-slate-900`
- Stat labels: `text-sm text-slate-600`
- Trend indicators: `text-xs text-forest-600 font-medium`

---

## Patient Dashboard Modernization - NEXT

### Planned Changes

**1. Hero Header** (Same style as provider)
- Gradient background
- Rounded bottom corners
- Welcome message with first name

**2. Appointment Preparation Card Enhancement**
- Add progress bar visualization
- Completion percentage badge
- Color-coded task status

**3. Pre-Visit Checklist Modernization**
- Larger checkboxes
- Time estimates per task (e.g., "5 min")
- Better visual hierarchy
- Sequential workflow indicators

**4. Stats Overview** (New section)
- Upcoming appointments count
- Completed tasks count
- Unread messages count
- Next appointment countdown

---

## TemplateCard Component Design

### Component API
```typescript
interface TemplateCardProps {
  id: string;
  name: string;
  category: 'soap' | 'intake' | 'assessment' | 'procedure' | 'referral';
  description: string;
  specialty?: string;
  usageCount?: number;
  lastUsed?: Date;
  isPersonal: boolean;
  isFavorite?: boolean;
  version?: string;
  onUse: (id: string) => void;
  onPreview: (id: string) => void;
  onFavorite?: (id: string) => void;
}
```

### Visual Design
```tsx
<Card variant="interactive" className="group hover:scale-105 transition-all">
  <CardContent className="p-4">
    {/* Top: Icon + Title + Badge */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        {/* Category Icon - 10x10 rounded background */}
        <div className="w-10 h-10 rounded-lg bg-{category}-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-{category}-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
          <p className="text-xs text-gray-500">{specialty || category}</p>
        </div>
      </div>
      {isPersonal && <Badge variant="primary" size="sm">Mine</Badge>}
    </div>

    {/* Description */}
    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
      {description}
    </p>

    {/* Footer: Metadata + Actions */}
    <div className="flex items-center justify-between pt-3 border-t">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {usageCount && <span><FileText className="w-3 h-3" /> {usageCount} uses</span>}
        {lastUsed && <span>Used {formatRelativeTime(lastUsed)}</span>}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onPreview(id)}>
          Preview
        </Button>
        <Button size="sm" onClick={() => onUse(id)}>
          Use
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

### Category Colors
```typescript
const categoryColors = {
  soap: { icon: 'purple-600', bg: 'purple-100' },
  intake: { icon: 'blue-600', bg: 'blue-100' },
  assessment: { icon: 'emerald-600', bg: 'emerald-100' },
  procedure: { icon: 'orange-600', bg: 'orange-100' },
  referral: { icon: 'cyan-600', bg: 'cyan-100' },
};
```

---

## FilterBar Component Design

### Component API
```typescript
interface FilterBarProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSpecialtyChange: (specialty: string) => void;
  onSortChange: (sort: string) => void;
  categories: string[];
  specialties: string[];
}
```

### Layout (Desktop)
```tsx
<div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-lg">
  <div className="px-6 py-4 flex flex-wrap items-center gap-4">
    {/* Search Input */}
    <Input
      leftIcon={<Search className="w-4 h-4" />}
      placeholder="Search templates..."
      className="flex-1 min-w-[300px]"
      onChange={debounce(onSearch, 300)}
    />

    {/* Category Dropdown */}
    <Select value={category} onValueChange={onCategoryChange}>
      <option value="all">All Types</option>
      {categories.map(cat => <option key={cat}>{cat}</option>)}
    </Select>

    {/* Specialty Dropdown */}
    <Select value={specialty} onValueChange={onSpecialtyChange}>
      <option value="all">All Specialties</option>
      {specialties.map(spec => <option key={spec}>{spec}</option>)}
    </Select>

    {/* Sort Dropdown */}
    <Select value={sort} onValueChange={onSortChange}>
      <option value="recent">Recently Used</option>
      <option value="popular">Most Popular</option>
      <option value="name">Name (A-Z)</option>
    </Select>

    {/* View Toggle */}
    <div className="flex border border-slate-200 rounded-lg p-1">
      <button onClick={() => setView('grid')}>
        <Grid className="w-4 h-4" />
      </button>
      <button onClick={() => setView('list')}>
        <List className="w-4 h-4" />
      </button>
    </div>
  </div>
</div>
```

### Mobile Adaptation
- Collapse into single "Filter" button
- Open bottom sheet with all filter options
- Full-screen on small devices
- Touch-friendly controls

---

## "Save as Template" Feature - Technical Spec

### User Flow

**Step 1: Trigger**
- Provider clicks "Save as Template" button in SOAP editor toolbar
- Button location: Next to "Save Draft" and "Complete Note"

**Step 2: Automated PHI Scrubbing** (Backend)
```python
async def scrub_phi(content: str, patient_context: PatientContext) -> dict:
    """
    Returns:
        {
            "scrubbed_content": str,
            "changes": [{"original": str, "replacement": str, "type": str}],
            "warnings": [str]
        }
    """
    changes = []
    scrubbed = content

    # Replace patient-specific identifiers from context
    scrubbed = scrubbed.replace(patient_context.full_name, "[Patient Name]")
    changes.append({
        "original": patient_context.full_name,
        "replacement": "[Patient Name]",
        "type": "name"
    })

    # Regex patterns for common PHI
    patterns = [
        (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', 'ssn'),        # SSN
        (r'\b\d{3}-\d{3}-\d{4}\b', '[Phone]', 'phone'),    # Phone
        (r'\b\d{2}/\d{2}/\d{4}\b', '[Date]', 'date'),      # Date
        (r'MRN:\s*\d+', 'MRN: [MRN]', 'mrn'),              # MRN
    ]

    for pattern, replacement, type in patterns:
        matches = re.finditer(pattern, scrubbed)
        for match in matches:
            changes.append({
                "original": match.group(),
                "replacement": replacement,
                "type": type
            })
            scrubbed = scrubbed.replace(match.group(), replacement)

    # Check for potential remaining PHI
    warnings = []
    if any(char.isdigit() for char in scrubbed):
        warnings.append("Document contains numbers - please review carefully")

    return {
        "scrubbed_content": scrubbed,
        "changes": changes,
        "warnings": warnings
    }
```

**Step 3: Manual Confirmation Modal** (Frontend)
```tsx
<Modal isOpen={isScrubbing} onClose={() => setIsScrubbing(false)}>
  <ModalHeader>
    <h2 className="text-xl font-bold">Review Template Before Saving</h2>
    <p className="text-sm text-slate-600 mt-1">
      We've automatically removed potential PHI. Please review all changes.
    </p>
  </ModalHeader>

  <ModalContent>
    {/* Diff View */}
    <div className="bg-slate-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-2">Changes Made ({changes.length})</h3>
      <div className="space-y-2">
        {changes.map((change, idx) => (
          <div key={idx} className="text-sm">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded line-through">
              {change.original}
            </span>
            <span className="mx-2">→</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {change.replacement}
            </span>
            <Badge size="sm" className="ml-2">{change.type}</Badge>
          </div>
        ))}
      </div>
    </div>

    {/* Warnings */}
    {warnings.length > 0 && (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Warnings</h3>
        <ul className="space-y-1">
          {warnings.map((warning, idx) => (
            <li key={idx} className="text-sm text-amber-800">{warning}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Preview */}
    <div className="border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold mb-2">Scrubbed Template Preview</h3>
      <div className="text-sm whitespace-pre-wrap">
        {scrubbedContent}
      </div>
    </div>

    {/* Confirmation Checkbox */}
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm">
          <strong className="text-blue-900">I have reviewed this content and confirm it contains no Protected Health Information (PHI).</strong>
          <br />
          <span className="text-blue-700">
            This template will be saved to your personal library and can be reused for other patients.
          </span>
        </span>
      </label>
    </div>
  </ModalContent>

  <ModalFooter>
    <Button variant="outline" onClick={() => setIsScrubbing(false)}>
      Cancel
    </Button>
    <Button
      variant="primary"
      disabled={!confirmed}
      onClick={handleSaveTemplate}
    >
      Save Template
    </Button>
  </ModalFooter>
</Modal>
```

**Step 4: Template Metadata Form**
After confirmation, show form for:
- Template name (required)
- Description (optional)
- Category (dropdown)
- Specialty (dropdown)
- Tags (multi-select)

---

## "Insert Template" Browser - Technical Spec

### User Flow

**Step 1: Trigger**
- Provider clicks "Insert Template" button in SOAP editor toolbar
- Opens modal overlay

**Step 2: Browser Modal**
```tsx
<Modal size="large" isOpen={isBrowsing} onClose={() => setIsBrowsing(false)}>
  <ModalHeader>
    <h2 className="text-xl font-bold">Insert Template</h2>

    {/* Context-Aware Suggestions */}
    {suggestedTemplates.length > 0 && (
      <div className="mt-2">
        <p className="text-sm text-slate-600 mb-2">
          Suggested for {appointmentType}:
        </p>
        <div className="flex gap-2">
          {suggestedTemplates.map(template => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              onClick={() => handleInsertTemplate(template.id)}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>
    )}
  </ModalHeader>

  <ModalContent>
    {/* Search */}
    <Input
      leftIcon={<Search />}
      placeholder="Search templates..."
      onChange={debounce(handleSearch, 300)}
      className="mb-4"
    />

    {/* Filters */}
    <div className="flex gap-2 mb-4">
      <Select value={category} onValueChange={setCategory}>
        <option value="all">All Categories</option>
        {categories.map(cat => <option key={cat}>{cat}</option>)}
      </Select>
      <Select value={sort} onValueChange={setSort}>
        <option value="recent">Recently Used</option>
        <option value="popular">Most Popular</option>
        <option value="name">Name (A-Z)</option>
      </Select>
    </div>

    {/* Template Grid */}
    <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
      {filteredTemplates.map(template => (
        <TemplateCard
          key={template.id}
          {...template}
          onUse={handleInsertTemplate}
          onPreview={handlePreviewTemplate}
        />
      ))}
    </div>
  </ModalContent>
</Modal>
```

**Step 3: Template Insertion with Placeholders**
```typescript
function insertTemplateWithPlaceholders(
  template: Template,
  patientContext: PatientContext
): string {
  let content = template.content;

  // Auto-populate placeholders from patient context
  const replacements = {
    '[Patient Name]': patientContext.name,
    '[Patient DOB]': patientContext.dob,
    '[Patient Age]': calculateAge(patientContext.dob),
    '[Patient MRN]': patientContext.mrn,
    '[Today\'s Date]': new Date().toLocaleDateString(),
    '[Provider Name]': currentProvider.name,
  };

  // Replace known placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  // Keep unfilled placeholders as interactive nodes
  // (will be rendered as styled "pills" in rich text editor)
  return content;
}
```

---

## Accessibility (WCAG 2.1 AA Compliance)

### Color Contrast
- All text meets 4.5:1 contrast ratio minimum
- Large text (18pt+) meets 3:1 ratio
- Interactive elements have visible focus states

### Keyboard Navigation
- All interactive elements tabbable
- Skip navigation links
- Arrow key navigation in dropdowns
- Escape key closes modals
- Tab traps in modals

### Screen Reader Support
```tsx
// Example: Stat Card with ARIA labels
<div role="region" aria-label="Dashboard Statistics">
  <Card>
    <CardContent>
      <div aria-labelledby="patients-today-label">
        <p id="patients-today-label" className="text-sm">Patients Today</p>
        <h3 aria-label="4 patients scheduled today">4</h3>
      </div>
    </CardContent>
  </Card>
</div>

// Template Card with action labels
<Button
  aria-label={`Use ${template.name} template`}
  onClick={() => onUse(template.id)}
>
  Use
</Button>
```

### Focus Management
- Modal opening: Focus moves to modal
- Modal closing: Focus returns to trigger element
- Tab trap within modal
- Skip to main content link

---

## Mobile Experience Strategy

### Desktop-Only Features (Phase 1)
- Template creation/editing
- Complex SOAP note composition
- "Save as Template" workflow

### Mobile-Optimized Features
- Template browsing
- Quick template insertion
- Appointment viewing
- Pre-visit checklist

### Responsive Breakpoints
```css
/* Mobile: 0-639px */
- Single column layouts
- Full-width cards
- Bottom sheets for filters
- Larger tap targets (44x44px)

/* Tablet: 640-1023px */
- 2-column layouts
- Side-by-side cards
- Modal filters

/* Desktop: 1024px+ */
- 3-4 column layouts
- Hover interactions
- Rich modals
- Desktop-optimized editor
```

---

## Technical Stack Decisions

### State Management
- **Server State**: `@tanstack/react-query` (data fetching, caching, invalidation)
- **Local State**: React `useState`, `useReducer`
- **Global State**: React Context (minimal usage)

### UI Libraries
- **Headless Components**: Radix UI (modals, tabs, dropdowns, selects)
- **Styling**: TailwindCSS + custom design system
- **Icons**: Lucide React
- **Rich Text**: TipTap or Slate.js (for placeholder support)

### Performance Optimizations
- Debounced search (300ms delay)
- Virtualized lists for large datasets (`@tanstack/react-virtual`)
- Server-side pagination
- Image lazy loading
- Code splitting per route

---

## API Endpoints Needed

### Templates API
```
GET    /api/templates                 # List templates (with filters)
GET    /api/templates/:id              # Get single template
POST   /api/templates                  # Create template
PATCH  /api/templates/:id              # Update template
DELETE /api/templates/:id              # Delete template
POST   /api/templates/:id/favorite     # Toggle favorite
GET    /api/templates/suggestions      # Context-aware suggestions
POST   /api/templates/scrub-phi        # PHI scrubbing utility
```

### Query Parameters for GET /api/templates
```
?search=headache              # Search query
&category=soap                # Filter by category
&specialty=cardiology         # Filter by specialty
&sort=recent|popular|name     # Sort order
&page=1&limit=20              # Pagination
&personal_only=true           # Only user's templates
&appointment_type=wellness    # Context-based filter
```

---

## Database Schema

### templates Table
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- soap, intake, assessment, procedure, referral
    specialty VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    version INT DEFAULT 1,
    is_personal BOOLEAN DEFAULT TRUE,
    is_practice_template BOOLEAN DEFAULT FALSE,
    is_community_template BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    metadata JSONB, -- tags, appointment_types, etc.
    CONSTRAINT templates_category_check CHECK (category IN ('soap', 'intake', 'assessment', 'procedure', 'referral'))
);

CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_specialty ON templates(specialty);
CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC);
CREATE INDEX idx_templates_metadata_gin ON templates USING GIN (metadata);
```

### template_usage Table (for analytics)
```sql
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    used_at TIMESTAMP DEFAULT NOW(),
    appointment_id UUID REFERENCES appointments(id)
);

CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX idx_template_usage_user_id ON template_usage(user_id);
```

### template_favorites Table
```sql
CREATE TABLE template_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, template_id)
);
```

---

## Success Metrics

### Phase 1 Goals
- ✅ Provider dashboard visually modernized
- ⏳ Patient dashboard visually modernized
- ⏳ "Save as Template" workflow fully functional
- ⏳ "Insert Template" browser integrated in SOAP editor
- ⏳ Basic "My Templates" library page
- ⏳ 0 critical accessibility issues

### Phase 2 Goals
- Practice templates with RBAC
- Community template sharing
- Advanced filtering (category, specialty, tags)
- Template preview modal
- Template versioning system

### Phase 3 Goals
- Dashboard widget integration
- Usage analytics dashboard
- Keyboard shortcuts
- Mobile-optimized experience
- 95%+ Lighthouse accessibility score

---

## Next Steps

1. ✅ **Provider Dashboard Modernization** - COMPLETE
2. **Patient Dashboard Modernization** - IN PROGRESS
3. **Create TemplateCard Component**
4. **Build "My Templates" Library Page**
5. **Implement "Save as Template" with PHI Scrubbing**
6. **Implement "Insert Template" Browser**

---

## Resources

- **Frontend**: http://localhost:3002 ✅ Running
- **Backend**: http://localhost:8000
- **Design System**: `/components/ui/` (Button, Badge, Card, Input)
- **Consultation**: Frontend-Developer Agent + Gemini 2.5 Pro
- **Documentation**: This file + LANDING_PAGE_ENHANCEMENTS.md

---

*Last Updated: November 13, 2025*
*Phase 1 Progress: 20% Complete*
*Next Session: Patient Dashboard Modernization*
