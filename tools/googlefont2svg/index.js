// GoogleFont2SVG - RIPlay Tools
// Fetches fonts from Google Fonts API

var makerjs = require('makerjs');

// Google Fonts API Key
var apiKey = 'AIzaSyAOES8EmKhuJEnsn9kS1XKBpxxp-TgN8Jc';

// State
var state = {
    fontList: null,
    customFont: undefined,
    fontFamily: 'ABeeZee',
    fontVariant: 'regular',
    text: 'Verb',
    size: 100,
    lineHeight: 1.2,
    union: false,
    kerning: true,
    filled: false,
    separate: false,
    bezierAccuracy: '',
    dxfUnits: '',
    fill: '#ff0000',
    stroke: '#ff0000',
    strokeWidth: '0.25mm',
    strokeNonScaling: true,
    fillRule: 'evenodd',
    svgOutput: '',
    dxfOutput: '',
    errorMessage: ''
};

// DOM Elements
var elements = {};

// Initialize
function init() {
    // Get DOM elements
    elements = {
        fontSelect: document.getElementById('font-select'),
        fontVariant: document.getElementById('font-variant'),
        fontUpload: document.getElementById('font-upload'),
        fontUploadRemove: document.getElementById('font-upload-remove'),
        inputText: document.getElementById('input-text'),
        inputSize: document.getElementById('input-size'),
        inputLineHeight: document.getElementById('input-line-height'),
        inputUnion: document.getElementById('input-union'),
        inputKerning: document.getElementById('input-kerning'),
        inputFilled: document.getElementById('input-filled'),
        inputSeparate: document.getElementById('input-separate'),
        inputBezierAccuracy: document.getElementById('input-bezier-accuracy'),
        dxfUnits: document.getElementById('dxf-units'),
        inputFill: document.getElementById('input-fill'),
        inputFillColor: document.getElementById('input-fill-color'),
        inputStroke: document.getElementById('input-stroke'),
        inputStrokeColor: document.getElementById('input-stroke-color'),
        inputStrokeWidth: document.getElementById('input-stroke-width'),
        inputStrokeNonScaling: document.getElementById('input-stroke-non-scaling'),
        inputFillRule: document.getElementById('input-fill-rule'),
        svgRender: document.getElementById('svg-render'),
        outputSvg: document.getElementById('output-svg'),
        errorDisplay: document.getElementById('error-display'),
        copyBtn: document.getElementById('copy-to-clipboard-btn'),
        downloadBtn: document.getElementById('download-btn'),
        createLinkBtn: document.getElementById('create-link'),
        dxfBtn: document.getElementById('dxf-btn')
    };

    // Populate DXF units
    populateDxfUnits();

    // Set up event listeners
    setupEventListeners();

    // Load Google Fonts
    loadGoogleFonts();

    // Read URL params
    readUrlParams();
}

// Populate DXF units dropdown
function populateDxfUnits() {
    if (elements.dxfUnits && makerjs && makerjs.unitType) {
        Object.values(makerjs.unitType).forEach(function(unit) {
            var option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            elements.dxfUnits.appendChild(option);
        });
    }
}

// Set up event listeners
function setupEventListeners() {
    // Font selection
    elements.fontSelect.addEventListener('change', function() {
        state.fontFamily = this.value;
        updateVariants();
        render();
    });

    elements.fontVariant.addEventListener('change', function() {
        state.fontVariant = this.value;
        render();
    });

    // Font upload
    elements.fontUpload.addEventListener('change', handleFontUpload);
    elements.fontUploadRemove.addEventListener('click', removeUploadedFont);

    // Text settings
    elements.inputText.addEventListener('input', function() {
        state.text = this.value;
        render();
    });

    elements.inputSize.addEventListener('input', function() {
        state.size = parseFloat(this.value) || 100;
        render();
    });

    elements.inputLineHeight.addEventListener('input', function() {
        state.lineHeight = parseFloat(this.value) || 1.2;
        render();
    });

    elements.inputKerning.addEventListener('change', function() {
        state.kerning = this.checked;
        render();
    });

    // Stroke settings
    elements.inputStroke.addEventListener('input', function() {
        state.stroke = this.value;
        elements.inputStrokeColor.value = this.value;
        render();
    });

    elements.inputStrokeColor.addEventListener('input', function() {
        state.stroke = this.value;
        elements.inputStroke.value = this.value;
        render();
    });

    elements.inputStrokeWidth.addEventListener('input', function() {
        state.strokeWidth = this.value;
        render();
    });

    elements.inputStrokeNonScaling.addEventListener('change', function() {
        state.strokeNonScaling = this.checked;
        render();
    });

    // Fill settings
    elements.inputFilled.addEventListener('change', function() {
        state.filled = this.checked;
        render();
    });

    elements.inputFill.addEventListener('input', function() {
        state.fill = this.value;
        elements.inputFillColor.value = this.value;
        render();
    });

    elements.inputFillColor.addEventListener('input', function() {
        state.fill = this.value;
        elements.inputFill.value = this.value;
        render();
    });

    elements.inputFillRule.addEventListener('change', function() {
        state.fillRule = this.value;
        render();
    });

    // Options
    elements.inputUnion.addEventListener('change', function() {
        state.union = this.checked;
        render();
    });

    elements.inputSeparate.addEventListener('change', function() {
        state.separate = this.checked;
        render();
    });

    elements.inputBezierAccuracy.addEventListener('input', function() {
        state.bezierAccuracy = this.value;
        render();
    });

    elements.dxfUnits.addEventListener('change', function() {
        state.dxfUnits = this.value;
        render();
    });

    // Buttons
    elements.copyBtn.addEventListener('click', copyToClipboard);
    elements.downloadBtn.addEventListener('click', downloadSvg);
    elements.createLinkBtn.addEventListener('click', createLink);
    elements.dxfBtn.addEventListener('click', downloadDxf);
}

