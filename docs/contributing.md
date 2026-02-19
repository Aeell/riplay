# Contributing Guidelines

Thank you for your interest in contributing to RIPlay! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be considerate of others and follow standard open-source community guidelines.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Console errors

### Suggesting Features

1. Check existing issues for similar suggestions
2. Use the feature request template
3. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Use cases

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Modern web browser

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/riplay.git
cd riplay

# Install converter dependencies
cd tools/converter
npm install

# Start development server
npm run dev

# In another terminal, serve main site
cd ../..
npx serve .
```

## Project Structure

```
riplay/
├── index.html          # Czech homepage
├── en.html             # English homepage
├── de.html             # German homepage
├── css/
│   └── style.css       # Main styles
├── js/
│   └── script.js       # Main JavaScript
├── img/
│   └── icons.svg       # SVG icon sprite
├── tools/
│   ├── converter/      # Universal File Converter
│   └── googlefont2svg/ # Font converter
└── docs/               # Documentation
```

## Coding Standards

### HTML

- Use semantic HTML5 elements
- Include proper `lang` attribute
- Add ARIA labels where needed
- Validate with W3C validator

```html
<!-- Good -->
<button type="button" aria-label="Close menu">
  <span aria-hidden="true">&times;</span>
</button>

<!-- Bad -->
<div onclick="closeMenu()">X</div>
```

### CSS

- Use CSS custom properties for theming
- Follow BEM naming convention
- Mobile-first responsive design
- Minimize specificity

```css
/* Good */
.service-card__icon {
  fill: var(--primary-color);
}

/* Bad */
div.container .services .card img.icon {
  fill: #1C77FF;
}
```

### JavaScript

- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Add JSDoc comments for functions

```javascript
/**
 * Converts a file to the specified format
 * @param {File} file - Input file
 * @param {string} format - Target format
 * @returns {Promise<Blob>} Converted file
 */
const convertFile = async (file, format) => {
  // Implementation
};
```

### TypeScript (Converter)

- Strict mode enabled
- Explicit return types for public functions
- Interface over type alias for objects
- Avoid `any` type

```typescript
// Good
interface ConvertOptions {
  format: string;
  quality?: number;
}

function convert(file: File, options: ConvertOptions): Promise<Blob> {
  // Implementation
}

// Bad
function convert(file, options): any {
  // Implementation
}
```

## Adding a New Format Handler

### 1. Create Handler File

```typescript
// tools/converter/src/handlers/myFormatHandler.ts

import type { FormatHandler, ConvertOptions } from '../types';

export class MyFormatHandler implements FormatHandler {
  inputFormats = ['myf', 'myformat'];
  outputFormats = ['svg', 'png'];

  async convert(file: File, options: ConvertOptions): Promise<Blob> {
    // Implementation
    const buffer = await file.arrayBuffer();
    
    // Process the file...
    
    return new Blob([output], { type: 'image/svg+xml' });
  }

  async validate(file: File): Promise<boolean> {
    // Validate file structure
    return true;
  }
}
```

### 2. Register Handler

```typescript
// tools/converter/src/handlers/index.ts

import { MyFormatHandler } from './myFormatHandler';

export const handlers = [
  // ... existing handlers
  new MyFormatHandler(),
];
```

### 3. Add Tests

```typescript
// tools/converter/src/handlers/__tests__/myFormatHandler.test.ts

import { MyFormatHandler } from '../myFormatHandler';

describe('MyFormatHandler', () => {
  it('should convert myf to svg', async () => {
    const handler = new MyFormatHandler();
    // Test implementation
  });
});
```

### 4. Update Documentation

Add format to:
- `docs/converter-guide.md`
- `tools/converter/README.md`

## Testing

### Manual Testing

1. Test in multiple browsers (Chrome, Firefox, Safari)
2. Test responsive design at various breakpoints
3. Test with real files of different sizes
4. Verify accessibility with screen reader

### Automated Testing

```bash
# Run converter tests
cd tools/converter
npm test

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## Localization

### Adding a New Language

1. Create locale file:

```json
// tools/googlefont2svg/locales/xx.json
{
  "title": "Tool Title",
  "description": "Tool description",
  "buttons": {
    "convert": "Convert"
  }
}
```

2. Add flag icon to `img/` or `tools/googlefont2svg/flags/`

3. Update language toggle in HTML files

4. Register in i18n configuration

### Translation Guidelines

- Keep strings concise
- Use UTF-8 encoding
- Maintain placeholder syntax (`{variable}`)
- Consider text expansion (some languages are longer)

## Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(converter): add 3MF format support

- Add 3MF handler with mesh parsing
- Support binary and XML variants
- Add unit tests

Closes #123
```

```
fix(ui): correct icon alignment on mobile

The service icons were misaligned on screens < 480px.
```

## Questions?

- Open a GitHub issue for questions
- Email: stanwesly@protonmail.com

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
