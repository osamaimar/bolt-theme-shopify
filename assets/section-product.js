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
    initPickupAvailability(section);
    initProductMediaEnhancements(section);
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
  const cards = document.querySelectorAll('.pd-related-card, .pd-comp-card');
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
  const variantsData = window.ProductVariants ? window.ProductVariants[sectionId] : null;
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

      // Update Unit Price — element only exists in DOM when settings.show_unit_price is enabled
      const unitPriceEl = container.querySelector('.pd-unit-price');
      if (unitPriceEl) {
        const upm = matchedVariant.unit_price_measurement;
        if (upm) {
          const valueEl = unitPriceEl.querySelector('.pd-unit-price-value');
          const refEl   = unitPriceEl.querySelector('.pd-unit-price-ref');
          if (valueEl) valueEl.textContent = formatMoney(matchedVariant.unit_price);
          if (refEl)   refEl.textContent   = (upm.reference_value !== 1 ? upm.reference_value : '') + upm.reference_unit;
          unitPriceEl.classList.remove('hidden');
        } else {
          unitPriceEl.classList.add('hidden');
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

      // Update Pickup Availability
      updatePickupAvailability(matchedVariant.id, container);
    }
  }

  buttons.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.pd-variant-options');
      parent.querySelectorAll('.pd-variant-btn, .pd-variant-swatch').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

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

function initPickupAvailability(container) {
  const puaContainer = container.querySelector('.pickup-availability-container');
  if (!puaContainer) return;

  const drawer = puaContainer.querySelector('.pua-drawer');
  if (drawer) {
    // Append the drawer to the body so it is outside any nested stacking context and overlays correctly over the header
    document.body.appendChild(drawer);

    // Add listeners to close the drawer
    drawer.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.pua-drawer__close');
      const overlay = e.target.closest('.pua-drawer__overlay');
      if (closeBtn || overlay) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
      }
    });
  }

  // Handle the trigger button click on the section container
  // Use unique listeners to avoid duplication
  if (!container.dataset.puaListenerAdded) {
    container.addEventListener('click', (e) => {
      const trigger = e.target.closest('.pua-trigger-btn');
      if (trigger) {
        const currentPua = container.querySelector('.pickup-availability-container');
        if (currentPua) {
          const sectionId = currentPua.dataset.sectionId;
          const targetDrawer = document.querySelector(`.pua-drawer[aria-labelledby="PuaTitle-${sectionId}"]`);
          if (targetDrawer) {
            targetDrawer.classList.add('is-open');
            targetDrawer.removeAttribute('aria-hidden');
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
          }
        }
      }
    });
    container.dataset.puaListenerAdded = 'true';
  }
}

function updatePickupAvailability(variantId, container) {
  const puaContainer = container.querySelector('.pickup-availability-container');
  if (!puaContainer) return;

  const sectionId = puaContainer.dataset.sectionId;
  if (!sectionId) return;

  // Before re-fetching, remove the old drawer from the body to avoid orphans
  const oldDrawer = document.querySelector(`.pua-drawer[aria-labelledby="PuaTitle-${sectionId}"]`);
  if (oldDrawer) {
    oldDrawer.remove();
  }

  // Show skeleton pulse loader
  puaContainer.innerHTML = `<div class="pua-skeleton"></div>`;

  // Fetch using Shopify's Section Rendering API
  const url = `${window.location.pathname}?variant=${variantId}&section_id=${sectionId}`;

  fetch(url)
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newPua = doc.querySelector('.pickup-availability-container');
      if (newPua) {
        puaContainer.outerHTML = newPua.outerHTML;
        // Re-initialize to move the new drawer to the body and bind its close events
        initPickupAvailability(container);
      } else {
        puaContainer.innerHTML = '';
      }
    })
    .catch(error => {
      console.error('Error fetching pickup availability:', error);
      puaContainer.innerHTML = '';
    });
}

function initProductMediaEnhancements(container) {
  const mediaItems = container.querySelectorAll('.pd-media-item');
  const autoplaySetting = container.dataset.videoAutoplay === 'true';

  mediaItems.forEach(item => {
    // 1. Setup native video controls
    const video = item.querySelector('video');
    const playOverlay = item.querySelector('.pd-play-overlay');
    const muteBtn = item.querySelector('.pd-mute-btn');

    if (video) {
      if (playOverlay) {
        playOverlay.addEventListener('click', (e) => {
          e.stopPropagation();
          video.play();
          playOverlay.classList.add('is-playing');
        });
        video.addEventListener('play', () => {
          playOverlay.classList.add('is-playing');
        });
        video.addEventListener('pause', () => {
          playOverlay.classList.remove('is-playing');
        });
      }
      if (muteBtn) {
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          video.muted = !video.muted;
          muteBtn.classList.toggle('is-muted', video.muted);
        });
      }
    }

    // 2. Setup external video placeholders
    const placeholder = item.querySelector('.pd-external-video-placeholder');
    if (placeholder) {
      placeholder.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = placeholder.dataset.videoId;
        const host = placeholder.dataset.host;
        let iframe = document.createElement('iframe');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '1');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        
        if (host === 'youtube') {
          iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`);
        } else if (host === 'vimeo') {
          iframe.setAttribute('src', `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`);
        }
        
        placeholder.appendChild(iframe);
        const playOverlay = placeholder.querySelector('.pd-play-overlay');
        if (playOverlay) playOverlay.style.display = 'none';
      });
    }
  });

  // 3. MutationObserver to handle active state transitions (autoplay/pause/iframe reset)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        const isActive = target.classList.contains('active');
        const video = target.querySelector('video');
        const iframe = target.querySelector('iframe');
        const playOverlay = target.querySelector('.pd-play-overlay');

        if (isActive) {
          if (video && autoplaySetting) {
            video.play().catch(err => console.log('Autoplay blocked:', err));
            if (playOverlay) playOverlay.classList.add('is-playing');
          }
        } else {
          // Pause native video on deactivate
          if (video) {
            video.pause();
            if (playOverlay) playOverlay.classList.remove('is-playing');
          }
          // Reset external video iframe to stop playback
          if (iframe) {
            const placeholder = target.querySelector('.pd-external-video-placeholder');
            if (placeholder) {
              const existingIframe = placeholder.querySelector('iframe');
              if (existingIframe) existingIframe.remove();
              const playOverlay = placeholder.querySelector('.pd-play-overlay');
              if (playOverlay) playOverlay.style.display = '';
            }
          }
        }
      }
    });
  });

  mediaItems.forEach(item => {
    observer.observe(item, { attributes: true, attributeFilter: ['class'] });
  });
}

