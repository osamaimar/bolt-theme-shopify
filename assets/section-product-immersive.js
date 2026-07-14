/**
 * Immersive Product Section Logic
 * Matches HTML behavior exactly
 */
document.addEventListener('DOMContentLoaded', () => {
  const immersiveSections = document.querySelectorAll('.pdi-main-outer');
  immersiveSections.forEach(section => {
    initImmersiveGallery(section);
    initImmersiveQuantity(section);
    initImmersiveAccordions(section);
    initImmersiveVariants(section);
  });
  
  initImmersiveSpotlight();
});

function initImmersiveGallery(container) {
  const mediaItems = container.querySelectorAll('.pdi-media-item');
  const thumbs = container.querySelectorAll('.pdi-thumb');
  const track = container.querySelector('.pdi-thumbs-track');
  const prevBtn = container.querySelector('.pdi-gallery-prev');
  const nextBtn = container.querySelector('.pdi-gallery-next');
  const thumbPrev = container.querySelector('.pdi-thumb-prev');
  const thumbNext = container.querySelector('.pdi-thumb-next');

  if (mediaItems.length === 0 || thumbs.length === 0) return;

  let currentIndex = 0;
  let thumbScrollIndex = 0;
  const visibleThumbs = window.innerWidth > 576 ? 4 : 3;

  function setActiveMedia(index) {
    currentIndex = index;
    
    mediaItems.forEach((item, i) => {
      const isActive = i === index;
      item.classList.toggle('active', isActive);
      
      const video = item.querySelector('video');
      if (video && !isActive) video.pause();
      
      const iframe = item.querySelector('iframe');
      if (iframe && !isActive) {
        const src = iframe.getAttribute('src');
        iframe.setAttribute('src', '');
        iframe.setAttribute('src', src);
      }
    });

    thumbs.forEach((t, i) => {
      t.classList.toggle('active', i === index);
    });

    // Auto-scroll thumbnails to keep active one visible
    if (index >= thumbScrollIndex + visibleThumbs) {
      updateThumbScroll(index - visibleThumbs + 1);
    } else if (index < thumbScrollIndex) {
      updateThumbScroll(index);
    }
  }

  function updateThumbScroll(newIndex) {
    const maxScroll = Math.max(0, thumbs.length - visibleThumbs);
    thumbScrollIndex = Math.min(Math.max(0, newIndex), maxScroll);
    
    if (track) {
      const thumbWidth = thumbs[0].offsetWidth + 12; // width + gap
      track.style.transform = `translateX(-${thumbScrollIndex * thumbWidth}px)`;
    }

    if (thumbPrev) thumbPrev.disabled = thumbScrollIndex === 0;
    if (thumbNext) thumbNext.disabled = thumbScrollIndex === maxScroll;
  }

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => {
      setActiveMedia(idx);
    });
  });

  if (thumbPrev) thumbPrev.addEventListener('click', () => updateThumbScroll(thumbScrollIndex - 1));
  if (thumbNext) thumbNext.addEventListener('click', () => updateThumbScroll(thumbScrollIndex + 1));

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      let nextIdx = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
      setActiveMedia(nextIdx);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      let nextIdx = (currentIndex + 1) % mediaItems.length;
      setActiveMedia(nextIdx);
    });
  }

  // Initialize
  updateThumbScroll(0);
}

function initImmersiveQuantity(container) {
  const minusBtn = container.querySelector('.pdi-qty-minus') || container.querySelector('#pdi-qty-minus');
  const plusBtn = container.querySelector('.pdi-qty-plus') || container.querySelector('#pdi-qty-plus');
  const qtyVal = container.querySelector('.pdi-qty-val') || container.querySelector('#pdi-qty-val');
  const qtyHidden = container.querySelector('.pdi-qty-hidden') || container.querySelector('#pdi-qty-hidden');

  if (!minusBtn || !plusBtn || !qtyVal) return;

  let qty = 1;

  minusBtn.addEventListener('click', () => {
    if (qty > 1) {
      qty--;
      updateQty();
    }
  });

  plusBtn.addEventListener('click', () => {
    qty++;
    updateQty();
  });

  function updateQty() {
    qtyVal.textContent = qty;
    if (qtyHidden) qtyHidden.value = qty;
  }
}

function initImmersiveAccordions(container) {
  const triggers = container.querySelectorAll('.pdi-accordion-trigger');

  if (triggers.length > 0) {
    // Open first one by default as in HTML
    triggers[0].setAttribute('aria-expanded', 'true');
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      
      // Close all others as in HTML
      triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
      
      // Toggle current
      trigger.setAttribute('aria-expanded', !isExpanded);
    });
  });
}

