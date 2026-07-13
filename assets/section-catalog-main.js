/**
 * section-catalog-main.js
 * Handles interactions for the main catalog page: sidebar toggle, filters, view toggle, and spotlight.
 */

function initAllCatalogLogic() {
    initCatalogSidebarToggle();
    initCatalogFilters();
    initCatalogViewToggle();
    initCatalogSpotlight();
    initCatalogSort();
    updateFilterCounts();
}



document.addEventListener('DOMContentLoaded', initAllCatalogLogic);

// Theme Editor support
document.addEventListener('shopify:section:load', (event) => {
    initAllCatalogLogic();
});

/**
 * Mobile sidebar toggle
 */
function initCatalogSidebarToggle() {
    const toggleBtn = document.getElementById('cpd-sidebar-toggle');
    const sidebar = document.getElementById('cpd-sidebar');

    if (!toggleBtn || !sidebar) {
        console.warn('Catalog: Sidebar or Toggle button not found');
        return;
    }

    // Remove existing listener to avoid multiple attaches
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    // Ensure overlay exists
    let overlay = document.querySelector('.cpd-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cpd-sidebar-overlay';
        document.body.appendChild(overlay);
    }

    const toggleSidebar = (state) => {
        const isOpen = state !== undefined ? state : !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', isOpen);
        overlay.classList.toggle('active', isOpen);
        newToggleBtn.classList.toggle('active', isOpen);
        
        const label = newToggleBtn.querySelector('span');
        if (isOpen) {
            if (label) label.textContent = 'Hide Filters';
            document.body.style.overflow = 'hidden';
        } else {
            if (label) label.textContent = 'Show Filters';
            document.body.style.overflow = '';
        }
    };

    newToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar();
    });

    overlay.addEventListener('click', () => toggleSidebar(false));

    // Close button inside sidebar
    if (!sidebar.querySelector('.cpd-sidebar-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'cpd-sidebar-close';
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: none; border: none; color: inherit; cursor: pointer; padding: 5px;';
        sidebar.appendChild(closeBtn);
        
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            newToggleBtn.classList.remove('active');
            if (label) label.textContent = 'Show Filters';
            document.body.style.overflow = '';
        });
    }
}

/**
 * Filtering logic (client-side)
 */
function initCatalogFilters() {
    const productGrid = document.getElementById('cpd-product-grid');
    const products = document.querySelectorAll('.cpd-product-card');

    if (!productGrid || !products.length) return;

    const applyFilters = () => {
        const activeFilters = {};
        document.querySelectorAll('.cpd-category-item.active').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            const source = btn.getAttribute('data-source');
            if (filter && filter !== 'all') {
                if (!activeFilters[source]) activeFilters[source] = [];
                activeFilters[source].push(filter);
            }
        });

        const activeTags = Array.from(document.querySelectorAll('.cpd-tag.active')).map(btn => btn.getAttribute('data-tag'));
        const searchTerm = document.getElementById('cpd-search')?.value.toLowerCase().trim() || '';

        products.forEach(product => {
            let isVisible = true;

            // 1. Check list filters (Vendors, Types)
            for (const source in activeFilters) {
                const attrName = `data-${source}`;
                const productVal = product.getAttribute(attrName) || "";
                const matches = activeFilters[source].some(f => productVal === f);
                if (!matches) {
                    isVisible = false;
                    break;
                }
            }

            // 2. Check Tags
            if (isVisible && activeTags.length > 0) {
                const productTags = product.getAttribute('data-tags') || "";
                const tagMatch = activeTags.every(tag => productTags.includes(tag));
                if (!tagMatch) isVisible = false;
            }

            // 3. Price filtering
            const minPriceInput = document.getElementById('cpd-price-min');
            const maxPriceInput = document.getElementById('cpd-price-max');
            if (isVisible && (minPriceInput?.value || maxPriceInput?.value)) {
                const price = parseFloat(product.getAttribute('data-price'));
                const min = parseFloat(minPriceInput.value) || 0;
                const max = parseFloat(maxPriceInput.value) || Infinity;
                if (price < min || price > max) isVisible = false;
            }

            // 4. Search filtering
            if (isVisible && searchTerm !== '') {
                const title = product.querySelector('.cpd-product-name')?.textContent.toLowerCase() || '';
                const vendor = product.getAttribute('data-vendor')?.toLowerCase() || '';
                if (!title.includes(searchTerm) && !vendor.includes(searchTerm)) {
                    isVisible = false;
                }
            }

            // Apply visibility
            if (isVisible) {
                product.style.display = '';
                product.style.opacity = '1';
            } else {
                product.style.opacity = '0';
                product.style.display = 'none';
            }
        });

        updateFilterCounts();
        updateEmptyState(searchTerm);
    };

    // Category / Brand / Type Buttons
    document.querySelectorAll('.cpd-category-item').forEach(btn => {
        btn.onclick = () => {
            const parentBlock = btn.closest('.cpd-category-list');
            parentBlock.querySelectorAll('.cpd-category-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        };
    });

    // Tag Buttons
    document.querySelectorAll('.cpd-tag').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');
            applyFilters();
        };
    });

    // Price Inputs
    [document.getElementById('cpd-price-min'), document.getElementById('cpd-price-max')].forEach(input => {
        if (input) input.oninput = applyFilters;
    });

    // Search Input integration
    const globalSearch = document.getElementById('cpd-search');
    if (globalSearch) globalSearch.oninput = applyFilters;
}

