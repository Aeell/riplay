# RIPlay Changelog

All notable changes to the RIPlay project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-02-19

### 🔥 Complete UI/UX Overhaul — Cyberpunk Design System

#### Design System
- Created unified RIPlay Design System (`css/riplay-design-system.css`) with 80+ CSS custom properties
- New brand aesthetic: freelancer cyberpunk — ember/molten fire accents on dark steel backgrounds
- Typography: Inter (body) + JetBrains Mono (technical accents)
- Consistent design across all three sub-sites (main, converter, GoogleFont2SVG)

#### Main Site
- Complete redesign of all three language versions (CS, EN, DE)
- Unified content strategy across all languages (automation + local AI + tools)
- Mobile hamburger navigation with slide-out menu
- Scroll-triggered animations with IntersectionObserver
- Typing effect in hero section
- Full SEO normalization: OG tags, Twitter Cards, JSON-LD structured data on all pages
- Complete hreflang implementation (cs, en, de, x-default) on all pages

#### Universal File Converter
- Dark cyberpunk theme replacing the old light blue design
- Category tab filtering (Images, Audio, Video, Documents, CAD/CAM, Archives)
- Removed 11 niche/gaming handlers (VTF, Minecraft, FL Studio, etc.)
- Fixed STL export: now uses binary format (4-10× smaller files)
- Fixed DXF handler: removed broken PDF output stub
- Removed duplicate GLB handler (threejs superseded by cadMesh)

#### CAD/CAM Intelligent Safeguards
- SVG complexity detection with warnings for high object counts (>1000/>5000)
- 3D-to-2D projection warnings
- Mesh format conversion limitation notes
- Software-aware guidance (Fusion 360, SolidWorks, FreeCAD compatibility)

#### GoogleFont2SVG
- Redesigned CSS to match the unified design system
- Updated header, sidebar, and controls to cyberpunk aesthetic

#### Infrastructure
- Updated manifest.json with ember theme color
- Updated sitemap.xml with full hreflang alternates
- Updated robots.txt with proper disallow rules
- New geometric favicon with ember accent

---

## [2026-02-17] - CAD/CAM Converter & Documentation

### Added

#### Universal File Converter (`tools/converter/`)
- **CAD Mesh Handler** - Support for STL, OBJ, PLY, GLB 3D formats
  - Mesh validation and repair
  - Format conversion between mesh types
  - 3D preview generation
  - Wireframe SVG/PNG export
- **DXF Handler** - Support for 2D CAD drawings
  - DXF to SVG conversion
  - DXF to PNG conversion
  - Support for LINE, CIRCLE, ARC, POLYLINE, TEXT entities
- **PDF Handler** - PDF to SVG/PNG conversion
- **3D to 2D Warning** - User notification for mesh-to-vector conversions

#### SEO Enhancements
- **robots.txt** - Search engine crawling instructions
- **manifest.json** - PWA manifest for installable web app
- **Open Graph Tags** - Social media sharing optimization
- **Twitter Cards** - Twitter-specific meta tags
- **Schema.org Structured Data**:
  - LocalBusiness schema
  - Service schema (ItemList)
  - FAQPage schema
  - HowTo schema (converter)
  - BreadcrumbList schema
  - AggregateRating schema

#### Localization
- **German Language Support** - Full German translation (`de.html`)
- **German Flag Icon** - `img/de.svg`
- **Language Toggles** - All pages have language switchers

#### UI/UX Improvements
- **SVG Icon System** - External sprite file (`img/icons.svg`)
  - Wrench, rocket, tools, chart, shield, graduation icons
  - Font, converter, brain icons
  - Better caching with external file
- **Converter UI Fixes**:
  - Fixed advanced mode button visibility (top offset)
  - Added language toggle in header
  - Logo display fix

#### Documentation (`docs/`)
- **README.md** - Documentation index
- **installation.md** - Setup and installation guide
- **architecture.md** - System architecture overview
- **converter-guide.md** - File converter documentation
- **api-reference.md** - Handler interfaces and APIs
- **deployment.md** - Production deployment guide
- **contributing.md** - Contribution guidelines

### Changed

- **Main README.md** - Comprehensive project overview
- **sitemap.xml** - Updated with all pages and tools
- **SVG References** - Changed from inline sprite to external file
  - `index.html` - Updated all icon references
  - `en.html` - Updated all icon references
  - `de.html` - Updated all icon references

### Fixed

- **cache.json** - Fixed handler name mismatches
- **WASM Paths** - Corrected from `/convert/wasm/` to `/tools/converter/wasm/`
- **Converter Logo** - Added logo to converter directory

---

## [2026-02-08] - GitHub Actions & Documentation Setup

### Added
- **`.github/copilot-instructions.md`** - Comprehensive AI agent instructions
- **`.nojekyll`** - Skip Jekyll build for GitHub Pages

### Fixed
- **GitHub Actions Billing** - Confirmed free for public repos

### Changed
- **`github-pages.yml`** - Restored deployment workflow

---

## Format Support Matrix

### CAD/CAM Formats

| Format | Input | Output | Notes |
|--------|-------|--------|-------|
| STL | ✓ | ✓ | 3D printing standard |
| OBJ | ✓ | ✓ | With material support |
| PLY | ✓ | ✓ | Polygon format |
| GLB | ✓ | ✓ | Binary glTF |
| DXF | ✓ | SVG, PNG | 2D CAD |

### Media Formats

| Category | Input | Output |
|----------|-------|--------|
| Video | MP4, WebM, AVI, MOV | MP4, WebM, GIF |
| Audio | MP3, WAV, OGG, FLAC | MP3, WAV, OGG |
| Image | PNG, JPG, WebP, GIF, BMP | PNG, JPG, WebP, SVG |

### Document Formats

| Format | Input | Output |
|--------|-------|--------|
| PDF | ✓ | SVG, PNG |
| SVG | ✓ | PNG, PDF |

---

## Roadmap

### Phase 3 (Planned)
- Server-side STEP/IGES conversion using FreeCAD
- 3MF format support for additive manufacturing

### Phase 4 (Planned)
- CNC-specific features
- G-code generation
- Toolpath preview
- Mesh analysis (volume, surface area)

---

## Version History

| Date | Version | Description |
|------|---------|-------------|
| 2026-02-19 | 2.0.0 | Complete UI/UX overhaul — cyberpunk design system |
| 2026-02-17 | 1.1.0 | CAD/CAM converter, SEO, localization, documentation |
| 2026-02-08 | 1.0.0 | Initial release, GitHub Pages deployment |
