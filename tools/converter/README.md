# RIPlay Universal File Converter

A powerful, client-side file converter with CAD/CAM support. Based on [p2r3/convert](https://github.com/p2r3/convert) with additional CAD/CAM functionality.

## Features

### CAD/CAM Formats (RIPlay Extensions)
- **STL** - Stereolithography (3D printing, CNC)
- **OBJ** - Wavefront OBJ (3D modeling)
- **PLY** - Polygon File Format (3D scanning)
- **GLB** - GL Transmission Format Binary
- **DXF** - AutoCAD Drawing Exchange Format (2D CAD)
- **SVG** - Scalable Vector Graphics (laser cutting)

### Standard Formats (from p2r3/convert)
- **Video**: MP4, AVI, MOV, WebM, MKV, etc.
- **Audio**: MP3, WAV, OGG, FLAC, etc.
- **Images**: PNG, JPG, WebP, GIF, SVG, etc.
- **Documents**: PDF, Markdown, HTML
- **Archives**: ZIP, TAR, etc.

## Key Benefits

- ✅ **100% Client-side** - Files never leave your browser
- ✅ **No registration required** - Instant conversion
- ✅ **Privacy-first** - Your data stays on your device
- ✅ **Batch support** - Convert multiple files at once
- ✅ **Auto-routing** - Automatically finds conversion paths

## Development

### Prerequisites
- Node.js 18+ (or Bun)
- npm (comes with Node.js)

### Setup

```bash
# Navigate to converter directory
cd tools/converter

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build static files
npm run build

# Output will be in dist/ directory
```

### Docker Deployment

```bash
# Using Docker Compose
docker compose -f docker/docker-compose.yml up -d

# Or with local build
docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml up --build -d
```

## Project Structure

```
tools/converter/
├── src/
│   ├── handlers/
│   │   ├── cadMesh.ts      # STL, OBJ, PLY, GLB conversion
│   │   ├── dxfHandler.ts   # DXF to SVG/PNG conversion
│   │   ├── threejs.ts      # GLB rendering
│   │   ├── FFmpeg.ts       # Video/audio conversion
│   │   ├── ImageMagick.ts  # Image conversion
│   │   └── ...
│   ├── main.ts             # Main application
│   └── FormatHandler.ts    # Handler interface
├── index.html              # Entry point
├── style.css               # Styles
├── package.json            # Dependencies
└── vite.config.js          # Build configuration
```

## Adding New Format Handlers

Create a new handler in `src/handlers/`:

```typescript
// src/handlers/myFormat.ts
import type { FileData, FileFormat, FormatHandler } from "../FormatHandler.ts";

class myFormatHandler implements FormatHandler {
  public name = "myFormat";
  public supportedFormats: FileFormat[] = [
    {
      name: "My Format",
      format: "myf",
      extension: "myf",
      mime: "application/x-my-format",
      from: true,
      to: true,
      internal: "myf"
    },
  ];
  public ready = false;

  async init() {
    // Initialize your handler
    this.ready = true;
  }

  async doConvert(
    inputFiles: FileData[],
    inputFormat: FileFormat,
    outputFormat: FileFormat
  ): Promise<FileData[]> {
    // Implement conversion logic
    return [];
  }
}

export default myFormatHandler;
```

Then register it in `src/handlers/index.ts`:

```typescript
import myFormatHandler from "./myFormat.ts";
// ...
try { handlers.push(new myFormatHandler()) } catch (_) { };
```

## CAD/CAM Conversion Matrix

| From | To | Method |
|------|-----|--------|
| STL | OBJ, GLB, PLY | Three.js |
| OBJ | STL, GLB, PLY | Three.js |
| PLY | STL, OBJ, GLB | Three.js |
| GLB | STL, OBJ, PLY | Three.js |
| DXF | SVG, PNG | dxf-parser |
| Any mesh | PNG, JPEG | Three.js rendering |

## Future Plans (Phase 3+)

- [ ] STEP/IGES support (requires server-side FreeCAD)
- [ ] Parasolid support
- [ ] Mesh analysis tools (manifold check, holes)
- [ ] Unit conversion (mm/inch)
- [ ] Bounding box display
- [ ] G-code preview

## License

GPL-2.0 (inherited from p2r3/convert)

## Credits

- Base converter: [p2r3/convert](https://github.com/p2r3/convert)
- CAD/CAM extensions: RIPlay
- 3D processing: [Three.js](https://threejs.org/)
- DXF parsing: [dxf-parser](https://www.npmjs.com/package/dxf-parser)
