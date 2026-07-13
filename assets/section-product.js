/**
 * Product Section Logic
 * Handles gallery, quantity selector, and tabs
 */
document.addEventListener('DOMContentLoaded', () => {
  const productSections = document.querySelectorAll('.pd-main-outer');
  productSections.forEach(section => {
    initProductGallery(section);
    initProductQuantity(section);
    initProductVariants(section);
  });
  
  initProductTabs();
  initRelatedSpotlight();
});

function initProductGallery(container) {
  const mediaItems = container.querySelectorAll('.pd-media-item');
  const thumbs = container.querySelectorAll('.pd-gallery-thumb');
  const track = container.querySelector('.pd-thumbs-track');
  const prevBtn = container.querySelector('.pd-gallery-prev');
  const nextBtn = container.querySelector('.pd-gallery-next');
  const thumbPrev = container.querySelector('.pd-thumb-prev');
  const thumbNext = container.querySelector('.pd-thumb-next');

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

function initProductQuantity(container) {
  const minusBtn = container.querySelector('.pd-qty-minus') || container.querySelector('#pd-qty-minus');
  const plusBtn = container.querySelector('.pd-qty-plus') || container.querySelector('#pd-qty-plus');
  const qtyVal = container.querySelector('.pd-qty-value') || container.querySelector('#pd-qty-value');
  const qtyHidden = container.querySelector('.pd-qty-hidden') || container.querySelector('#pd-qty-hidden');

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

function initProductTabs() {
  const tabBtns = document.querySelectorAll('.pd-tab-btn');
  const tabContents = document.querySelectorAll('.pd-tab-content');

  if (tabBtns.length === 0) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update Buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update Content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `pd-tab-${tabId}`) {
          content.classList.add('active');
        }
      });
    });
  });
}

function initRelatedSpotlight() {
  const cards = document.querySelectorAll('.pd-related-card');
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

function initProductVariants(container) {
  const variantsBlock = container.querySelector('.pd-variants');
  if (!variantsBlock) return;

  const sectionId = container.closest('[id^="shopify-section-"]').id.replace('shopify-section-', '');
  const variantsData = window['__pdVariants_' + sectionId];
  if (!variantsData) return;

  const syncGallery = variantsBlock.dataset.gallerySync === 'true';
  const soldOutHandling = variantsBlock.dataset.soldOutHandling;

  const buttons = variantsBlock.querySelectorAll('.pd-variant-btn, .pd-variant-swatch');
  const idInput = variantsBlock.querySelector('.pd-variant-id-input');
  const formIdInput = container.querySelector('form.product-form input[name="id"]');
  const atcButton = container.querySelector('.pd-add-cart-btn');

  // Detect currency symbol dynamically from existing price markup
  let currencySymbol = '$';
  const priceEl = container.querySelector('.pd-price');
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
    const optionContainers = variantsBlock.querySelectorAll('.pd-variant-options');
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
    const optionContainers = variantsBlock.querySelectorAll('.pd-variant-options');
    optionContainers.forEach((optContainer, optIdx) => {
      const btns = optContainer.querySelectorAll('.pd-variant-btn, .pd-variant-swatch');
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
      const priceValEl = container.querySelector('.pd-price');
      if (priceValEl) {
        priceValEl.textContent = formatMoney(matchedVariant.price);
      }
      const oldPriceEl = container.querySelector('.pd-old-price');
      if (oldPriceEl) {
        if (matchedVariant.compare_at_price > matchedVariant.price) {
          oldPriceEl.textContent = formatMoney(matchedVariant.compare_at_price);
          oldPriceEl.style.display = '';
        } else {
          oldPriceEl.style.display = 'none';
        }
      }
      const savingsLabel = container.querySelector('.pd-discount-label');
      if (savingsLabel) {
        if (matchedVariant.compare_at_price > matchedVariant.price) {
          const savings = Math.round((matchedVariant.compare_at_price - matchedVariant.price) * 100 / matchedVariant.compare_at_price);
          savingsLabel.textContent = `-${savings}% Off`;
          savingsLabel.style.display = '';
        } else {
          savingsLabel.style.display = 'none';
        }
      }

      // Sync Gallery if enabled
      if (syncGallery && matchedVariant.featured_media) {
        const mediaId = matchedVariant.featured_media.id;
        const matchingThumb = container.querySelector(`.pd-gallery-thumb[data-media-id="${mediaId}"]`);
        if (matchingThumb) {
          matchingThumb.click();
        }
      }
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.pd-variant-options');
      parent.querySelectorAll('.pd-variant-btn, .pd-variant-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const labelVal = btn.closest('.pd-variant-group').querySelector('.pd-variant-selected-val');
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
