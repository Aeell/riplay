import type { FileFormat, FileData, FormatHandler, ConvertPathNode } from "./FormatHandler.js";
import normalizeMimeType from "./normalizeMimeType.js";
import handlers from "./handlers";

/** Files currently selected for conversion */
let selectedFiles: File[] = [];
/**
 * Whether to use "simple" mode.
 * - In **simple** mode, the input/output lists are grouped by file format.
 * - In **advanced** mode, these lists are grouped by format handlers, which
 *   requires the user to manually select the tool that processes the output.
 */
let simpleMode: boolean = true;

// ─── Category → format extension mapping ────────────────────────────────────
const FORMAT_CATEGORIES: Record<string, string[]> = {
  images: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'ico', 'svg', 'avif', 'heic', 'heif', 'qoi'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'aiff'],
  video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'ogv', 'm4v', 'ts', 'mpeg', '3gp'],
  documents: ['pdf', 'md', 'html', 'txt', 'csv', 'json', 'xml', 'yaml', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'],
  cad: ['stl', 'obj', 'ply', 'glb', 'gltf', 'dxf', '3mf', 'amf', 'step', 'stp', 'iges', 'igs', 'brep', 'fcstd'],
  archives: ['zip', 'gz', 'tar', 'rar', '7z', 'bz2', 'xz'],
};

/** Currently active category filter (null = "all") */
let activeCategory: string | null = null;

/** Set of CAD format extensions for quick lookup */
const CAD_EXTENSIONS = new Set(FORMAT_CATEGORIES.cad);

/** 3D mesh format extensions */
const MESH_3D_FORMATS = new Set(['stl', 'obj', 'ply', 'glb', 'gltf']);

/** 2D raster/vector output formats */
const RASTER_2D_FORMATS = new Set(['png', 'jpeg', 'jpg', 'svg']);

/** Handlers that support conversion from any formats. */
const conversionsFromAnyInput: ConvertPathNode[] = handlers
.filter(h => h.supportAnyInput && h.supportedFormats)
.flatMap(h => h.supportedFormats!
  .filter(f => f.to)
  .map(f => ({ handler: h, format: f})))

const ui = {
  fileInput: document.querySelector("#file-input") as HTMLInputElement,
  fileSelectArea: document.querySelector("#file-area") as HTMLDivElement,
  convertButton: document.querySelector("#convert-button") as HTMLButtonElement,
  modeToggleButton: document.querySelector("#mode-button") as HTMLButtonElement,
  inputList: document.querySelector("#from-list") as HTMLDivElement,
  outputList: document.querySelector("#to-list") as HTMLDivElement,
  inputSearch: document.querySelector("#search-from") as HTMLInputElement,
  outputSearch: document.querySelector("#search-to") as HTMLInputElement,
  popupBox: document.querySelector("#popup") as HTMLDivElement,
  popupBackground: document.querySelector("#popup-bg") as HTMLDivElement
};

/**
 * Filters a list of butttons to exclude those not matching a substring.
 * @param list Button list (div) to filter.
 * @param string Substring for which to search.
 */
const filterButtonList = (list: HTMLDivElement, string: string) => {
  for (const button of Array.from(list.children)) {
    if (!(button instanceof HTMLButtonElement)) continue;
    const formatIndex = button.getAttribute("format-index");
    let hasExtension = false;
    if (formatIndex) {
      const format = allOptions[parseInt(formatIndex)];
      hasExtension = format?.format.extension.toLowerCase().includes(string);
    }
    const hasText = button.textContent.toLowerCase().includes(string);
    if (!hasExtension && !hasText) {
      button.style.display = "none";
    } else {
      button.style.display = "";
    }
  }
}

/**
 * Handles search box input by filtering its parent container.
 * @param event Input event from an {@link HTMLInputElement}
 */
const searchHandler = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const targetParentList = target.parentElement?.querySelector(".format-list");
  if (!(targetParentList instanceof HTMLDivElement)) return;

  const string = target.value.toLowerCase();
  filterButtonList(targetParentList, string);
};

// Assign search handler to both search boxes
ui.inputSearch.oninput = searchHandler;
ui.outputSearch.oninput = searchHandler;

// Map clicks in the file selection area to the file input element
ui.fileSelectArea.onclick = () => {
  ui.fileInput.click();
};

/**
 * Validates and stores user selected files. Works for both manual
 * selection and file drag-and-drop.
 * @param event Either a file input element's "change" event,
 * or a "drop" event.
 */
