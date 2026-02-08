# RIPlay Copilot Instructions

## Project Overview
RIPlay is a bilingual (English/Czech) marketing website for a local AI agent development freelance business. It's a static site deployed via GitHub Pages, showcasing services and enabling contact form submissions.

**Key Files:**
- [index.html](index.html) & [cs.html](cs.html) - Bilingual landing pages (English/Czech)
- [js/script.js](js/script.js) - Smooth scroll navigation, contact form handling, navbar effects, fade-in animations
- [css/style.css](css/style.css) - Dark theme design system with glassmorphism effects

## Architecture & Patterns

### Design System (CSS)
The site uses a **dark, modern glassmorphism aesthetic**:
- **Color Scheme:** Deep navy backgrounds (`#0a0d1a`), indigo accents (`#6366f1`), emerald highlights (`#10b981`)
- **Components:** Frosted glass cards with `backdrop-filter: blur(10px)`, smooth transitions, gradient overlays
- **Layout:** 12-column grid container with 1200px max-width, responsive breakpoints at 1024px and 768px

**Example pattern from [css/style.css](css/style.css#L35-L45):**
```css
.service-card {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.35s ease;
}
.service-card:hover {
    transform: translateY(-8px);
}
```

When adding new sections: use CSS variables, maintain 0.35s ease transitions, apply hover transforms (`translateY(-8px)` pattern).

### JavaScript Patterns
Three main interaction patterns in [js/script.js](js/script.js):

1. **Smooth Scroll Navigation** - Anchor links scroll to sections with 80px header offset
2. **Form Handling** - Client-side validation; submission shows "Sending..." with 1500ms simulated delay (no backend integration)
3. **Scroll Effects** - Navbar background becomes opaque/blurred after 100px scroll; IntersectionObserver fades in `.service-card`, `.about-text`, `.contact-info`, `.contact-form` elements

When modifying JS: maintain the `DOMContentLoaded` wrapper, use `IntersectionObserver` for new animated elements (opacity/transform pattern), mock API delays with `setTimeout`.

### Bilingual Structure
Two separate HTML files share the same CSS/JS. Navigation language toggle (top-right) links between [index.html](index.html) and [cs.html](cs.html).

**Convention:** Both HTML files must be kept in sync. Content differences are only in text/labels—structure and classes are identical. When adding features, update BOTH files.

### Deployment
GitHub Actions workflow ([.github/workflows/github-pages.yml](.github/workflows/github-pages.yml)) deploys on push to `main`/`master` branches. The entire repo root is deployed (no build step). Verify all HTML/CSS/JS changes work in static serving context.

## Developer Workflows

### Adding a New Section
1. Add HTML structure to both [index.html](index.html#L100-L120) and [cs.html](cs.html#L100-L120)
2. Apply `.service-card` or equivalent glass-bg pattern (see [style.css](css/style.css#L165-L175))
3. Add fade-in animation: include element in `animatedElements` selector in [script.js](js/script.js#L89-L99)
4. Test responsive behavior: check layout at 768px and 1024px breakpoints

### Updating Content
- Text changes: update both HTML files (maintain parity)
- Styling: modify [style.css](css/style.css) with `:root` variables
- Interactive features: add to [script.js](js/script.js) with event delegation via `document.querySelector`

### Testing Locally
- No build required; open [index.html](index.html) directly in browser or use `python -m http.server 8000`
- Test both [index.html](index.html) (English) and [cs.html](cs.html) (Czech) versions
- Check Intersection Observer animations trigger on scroll (may need to resize viewport to see fade-in effects)
- Verify contact form shows validation alerts and "Sending..." state

## Key Conventions

- **CSS:** Use CSS variables (`:root` defined at [style.css](css/style.css#L4-L12)). Do NOT hardcode colors.
- **Transitions:** Standard is 0.35s ease for card interactions, 0.25s for nav links, 0.6s for fade-ins
- **Spacing:** Grid gaps are 2rem for service cards, 4rem for section content areas
- **Shadows:** Use `--shadow` for normal depth, `--shadow-lg` for hover states
- **Responsive:** Mobile-first where possible; test breakpoints at 768px (tablets) and 1024px (small desktops)
- **Accessibility:** Maintain semantic HTML; contact form uses `required` attributes

## Integration Points
- **No Backend:** Contact form has client-side validation only; actual submission would require a backend service
- **External Resources:** Google Fonts (Inter family), GitHub Pages for hosting
- **External Links:** GitHub profile, Google Business profile, phone/email links in footer
- **Language Toggle:** Simple file-based routing (no JavaScript locale switching)
