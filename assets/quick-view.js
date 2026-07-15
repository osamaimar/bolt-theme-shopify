/**
 * Quick View Modal Logic
 * Handles modal visibility, content population, and accessibility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const categoryKeys = {
        'laptops': 'catalog.filter_laptops',
        'phones': 'catalog.filter_phones',
        'audio': 'catalog.filter_audio',
        'gaming': 'catalog.filter_gaming',
        'smart-home': 'catalog.filter_smart_home'
    };

    const overlay = document.getElementById('qv-overlay');
    
    // Exit early if modal is not present on the page
    if (!overlay) return;

    const backdrop = document.getElementById('qv-backdrop');
    const closeBtn = document.getElementById('qv-close');
    const qvImage = document.getElementById('qv-image');
    const qvTitle = document.getElementById('qv-title');
    const qvPrice = document.getElementById('qv-price');
    const qvDescription = document.getElementById('qv-description');
    const qvCategoryText = document.getElementById('qv-category-text');
    const qvQtyValue = document.getElementById('qv-qty-value');
    const qvQtyMinus = document.getElementById('qv-qty-minus');
    const qvQtyPlus = document.getElementById('qv-qty-plus');
    const qvViewFull = document.getElementById('qv-view-full');
    const qvAddToCart = document.getElementById('qv-add-to-cart');

    const qvGalleryViewer = document.getElementById('qv-gallery-viewer');
    const qvThumbsStrip = document.getElementById('qv-thumbs-strip');
    const qvPrev = document.getElementById('qv-gallery-prev');
    const qvNext = document.getElementById('qv-gallery-next');
    let qvCurrentIndex = 0;
    let qvMediaItems = [];
    let qvThumbs = [];
    
    const mainContent = document.getElementById('main-content');
    const mainHeader = document.getElementById('main-header');
    const mainFooter = document.querySelector('.apex-footer');

    let lastFocusedElement = null;

    /**
     * Opens the Quick View modal and populates it with product card data.
     */
    function openQuickView(card) {
        lastFocusedElement = document.activeElement;
        
        const img = card.querySelector('.cpd-product-thumb img') || card.querySelector('.card-v2-image') || card.querySelector('.pd-related-card-thumb img') || card.querySelector('.hes-trend-img img') || card.querySelector('img');
        const name = card.querySelector('.cpd-product-name') || card.querySelector('.card-v2-title') || card.querySelector('.csh-product-name') || card.querySelector('.pd-related-card-name') || card.querySelector('.hes-trend-name') || card.querySelector('[class*="name"]') || card.querySelector('[class*="title"]');
        const desc = card.querySelector('.cpd-product-desc') || card.querySelector('.csh-product-desc') || card.querySelector('.pd-related-card-desc') || card.querySelector('.hes-trend-desc') || card.querySelector('[class*="desc"]');
        const price = card.querySelector('.cpd-product-price') || card.querySelector('.card-v2-price') || card.querySelector('.csh-product-price') || card.querySelector('.pd-related-card-price') || card.querySelector('.hes-trend-price') || card.querySelector('[class*="price"]');
        const category = card.getAttribute('data-category');

        // Populate content
        if (qvImage) {
            qvImage.src = img ? img.src : '';
            qvImage.alt = name ? name.textContent.trim() : (img ? img.alt : 'Product');
        }
        
        if (qvTitle) qvTitle.textContent = name ? name.textContent.trim() : '';
        if (qvDescription) qvDescription.textContent = desc ? desc.textContent.trim() : '';
        if (qvPrice) qvPrice.textContent = price ? price.textContent.trim() : '';
        
        // Translated category
        if (qvCategoryText) {
            const catKey = categoryKeys[category];
            if (window.BoltI18n && catKey) {
                qvCategoryText.textContent = window.BoltI18n.t(catKey);
            } else {
                qvCategoryText.textContent = category || 'Product';
            }
        }
        
        if (qvQtyValue) qvQtyValue.textContent = '1';

        // Link to full product if applicable
        if (qvViewFull) {
            const link = card.querySelector('a') || card.closest('a');
            if (link && link.href && !link.href.includes('#')) {
                qvViewFull.href = link.href;
            } else {
                qvViewFull.href = '#';
            }
        }
        
        if (qvAddToCart) {
            const variantIdInput = card.querySelector('input[name="id"]');
            if (variantIdInput) {
                qvAddToCart.setAttribute('data-variant-id', variantIdInput.value);
                qvAddToCart.removeAttribute('disabled');
                qvAddToCart.classList.remove('disabled');
            } else {
                qvAddToCart.removeAttribute('data-variant-id');
                const isSoldOut = card.querySelector('.cpd-product-cta.disabled') || card.querySelector('.btn-v2-primary.disabled') || card.querySelector('.disabled');
                if (isSoldOut) {
                    qvAddToCart.setAttribute('disabled', 'true');
                    qvAddToCart.classList.add('disabled');
                }
            }
        }

        // Fetch and Build gallery
        const handle = card.getAttribute('data-product-handle');
        const enableMedia = qvGalleryViewer ? qvGalleryViewer.parentElement.dataset.enableMedia !== 'false' : true;
        if (enableMedia) {
            fetchAndBuildQvGallery(handle, img ? img.src : '', name ? name.textContent.trim() : '');
        } else {
            renderFallbackImage(img ? img.src : '', name ? name.textContent.trim() : '');
        }

        // Show modal
        overlay.classList.add('active');
        document.body.classList.add('qv-active');
        document.documentElement.style.overflow = 'hidden';
        
        // Focus management: Wait for transition
        setTimeout(() => {
            if (closeBtn) closeBtn.focus();
        }, 150);
    }

    /**
     * Closes the Quick View modal.
     */
    function closeQuickView() {
        overlay.classList.remove('active');
        document.body.classList.remove('qv-active');
        document.documentElement.style.overflow = '';
        
        // Clean up playing videos/iframes
        if (qvGalleryViewer) {
            const videos = qvGalleryViewer.querySelectorAll('video');
            videos.forEach(v => v.pause());
            const placeholderIframes = qvGalleryViewer.querySelectorAll('.qv-external-video-placeholder iframe');
            placeholderIframes.forEach(iframe => iframe.remove());
            const placeholders = qvGalleryViewer.querySelectorAll('.qv-external-video-placeholder');
            placeholders.forEach(p => {
                const playOverlay = p.querySelector('.qv-play-overlay');
                if (playOverlay) playOverlay.style.display = '';
            });
        }

        // Restore focus
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    // Delegation to handle dynamically rendered products
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.cpd-quick-view-btn') || e.target.closest('.btn-v2-quick-view') || e.target.closest('.pd-related-quick-btn');
        if (btn) {
            e.preventDefault();
            const card = btn.closest('.cpd-product-card') || btn.closest('.theme-card-v2') || btn.closest('article');
            if (card) openQuickView(card);
        }
    });

    // Close handlers
    if (closeBtn) closeBtn.addEventListener('click', closeQuickView);
    if (backdrop) backdrop.addEventListener('click', closeQuickView);
    
    document.addEventListener('keydown', (e) => {
        if (!overlay.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeQuickView();
        }
        
        // Focus trap
        if (e.key === 'Tab') {
            const focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusables.length === 0) return;
            
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    });

    // Quantity controls
    if (qvQtyMinus && qvQtyValue) {
        qvQtyMinus.addEventListener('click', () => {
            let val = parseInt(qvQtyValue.textContent, 10);
            if (val > 1) qvQtyValue.textContent = val - 1;
        });
    }

    if (qvQtyPlus && qvQtyValue) {
        qvQtyPlus.addEventListener('click', () => {
            let val = parseInt(qvQtyValue.textContent, 10);
            if (val < 99) qvQtyValue.textContent = val + 1;
        });
    }

    if (qvAddToCart) {
        qvAddToCart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const variantId = qvAddToCart.getAttribute('data-variant-id');
            if (!variantId) return;

            const qty = qvQtyValue ? parseInt(qvQtyValue.textContent, 10) : 1;

            document.dispatchEvent(new CustomEvent('product:add-to-cart', {
                detail: {
                    productId: variantId,
                    quantity: qty,
                    target: qvAddToCart
                }
            }));
        });
    }

    // Prev/Next Navigation
    if (qvPrev) {
        qvPrev.addEventListener('click', () => {
            if (qvMediaItems.length === 0) return;
            let nextIdx = (qvCurrentIndex - 1 + qvMediaItems.length) % qvMediaItems.length;
            setActiveQvMedia(nextIdx);
        });
    }
    if (qvNext) {
        qvNext.addEventListener('click', () => {
            if (qvMediaItems.length === 0) return;
            let nextIdx = (qvCurrentIndex + 1) % qvMediaItems.length;
            setActiveQvMedia(nextIdx);
        });
    }

    function fetchAndBuildQvGallery(handle, defaultImg, defaultAlt) {
        if (!qvGalleryViewer || !qvThumbsStrip) return;

        // Reset
        qvGalleryViewer.innerHTML = '';
        qvThumbsStrip.innerHTML = '';
        qvCurrentIndex = 0;
        qvMediaItems = [];
        qvThumbs = [];

        if (qvPrev) qvPrev.style.display = 'none';
        if (qvNext) qvNext.style.display = 'none';

        if (!handle) {
            renderFallbackImage(defaultImg, defaultAlt);
            return;
        }

        // Add loading state
        qvGalleryViewer.classList.add('loading');

        fetch(`/products/${handle}.js`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch product JSON');
                return res.json();
            })
            .then(product => {
                qvGalleryViewer.classList.remove('loading');
                if (product.media && product.media.length > 0) {
                    buildGallery(product.media);
                } else {
                    renderFallbackImage(defaultImg, defaultAlt);
                }
            })
            .catch(err => {
                console.error(err);
                qvGalleryViewer.classList.remove('loading');
                renderFallbackImage(defaultImg, defaultAlt);
            });
    }

    function renderFallbackImage(src, alt) {
        if (!src) return;
        qvGalleryViewer.innerHTML = `
            <div class="qv-gallery-media-item active">
                <img src="${src}" alt="${alt || 'Product image'}" />
            </div>
        `;
    }

    function buildGallery(mediaList) {
        const maxThumbs = parseInt(qvGalleryViewer.parentElement.dataset.maxThumbs || '4', 10);
        
        mediaList.forEach((media, idx) => {
            // Build media item
            const item = document.createElement('div');
            item.className = `qv-gallery-media-item ${idx === 0 ? 'active' : ''}`;
            item.setAttribute('data-media-id', media.id);
            item.setAttribute('data-media-type', media.media_type);

            if (media.media_type === 'image') {
                item.innerHTML = `<img src="${media.src}" alt="${media.alt || ''}" />`;
            } else if (media.media_type === 'video') {
                item.innerHTML = `
                    <div class="qv-video-container">
                        <video controls playsinline class="qv-video-native" src="${media.sources[0]?.url}"></video>
                        <button type="button" class="qv-play-overlay" aria-label="Play video">
                            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </button>
                    </div>
                `;
                setupNativeVideoEvents(item);
            } else if (media.media_type === 'external_video') {
                item.innerHTML = `
                    <div class="qv-external-video-wrapper">
                        <div class="qv-external-video-placeholder" data-video-id="${media.external_id}" data-host="${media.host}">
                            <img src="${media.preview_image.src}" alt="${media.alt || ''}" />
                            <button type="button" class="qv-play-overlay" aria-label="Play video">
                                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </button>
                        </div>
                    </div>
                `;
                setupExternalVideoEvents(item);
            } else if (media.media_type === 'model') {
                item.innerHTML = `
                    <div class="qv-model-container" style="position: relative; width: 100%; height: 100%;">
                        <model-viewer class="qv-model-viewer" src="${media.sources[0]?.url}" camera-controls interaction-prompt="always" ar-status="not-presenting"></model-viewer>
                        <button class="qv-ar-badge" data-shopify-xr data-shopify-model3d-id="${media.id}" data-shopify-xr-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="21 8 21 16 12 21 3 16 3 8 12 3 21 8"/>
                                <polyline points="3 8 12 13 21 8"/>
                                <line x1="12" y1="13" x2="12" y2="21"/>
                            </svg>
                            <span>View in AR</span>
                        </button>
                    </div>
                `;
            }

            qvGalleryViewer.appendChild(item);
            qvMediaItems.push(item);

            // Build thumbnail
            const thumb = document.createElement('div');
            thumb.className = `qv-thumb ${idx === 0 ? 'active' : ''}`;
            thumb.setAttribute('data-index', idx);
            thumb.setAttribute('data-media-id', media.id);

            let thumbInner = `<img src="${media.preview_image?.src || media.src}" alt="${media.alt || ''}" />`;
            if (media.media_type === 'video' || media.media_type === 'external_video') {
                thumbInner += `
                    <div class="qv-thumb-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                    <span class="qv-thumb-type-badge">${media.media_type === 'external_video' ? media.host.toUpperCase() : 'VIDEO'}</span>
                `;
            } else if (media.media_type === 'model') {
                thumbInner += `
                    <div class="qv-thumb-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="21 8 21 16 12 21 3 16 3 8 12 3 21 8" />
                            <polyline points="3 8 12 13 21 8" />
                            <line x1="12" y1="13" x2="12" y2="21" />
                        </svg>
                    </div>
                    <span class="qv-thumb-type-badge">3D</span>
                `;
            }

            thumb.innerHTML = thumbInner;
            qvThumbsStrip.appendChild(thumb);
            qvThumbs.push(thumb);

            thumb.addEventListener('click', () => {
                setActiveQvMedia(idx);
            });
        });

        // Hide thumbs if they exceed max configuration
        if (qvThumbs.length > maxThumbs) {
            // Apply custom CSS grid properties for scroll or wrap, or limit via visibility CSS
        }

        if (mediaList.length > 1) {
            if (qvPrev) qvPrev.style.display = 'flex';
            if (qvNext) qvNext.style.display = 'flex';
        }
    }

    function setActiveQvMedia(index) {
        qvCurrentIndex = index;
        qvMediaItems.forEach((item, i) => {
            const isActive = i === index;
            item.classList.toggle('active', isActive);

            const video = item.querySelector('video');
            const playOverlay = item.querySelector('.qv-play-overlay');
            if (video && !isActive) {
                video.pause();
                if (playOverlay) playOverlay.classList.remove('is-playing');
            }

            const iframe = item.querySelector('iframe');
            if (iframe && !isActive) {
                iframe.remove();
                if (playOverlay) playOverlay.style.display = '';
            }
        });

        qvThumbs.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    function setupNativeVideoEvents(item) {
        const video = item.querySelector('video');
        const playOverlay = item.querySelector('.qv-play-overlay');
        if (video && playOverlay) {
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
    }

    function setupExternalVideoEvents(item) {
        const placeholder = item.querySelector('.qv-external-video-placeholder');
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
                const playOverlay = placeholder.querySelector('.qv-play-overlay');
                if (playOverlay) playOverlay.style.display = 'none';
            });
        }
    }
});
