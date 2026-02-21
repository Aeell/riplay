/**
 * RIPlay Toolbox API Server
 * 
 * Endpoints for server-side processing of large files:
 * - POST /api/pdf/merge - Merge multiple PDFs
 * - POST /api/pdf/split - Split PDF by page ranges
 * - POST /api/pdf/compress - Compress PDF (reduce quality)
 * - POST /api/image/compress - Compress images with sharp
 * 
 * Security:
 * - Memory-only processing (no disk writes)
 * - Immediate cleanup after response
 * - Zero logging of file contents
 * - 60s timeout, 200MB max file size
 */

import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://riplay.cz', 'https://www.riplay.cz', 'http://localhost:*.'],
  credentials: true
}));

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
    files: 20 // Max 20 files for batch operations
  }
});

// Request timeout middleware (60 seconds)
app.use((req, res, next) => {
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================================================================
// PDF ENDPOINTS
// ================================================================

/**
 * POST /api/pdf/merge
 * Merge multiple PDF files into one
 * 
 * Form data:
 * - files: PDF files to merge (multiple)
 * 
 * Returns: Merged PDF file
 */
app.post('/api/pdf/merge', upload.array('files', 20), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 PDF files required' });
    }

    // Create new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Process each file
    for (const file of req.files) {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    // Generate merged PDF bytes
    const mergedPdfBytes = await mergedPdf.save();
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="merged-${timestamp}.pdf"`);
    res.setHeader('Content-Length', mergedPdfBytes.length);
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    
    // Send response
    res.send(Buffer.from(mergedPdfBytes));
    
  } catch (error) {
    console.error('PDF merge error:', error.message);
    res.status(500).json({ error: 'Failed to merge PDFs', details: error.message });
  }
});

/**
 * POST /api/pdf/split
 * Split PDF by page ranges
 * 
 * Form data:
 * - file: PDF file to split
 * - ranges: Page ranges (e.g., "1-3,5,7-9")
 * 
 * Returns: Split PDF file
 */
app.post('/api/pdf/split', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file required' });
    }

    const ranges = parsePageRanges(req.body.ranges || '1-');
    const sourcePdf = await PDFDocument.load(req.file.buffer);
    const splitPdf = await PDFDocument.create();
    
    // Copy specified pages
    for (const pageNum of ranges) {
      if (pageNum >= 1 && pageNum <= sourcePdf.getPageCount()) {
        const [page] = await splitPdf.copyPages(sourcePdf, [pageNum - 1]);
        splitPdf.addPage(page);
      }
    }
    
    // Generate split PDF bytes
    const splitPdfBytes = await splitPdf.save();
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="split-${timestamp}.pdf"`);
    res.setHeader('Content-Length', splitPdfBytes.length);
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    
    res.send(Buffer.from(splitPdfBytes));
    
  } catch (error) {
    console.error('PDF split error:', error.message);
    res.status(500).json({ error: 'Failed to split PDF', details: error.message });
  }
});

/**
 * POST /api/pdf/compress
 * Compress PDF by removing redundant data
 * 
 * Note: pdf-lib doesn't support image recompression.
 * For real compression, consider using Ghostscript or pdfcpu.
 * This endpoint removes metadata and optimizes structure.
 * 
 * Form data:
 * - file: PDF file to compress
 * - quality: Compression quality (low, medium, high)
 * 
 * Returns: Compressed PDF file
 */
