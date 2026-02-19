/**
 * DXF Handler - Supports DXF to SVG/PNG conversion
 * For CNC/laser cutting workflows
 * 
 * Part of RIPlay Tools - CAD/CAM file conversion
 */

import type { FileData, FileFormat, FormatHandler } from "../FormatHandler.ts";

class dxfHandler implements FormatHandler {

  public name: string = "dxf";
  
  public supportedFormats: FileFormat[] = [
    {
      name: "AutoCAD Drawing Exchange Format",
      format: "dxf",
      extension: "dxf",
      mime: "image/vnd.dxf",
      from: true,
      to: false,
      internal: "dxf"
    },
    {
      name: "Scalable Vector Graphics",
      format: "svg",
      extension: "svg",
      mime: "image/svg+xml",
      from: false,
      to: true,
      internal: "svg"
    },
    {
      name: "Portable Network Graphics",
      format: "png",
      extension: "png",
      mime: "image/png",
      from: false,
      to: true,
      internal: "png"
    },
  ];
  
  public ready: boolean = false;
  
  private dxfParser: any = null;

  async init() {
    try {
      // Dynamically import dxf-parser
      const DxfParserModule = await import("dxf-parser");
      this.dxfParser = DxfParserModule.default || DxfParserModule;
      this.ready = true;
    } catch (error) {
      console.warn("DXF parser not available:", error);
      // Still mark as ready - we'll handle errors during conversion
      this.ready = true;
    }
  }

  /**
   * Parse DXF file and extract entities
   */
  private parseDXF(bytes: Uint8Array): any {
    const decoder = new TextDecoder("utf-8");
    const dxfContent = decoder.decode(bytes);
    
    if (!this.dxfParser) {
      throw new Error("DXF parser not initialized");
    }
    
    const parser = new this.dxfParser();
    const dxf = parser.parseSync(dxfContent);
    
    return dxf;
  }

