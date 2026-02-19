# RIPlay Nuclear SEO Implementation Plan

## Executive Summary
Comprehensive SEO overhaul for riplay.cz - a local AI agent services website with free online tools (GoogleFont2SVG, Universal Converter).

## Current SEO Audit

### ✅ Already Implemented
- Basic meta tags (title, description, keywords)
- LocalBusiness schema on main pages
- hreflang for CS/EN
- sitemap.xml exists
- WebApplication schema on tools
- Open Graph/Twitter cards on tools

### ❌ Missing Critical Elements
1. **robots.txt** - Not present
2. **Open Graph on main pages** - Missing
3. **Twitter cards on main pages** - Missing
4. **FAQ Schema** - No FAQ sections
5. **Service Schema** - Services not marked up
6. **BreadcrumbList Schema** - No breadcrumbs
7. **Review/Testimonial Schema** - Google reviews not marked up
8. **Web Manifest** - No PWA support
9. **Performance optimizations** - Missing preconnect/preload
10. **Image optimization** - Missing width/height on some images

---

## Phase 1: Technical SEO Foundation

### 1.1 robots.txt
```
User-agent: *
Allow: /
Sitemap: https://riplay.cz/sitemap.xml
```

### 1.2 Web Manifest (manifest.json)
- PWA support
- App name, icons, theme colors
- Start URL, display mode

### 1.3 Performance Optimizations
- Preconnect to external domains
- Preload critical fonts
- Add width/height to all images

---

## Phase 2: Structured Data Enhancement

### 2.1 Main Pages (index.html, en.html)
Add to existing LocalBusiness schema:
- **FAQPage Schema** - Common questions about local AI
- **Service Schema** - Each service card as individual service
- **Review Schema** - Aggregate rating from Google reviews

### 2.2 Tools Pages
Already have WebApplication schema. Add:
- **HowTo Schema** - Step-by-step usage instructions
- **FAQPage Schema** - Common tool questions
- **BreadcrumbList Schema** - Home > Tools > [Tool Name]

---

## Phase 3: Content SEO

### 3.1 Main Pages Enhancement
- Add FAQ section before contact
- Add testimonials section
- Add pricing hints
- Add case studies preview

### 3.2 Tools Pages Enhancement
- Add usage examples
- Add format-specific landing sections
- Add related tools links

---

## Phase 4: On-Page Optimization

### 4.1 Title Tags
- Main CS: "RIPlay – Lokální AI Agenti | Soukromí na prvním místě & Open-Source"
- Main EN: "RIPlay – Local AI Agents | Privacy-First & Open-Source Solutions"
- Converter: "Universal File Converter - CAD/CAM, Video, Image, Document | RIPlay Tools"
- GoogleFont2SVG: "GoogleFont2SVG - Free Online Font to SVG Converter | RIPlay Tools"

### 4.2 Meta Descriptions
Optimized for CTR with:
- Value proposition
- Key features
- Call to action
- Under 160 characters

### 4.3 Heading Hierarchy
- H1: One per page, includes main keyword
- H2: Section titles
- H3: Subsections
- Proper nesting

---

## Phase 5: Off-Page SEO

### 5.1 Local SEO
- Google Business Profile optimization
- Local citations consistency
- NAP (Name, Address, Phone) consistency

### 5.2 Backlinks
- GitHub profile links
- Tool directories submission
- Czech IT community engagement

---

## Implementation Priority

### Immediate (Phase 1)
1. Create robots.txt
2. Create manifest.json
3. Add Open Graph to main pages
4. Add Twitter cards to main pages
5. Add preconnect hints

### Short-term (Phase 2)
1. Add FAQ sections with schema
2. Add Service schema
3. Add Review schema
4. Add BreadcrumbList schema

### Medium-term (Phase 3-4)
1. Content expansion
2. Case studies
3. Blog section (future)

---

## Files to Create/Modify

### New Files
- `/robots.txt` - Search engine directives
- `/manifest.json` - PWA manifest
- `/css/critical.css` - Critical CSS for above-fold

### Modified Files
- `/index.html` - Add OG, Twitter, FAQ, Service schema
- `/en.html` - Add OG, Twitter, FAQ, Service schema
- `/tools/converter/index.html` - Add FAQ, HowTo schema
- `/tools/googlefont2svg/index.html` - Add FAQ, HowTo schema
- `/sitemap.xml` - Update with new dates

---

## Expected Results

### Technical Scores
- Lighthouse SEO: 100/100
- Core Web Vitals: Pass
- Mobile-friendly: Pass

### Search Visibility
- Improved ranking for "lokální AI agenti" (CZ)
- Improved ranking for "local AI agents" (EN)
- Improved ranking for "file converter", "font to svg"
- Rich snippets in search results

### User Engagement
- Higher CTR from search
- Longer session duration
- Lower bounce rate
