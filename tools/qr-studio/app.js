/**
 * QR Code Studio - Custom QR code generator
 * Uses qrcode-generator library for pure client-side generation
 * Supports custom colors, logo overlay, and PNG/SVG export
 * 
 * @version 1.0.0
 */

(function() {
  'use strict';

  // State
  const state = {
    content: 'https://riplay.cz',
    size: 512,
    fgColor: '#000000',
    bgColor: '#ffffff',
    logo: null,
    qrData: null
  };

  // DOM Elements
  const qrContent = document.getElementById('qrContent');
  const qrPreview = document.getElementById('qrPreview');
  const fgColor = document.getElementById('fgColor');
  const fgColorText = document.getElementById('fgColorText');
  const bgColor = document.getElementById('bgColor');
  const bgColorText = document.getElementById('bgColorText');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const logoUploadText = document.getElementById('logoUploadText');
  const removeLogoBtn = document.getElementById('removeLogoBtn');

  // Initialize
  function init() {
    // Set initial content
    qrContent.value = state.content;
    
    // Generate initial QR
    generateQR();
  }

  // Generate QR code
  window.generateQR = function() {
    const content = qrContent.value.trim();
    if (!content) {
      qrPreview.innerHTML = '<p style="color: var(--rds-iron); padding: 2rem;">Enter content to generate QR code</p>';
      return;
    }

    state.content = content;

    try {
      // Create QR code (type 0 = auto, error correction level L)
      const qr = qrcode(0, 'M');
      qr.addData(content);
      qr.make();

      // Get module count
      const moduleCount = qr.getModuleCount();
      
      // Calculate cell size
      const cellSize = Math.floor(state.size / moduleCount);
      const actualSize = cellSize * moduleCount;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = actualSize;
      canvas.height = actualSize;
      const ctx = canvas.getContext('2d');

      // Draw background
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, 0, actualSize, actualSize);

      // Draw QR modules
      ctx.fillStyle = state.fgColor;
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }

      // Draw logo if present
      if (state.logo) {
        const logoSize = actualSize * 0.2; // Logo is 20% of QR size
        const logoX = (actualSize - logoSize) / 2;
        const logoY = (actualSize - logoSize) / 2;

        // Draw white background for logo
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);

        // Draw logo
        ctx.drawImage(state.logo, logoX, logoY, logoSize, logoSize);
      }

      // Store canvas reference
      state.qrData = canvas;

      // Display in preview
      qrPreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.alt = 'QR Code';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      qrPreview.appendChild(img);

    } catch (error) {
      console.error('Error generating QR code:', error);
      // Use textContent to prevent XSS (no HTML interpretation)
      const errorP = document.createElement('p');
      errorP.style.cssText = 'color: var(--rds-red); padding: 2rem;';
      errorP.textContent = 'Error: ' + (error.message || 'Unknown error');
      qrPreview.innerHTML = '';
      qrPreview.appendChild(errorP);
    }
  };

  // Set size
  window.setSize = function(size) {
    state.size = size;

    // Update active button and aria-checked
    document.querySelectorAll('.size-option').forEach(btn => {
      const isActive = parseInt(btn.dataset.size) === size;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    generateQR();
  };

  // Sync color inputs
  window.syncColor = function(type) {
    if (type === 'fg') {
      const value = fgColorText.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        state.fgColor = value;
        fgColor.value = value;
        generateQR();
      }
    } else {
      const value = bgColorText.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        state.bgColor = value;
        bgColor.value = value;
        generateQR();
      }
    }
  };

  // Update color from picker
  fgColor.addEventListener('change', function() {
    state.fgColor = this.value;
    fgColorText.value = this.value;
    generateQR();
  });

  bgColor.addEventListener('change', function() {
    state.bgColor = this.value;
    bgColorText.value = this.value;
    generateQR();
  });

  // Handle logo upload
  window.handleLogoUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        state.logo = img;
        
        // Show preview
        logoPreview.src = e.target.result;
        logoPreview.style.display = 'block';
        logoUploadText.textContent = 'Logo loaded';
        removeLogoBtn.style.display = 'block';

        generateQR();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Remove logo
  window.removeLogo = function() {
    state.logo = null;
    logoPreview.style.display = 'none';
    logoPreview.src = '';
    logoUploadText.textContent = 'Click to upload logo';
    removeLogoBtn.style.display = 'none';
    logoInput.value = '';

    generateQR();
  };

  // Download as PNG
  window.downloadPNG = function() {
    if (!state.qrData) {
      alert('Generate a QR code first');
      return;
    }

    const link = document.createElement('a');
    link.download = `qrcode_${Date.now()}.png`;
    link.href = state.qrData.toDataURL('image/png');
    link.click();

    // GA4 event
    if (typeof gtag === 'function') {
      gtag('event', 'qr_studio_download', {
        'event_category': 'engagement',
        'event_label': 'PNG download'
      });
    }
  };

  // Download as SVG
  window.downloadSVG = function() {
    if (!state.qrData) {
      alert('Generate a QR code first');
      return;
    }

    try {
      // Create QR again for SVG
      const qr = qrcode(0, 'M');
      qr.addData(state.content);
      qr.make();

      const moduleCount = qr.getModuleCount();
      const cellSize = Math.floor(state.size / moduleCount);
      const actualSize = cellSize * moduleCount;

      // Build SVG
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actualSize} ${actualSize}" width="${actualSize}" height="${actualSize}">
  <rect width="${actualSize}" height="${actualSize}" fill="${state.bgColor}"/>
  <g fill="${state.fgColor}">`;

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            svg += `\n    <rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
          }
        }
      }

      svg += '\n  </g>';

      // Add logo if present (as embedded image)
      if (state.logo) {
        const logoSize = actualSize * 0.2;
        const logoX = (actualSize - logoSize) / 2;
        const logoY = (actualSize - logoSize) / 2;

        // Convert logo to data URL
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoSize;
        logoCanvas.height = logoSize;
        const logoCtx = logoCanvas.getContext('2d');
        logoCtx.drawImage(state.logo, 0, 0, logoSize, logoSize);
        const logoDataUrl = logoCanvas.toDataURL('image/png');

        svg += `\n  <rect x="${logoX - 4}" y="${logoY - 4}" width="${logoSize + 8}" height="${logoSize + 8}" fill="${state.bgColor}"/>`;
        svg += `\n  <image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="${logoDataUrl}"/>`;
      }

      svg += '\n</svg>';

      // Download
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcode_${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // GA4 event
      if (typeof gtag === 'function') {
        gtag('event', 'qr_studio_download', {
          'event_category': 'engagement',
          'event_label': 'SVG download'
        });
      }

    } catch (error) {
      console.error('Error generating SVG:', error);
      alert(`Error generating SVG: ${error.message}`);
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
