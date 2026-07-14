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
});
