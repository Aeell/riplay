import type { FileData, FileFormat, FormatHandler } from "../FormatHandler.ts";

import { pdfToImg } from "pdftoimg-js/browser";
import { imageTracer } from 'imagetracer';

function base64ToBytes (base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

class pdftoimgHandler implements FormatHandler {

  public name: string = "pdftoimg";

  public supportedFormats: FileFormat[] = [
    {
      name: "Portable Document Format",
      format: "pdf",
      extension: "pdf",
      mime: "application/pdf",
      from: true,
      to: false,
      internal: "pdf"
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
    {
      name: "Joint Photographic Experts Group JFIF",
      format: "jpeg",
      extension: "jpg",
      mime: "image/jpeg",
      from: false,
      to: true,
      internal: "jpeg"
    },
    {
      name: "Scalable Vector Graphics (Traced)",
      format: "svg",
      extension: "svg",
      mime: "image/svg+xml",
      from: false,
      to: true,
      internal: "svg"
    }
  ];

  public ready: boolean = true;

  async init () {
    this.ready = true;
  }

  async doConvert (
    inputFiles: FileData[],
    inputFormat: FileFormat,
    outputFormat: FileFormat
  ): Promise<FileData[]> {

    if (
      outputFormat.format !== "png"
      && outputFormat.format !== "jpg"
      && outputFormat.format !== "svg"
    ) throw "Invalid output format.";

    const outputFiles: FileData[] = [];
    const encoder = new TextEncoder();

    for (const inputFile of inputFiles) {

      const blob = new Blob([inputFile.bytes as BlobPart], { type: inputFormat.mime });
      const url = URL.createObjectURL(blob);

      // For SVG, we need to render to PNG first then trace
      const imgType = outputFormat.format === "svg" ? "png" : outputFormat.format;

      const images = await pdfToImg(url, {
        imgType: imgType,
        pages: "all"
      });

      const baseName = inputFile.name.split(".")[0];

      for (let i = 0; i < images.length; i++) {
        if (outputFormat.format === "svg") {
          // Trace the PNG to SVG
          const svgString = await imageTracer.imageToSVG(images[i]);
          const bytes = encoder.encode(svgString);
          const name = `${baseName}_${i}.svg`;
          outputFiles.push({ bytes, name });
        } else {
          const base64 = images[i].slice(images[i].indexOf(";base64,") + 8);
          const bytes = base64ToBytes(base64);
          const name = `${baseName}_${i}.${outputFormat.extension}`;
          outputFiles.push({ bytes, name });
        }
      }

    }

    return outputFiles;

  }

}

export default pdftoimgHandler;