const fileSelectHandler = (event: Event) => {

  let inputFiles;

  if (event instanceof DragEvent) {
    inputFiles = event.dataTransfer?.files;
    if (inputFiles) event.preventDefault();
  } else if (event instanceof ClipboardEvent) {
    inputFiles = event.clipboardData?.files;
  } else {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    inputFiles = target.files;
  }

  if (!inputFiles) return;
  const files = Array.from(inputFiles);
  if (files.length === 0) return;

  if (files.some(c => c.type !== files[0].type)) {
    return alert("All input files must be of the same type.");
  }
  files.sort((a, b) => a.name === b.name ? 0 : (a.name < b.name ? -1 : 1));
  selectedFiles = files;

  ui.fileSelectArea.innerHTML = `<h2>
    ${files[0].name}
    ${files.length > 1 ? `<br>... and ${files.length - 1} more` : ""}
  </h2>`;

  // Common MIME type adjustments (to match "mime" library)
  let mimeType = normalizeMimeType(files[0].type);

  // Find a button matching the input MIME type.
  const buttonMimeType = Array.from(ui.inputList.children).find(button => {
    if (!(button instanceof HTMLButtonElement)) return false;
    return button.getAttribute("mime-type") === mimeType;
  });
  // Click button with matching MIME type.
  if (mimeType && buttonMimeType instanceof HTMLButtonElement) {
    buttonMimeType.click();
    ui.inputSearch.value = mimeType;
    filterButtonList(ui.inputList, ui.inputSearch.value);
    return;
  }

  // Fall back to matching format by file extension if MIME type wasn't found.
  const fileExtension = files[0].name.split(".").pop()?.toLowerCase();

  const buttonExtension = Array.from(ui.inputList.children).find(button => {
    if (!(button instanceof HTMLButtonElement)) return false;
    const formatIndex = button.getAttribute("format-index");
    if (!formatIndex) return;
    const format = allOptions[parseInt(formatIndex)];
    return format.format.extension.toLowerCase() === fileExtension;
  });
  if (buttonExtension instanceof HTMLButtonElement) {
    buttonExtension.click();
    ui.inputSearch.value = buttonExtension.getAttribute("mime-type") || "";
  } else {
    ui.inputSearch.value = fileExtension || "";
  }

  filterButtonList(ui.inputList, ui.inputSearch.value);

};

// Add the file selection handler to both the file input element and to
// the window as a drag-and-drop event, and to the clipboard paste event.
ui.fileInput.addEventListener("change", fileSelectHandler);
window.addEventListener("drop", fileSelectHandler);
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("paste", fileSelectHandler);

/**
 * Display an on-screen popup.
 * @param html HTML content of the popup box.
 */
window.showPopup = function (html: string) {
  ui.popupBox.innerHTML = html;
  ui.popupBox.style.display = "block";
  ui.popupBackground.style.display = "block";
}
/**
 * Hide the on-screen popup.
 */
window.hidePopup = function () {
  ui.popupBox.style.display = "none";
  ui.popupBackground.style.display = "none";
}

const allOptions: Array<{ format: FileFormat, handler: FormatHandler }> = [];

window.supportedFormatCache = new Map();

window.printSupportedFormatCache = () => {
  const entries = [];
  for (const entry of window.supportedFormatCache) {
    entries.push(entry);
  }
  return JSON.stringify(entries, null, 2);
}