app.post('/api/pdf/compress', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file required' });
    }

    const quality = req.body.quality || 'medium';
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(req.file.buffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    // Remove metadata for size reduction
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('RIPlay Toolbox');
    pdfDoc.setCreator('RIPlay Toolbox');
    
    // Save with compression options
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true, // Better compression
      addDefaultPage: false,
    });
    
    // Calculate compression ratio
    const originalSize = req.file.size;
    const compressedSize = compressedPdfBytes.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="compressed-${timestamp}.pdf"`);
    res.setHeader('Content-Length', compressedPdfBytes.length);
    res.setHeader('X-Original-Size', originalSize);
    res.setHeader('X-Compressed-Size', compressedSize);
    res.setHeader('X-Compression-Ratio', `${ratio}%`);
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    
    res.send(Buffer.from(compressedPdfBytes));
    
  } catch (error) {
    console.error('PDF compress error:', error.message);
    res.status(500).json({ error: 'Failed to compress PDF', details: error.message });
  }
});

// ================================================================
// IMAGE ENDPOINTS
// ================================================================

/**
 * POST /api/image/compress
 * Compress and optionally convert images
 * 
 * Form data:
 * - file: Image file (JPG, PNG, WebP, AVIF)
 * - quality: Compression quality (1-100)
 * - format: Output format (jpeg, png, webp, avif)
 * - maxWidth: Maximum width (optional)
 * - maxHeight: Maximum height (optional)
 * 
 * Returns: Compressed image file
 */
app.post('/api/image/compress', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file required' });
    }

    const quality = parseInt(req.body.quality) || 80;
    const format = req.body.format || 'jpeg';
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;
    
    // Validate format
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: `Invalid format. Supported: ${validFormats.join(', ')}` });
    }
    
    // Create sharp instance
    let image = sharp(req.file.buffer);
    
    // Get metadata
    const metadata = await image.metadata();
    
    // Resize if needed
    if (maxWidth || maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply format and quality
    const outputFormat = format === 'jpg' ? 'jpeg' : format;
    const formatOptions = {
      jpeg: { quality, mozjpeg: true },
      png: { compressionLevel: 9, quality },
      webp: { quality },
      avif: { quality }
    };
    
    image = image.toFormat(outputFormat, formatOptions[outputFormat]);
    
    // Process image
    const compressedBuffer = await image.toBuffer();
    
    // Calculate compression ratio
    const originalSize = req.file.size;
    const compressedSize = compressedBuffer.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    // Determine content type
    const contentTypes = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif'
    };
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = format === 'jpeg' ? 'jpg' : format;
    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="compressed-${timestamp}.${extension}"`);
    res.setHeader('Content-Length', compressedSize);
    res.setHeader('X-Original-Size', originalSize);
    res.setHeader('X-Compressed-Size', compressedSize);
    res.setHeader('X-Compression-Ratio', `${ratio}%`);
    res.setHeader('X-Original-Format', metadata.format);
    res.setHeader('X-Original-Dimensions', `${metadata.width}x${metadata.height}`);
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    
    res.send(compressedBuffer);
    
  } catch (error) {
    console.error('Image compress error:', error.message);
    res.status(500).json({ error: 'Failed to compress image', details: error.message });
  }
});

/**
 * POST /api/image/batch
 * Batch compress multiple images
 * 
 * Form data:
 * - files: Image files (up to 20)
 * - quality: Compression quality (1-100)
 * - format: Output format (jpeg, png, webp, avif)
 * 
 * Returns: ZIP file with compressed images
 */
app.post('/api/image/batch', upload.array('files', 20), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Image files required' });
    }

    const quality = parseInt(req.body.quality) || 80;
    const format = req.body.format || 'jpeg';
    
    // For batch processing, we'll return a JSON with individual results
    // In production, you'd use JSZip to create a ZIP file
    const results = [];
    
    for (const file of req.files) {
      try {
        let image = sharp(file.buffer);
        const metadata = await image.metadata();
        
        const outputFormat = format === 'jpg' ? 'jpeg' : format;
        const formatOptions = {
          jpeg: { quality, mozjpeg: true },
          png: { compressionLevel: 9, quality },
          webp: { quality },
          avif: { quality }
        };
        
        image = image.toFormat(outputFormat, formatOptions[outputFormat]);
        const compressedBuffer = await image.toBuffer();
        
        const ratio = ((1 - compressedBuffer.length / file.size) * 100).toFixed(1);
        
        results.push({
          originalName: file.originalname,
          originalSize: file.size,
          compressedSize: compressedBuffer.length,
          compressionRatio: `${ratio}%`,
          data: compressedBuffer.toString('base64')
        });
      } catch (err) {
        results.push({
          originalName: file.originalname,
          error: err.message
        });
      }
    }
    
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    res.json({ results });
    
  } catch (error) {
    console.error('Batch compress error:', error.message);
    res.status(500).json({ error: 'Failed to batch compress images', details: error.message });
  }
});

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Parse page ranges string into array of page numbers
 * Examples: "1-3" => [1,2,3], "1,3,5" => [1,3,5], "1-3,5,7-9" => [1,2,3,5,7,8,9]
 */
function parsePageRanges(rangeStr) {
  const pages = [];
  const parts = rangeStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
      if (!isNaN(start)) {
        const endPage = isNaN(end) ? 10000 : end; // Large number for "to end"
        for (let i = start; i <= endPage; i++) {
          pages.push(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed);
      if (!isNaN(pageNum)) {
        pages.push(pageNum);
      }
    }
  }
  
  return [...new Set(pages)].sort((a, b) => a - b);
}

// ================================================================
// ERROR HANDLING
// ================================================================

// Multer error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 200MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 20 files.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Generic error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ================================================================
// START SERVER
// ================================================================

app.listen(PORT, () => {
  console.log(`RIPlay Toolbox API running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/pdf/merge');
  console.log('  POST /api/pdf/split');
  console.log('  POST /api/pdf/compress');
  console.log('  POST /api/image/compress');
  console.log('  POST /api/image/batch');
});