  /**
   * Convert DXF entities to SVG paths
   */
  private dxfToSVG(dxf: any): string {
    const svgParts: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Helper to update bounds
    const updateBounds = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    
    // Process entities
    const entities = dxf.entities || [];
    
    for (const entity of entities) {
      switch (entity.type) {
        case "LINE": {
          const x1 = entity.vertices[0].x;
          const y1 = -entity.vertices[0].y; // Flip Y for SVG
          const x2 = entity.vertices[1].x;
          const y2 = -entity.vertices[1].y;
          updateBounds(x1, y1);
          updateBounds(x2, y2);
          svgParts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "LWPOLYLINE":
        case "POLYLINE": {
          const vertices = entity.vertices;
          if (vertices.length < 2) break;
          
          let pathD = `M ${vertices[0].x} ${-vertices[0].y}`;
          updateBounds(vertices[0].x, -vertices[0].y);
          
          for (let i = 1; i < vertices.length; i++) {
            const v = vertices[i];
            pathD += ` L ${v.x} ${-v.y}`;
            updateBounds(v.x, -v.y);
          }
          
          if (entity.shape === true) {
            pathD += " Z";
          }
          
          svgParts.push(`<path d="${pathD}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "CIRCLE": {
          const cx = entity.center.x;
          const cy = -entity.center.y;
          const r = entity.radius;
          updateBounds(cx - r, cy - r);
          updateBounds(cx + r, cy + r);
          svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "ARC": {
          const cx = entity.center.x;
          const cy = -entity.center.y;
          const r = entity.radius;
          const startAngle = (entity.startAngle || 0) * 180 / Math.PI;
          const endAngle = (entity.endAngle || 360) * 180 / Math.PI;
          
          // Convert arc to path
          const start = this.polarToCartesian(cx, cy, r, endAngle);
          const end = this.polarToCartesian(cx, cy, r, startAngle);
          const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
          
          updateBounds(start.x, start.y);
          updateBounds(end.x, end.y);
          
          const pathD = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
          svgParts.push(`<path d="${pathD}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "ELLIPSE": {
          // Simplified ellipse rendering
          const cx = entity.center.x;
          const cy = -entity.center.y;
          const rx = entity.majorAxisX || entity.radiusX || 10;
          const ry = entity.majorAxisY || entity.radiusY || rx * 0.5;
          updateBounds(cx - rx, cy - ry);
          updateBounds(cx + rx, cy + ry);
          svgParts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(rx)}" ry="${Math.abs(ry)}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "SPLINE": {
          // Approximate spline with polyline
          const points = entity.controlPoints || entity.fitPoints || [];
          if (points.length < 2) break;
          
          let pathD = `M ${points[0].x} ${-points[0].y}`;
          updateBounds(points[0].x, -points[0].y);
          
          for (let i = 1; i < points.length; i++) {
            const p = points[i];
            pathD += ` L ${p.x} ${-p.y}`;
            updateBounds(p.x, -p.y);
          }
          
          svgParts.push(`<path d="${pathD}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        case "TEXT":
        case "MTEXT": {
          // Simplified text rendering
          const x = entity.position?.x || entity.insertionPoint?.x || 0;
          const y = -(entity.position?.y || entity.insertionPoint?.y || 0);
          const text = entity.text || entity.string || "";
          const height = entity.height || 10;
          updateBounds(x, y);
          updateBounds(x + text.length * height * 0.6, y + height);
          svgParts.push(`<text x="${x}" y="${y}" font-size="${height}" fill="black">${this.escapeXml(text)}</text>`);
          break;
        }
        case "POINT": {
          const x = entity.position.x;
          const y = -entity.position.y;
          updateBounds(x - 2, y - 2);
          updateBounds(x + 2, y + 2);
          svgParts.push(`<circle cx="${x}" cy="${y}" r="2" fill="black"/>`);
          break;
        }
        case "SOLID":
        case "HATCH": {
          // Simplified hatch as path
          const points = entity.vertices || [];
          if (points.length < 3) break;
          
          let pathD = `M ${points[0].x} ${-points[0].y}`;
          updateBounds(points[0].x, -points[0].y);
          
          for (let i = 1; i < points.length; i++) {
            const p = points[i];
            pathD += ` L ${p.x} ${-p.y}`;
            updateBounds(p.x, -p.y);
          }
          pathD += " Z";
          
          svgParts.push(`<path d="${pathD}" fill="none" stroke="black" stroke-width="1"/>`);
          break;
        }
        default:
          console.log(`Unsupported DXF entity type: ${entity.type}`);
      }
    }
    
    // Calculate viewBox with padding
    const padding = 10;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    
    // Build complete SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}" 
     height="${height}" 
     viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
  <g transform="scale(1, 1)">
    ${svgParts.join("\n    ")}
  </g>
</svg>`;
    
    return svg;
  }

  /**
   * Convert polar to cartesian coordinates
   */
  private polarToCartesian(cx: number, cy: number, r: number, angle: number): { x: number, y: number } {
    const rad = angle * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '\x26amp;')
      .replace(/</g, '\x26lt;')
      .replace(/>/g, '\x26gt;')
      .replace(/"/g, '\x26quot;')
      .replace(/'/g, '\x26apos;');
  }

  /**
   * Convert SVG to PNG using Canvas
   */
  private async svgToPng(svgContent: string, width: number = 800, height: number = 600): Promise<Uint8Array> {
    // Create a canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    // Fill with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    
    // Create image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Calculate scaling to fit
        const scale = Math.min(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        URL.revokeObjectURL(url);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create PNG blob"));
            return;
          }
          blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
        }, "image/png");
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };
      
      img.src = url;
    });
  }

  async doConvert(
    inputFiles: FileData[],
    inputFormat: FileFormat,
    outputFormat: FileFormat
  ): Promise<FileData[]> {
    const outputFiles: FileData[] = [];

    for (const inputFile of inputFiles) {
      try {
        // Parse DXF
        const dxf = this.parseDXF(inputFile.bytes);
        
        // Convert to SVG first
        const svgContent = this.dxfToSVG(dxf);
        
        let outputBytes: Uint8Array;
        let outputExtension: string;
        
        switch (outputFormat.internal) {
          case "svg": {
            outputBytes = new TextEncoder().encode(svgContent);
            outputExtension = "svg";
            break;
          }
          case "png": {
            outputBytes = await this.svgToPng(svgContent);
            outputExtension = "png";
            break;
          }
          default:
            throw new Error(`Unsupported output format: ${outputFormat.internal}`);
        }
        
        // Generate output filename
        const baseName = inputFile.name.split(".")[0];
        const outputName = `${baseName}.${outputExtension}`;
        
        outputFiles.push({
          bytes: outputBytes,
          name: outputName
        });
      } catch (error) {
        console.error(`Failed to convert ${inputFile.name}:`, error);
        throw error;
      }
    }

    return outputFiles;
  }
}

export default dxfHandler;