async function buildOptionList () {

  allOptions.length = 0;
  ui.inputList.innerHTML = "";
  ui.outputList.innerHTML = "";

  for (const handler of handlers) {
    if (!window.supportedFormatCache.has(handler.name)) {
      console.warn(`Cache miss for formats of handler "${handler.name}".`);
      try {
        await handler.init();
      } catch (_) { continue; }
      if (handler.supportedFormats) {
        window.supportedFormatCache.set(handler.name, handler.supportedFormats);
        console.info(`Updated supported format cache for "${handler.name}".`);
      }
    }
    const supportedFormats = window.supportedFormatCache.get(handler.name);
    if (!supportedFormats) {
      console.warn(`Handler "${handler.name}" doesn't support any formats.`);
      continue;
    }
    for (const format of supportedFormats) {

      if (!format.mime) continue;

      allOptions.push({ format, handler });

      // In simple mode, display each input/output format only once
      let addToInputs = true, addToOutputs = true;
      if (simpleMode) {
        addToInputs = !Array.from(ui.inputList.children).some(c => {
          const currFormat = allOptions[parseInt(c.getAttribute("format-index") || "")]?.format;
          return currFormat?.mime === format.mime && currFormat?.format === format.format;
        });
        addToOutputs = !Array.from(ui.outputList.children).some(c => {
          const currFormat = allOptions[parseInt(c.getAttribute("format-index") || "")]?.format;
          return currFormat?.mime === format.mime && currFormat?.format === format.format;
        });
        if ((!format.from || !addToInputs) && (!format.to || !addToOutputs)) continue;
      }

      const newOption = document.createElement("button");
      newOption.setAttribute("format-index", (allOptions.length - 1).toString());
      newOption.setAttribute("mime-type", format.mime);

      // Add .cad-format class for CAD format styling
      const ext = format.extension.toLowerCase();
      if (CAD_EXTENSIONS.has(ext)) {
        newOption.classList.add('cad-format');
      }

      const formatDescriptor = format.format.toUpperCase();
      if (simpleMode) {
        // Hide any handler-specific information in simple mode
        const cleanName = format.name
          .split("(").join(")").split(")")
          .filter((_, i) => i % 2 === 0)
          .filter(c => c != "")
          .join(" ");
        newOption.appendChild(document.createTextNode(`${formatDescriptor} - ${cleanName} (${format.mime})`));
      } else {
        newOption.appendChild(document.createTextNode(`${formatDescriptor} - ${format.name} (${format.mime}) ${handler.name}`));
      }

      const clickHandler = (event: Event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        const targetParent = event.target.parentElement;
        const previous = targetParent?.getElementsByClassName("selected")?.[0];
        if (previous) previous.classList.remove("selected");
        event.target.classList.add("selected");
        const allSelected = document.getElementsByClassName("selected");
        if (allSelected.length === 2) {
          ui.convertButton.className = "";
        } else {
          ui.convertButton.className = "disabled";
        }
      };

      if (format.from && addToInputs) {
        const clone = newOption.cloneNode(true) as HTMLButtonElement;
        clone.onclick = clickHandler;
        ui.inputList.appendChild(clone);
      }
      if (format.to && addToOutputs) {
        const clone = newOption.cloneNode(true) as HTMLButtonElement;
        clone.onclick = clickHandler;
        ui.outputList.appendChild(clone);
      }

    }
  }

  filterButtonList(ui.inputList, ui.inputSearch.value);
  filterButtonList(ui.outputList, ui.outputSearch.value);

  // Re-apply the active category filter after rebuilding buttons
  applyCategoryFilter();

  window.hidePopup();

}

// ─── Category tab filtering ─────────────────────────────────────────────────

/**
 * Returns the format extension for a button element by looking up its
 * format-index in {@link allOptions}.
 */
function getButtonExtension(button: HTMLButtonElement): string | null {
  const idx = button.getAttribute("format-index");
  if (idx == null) return null;
  const opt = allOptions[parseInt(idx)];
  return opt?.format.extension.toLowerCase() ?? null;
}

/**
 * Applies the active category filter to the "from" list.
 * Hides buttons whose extension is not in the active category.
 * Also respects the search filter — a button is hidden if it fails
 * either the category or the search filter.
 */
function applyCategoryFilter() {
  const categoryExts = activeCategory ? FORMAT_CATEGORIES[activeCategory] : null;
  const searchStr = ui.inputSearch.value.toLowerCase();

  for (const child of Array.from(ui.inputList.children)) {
    if (!(child instanceof HTMLButtonElement)) continue;

    const ext = getButtonExtension(child);

    // Category check (null = "all" → always passes)
    const passesCategory = !categoryExts || (ext != null && categoryExts.includes(ext));

    // Search check (empty search → always passes)
    let passesSearch = true;
    if (searchStr) {
      const hasExt = ext ? ext.includes(searchStr) : false;
      const hasText = child.textContent?.toLowerCase().includes(searchStr) ?? false;
      passesSearch = hasExt || hasText;
    }

    child.style.display = (passesCategory && passesSearch) ? "" : "none";
  }

  // If the currently selected "from" button is now hidden, deselect it
  const selectedFrom = ui.inputList.querySelector(".selected") as HTMLButtonElement | null;
  if (selectedFrom && selectedFrom.style.display === "none") {
    selectedFrom.classList.remove("selected");
    ui.convertButton.className = "disabled";
  }
}

