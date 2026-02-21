/**
 * CAD Mesh Handler - Supports STL, OBJ, PLY, GLB formats
 * Uses Three.js for loading and exporting 3D mesh files
 * 
 * Part of RIPlay Tools - CAD/CAM file conversion
 * 
 * WARNING: 3D to 2D conversions (PNG, JPEG, SVG) are rendered projections,
 * not true engineering projections. For CNC work, use proper CAD software.
 */

import type { FileData, FileFormat, FormatHandler } from "../FormatHandler.ts";

import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import { PLYExporter } from "three/addons/exporters/PLYExporter.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { imageTracer } from 'imagetracer';

class cadMeshHandler implements FormatHandler {

  public name: string = "cadMesh";
  
  public supportedFormats: FileFormat[] = [
    // Input formats
    {
      name: "Stereolithography (CAD/CAM)",
      format: "stl",
      extension: "stl",
      mime: "model/stl",
      from: true,
      to: true,
      internal: "stl"
    },
    {
      name: "Wavefront OBJ (3D Model)",
      format: "obj",
      extension: "obj",
      mime: "model/obj",
      from: true,
      to: true,
      internal: "obj"
    },
    {
      name: "Polygon File Format (3D Scan)",
      format: "ply",
      extension: "ply",
      mime: "model/ply",
      from: true,
      to: true,
      internal: "ply"
    },
    {
      name: "GL Transmission Format Binary",
      format: "glb",
      extension: "glb",
      mime: "model/gltf-binary",
      from: true,
      to: true,
      internal: "glb"
    },
    // Image outputs for preview
    {
      name: "Portable Network Graphics (3D Render)",
      format: "png",
      extension: "png",
      mime: "image/png",
      from: false,
      to: true,
      internal: "png"
    },
    {
      name: "JPEG Image (3D Render)",
      format: "jpeg",
      extension: "jpg",
      mime: "image/jpeg",
      from: false,
      to: true,
      internal: "jpeg"
    },
    {
      name: "GIF Image (3D Render)",
      format: "gif",
      extension: "gif",
      mime: "image/gif",
      from: false,
      to: true,
      internal: "gif"
    },
    {
      name: "SVG Vector (3D Render Traced)",
      format: "svg",
      extension: "svg",
      mime: "image/svg+xml",
      from: false,
      to: true,
      internal: "svg"
    },
  ];
  
