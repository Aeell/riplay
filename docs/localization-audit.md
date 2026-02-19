# RIPlay Localization Audit

## Current State

### Main Website
| Page | CS (Czech) | EN (English) | DE (German) |
|------|------------|--------------|-------------|
| index.html | ✅ index.html | ✅ en.html | ❌ Missing |
| Tools section | ✅ | ✅ | ❌ Missing |

### GoogleFont2SVG Tool
| File | EN | CS | DE |
|------|----|----|----| 
| locales/*.json | ✅ | ✅ | ✅ |
| i18n.js | ✅ Supports all 3 | | |

### Universal Converter Tool
| File | EN | CS | DE |
|------|----|----|----|
| index.html | ✅ English only | ❌ Missing | ❌ Missing |

## Issues Found

### 1. Missing German Main Page
- No `de.html` exists for the main website
- German users have no localized landing page

### 2. Converter Tool Not Localized
- `tools/converter/index.html` is English only
- No i18n system implemented
- No locale files exist

### 3. Inconsistent Branding
- GoogleFont2SVG still references "JKT Group" in locale descriptions
- Should reference "RIPlay" instead

### 4. Missing Language Switchers
- Main pages have language toggle but only between CS/EN
- GoogleFont2SVG has language selector for all 3 languages
- Converter has no language selector

## Recommendations

### Priority 1: Fix Branding
- Update GoogleFont2SVG locale descriptions from "JKT Group" to "RIPlay"

### Priority 2: Add German Main Page
- Create `de.html` with German translations
- Add language alternates in all main pages

### Priority 3: Localize Converter
- Add i18n system to converter
- Create locale files for EN, CS, DE
- Add language selector

### Priority 4: Consistent Language Switching
- All pages should have consistent language switcher
- Show all available languages (CS, EN, DE)

## File Structure Needed

```
/
├── index.html (CS - default)
├── en.html (EN)
├── de.html (DE) - NEW
├── tools/
│   ├── googlefont2svg/
│   │   └── locales/
│   │       ├── en.json (update branding)
│   │       ├── cs.json (update branding)
│   │       └── de.json (update branding)
│   └── converter/
│       ├── index.html (add i18n)
│       └── locales/ - NEW
│           ├── en.json
│           ├── cs.json
│           └── de.json
```
