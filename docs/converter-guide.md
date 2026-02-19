# Universal File Converter Guide

## Overview

The Universal File Converter is a client-side file conversion tool supporting multiple format categories including CAD/CAM files, media files, documents, and images.

## Access

The converter is available at: `/tools/converter/`

## Supported Formats

### CAD/CAM Formats

| Format | Extension | Input | Output | Notes |
|--------|-----------|-------|--------|-------|
| **STL** | `.stl` | ✓ | ✓ | 3D mesh, common in 3D printing |
| **OBJ** | `.obj` | ✓ | ✓ | 3D mesh with material support |
| **PLY** | `.ply` | ✓ | ✓ | Polygon file format |
| **GLB** | `.glb` | ✓ | ✓ | Binary glTF format |
| **DXF** | `.dxf` | ✓ | SVG, PNG | 2D CAD drawings |

### Media Formats

| Category | Input Formats | Output Formats |
|----------|---------------|----------------|
| **Video** | MP4, WebM, AVI, MOV, MKV | MP4, WebM, GIF |
| **Audio** | MP3, WAV, OGG, FLAC, AAC | MP3, WAV, OGG |
| **Image** | PNG, JPG, WebP, GIF, BMP, TIFF | PNG, JPG, WebP, SVG |

### Document Formats

| Format | Input | Output | Notes |
|--------|-------|--------|-------|
| **PDF** | ✓ | SVG, PNG | Rasterization |
| **SVG** | ✓ | PNG, PDF | Vector graphics |

## Usage

### Basic Conversion

1. **Select Files:** Click the upload area or drag-and-drop files
2. **Choose Output Format:** Select from available output formats
3. **Configure Options:** Adjust quality, size, or other parameters
4. **Convert:** Click the convert button
5. **Download:** Save the converted file(s)

### Batch Processing

The converter supports multiple file uploads:

1. Select multiple files at once
2. All files convert to the same output format
3. Download as individual files or ZIP archive

### Advanced Mode

Toggle advanced mode for additional options:

- Custom output dimensions
- Quality settings
- Metadata preservation
- Format-specific parameters

## CAD/CAM Specific Features

### 3D Mesh Handling (STL, OBJ, PLY, GLB)

The CAD mesh handler uses Three.js for processing:

```typescript
// Example: STL to OBJ conversion flow
STL File → Three.js BufferGeometry → OBJ Export
```

**Features:**
- Mesh validation
- Vertex normal calculation
- Binary and ASCII STL support
- Material preservation (where applicable)

**Limitations:**
- 3D to 2D conversion produces wireframe only
- Large meshes (>1M triangles) may be slow

### DXF to SVG/PNG

DXF files are parsed and rendered as vector graphics:

```typescript
// DXF parsing flow
DXF File → dxf-parser → Entities → SVG Renderer → Output
```

**Supported DXF Entities:**
- LINE
- CIRCLE
- ARC
- LWPOLYLINE
- POLYLINE
- TEXT
- MTEXT
- DIMENSION (partial)

**Limitations:**
- Complex hatches may not render correctly
- External references (XREFs) not supported
- Custom line types may be simplified

## API Reference

### Handler Interface

All format handlers implement the `FormatHandler` interface:

```typescript
interface FormatHandler {
  // Supported input formats
  inputFormats: string[];
  
  // Supported output formats
  outputFormats: string[];
  
  // Convert file to target format
  convert(file: File, options: ConvertOptions): Promise<Blob>;
  
  // Get preview/thumbnail
  getPreview?(file: File): Promise<string>;
  
  // Validate file before conversion
  validate?(file: File): Promise<boolean>;
}
```

### Convert Options

```typescript
interface ConvertOptions {
  outputFormat: string;
  quality?: number;      // 0-100
  width?: number;        // Output width
  height?: number;       // Output height
  preserveMetadata?: boolean;
  advanced?: Record<string, any>;
}
```

## Performance Considerations

### Memory Usage

Large files are processed in memory. Recommended limits:

| File Type | Max Recommended Size |
|-----------|---------------------|
| 3D Meshes | 50MB |
| Videos | 500MB |
| Images | 100MB |
| Documents | 50MB |

### Browser Compatibility

For best performance, use:
- Chrome 90+ (best WASM performance)
- Firefox 90+
- Safari 15+ (limited SharedArrayBuffer support)

### Troubleshooting

#### "Out of Memory" Error

**Cause:** File too large for browser memory

**Solutions:**
1. Use a smaller file
2. Close other browser tabs
3. Try a different browser

#### Conversion Hangs

**Cause:** WASM not loaded or SharedArrayBuffer issues

**Solutions:**
1. Check browser console for errors
2. Ensure HTTPS (required for SharedArrayBuffer)
3. Try a different browser

#### DXF Not Rendering

**Cause:** Unsupported DXF entities or version

**Solutions:**
1. Simplify the DXF in CAD software
2. Export as older DXF version (R12/R2000)
3. Check console for specific entity errors

## Future Enhancements

### Planned Features

1. **STEP/IGES Support:** Server-side conversion using FreeCAD
2. **3MF Support:** Additive manufacturing format
3. **CNC Features:** G-code generation, toolpath preview
4. **Mesh Analysis:** Volume, surface area, bounding box

### Contributing

To add a new format handler:

1. Create `src/handlers/newFormatHandler.ts`
2. Implement `FormatHandler` interface
3. Register in `src/handlers/index.ts`
4. Add tests and documentation

See [Contributing Guidelines](./contributing.md) for details.