function initImmersiveSpotlight() {
  const cards = document.querySelectorAll('.pdi-rcard');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

function initImmersiveVariants(container) {
  const variantsBlock = container.querySelector('.pdi-variants');
  if (!variantsBlock) return;

  const sectionId = container.closest('[id^="shopify-section-"]').id.replace('shopify-section-', '');
  const variantsData = window.ProductVariants ? window.ProductVariants[sectionId] : null;
  if (!variantsData) return;

  const syncGallery = variantsBlock.dataset.gallerySync === 'true';
  const soldOutHandling = variantsBlock.dataset.soldOutHandling;

  const buttons = variantsBlock.querySelectorAll('.pdi-variant-btn, .pdi-variant-swatch');
  const idInput = variantsBlock.querySelector('.pdi-variant-id-input');
  const formIdInput = container.querySelector('form.pdi-form input[name="id"]');
  const atcButton = container.querySelector('.pdi-cart-btn');

  // Detect currency symbol dynamically from existing price markup
  let currencySymbol = '$';
  const priceEl = container.querySelector('.pdi-price');
  if (priceEl) {
    const symbolMatch = priceEl.textContent.trim().match(/^([^\d\s,.]+)/);
    if (symbolMatch) {
      currencySymbol = symbolMatch[1];
    }
  }

  function formatMoney(cents) {
    const dollars = (cents / 100).toFixed(2);
    return currencySymbol + dollars.replace(/\.00$/, '');
  }

  // Parse current active options
  let currentOptions = [];
  function updateOptionsState() {
    currentOptions = [];
    const optionContainers = variantsBlock.querySelectorAll('.pdi-variant-options');
    optionContainers.forEach(optContainer => {
      const activeBtn = optContainer.querySelector('.active');
      if (activeBtn) {
        currentOptions.push(activeBtn.dataset.value);
      } else {
        currentOptions.push(null);
      }
    });
  }

  function checkAvailabilityState() {
    const optionContainers = variantsBlock.querySelectorAll('.pdi-variant-options');
    optionContainers.forEach((optContainer, optIdx) => {
      const btns = optContainer.querySelectorAll('.pdi-variant-btn, .pdi-variant-swatch');
      btns.forEach(btn => {
        const val = btn.dataset.value;
        const testComb = [...currentOptions];
        testComb[optIdx] = val;
        
        const matchingVariant = variantsData.find(v => {
          return v.options.every((optVal, idx) => optVal === testComb[idx]);
        });

        const isAvailable = matchingVariant && matchingVariant.available;

        if (soldOutHandling === 'hide') {
          btn.style.display = isAvailable ? '' : 'none';
        } else {
          if (isAvailable) {
            btn.removeAttribute('disabled');
          } else {
            btn.setAttribute('disabled', 'disabled');
          }
        }
      });
    });
  }

  function handleVariantChange() {
    updateOptionsState();
    checkAvailabilityState();

    const matchedVariant = variantsData.find(v => {
      return v.options.every((optVal, idx) => optVal === currentOptions[idx]);
    });

    if (matchedVariant) {
      // Update form values
      if (idInput) idInput.value = matchedVariant.id;
      if (formIdInput) formIdInput.value = matchedVariant.id;

      // Update ATC button
      if (atcButton) {
        const span = atcButton.querySelector('span');
        if (matchedVariant.available) {
          atcButton.removeAttribute('disabled');
          if (span) span.textContent = 'Add to Cart';
        } else {
          atcButton.setAttribute('disabled', 'disabled');
          if (span) span.textContent = 'Sold Out';
        }
      }

      // Update Price display
      const priceValEl = container.querySelector('.pdi-price');
      if (priceValEl) {
        priceValEl.textContent = formatMoney(matchedVariant.price);
      }
      const oldPriceEl = container.querySelector('.pdi-old-price');
      if (oldPriceEl) {
        if (matchedVariant.compare_at_price > matchedVariant.price) {
          oldPriceEl.textContent = formatMoney(matchedVariant.compare_at_price);
          oldPriceEl.style.display = '';
        } else {
          oldPriceEl.style.display = 'none';
        }
      }
      const savingsLabel = container.querySelector('.pdi-discount');
      if (savingsLabel) {
        if (matchedVariant.compare_at_price > matchedVariant.price) {
          const savings = Math.round((matchedVariant.compare_at_price - matchedVariant.price) * 100 / matchedVariant.compare_at_price);
          savingsLabel.textContent = `-${savings}%`;
          savingsLabel.style.display = '';
        } else {
          savingsLabel.style.display = 'none';
        }
      }

      // Sync Gallery if enabled
      if (syncGallery && matchedVariant.featured_media) {
        const mediaId = matchedVariant.featured_media.id;
        const matchingThumb = container.querySelector(`.pdi-thumb[data-media-id="${mediaId}"]`);
        if (matchingThumb) {
          matchingThumb.click();
        }
      }
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.pdi-variant-options');
      parent.querySelectorAll('.pdi-variant-btn, .pdi-variant-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const labelVal = btn.closest('.pdi-variant-group').querySelector('.pdi-variant-selected-val');
      if (labelVal) {
        labelVal.textContent = btn.dataset.value;
      }

      handleVariantChange();
    });
  });

  // Run once on load to verify options availability
  updateOptionsState();
  checkAvailabilityState();
}