// Load Google Fonts
async function loadGoogleFonts() {
    try {
        var response = await fetch('https://www.googleapis.com/webfonts/v1/webfonts?key=' + apiKey);
        var data = await response.json();
        state.fontList = data;
        populateFonts();
        updateVariants();
        render();
    } catch (error) {
        console.error('Error loading fonts:', error);
        elements.errorDisplay.textContent = 'Error loading fonts from Google. Please try again later.';
    }
}

// Populate fonts dropdown
function populateFonts() {
    elements.fontSelect.innerHTML = '';
    if (state.fontList && state.fontList.items) {
        state.fontList.items.forEach(function(font) {
            var option = document.createElement('option');
            option.value = font.family;
            option.textContent = font.family;
            if (font.family === state.fontFamily) {
                option.selected = true;
            }
            elements.fontSelect.appendChild(option);
        });
    }
}

// Update variants dropdown
function updateVariants() {
    elements.fontVariant.innerHTML = '';
    var font = state.fontList && state.fontList.items && state.fontList.items.find(function(f) {
        return f.family === state.fontFamily;
    });
    
    if (font && font.variants) {
        font.variants.forEach(function(variant) {
            var option = document.createElement('option');
            option.value = variant;
            option.textContent = variant;
            if (variant === state.fontVariant) {
                option.selected = true;
            }
            elements.fontVariant.appendChild(option);
        });
        // Set first variant if current not found
        if (!font.variants.includes(state.fontVariant) && font.variants.length > 0) {
            state.fontVariant = font.variants[0];
            elements.fontVariant.value = state.fontVariant;
        }
    }
}

// Handle font upload
async function handleFontUpload(event) {
    var files = event.target.files;
    if (files && files.length > 0) {
        var buffer = await files[0].arrayBuffer();
        var font = opentype.parse(buffer);
        state.customFont = font;
        elements.fontUploadRemove.style.display = 'inline-block';
        elements.fontSelect.disabled = true;
        elements.fontVariant.disabled = true;
        render();
    }
}

// Remove uploaded font
function removeUploadedFont() {
    state.customFont = undefined;
    elements.fontUpload.value = '';
    elements.fontUploadRemove.style.display = 'none';
    elements.fontSelect.disabled = false;
    elements.fontVariant.disabled = false;
    render();
}

// Render SVG
async function render() {
    state.errorMessage = '';
    elements.errorDisplay.textContent = '';

    try {
        var font;

        if (state.customFont) {
            font = state.customFont;
        } else {
            var fontItem = state.fontList && state.fontList.items && state.fontList.items.find(function(f) {
                return f.family === state.fontFamily;
            });
            
            if (!fontItem) {
                state.errorMessage = 'Font not found';
                elements.errorDisplay.textContent = state.errorMessage;
                return;
            }

            var url = fontItem.files[state.fontVariant];
            if (!url) {
                state.errorMessage = 'Font variant not found';
                elements.errorDisplay.textContent = state.errorMessage;
                return;
            }

            // Ensure HTTPS
            url = url.replace('http:', 'https:');

            font = await new Promise(function(resolve, reject) {
                opentype.load(url, function(err, loadedFont) {
                    if (err) reject(err);
                    else resolve(loadedFont);
                });
            });
        }

        // Generate SVG
        var result = generateSvg(font);
        state.svgOutput = result.svg;
        state.dxfOutput = result.dxf;

        // Update display
        elements.svgRender.innerHTML = state.svgOutput;
        elements.outputSvg.value = state.svgOutput;

    } catch (error) {
        console.error('Render error:', error);
        state.errorMessage = error.toString();
        elements.errorDisplay.textContent = state.errorMessage;
    }
}