  public ready: boolean = false;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    // Add lighting for better rendering
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    this.scene.add(directionalLight2);
    
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    this.ready = true;
  }

  /**
   * Load a 3D file into a Three.js BufferGeometry
   */
  private async loadGeometry(bytes: Uint8Array, format: string): Promise<THREE.BufferGeometry> {
    const blob = new Blob([bytes.buffer as ArrayBuffer]);
    const url = URL.createObjectURL(blob);
    
    try {
      let result: THREE.BufferGeometry | THREE.Group;
      
      switch (format) {
        case "stl": {
          const loader = new STLLoader();
          result = await new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
          break;
        }
        case "obj": {
          const loader = new OBJLoader();
          const group = await new Promise<THREE.Group>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
          // Merge all geometries from the group
          const geometries: THREE.BufferGeometry[] = [];
          group.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              geometries.push(child.geometry);
            }
          });
          if (geometries.length === 0) {
            throw new Error("No geometry found in OBJ file");
          }
          result = geometries[0];
          break;
        }
        case "ply": {
          const loader = new PLYLoader();
          result = await new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
          break;
        }
        case "glb": {
          const loader = new GLTFLoader();
          const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });
          // Extract geometry from gltf
          const geometries: THREE.BufferGeometry[] = [];
          gltf.scene.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              geometries.push(child.geometry);
            }
          });
          if (geometries.length === 0) {
            throw new Error("No geometry found in GLB file");
          }
          result = geometries[0];
          break;
        }
        default:
          throw new Error(`Unsupported input format: ${format}`);
      }
      
      // Ensure we return a BufferGeometry
      if (result instanceof THREE.BufferGeometry) {
        return result;
      } else if (result instanceof THREE.Group) {
        // Extract first mesh geometry
        let geom: THREE.BufferGeometry | null = null;
        result.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !geom) {
            geom = child.geometry;
          }
        });
        if (geom) return geom;
      }
      
      throw new Error("Failed to extract geometry from loaded file");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Export geometry to the target format
   */
  private async exportGeometry(
    geometry: THREE.BufferGeometry,
    outputFormat: FileFormat,
    inputName: string
  ): Promise<Uint8Array> {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.DoubleSide
    }));
    
    switch (outputFormat.internal) {
      case "stl": {
        const exporter = new STLExporter();
        const stlBinary = exporter.parse(mesh, { binary: true });
        // Binary export returns a DataView; extract the underlying ArrayBuffer
        if (stlBinary instanceof DataView) {
          return new Uint8Array(stlBinary.buffer, stlBinary.byteOffset, stlBinary.byteLength);
        }
        // Fallback: ArrayBuffer or already Uint8Array-compatible
        return new Uint8Array(stlBinary as ArrayBuffer);
      }
      case "obj": {
        const exporter = new OBJExporter();
        const objString = exporter.parse(mesh);
        return new TextEncoder().encode(objString);
      }
      case "ply": {
        const exporter = new PLYExporter();
        const plyArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(mesh, (result: ArrayBuffer) => resolve(result), { binary: true });
        });
        return new Uint8Array(plyArrayBuffer);
      }
      case "glb": {
        const exporter = new GLTFExporter();
        const glbResult = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            mesh,
            (result: ArrayBuffer | { [key: string]: unknown }) => {
              if (result instanceof ArrayBuffer) {
                resolve(result);
              } else {
                reject(new Error("Expected binary GLB output"));
              }
            },
            (error: unknown) => reject(error),
            { binary: true }
          );
        });
        return new Uint8Array(glbResult);
      }
      case "png":
      case "jpeg":
      case "gif": {
        // Render to image (GIF uses PNG rendering, browser will convert)
        return this.renderToImage(geometry, outputFormat.mime);
      }
      case "svg": {
        // Render to PNG then trace to SVG
        const pngBytes = await this.renderToImage(geometry, "image/png");
        const blob = new Blob([pngBytes.buffer as ArrayBuffer], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        const svgString = await imageTracer.imageToSVG(url);
        URL.revokeObjectURL(url);
        return new TextEncoder().encode(svgString);
      }
      default:
        throw new Error(`Unsupported output format: ${outputFormat.internal}`);
    }
  }

  /**
   * Render geometry to an image
   */
  private async renderToImage(geometry: THREE.BufferGeometry, mimeType: string): Promise<Uint8Array> {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.DoubleSide
    }));
    
    // Compute bounding box for camera positioning
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Position camera
    this.camera.position.set(center.x, center.y, center.z + maxDim * 2);
    this.camera.lookAt(center);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    
    // Setup renderer
    const width = 800;
    const height = 800;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1);
    
    // Clear scene and add mesh
    this.scene.children.forEach((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        this.scene.remove(child);
      }
    });
    this.scene.add(mesh);
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Get image data
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      this.renderer.domElement.toBlob((blob: Blob | null) => {
        if (!blob) return reject("Canvas output failed");
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      }, mimeType, 0.95);
    });
    
    return bytes;
  }

  async doConvert(
    inputFiles: FileData[],
    inputFormat: FileFormat,
    outputFormat: FileFormat
  ): Promise<FileData[]> {
    const outputFiles: FileData[] = [];

    for (const inputFile of inputFiles) {
      try {
        // Load geometry from input
        const geometry = await this.loadGeometry(inputFile.bytes, inputFormat.internal);
        
        // Ensure normals are computed
        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals();
        }
        
        // Export to output format
        const outputBytes = await this.exportGeometry(geometry, outputFormat, inputFile.name);
        
        // Generate output filename
        const baseName = inputFile.name.split(".")[0];
        const outputName = `${baseName}.${outputFormat.extension}`;
        
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

export default cadMeshHandler;