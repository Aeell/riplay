# API Reference

This document describes the internal APIs and interfaces used in the RIPlay project.

## Converter Handler API

### FormatHandler Interface

All format handlers must implement this interface:

```typescript
interface FormatHandler {
  /**
   * Supported input file extensions (lowercase, no dot)
   */
  inputFormats: string[];
  
  /**
   * Supported output format extensions (lowercase, no dot)
   */
  outputFormats: string[];
  
  /**
   * Human-readable name for the handler
   */
  name: string;
  
  /**
   * Convert a file to the target format
   * @param file - Input file
   * @param options - Conversion options
   * @returns Promise resolving to converted file as Blob
   */
  convert(file: File, options: ConvertOptions): Promise<Blob>;
  
  /**
   * Generate a preview/thumbnail for the file
   * @param file - Input file
   * @returns Promise resolving to data URL or null
   */
  getPreview?(file: File): Promise<string | null>;
  
  /**
   * Validate file before conversion
   * @param file - Input file
   * @returns Promise resolving to validation result
   */
  validate?(file: File): Promise<ValidationResult>;
  
  /**
   * Get supported conversion paths
   * @returns Array of input-output format pairs
   */
  getConversionPaths?(): ConversionPath[];
}
```

### ConvertOptions Interface

```typescript
interface ConvertOptions {
  /** Target output format (required) */
  outputFormat: string;
  
  /** Quality setting (0-100), format-dependent */
  quality?: number;
  
  /** Output width in pixels */
  width?: number;
  
  /** Output height in pixels */
  height?: number;
  
  /** Preserve metadata (EXIF, etc.) */
  preserveMetadata?: boolean;
  
  /** Advanced format-specific options */
  advanced?: Record<string, unknown>;
}
```

### ValidationResult Interface

```typescript
interface ValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  
  /** Error messages if invalid */
  errors?: string[];
  
  /** Warnings (valid but with issues) */
  warnings?: string[];
  
  /** Detected file info */
  info?: {
    format?: string;
    dimensions?: { width: number; height: number };
    fileSize?: number;
    pageCount?: number;
  };
}
```

### ConversionPath Interface

```typescript
interface ConversionPath {
  input: string;
  output: string;
  quality?: boolean;
  dimensions?: boolean;
}
```

## Built-in Handlers

### CADMeshHandler

Handles 3D mesh formats: STL, OBJ, PLY, GLB

```typescript
import { CADMeshHandler } from './handlers/cadMesh';

const handler = new CADMeshHandler();

// Supported conversions
handler.inputFormats;  // ['stl', 'obj', 'ply', 'glb']
handler.outputFormats; // ['stl', 'obj', 'ply', 'glb', 'svg', 'png']

// Convert STL to OBJ
const result = await handler.convert(file, {
  outputFormat: 'obj'
});

// Get 3D preview
const preview = await handler.getPreview(file);
// Returns: data:image/png;base64,...
```

### DXFHandler

Handles 2D CAD drawings: DXF

```typescript
import { DXFHandler } from './handlers/dxfHandler';

const handler = new DXFHandler();

// Supported conversions
handler.inputFormats;  // ['dxf']
handler.outputFormats; // ['svg', 'png']

// Convert DXF to SVG
const result = await handler.convert(file, {
  outputFormat: 'svg',
  width: 1920,
  height: 1080
});
```

### VideoHandler

Handles video transcoding via FFmpeg WASM

```typescript
import { VideoHandler } from './handlers/videoHandler';

const handler = new VideoHandler();

// Supported conversions
handler.inputFormats;  // ['mp4', 'webm', 'avi', 'mov', 'mkv']
handler.outputFormats; // ['mp4', 'webm', 'gif', 'mp3']

// Convert video with quality setting
const result = await handler.convert(file, {
  outputFormat: 'webm',
  quality: 80,
  width: 1280
});
```

### ImageHandler

Handles image conversion via ImageMagick WASM

