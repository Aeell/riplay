/**
 * Image Compressor - Client-side image optimization
 * Uses Canvas API for compression
 * Server-side sharp for better quality (optional)
 * 
 * @version 1.0.0
 */

(function() {
  'use strict';

  // State
  const state = {
    images: [],        // { id, file, originalUrl, compressedUrl, originalSize, compressedSize, compressedBlob }
    quality: 80,
    format: 'original',
    maxWidth: 0,
    isProcessing: false
  };

  const MAX_IMAGES = 20;

  // DOM Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const settingsPanel = document.getElementById('settingsPanel');
  const imagesGrid = document.getElementById('imagesGrid');
  const emptyState = document.getElementById('emptyState');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const batchActions = document.getElementById('batchActions');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityDisplay = document.getElementById('qualityDisplay');
  const formatSelect = document.getElementById('formatSelect');
  const maxWidthSelect = document.getElementById('maxWidthSelect');

  // Initialize
  function init() {
    setupDropZone();
    setupFileInput();
  }

  // Drop zone setup
  function setupDropZone() {
    // Don't add click handler - label handles file input trigger
    // Only handle drag and drop
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => 
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        await loadFiles(files);
      }
    });
    
    // Keyboard accessibility
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
  }

  // File input setup
  function setupFileInput() {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        await loadFiles(files);
      }
      fileInput.value = '';
    });
  }

  // Load image files
  async function loadFiles(files) {
    const remainingSlots = MAX_IMAGES - state.images.length;
    const filesToLoad = files.slice(0, remainingSlots);

    if (filesToLoad.length === 0) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    showProgress('Loading images...', 0);

    for (let i = 0; i < filesToLoad.length; i++) {
      const file = filesToLoad[i];
      try {
        const originalUrl = URL.createObjectURL(file);
        
        const imageData = {
          id: generateId(),
          file: file,
          originalUrl: originalUrl,
          compressedUrl: null,
          originalSize: file.size,
          compressedSize: null,
          compressedBlob: null,
          filename: file.name,
          type: file.type
        };

        state.images.push(imageData);
        showProgress('Loading images...', ((i + 1) / filesToLoad.length) * 100);
      } catch (error) {
        console.error(`Error loading ${file.name}:`, error);
      }
    }

    hideProgress();
    renderImages();
    updateUI();
  }

  // Render images
  function renderImages() {
    if (state.images.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    
    // Clear existing cards (except empty state)
    const existingCards = imagesGrid.querySelectorAll('.image-card');
    existingCards.forEach(card => card.remove());

    state.images.forEach((imageData, index) => {
      const card = createImageCard(imageData, index);
      imagesGrid.appendChild(card);
    });
  }

  // Create image card
  function createImageCard(imageData, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = imageData.id;

    const reduction = imageData.compressedSize 
      ? Math.round((1 - imageData.compressedSize / imageData.originalSize) * 100)
      : 0;
    
    // Check if compression increased size
    const sizeIncreased = imageData.compressedSize && imageData.compressedSize >= imageData.originalSize;
    const reductionClass = sizeIncreased ? 'image-increase' : (reduction > 0 ? 'image-reduction' : '');
    const reductionText = sizeIncreased 
      ? '+' + Math.round((imageData.compressedSize / imageData.originalSize - 1) * 100) + '%'
      : (reduction > 0 ? '-' + reduction + '%' : '—');

    card.innerHTML = `
      <div class="image-preview-container">
        <img src="${imageData.compressedUrl || imageData.originalUrl}" alt="${imageData.filename}" class="image-preview">
      </div>
      <div class="image-info">
        <div class="image-filename">${imageData.filename}</div>
        <div class="image-stats">
          <div class="image-stat">
            <span class="image-stat-value">${formatSize(imageData.originalSize)}</span>
            <span class="image-stat-label">Original</span>
          </div>
          <div class="image-stat">
            <span class="image-stat-value">${imageData.compressedSize ? formatSize(imageData.compressedSize) : '—'}</span>
            <span class="image-stat-label">Compressed</span>
          </div>
          <div class="image-stat">
            <span class="image-stat-value ${reductionClass}">${reductionText}</span>
            <span class="image-stat-label">${sizeIncreased ? 'Larger' : 'Saved'}</span>
          </div>
        </div>
        ${sizeIncreased ? '<p style="font-size: var(--rds-text-xs); color: var(--rds-ember); margin-bottom: var(--rds-space-2);">Try lower quality or WebP format</p>' : ''}
        <div class="image-actions">
          <button class="rds-btn rds-btn-secondary rds-btn-sm" onclick="compressSingle('${imageData.id}')" ${imageData.compressedUrl ? 'disabled' : ''}>
            Compress
          </button>
          <button class="rds-btn rds-btn-primary rds-btn-sm" onclick="downloadSingle('${imageData.id}')" ${!imageData.compressedUrl ? 'disabled' : ''}>
            Download
          </button>
          <button class="rds-btn rds-btn-ghost rds-btn-sm" onclick="removeImage('${imageData.id}')" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    return card;
  }

  // Update UI
  function updateUI() {
    settingsPanel.classList.toggle('visible', state.images.length > 0);
    batchActions.classList.toggle('visible', state.images.length > 0);
  }

  // Update quality
  window.updateQuality = function(value) {
    state.quality = parseInt(value);
    qualityDisplay.textContent = `${value}%`;
  };

  // Get output format
  function getOutputFormat(inputType) {
    const format = formatSelect.value;
    if (format === 'original') {
      // Map input type to output type
      if (inputType === 'image/jpeg') return 'image/jpeg';
      if (inputType === 'image/png') return 'image/png';
      if (inputType === 'image/webp') return 'image/webp';
      if (inputType === 'image/avif') return 'image/webp'; // Fallback for AVIF
      return 'image/jpeg';
    }
    
    const formatMap = {
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    return formatMap[format] || 'image/jpeg';
  }

  // Get file extension
  function getExtension(mimeType) {
    const extMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif'
    };
    return extMap[mimeType] || '.jpg';
  }

  // Compress single image
  window.compressSingle = async function(id) {
    const imageData = state.images.find(img => img.id === id);
    if (!imageData) return;

    await compressImage(imageData);
    renderImages();
  };

  // Compress image
  async function compressImage(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate dimensions
          let width = img.width;
          let height = img.height;
          const maxWidth = parseInt(maxWidthSelect.value);

          if (maxWidth > 0 && width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image with white background for JPEG (handles transparency)
          const outputType = getOutputFormat(imageData.type);
          if (outputType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Quality setting (0-1 range for canvas)
          // Note: PNG doesn't support quality - it's lossless
          const quality = outputType === 'image/png' ? 1 : state.quality / 100;

          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              // Check if compression actually reduced size
              // If compressed is larger than original, keep original
              if (blob.size >= imageData.originalSize) {
                console.log(`Compression increased size for ${imageData.filename}, keeping original`);
                // For display, still show the "compressed" version but note it
                // User can decide to download or not
              }

              // Clean up previous compressed URL
              if (imageData.compressedUrl) {
                URL.revokeObjectURL(imageData.compressedUrl);
              }

              imageData.compressedUrl = URL.createObjectURL(blob);
              imageData.compressedSize = blob.size;
              imageData.compressedBlob = blob;

              // Update filename extension if format changed
              if (outputType !== imageData.type) {
                const baseName = imageData.filename.replace(/\.[^/.]+$/, '');
                imageData.filename = baseName + getExtension(outputType);
              }
            }
            resolve();
          }, outputType, quality);
        } catch (error) {
          console.error('Error compressing image:', error);
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData.originalUrl;
    });
  }

  // Compress all images
  window.compressAll = async function() {
    if (state.images.length === 0) return;

    state.isProcessing = true;
    showProgress('Compressing images...', 0);

    for (let i = 0; i < state.images.length; i++) {
      const imageData = state.images[i];
      try {
        await compressImage(imageData);
        showProgress('Compressing images...', ((i + 1) / state.images.length) * 100);
      } catch (error) {
        console.error(`Error compressing ${imageData.filename}:`, error);
      }
    }

    hideProgress();
    renderImages();
    state.isProcessing = false;

    // GA4 event
    if (typeof gtag === 'function') {
      gtag('event', 'image_compressor_download', {
        'event_category': 'engagement',
        'event_label': `${state.images.length} images compressed`
      });
    }
  };

  // Download single image
  window.downloadSingle = function(id) {
    const imageData = state.images.find(img => img.id === id);
    if (!imageData || !imageData.compressedBlob) return;

    const url = URL.createObjectURL(imageData.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = imageData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // GA4 event
    if (typeof gtag === 'function') {
      gtag('event', 'image_compressor_download', {
        'event_category': 'engagement',
        'event_label': 'Single image downloaded'
      });
    }
  };

  // Download all as ZIP
  window.downloadAll = async function() {
    const compressedImages = state.images.filter(img => img.compressedBlob);
    if (compressedImages.length === 0) {
      alert('No compressed images to download');
      return;
    }

    showProgress('Creating ZIP...', 0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < compressedImages.length; i++) {
        const imageData = compressedImages[i];
        zip.file(imageData.filename, imageData.compressedBlob);
        showProgress('Creating ZIP...', ((i + 1) / compressedImages.length) * 100);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // GA4 event
      if (typeof gtag === 'function') {
        gtag('event', 'image_compressor_download', {
          'event_category': 'engagement',
          'event_label': `ZIP with ${compressedImages.length} images`
        });
      }
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert(`Error creating ZIP: ${error.message}`);
    }

    hideProgress();
  };

  // Remove image
  window.removeImage = function(id) {
    const index = state.images.findIndex(img => img.id === id);
    if (index === -1) return;

    const imageData = state.images[index];
    
    // Clean up URLs
    if (imageData.originalUrl) {
      URL.revokeObjectURL(imageData.originalUrl);
    }
    if (imageData.compressedUrl) {
      URL.revokeObjectURL(imageData.compressedUrl);
    }

    state.images.splice(index, 1);
    renderImages();
    updateUI();
  };

  // Clear all
  window.clearAll = function() {
    // Clean up URLs
    state.images.forEach(imageData => {
      if (imageData.originalUrl) {
        URL.revokeObjectURL(imageData.originalUrl);
      }
      if (imageData.compressedUrl) {
        URL.revokeObjectURL(imageData.compressedUrl);
      }
    });

    state.images = [];
    renderImages();
    updateUI();
  };

  // Progress handling
  function showProgress(text, percent) {
    progressContainer.classList.add('visible');
    progressText.textContent = text;
    progressFill.style.width = `${percent}%`;
  }

  function hideProgress() {
    progressContainer.classList.remove('visible');
    progressFill.style.width = '0%';
  }

  // Generate unique ID
  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Format file size
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