// Generate SVG using makerjs
function generateSvg(font) {
    var lines = state.text.split('\n');
    var containerModel = { models: {} };

    lines.forEach(function(line, lineIndex) {
        if (line.length === 0) return;

        var accuracy = parseFloat(state.bezierAccuracy) || undefined;
        var lineModel = new makerjs.models.Text(font, line, state.size, state.union, false, accuracy, { 
            kerning: state.kerning 
        });
        var yOffset = -lineIndex * state.size * state.lineHeight;

        makerjs.model.move(lineModel, [0, yOffset]);
        containerModel.models['line_' + lineIndex] = lineModel;
    });

    if (state.separate) {
        var charIndex = 0;
        for (var lineKey in containerModel.models) {
            var lineModel = containerModel.models[lineKey];
            for (var charKey in lineModel.models) {
                lineModel.models[charKey].layer = String(charIndex);
                charIndex++;
            }
        }
    }

    var svg = makerjs.exporter.toSVG(containerModel, {
        fill: state.filled ? state.fill : undefined,
        stroke: state.stroke ? state.stroke : undefined,
        strokeWidth: state.strokeWidth ? state.strokeWidth : undefined,
        fillRule: state.fillRule ? state.fillRule : undefined,
        scalingStroke: !state.strokeNonScaling
    });

    var dxf = makerjs.exporter.toDXF(containerModel, {
        units: state.dxfUnits,
        usePOLYLINE: true
    });

    return { svg: svg, dxf: dxf };
}

// Copy to clipboard
function copyToClipboard() {
    elements.outputSvg.select();
    document.execCommand('copy');
    elements.copyBtn.textContent = 'Copied!';
    setTimeout(function() {
        elements.copyBtn.textContent = 'Copy to clipboard';
    }, 2000);
}

// Download SVG
function downloadSvg() {
    var a = document.createElement('a');
    a.href = 'data:image/svg+xml;base64,' + window.btoa(state.svgOutput);
    a.download = state.text + '.svg';
    a.click();
}

// Download DXF
function downloadDxf() {
    var a = document.createElement('a');
    a.href = 'data:application/dxf;base64,' + window.btoa(state.dxfOutput);
    a.download = state.text + '.dxf';
    a.click();
}

// Create link
function createLink() {
    var params = new URLSearchParams();
    params.set('font', state.fontFamily);
    params.set('variant', state.fontVariant);
    params.set('text', state.text);
    params.set('size', state.size);
    params.set('lineHeight', state.lineHeight);
    params.set('union', state.union);
    params.set('kerning', state.kerning);
    params.set('filled', state.filled);
    params.set('separate', state.separate);
    params.set('bezierAccuracy', state.bezierAccuracy);
    params.set('dxfUnits', state.dxfUnits);
    params.set('fill', state.fill);
    params.set('stroke', state.stroke);
    params.set('strokeWidth', state.strokeWidth);
    params.set('strokeNonScaling', state.strokeNonScaling);
    params.set('fillRule', state.fillRule);

    var url = window.location.origin + window.location.pathname + '?' + params.toString();
    
    navigator.clipboard.writeText(url).then(function() {
        elements.createLinkBtn.textContent = 'Copied!';
        setTimeout(function() {
            elements.createLinkBtn.textContent = 'Create link';
        }, 2000);
    });
}

// Read URL params
function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    
    if (params.has('font')) state.fontFamily = params.get('font');
    if (params.has('variant')) state.fontVariant = params.get('variant');
    if (params.has('text')) state.text = params.get('text');
    if (params.has('size')) state.size = parseFloat(params.get('size')) || 100;
    if (params.has('lineHeight')) state.lineHeight = parseFloat(params.get('lineHeight')) || 1.2;
    if (params.has('union')) state.union = params.get('union') === 'true';
    if (params.has('kerning')) state.kerning = params.get('kerning') === 'true';
    if (params.has('filled')) state.filled = params.get('filled') === 'true';
    if (params.has('separate')) state.separate = params.get('separate') === 'true';
    if (params.has('bezierAccuracy')) state.bezierAccuracy = params.get('bezierAccuracy');
    if (params.has('dxfUnits')) state.dxfUnits = params.get('dxfUnits');
    if (params.has('fill')) state.fill = params.get('fill');
    if (params.has('stroke')) state.stroke = params.get('stroke');
    if (params.has('strokeWidth')) state.strokeWidth = params.get('strokeWidth');
    if (params.has('strokeNonScaling')) state.strokeNonScaling = params.get('strokeNonScaling') === 'true';
    if (params.has('fillRule')) state.fillRule = params.get('fillRule');

    // Update form values
    elements.inputText.value = state.text;
    elements.inputSize.value = state.size;
    elements.inputLineHeight.value = state.lineHeight;
    elements.inputUnion.checked = state.union;
    elements.inputKerning.checked = state.kerning;
    elements.inputFilled.checked = state.filled;
    elements.inputSeparate.checked = state.separate;
    elements.inputBezierAccuracy.value = state.bezierAccuracy;
    elements.dxfUnits.value = state.dxfUnits;
    elements.inputFill.value = state.fill;
    elements.inputFillColor.value = state.fill;
    elements.inputStroke.value = state.stroke;
    elements.inputStrokeColor.value = state.stroke;
    elements.inputStrokeWidth.value = state.strokeWidth;
    elements.inputStrokeNonScaling.checked = state.strokeNonScaling;
    elements.inputFillRule.value = state.fillRule;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
