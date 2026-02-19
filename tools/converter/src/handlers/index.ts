import type { FormatHandler } from "../FormatHandler.ts";

// Core handlers
import FFmpegHandler from "./FFmpeg.ts";
import pdftoimgHandler from "./pdftoimg.ts";
import ImageMagickHandler from "./ImageMagick.ts";
import svgTraceHandler from "./svgTrace.ts";
import { renameZipHandler, renameTxtHandler } from "./rename.ts";
import sqlite3Handler from "./sqlite.ts";
import markdownHandler from "./markdown.ts";
import jszipHandler from "./jszip.ts";
// RIPlay CAD/CAM Handlers
import cadMeshHandler from "./cadMesh.ts";
import dxfHandler from "./dxfHandler.ts";

// Removed: niche/gaming handler — not suitable for general-purpose converter
// import meydaHandler from "./meyda.ts";
// import htmlEmbedHandler from "./htmlEmbed.ts";
// import svgForeignObjectHandler from "./svgForeignObject.ts";
// import threejsHandler from "./threejs.ts";
// import vtfHandler from "./vtf.ts";
// import mcMapHandler from "./mcmap.ts";
// import pyTurtleHandler from "./pyTurtle.ts";
// import nbtHandler from "./nbt.ts";
// import peToZipHandler from "./petozip.ts";
// import flptojsonHandler from "./flptojson.ts";
// import floHandler from "./flo.ts";

const handlers: FormatHandler[] = [];

// Core handlers
try { handlers.push(new FFmpegHandler()) } catch (_) { };
try { handlers.push(new ImageMagickHandler()) } catch (_) { };
try { handlers.push(new pdftoimgHandler()) } catch (_) { };
try { handlers.push(new svgTraceHandler()) } catch (_) { };
try { handlers.push(new markdownHandler()) } catch (_) { };
try { handlers.push(new jszipHandler()) } catch (_) { };
try { handlers.push(renameZipHandler) } catch (_) { };
try { handlers.push(renameTxtHandler) } catch (_) { };
try { handlers.push(new sqlite3Handler()) } catch (_) { };

// RIPlay CAD/CAM Handlers - Priority placement for CNC workflows
try { handlers.push(new cadMeshHandler()) } catch (_) { };
try { handlers.push(new dxfHandler()) } catch (_) { };

// Removed: niche/gaming handler — not suitable for general-purpose converter
// try { handlers.push(new meydaHandler()) } catch (_) { };
// try { handlers.push(new htmlEmbedHandler()) } catch (_) { };
// try { handlers.push(new svgForeignObjectHandler()) } catch (_) { };
// try { handlers.push(new threejsHandler()) } catch (_) { };
// try { handlers.push(new vtfHandler()) } catch (_) { };
// try { handlers.push(new mcMapHandler()) } catch (_) { };
// try { handlers.push(new pyTurtleHandler()) } catch (_) { };
// try { handlers.push(new nbtHandler()) } catch (_) { };
// try { handlers.push(new peToZipHandler()) } catch (_) { };
// try { handlers.push(new flptojsonHandler()) } catch (_) { };
// try { handlers.push(new floHandler()) } catch (_) { };

export default handlers;