/**
 * Dynamic Filter Counts
 */
function updateFilterCounts() {
    const products = document.querySelectorAll('.cpd-product-card');
    const counts = document.querySelectorAll('.cpd-count');
    
    counts.forEach(countSpan => {
        const source = countSpan.dataset.countSource;
        const val = countSpan.dataset.countVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        let matchCount = 0;
        products.forEach(p => {
            const productVal = p.getAttribute(`data-${source}`) || "";
            if (productVal === val) {
                matchCount++;
            }
        });
        countSpan.textContent = matchCount;
    });
}

/**
 * Empty State Handler
 */
function updateEmptyState(term) {
    const grid = document.getElementById('cpd-product-grid');
    if (!grid) return;

    const visibleCards = Array.from(grid.querySelectorAll('.cpd-product-card')).filter(c => c.style.display !== 'none');
    let emptyMsg = grid.querySelector('.catalog-empty-search');

    if (visibleCards.length === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'catalog-empty-search';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '80px 20px';
            emptyMsg.style.gridColumn = '1 / -1';
            emptyMsg.style.color = 'var(--text-lighter)';
            emptyMsg.textContent = term ? `No products match "${term}".` : 'No products match your selected filters.';
            grid.appendChild(emptyMsg);
        }
    } else if (emptyMsg) {
        emptyMsg.remove();
    }
}

/**
 * Grid/List view toggle
 */
function initCatalogViewToggle() {
    const viewBtns = document.querySelectorAll('.cpd-view-btn');
    const productGrid = document.getElementById('cpd-product-grid');

    if (!viewBtns.length || !productGrid) return;

    viewBtns.forEach(btn => {
        btn.onclick = () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.getAttribute('data-view');
            productGrid.classList.toggle('list-view', view === 'list');
        };
    });
}

/**
 * Spotlight effect
 */
function initCatalogSpotlight() {
    document.querySelectorAll('.cpd-product-card').forEach(card => {
        card.onmousemove = (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        };
    });
}

/**
 * Sorting
 */
function initCatalogSort() {
    const sortBox = document.querySelector('.cpd-sort-box');
    if (!sortBox) return;

    const trigger = sortBox.querySelector('.cpd-sort-trigger');
    const options = sortBox.querySelectorAll('.cpd-sort-option');

    if (!trigger || !options.length) return;

    // Toggle dropdown
    trigger.onclick = (e) => {
        e.stopPropagation();
        const isActive = sortBox.classList.toggle('active');
        trigger.setAttribute('aria-expanded', isActive);
    };

    // Close when clicking outside
    document.addEventListener('click', () => {
        sortBox.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    });

    // Handle option click
    options.forEach(option => {
        option.onclick = () => {
            const value = option.getAttribute('data-value');
            const url = new URL(window.location.href);
            url.searchParams.set('sort_by', value);
            window.location.href = url.href;
        };
    });
}