/**
 * Initializes the category tab system. Queries all `.category-tab` buttons
 * and wires click listeners that set the active filter and re-filter.
 */
function initCategoryTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".category-tab");
  for (const tab of Array.from(tabs)) {
    tab.addEventListener("click", () => {
      // Toggle active class
      for (const t of Array.from(tabs)) t.classList.remove("active");
      tab.classList.add("active");

      const cat = tab.getAttribute("data-category");
      activeCategory = (cat === "all" || !cat) ? null : cat;

      applyCategoryFilter();
    });
  }
}

(async () => {
  try {
    const cacheJSON = await fetch("cache.json").then(r => r.json());
    window.supportedFormatCache = new Map(cacheJSON);
  } catch {
    console.warn(
      "Missing supported format precache.\n\n" +
      "Consider saving the output of printSupportedFormatCache() to cache.json."
    );
  } finally {
    await buildOptionList();
    initCategoryTabs();
    console.log("Built initial format list.");
  }
})();

ui.modeToggleButton.addEventListener("click", () => {
  simpleMode = !simpleMode;
  if (simpleMode) {
    ui.modeToggleButton.textContent = "Advanced mode";
    document.body.style.setProperty("--highlight-color", "#1C77FF");
  } else {
    ui.modeToggleButton.textContent = "Simple mode";
    document.body.style.setProperty("--highlight-color", "#FF6F1C");
  }
  buildOptionList();
});

const convertPathCache: Array<{
  files: FileData[],
  node: ConvertPathNode
}> = [];

async function attemptConvertPath (files: FileData[], path: ConvertPathNode[]) {

  ui.popupBox.innerHTML = `<h2>Finding conversion route...</h2>
    <p>Trying <b>${path.map(c => c.format.format).join(" → ")}</b>...</p>`;

  const cacheLast = convertPathCache.at(-1);
  if (cacheLast) files = cacheLast.files;

  const start = cacheLast ? convertPathCache.length : 0;
  for (let i = start; i < path.length - 1; i ++) {
    const handler = path[i + 1].handler;
    try {
      let supportedFormats = window.supportedFormatCache.get(handler.name);
      if (!handler.ready) {
        try {
          await handler.init();
        } catch (_) { return null; }
        if (handler.supportedFormats) {
          window.supportedFormatCache.set(handler.name, handler.supportedFormats);
          supportedFormats = handler.supportedFormats;
        }
      }
      if (!supportedFormats) throw `Handler "${handler.name}" doesn't support any formats.`;
      const inputFormat = supportedFormats.find(c => c.mime === path[i].format.mime && c.from)!;
      files = await handler.doConvert(files, inputFormat, path[i + 1].format);
      if (files.some(c => !c.bytes.length)) throw "Output is empty.";
      convertPathCache.push({ files, node: path[i + 1] });
    } catch (e) {
      console.log(path.map(c => c.format.format));
      console.error(handler.name, `${path[i].format.format} → ${path[i + 1].format.format}`, e);
      return null;
    }
  }

  return { files, path };

}

async function buildConvertPath (
  files: FileData[],
  target: ConvertPathNode,
  queue: ConvertPathNode[][]
) {

  convertPathCache.length = 0;

  let isNestedConversion: boolean = false;

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    if (path.length > 5) continue;

    for (let i = 1; i < path.length; i ++) {
      if (path[i] !== convertPathCache[i]?.node) {
        convertPathCache.length = i - 1;
        break;
      }
    }

    const previous = path[path.length - 1];

    // Get handlers that support *taking in* the previous node's format
    const validHandlers = handlers.filter(handler => (
      window.supportedFormatCache.get(handler.name)?.some(format => (
        format.mime === previous.format.mime &&
        format.from
      ))
    ));

    if (simpleMode) {
      // Try *all* supported handlers that output the target format
      const candidates = allOptions.filter(opt =>
        validHandlers.includes(opt.handler) &&
        opt.format.mime === target.format.mime && opt.format.to
      );
      for (const candidate of candidates) {
        const attempt = await attemptConvertPath(files, path.concat(candidate));
        if (attempt) return attempt;
      }
    } else {
      // Check if the target handler is supported by the previous node
      if (validHandlers.includes(target.handler)) {
        const attempt = await attemptConvertPath(files, path.concat(target));
        if (attempt) return attempt;
      }
    }

    // Look for conversions from any input format.
    // Checked only if there is no direct conversion between the requested formats.
    if (!isNestedConversion) {
      const anyConversions = conversionsFromAnyInput.filter(c => c.format.mime == target.format.mime);

      for (const conversion of anyConversions) {
        const attempt = await attemptConvertPath(files, path.concat(conversion));
        if (attempt) return attempt; 
      }

      isNestedConversion = true;
    }

    // Look for untested mime types among valid handlers and add to queue
    for (const handler of validHandlers) {
      const supportedFormats = window.supportedFormatCache.get(handler.name);
      if (!supportedFormats) continue;
      for (const format of supportedFormats) {
        if (!format.to) continue;
        if (!format.mime) continue;
        if (path.some(c => c.format === format)) continue;
        queue.push(path.concat({ format, handler }));
      }
    }
  }

  return null;

}