```typescript
import { ImageHandler } from './handlers/imageHandler';

const handler = new ImageHandler();

// Supported conversions
handler.inputFormats;  // ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']
handler.outputFormats; // ['png', 'jpg', 'webp', 'gif', 'svg', 'pdf']

// Convert image
const result = await handler.convert(file, {
  outputFormat: 'webp',
  quality: 90,
  width: 800,
  height: 600
});
```

## Utility Functions

### detectFormat()

Detect file format from magic bytes

```typescript
import { detectFormat } from './lib/detect';

const format = await detectFormat(file);
// Returns: 'png', 'jpeg', 'pdf', 'stl', etc.
```

### getHandler()

Get appropriate handler for a file

```typescript
import { getHandler } from './handlers';

const handler = getHandler(file);
if (handler) {
  const result = await handler.convert(file, options);
}
```

### downloadBlob()

Trigger file download

```typescript
import { downloadBlob } from './lib/download';

downloadBlob(blob, 'converted-file.svg');
```

## Event System

The converter emits custom events during processing:

```typescript
// Listen for conversion events
document.addEventListener('converter:start', (e) => {
  console.log('Conversion started', e.detail);
});

document.addEventListener('converter:progress', (e) => {
  console.log(`Progress: ${e.detail.percent}%`);
});

document.addEventListener('converter:complete', (e) => {
  console.log('Conversion complete', e.detail.output);
});

document.addEventListener('converter:error', (e) => {
  console.error('Conversion failed', e.detail.error);
});
```

### Event Types

```typescript
interface ConverterEventDetail {
  // Start event
  file?: File;
  format?: string;
  
  // Progress event
  percent?: number;
  stage?: string;
  
  // Complete event
  output?: Blob;
  
  // Error event
  error?: Error;
}
```

## WASM Integration

### FFmpeg Loading

```typescript
import { loadFFmpeg } from './wasm/ffmpeg';

// Load FFmpeg WASM
const ffmpeg = await loadFFmpeg();

// Execute FFmpeg command
await ffmpeg.exec(['-i', 'input.mp4', 'output.webm']);
```

### ImageMagick Loading

```typescript
import { loadImageMagick } from './wasm/magick';

// Load ImageMagick WASM
const magick = await loadImageMagick();

// Convert image
await magick.convert(['input.png', '-resize', '800x600', 'output.webp']);
```

## Error Handling

### Error Types

```typescript
class ConversionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

// Error codes
enum ErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  UNSUPPORTED_CONVERSION = 'UNSUPPORTED_CONVERSION',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  WASM_LOAD_FAILED = 'WASM_LOAD_FAILED',
}
```

### Error Handling Example

```typescript
try {
  const result = await handler.convert(file, options);
} catch (error) {
  if (error instanceof ConversionError) {
    switch (error.code) {
      case ErrorCode.FILE_TOO_LARGE:
        console.error('File exceeds size limit');
        break;
      case ErrorCode.OUT_OF_MEMORY:
        console.error('Not enough memory. Try a smaller file.');
        break;
      default:
        console.error('Conversion failed:', error.message);
    }
  }
}
```

## Configuration

### Handler Registration

```typescript
// src/handlers/index.ts
import { CADMeshHandler } from './cadMesh';
import { DXFHandler } from './dxfHandler';
import { VideoHandler } from './videoHandler';
import { ImageHandler } from './imageHandler';

export const handlers: FormatHandler[] = [
  new CADMeshHandler(),
  new DXFHandler(),
  new VideoHandler(),
  new ImageHandler(),
  // Add custom handlers here
];
```

### WASM Configuration

```typescript
// src/config/wasm.ts
export const wasmConfig = {
  ffmpeg: {
    corePath: '/tools/converter/wasm/ffmpeg/ffmpeg-core.js',
    wasmPath: '/tools/converter/wasm/ffmpeg/ffmpeg-core.wasm',
  },
  magick: {
    corePath: '/tools/converter/wasm/magick/magick.js',
    wasmPath: '/tools/converter/wasm/magick/magick.wasm',
  },
};
```