function downloadFile (bytes: Uint8Array, name: string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

// ─── CAD/CAM Safeguard System ────────────────────────────────────────────────

/**
 * Analyze SVG complexity by counting element types.
 */
async function checkSVGComplexity(fileData: Uint8Array): Promise<{objectCount: number, hasGroups: boolean, hasPaths: boolean}> {
  const svgText = new TextDecoder().decode(fileData);
  const pathCount = (svgText.match(/<path[\s>]/g) || []).length;
  const circleCount = (svgText.match(/<circle[\s>]/g) || []).length;
  const rectCount = (svgText.match(/<rect[\s>]/g) || []).length;
  const lineCount = (svgText.match(/<line[\s>]/g) || []).length;
  const polylineCount = (svgText.match(/<polyline[\s>]/g) || []).length;
  const polygonCount = (svgText.match(/<polygon[\s>]/g) || []).length;
  const ellipseCount = (svgText.match(/<ellipse[\s>]/g) || []).length;
  const groupCount = (svgText.match(/<g[\s>]/g) || []).length;
  const objectCount = pathCount + circleCount + rectCount + lineCount + polylineCount + polygonCount + ellipseCount;
  return { objectCount, hasGroups: groupCount > 0, hasPaths: pathCount > 0 };
}

/**
 * Show a safeguard popup and return a Promise that resolves to `true`
 * (user chose to proceed) or `false` (user cancelled).
 */
function showSafeguardPopup(html: string): Promise<boolean> {
  return new Promise((resolve) => {
    ui.popupBox.innerHTML = html;
    ui.popupBox.style.display = "block";
    ui.popupBackground.style.display = "block";

    // Attach handlers to buttons inside the popup
    const proceedBtn = ui.popupBox.querySelector<HTMLButtonElement>("[data-safeguard-proceed]");
    const cancelBtn = ui.popupBox.querySelector<HTMLButtonElement>("[data-safeguard-cancel]");
    const continueBtn = ui.popupBox.querySelector<HTMLButtonElement>("[data-safeguard-continue]");

    if (proceedBtn) proceedBtn.onclick = () => { window.hidePopup(); resolve(true); };
    if (cancelBtn) cancelBtn.onclick = () => { window.hidePopup(); resolve(false); };
    if (continueBtn) continueBtn.onclick = () => { window.hidePopup(); resolve(true); };
  });
}

/**
 * Runs all applicable CAD/CAM safeguard checks before conversion.
 * Returns `true` if conversion should proceed, `false` to abort.
 */
async function checkCADSafeguards(
  inputFormat: FileFormat,
  outputFormat: FileFormat,
  inputFiles: File[]
): Promise<boolean> {

  const inExt = inputFormat.extension.toLowerCase();
  const outExt = outputFormat.extension.toLowerCase();
  const inFmt = inputFormat.format.toLowerCase();
  const outFmt = outputFormat.format.toLowerCase();

  // ── (a) SVG to CAD complexity warning ──────────────────────────────────
  if ((inExt === 'svg' || inFmt === 'svg') && CAD_EXTENSIONS.has(outExt)) {
    // Analyze the first file's SVG content
    if (inputFiles.length > 0) {
      const buffer = await inputFiles[0].arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const complexity = await checkSVGComplexity(bytes);

      if (complexity.objectCount > 5000) {
        const proceed = await showSafeguardPopup(`
          <h2>⚠️ High Object Count Detected</h2>
          <p>This SVG contains approximately <strong>${complexity.objectCount.toLocaleString()}</strong> objects.</p>
          <p>Importing files with high object counts into CAD software like Fusion 360
          may cause instability, crashes, or extremely slow performance.</p>
          <p><strong>Recommendations:</strong></p>
          <ul>
            <li>Simplify or merge paths in a vector editor before conversion</li>
            <li>Consider using "Outline" or "Flatten" operations in Inkscape/Illustrator</li>
            <li>For Fusion 360: keep object counts under 2,000 for stable imports</li>
          </ul>
          <p>Do you want to proceed anyway?</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button data-safeguard-cancel>Cancel</button>
            <button data-safeguard-proceed>Proceed</button>
          </div>
        `);
        if (!proceed) return false;

      } else if (complexity.objectCount > 1000) {
        const proceed = await showSafeguardPopup(`
          <h2>ℹ️ Complex SVG Detected</h2>
          <p>This SVG contains approximately <strong>${complexity.objectCount.toLocaleString()}</strong> objects.
          Some CAD software may be slow to import this. Consider simplifying if you experience issues.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button data-safeguard-continue>Continue</button>
          </div>
        `);
        if (!proceed) return false;
      }
    }
  }

  // ── (b) 3D to 2D projection warning ────────────────────────────────────
  if (MESH_3D_FORMATS.has(inExt) && RASTER_2D_FORMATS.has(outExt)) {
    const proceed = await showSafeguardPopup(`
      <h2>ℹ️ 3D to 2D Conversion</h2>
      <p>This will render a 2D image of your 3D model from a default camera angle.
      The output is a rasterized preview, not a technical projection or cross-section.</p>
      <p>For proper engineering drawings, consider exporting from your CAD software directly.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button data-safeguard-continue>Continue</button>
      </div>
    `);
    if (!proceed) return false;
  }

  // ── (c) Mesh format limitations warning ────────────────────────────────
  if (MESH_3D_FORMATS.has(inExt) && MESH_3D_FORMATS.has(outExt) && inExt !== outExt) {
    const proceed = await showSafeguardPopup(`
      <h2>ℹ️ Mesh Conversion Note</h2>
      <p>Converting between mesh formats preserves geometry but may not transfer:</p>
      <ul>
        <li>Material/texture data (STL has no material support)</li>
        <li>UV mapping (varies by format)</li>
        <li>Color information (varies by format)</li>
      </ul>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button data-safeguard-continue>Continue</button>
      </div>
    `);
    if (!proceed) return false;
  }

  return true;
}

// ─── Convert button handler ──────────────────────────────────────────────────

ui.convertButton.onclick = async function () {

  const inputFiles = selectedFiles;

  if (inputFiles.length === 0) {
    return alert("Select an input file.");
  }

  const inputButton = document.querySelector("#from-list .selected");
  if (!inputButton) return alert("Specify input file format.");

  const outputButton = document.querySelector("#to-list .selected");
  if (!outputButton) return alert("Specify output file format.");

  const inputOption = allOptions[Number(inputButton.getAttribute("format-index"))];
  const outputOption = allOptions[Number(outputButton.getAttribute("format-index"))];

  const inputFormat = inputOption.format;
  const outputFormat = outputOption.format;

  // ── CAD/CAM safeguard checks (before conversion) ───────────────────────
  const shouldProceed = await checkCADSafeguards(inputFormat, outputFormat, inputFiles);
  if (!shouldProceed) return;

  try {

    const inputFileData = [];
    for (const inputFile of inputFiles) {
      const inputBuffer = await inputFile.arrayBuffer();
      const inputBytes = new Uint8Array(inputBuffer);
      if (inputFormat.mime === outputFormat.mime) {
        downloadFile(inputBytes, inputFile.name, inputFormat.mime);
        continue;
      }
      inputFileData.push({ name: inputFile.name, bytes: inputBytes });
    }

    window.showPopup("<h2>Finding conversion route...</h2>");

    const output = await buildConvertPath(inputFileData, outputOption, [[inputOption]]);
    if (!output) {
      window.hidePopup();
      alert("Failed to find conversion route.");
      return;
    }

    for (const file of output.files) {
      downloadFile(file.bytes, file.name, outputFormat.mime);
    }

    window.showPopup(
      `<h2>Converted ${inputOption.format.format} to ${outputOption.format.format}!</h2>` +
      `<p>Path used: <b>${output.path.map(c => c.format.format).join(" → ")}</b>.</p>\n` +
      `<button onclick="window.hidePopup()">OK</button>`
    );

  } catch (e) {

    window.hidePopup();
    alert("Unexpected error while routing:\n" + e);
    console.error(e);

  }

};
