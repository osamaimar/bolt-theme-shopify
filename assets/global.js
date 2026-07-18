/* global.js: core JS functionality for BoltTheme */

// ─── Focus Trap Utility ───
function trapFocus(element) {
    const focusables = element.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    function handleTrap(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) { last.focus(); e.preventDefault(); }
        } else {
            if (document.activeElement === last) { first.focus(); e.preventDefault(); }
        }
    }

    element._trapHandler = handleTrap;
    element.addEventListener('keydown', handleTrap);
}

function removeTrapFocus(element) {
    if (element && element._trapHandler) {
        element.removeEventListener('keydown', element._trapHandler);
        element._trapHandler = null;
    }
}

function togglePageInertness(isInert) {
    if (window.Shopify && window.Shopify.designMode) return;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        if (isInert) {
            mainContent.setAttribute('aria-hidden', 'true');
        } else {
            mainContent.removeAttribute('aria-hidden');
        }
    }
}

function updateCartQuantityButtonsAccessibility() {
    const cdOverlay = document.getElementById('cd-overlay');
    if (!cdOverlay) return;
    const items = cdOverlay.querySelectorAll('.cd-item');
    items.forEach(item => {
        const qtyValEl = item.querySelector('.cd-qty-value');
        if (qtyValEl) {
            const qty = parseInt(qtyValEl.textContent);
            const minusBtn = item.querySelector('.cd-qty-btn[data-change="-1"]');
            if (minusBtn) {
                if (qty <= 1) {
                    minusBtn.setAttribute('aria-disabled', 'true');
                    minusBtn.setAttribute('disabled', 'disabled');
                } else {
                    minusBtn.removeAttribute('aria-disabled');
                    minusBtn.removeAttribute('disabled');
                }
            }
        }
    });
}

// ─── Toast Notification Utility ───
function showToast(message, type) {
    type = type || 'error';
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    let cartNeedsRefresh = true;

    // ─── Sticky Header Logic ───
    const header = document.getElementById('main-header');
    if (header) {
        const stickyType = header.dataset.stickyType || 'none';

        if (stickyType !== 'none') {
            let lastScrollY = 0;
            let isTicking = false;

            window.addEventListener('scroll', function () {
                if (!isTicking) {
                    window.requestAnimationFrame(() => {
                        const currentScrollY = window.scrollY;

                        if (stickyType === 'always') {
                            header.classList.toggle('sticky', currentScrollY > 50);
                        } else if (stickyType === 'on-scroll') {
                            header.classList.toggle('sticky', currentScrollY > 50);
                            header.classList.remove('scrolled-down');
                        }

                        lastScrollY = currentScrollY;
                        isTicking = false;
                    });
                    isTicking = true;
                }
            });
        }
    }

    // ─── Mobile Menu Logic ───
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileClose = document.getElementById('mobile-close');
    const body = document.body;

    if (mobileToggle && mobileMenu) {
        // Toggle function
        const toggleMenu = (open) => {
            const isOpen = open !== undefined ? open : !mobileMenu.classList.contains('active');
            mobileMenu.classList.toggle('active', isOpen);
            body.classList.toggle('no-scroll', isOpen);
            document.documentElement.classList.toggle('no-scroll', isOpen);
            mobileToggle.setAttribute('aria-expanded', isOpen);
            if (isOpen) {
                trapFocus(mobileMenu);
            } else {
                removeTrapFocus(mobileMenu);
                mobileToggle.focus();
            }
            togglePageInertness(isOpen);
        };

        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        if (mobileClose) {
            mobileClose.addEventListener('click', () => toggleMenu(false));
        }

        // Mobile Dropdowns
        mobileMenu.addEventListener('click', (e) => {
            const dropdownBtn = e.target.closest('.mobile-dropdown-btn');
            if (!dropdownBtn) return;

            e.preventDefault();
            e.stopPropagation();

            const parentLi = dropdownBtn.closest('li');
            const submenu = parentLi.querySelector('.mobile-dropdown-menu, .mobile-sub-dropdown-menu');
            
            if (submenu) {
                const isActive = submenu.classList.contains('active');
                submenu.classList.toggle('active', !isActive);
                dropdownBtn.classList.toggle('active', !isActive);
                dropdownBtn.setAttribute('aria-expanded', !isActive);
            }
        });

        mobileMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const dropdownBtn = e.target.closest('.mobile-dropdown-btn');
                if (!dropdownBtn) return;

                e.preventDefault();
                e.stopPropagation();

                const parentLi = dropdownBtn.closest('li');
                const submenu = parentLi.querySelector('.mobile-dropdown-menu, .mobile-sub-dropdown-menu');
                
                if (submenu) {
                    const isActive = submenu.classList.contains('active');
                    submenu.classList.toggle('active', !isActive);
                    dropdownBtn.classList.toggle('active', !isActive);
                    dropdownBtn.setAttribute('aria-expanded', !isActive);
                }
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                toggleMenu(false);
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileMenu.classList.contains('active') && !mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                toggleMenu(false);
            }
        });
    }

    // ─── Search Popup Logic ───
    const saveSearch = (query) => {
        if (!query) return;
        try {
            let searches = JSON.parse(localStorage.getItem('bolt-recent-searches')) || [];
            searches = searches.filter(item => item.toLowerCase() !== query.toLowerCase());
            searches.unshift(query);
            searches = searches.slice(0, 5);
            localStorage.setItem('bolt-recent-searches', JSON.stringify(searches));
        } catch (e) {
            console.error('Error saving recent search:', e);
        }
    };

    const renderRecentSearches = () => {
        const recentSection = document.getElementById('search-recent');
        const recentList = document.getElementById('search-recent-list');
        if (!recentSection || !recentList) return;

        try {
            const searches = JSON.parse(localStorage.getItem('bolt-recent-searches')) || [];
            if (searches.length > 0) {
                recentList.innerHTML = '';
                searches.forEach(search => {
                    const li = document.createElement('li');
                    li.className = 'search-recent-item';
                    li.setAttribute('role', 'option');

                    const icon1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    icon1.setAttribute('viewBox', '0 0 24 24');
                    icon1.setAttribute('fill', 'none');
                    icon1.setAttribute('stroke', 'currentColor');
                    icon1.setAttribute('stroke-width', '2');
                    icon1.setAttribute('stroke-linecap', 'round');
                    icon1.setAttribute('stroke-linejoin', 'round');
                    icon1.innerHTML = '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';

                    const span = document.createElement('span');
                    span.textContent = search;

                    const icon2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    icon2.setAttribute('class', 'search-recent-arrow');
                    icon2.setAttribute('viewBox', '0 0 24 24');
                    icon2.setAttribute('fill', 'none');
                    icon2.setAttribute('stroke', 'currentColor');
                    icon2.setAttribute('stroke-width', '2');
                    icon2.setAttribute('stroke-linecap', 'round');
                    icon2.setAttribute('stroke-linejoin', 'round');
                    icon2.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>';

                    li.appendChild(icon1);
                    li.appendChild(span);
                    li.appendChild(icon2);

                    li.addEventListener('click', () => {
                        const searchInput = document.getElementById('search-popup-input');
                        if (searchInput) {
                            searchInput.value = search;
                            const form = searchInput.closest('form');
                            if (form) {
                                if (typeof form.requestSubmit === 'function') {
                                    form.requestSubmit();
                                } else {
                                    form.submit();
                                }
                            }
                        }
                    });
                    recentList.appendChild(li);
                });
                recentSection.style.display = 'block';
            } else {
                recentSection.style.display = 'none';
            }
        } catch (e) {
            console.error('Error rendering recent searches:', e);
            recentSection.style.display = 'none';
        }
    };

    const toggleSearch = (open) => {
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('search-popup-input');
        if (!searchOverlay) return;
        
        const isOpen = open !== undefined ? open : !searchOverlay.classList.contains('active');
        searchOverlay.classList.toggle('active', isOpen);
        body.classList.toggle('no-scroll', isOpen);
        document.documentElement.classList.toggle('no-scroll', isOpen);
        
        const searchTriggers = document.querySelectorAll('[data-open-search]');
        searchTriggers.forEach(trigger => trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false'));

        if (isOpen) {
            renderRecentSearches();
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                const mobileToggle = document.getElementById('mobile-toggle');
                if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
                removeTrapFocus(mobileMenu);
            }
            setTimeout(() => trapFocus(searchOverlay), 160);
        } else {
            removeTrapFocus(searchOverlay);
            const searchTrigger = document.querySelector('[data-open-search]');
            if (searchTrigger) searchTrigger.focus();
        }
        
        if (isOpen && searchInput) {
            setTimeout(() => searchInput.focus(), 150);
        }
        
        togglePageInertness(isOpen);
    };

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-open-search]');
        if (trigger) {
            e.preventDefault();
            toggleSearch(true);
        }
        
        const closeBtn = e.target.closest('#search-popup-close');
        if (closeBtn || (e.target.classList.contains('search-overlay') && e.target.classList.contains('active'))) {
            toggleSearch(false);
        }
    });

    // Search Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const searchOverlay = document.getElementById('search-overlay');
            if (searchOverlay && searchOverlay.classList.contains('active')) {
                toggleSearch(false);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            toggleSearch();
        }
    });

    // Search Popup Submission logic (wildcard terms matching search bar)
    const searchPopupForm = document.querySelector('.search-input-wrapper');
    const searchPopupInput = document.getElementById('search-popup-input');
    if (searchPopupForm && searchPopupInput) {
        searchPopupForm.addEventListener('submit', () => {
            let query = searchPopupInput.value.trim();
            if (query.length > 0) {
                saveSearch(query);
                const words = query.split(/\s+/).map(word => {
                    if (word && !word.endsWith('*') && !word.includes(':')) {
                        return word + '*';
                    }
                    return word;
                });
                const modifiedQuery = words.join(' ');

                // Submit with hidden input so visual input stays clean
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'q';
                hiddenInput.value = modifiedQuery;
                searchPopupForm.appendChild(hiddenInput);

                // Strip name from visible field
                searchPopupInput.removeAttribute('name');
            }
        });
    }

    // Clear recent searches
    const clearRecentBtn = document.getElementById('search-recent-clear');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            localStorage.removeItem('bolt-recent-searches');
            const recentSection = document.getElementById('search-recent');
            if (recentSection) recentSection.style.display = 'none';
        });
    }

    // ─── Cart Drawer Logic ───
    const toggleCart = (open) => {
        const cdOverlay = document.getElementById('cd-overlay');
        if (!cdOverlay) return;
        const isOpen = open !== undefined ? open : !cdOverlay.classList.contains('active');
        cdOverlay.classList.toggle('active', isOpen);
        body.classList.toggle('cd-open', isOpen);
        document.documentElement.classList.toggle('cd-open', isOpen);

        if (isOpen) {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                body.classList.remove('no-scroll');
                document.documentElement.classList.remove('no-scroll');
                const mobileToggle = document.getElementById('mobile-toggle');
                if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
                removeTrapFocus(mobileMenu);
            }
            trapFocus(cdOverlay);
        } else {
            removeTrapFocus(cdOverlay);
            const cartTrigger = document.getElementById('header-cart-btn') || document.querySelector('[data-open-cart], .cart-trigger');
            if (cartTrigger) cartTrigger.focus();
        }

        // Fetch latest cart when opening
        if (isOpen && cartNeedsRefresh) {
            refreshCartDrawer();
        } else if (isOpen) {
            updateCartQuantityButtonsAccessibility();
        }
        
        togglePageInertness(isOpen);
    };

    document.addEventListener('click', (e) => {
        // Toggle cart
        const trigger = e.target.closest('[data-open-cart], .cart-trigger');
        if (trigger) {
            e.preventDefault();
            toggleCart(true);
        }
        
        // Close cart
        const closeBtn = e.target.closest('#cd-close') || e.target.closest('#cd-backdrop');
        if (closeBtn) {
            toggleCart(false);
        }

        // Quantity Change
        const qtyBtn = e.target.closest('.cd-qty-btn');
        if (qtyBtn) {
            const itemEl = qtyBtn.closest('.cd-item');
            const key = itemEl.dataset.key;
            const change = parseInt(qtyBtn.dataset.change);
            const currentQty = parseInt(itemEl.querySelector('.cd-qty-value').textContent);
            updateCartQuantity(key, currentQty + change);
        }

        // Remove Item
        const removeBtn = e.target.closest('.cd-item-remove');
        if (removeBtn) {
            const itemEl = removeBtn.closest('.cd-item');
            const key = itemEl.dataset.key;
            updateCartQuantity(key, 0);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const cdOverlay = document.getElementById('cd-overlay');
            if (cdOverlay && cdOverlay.classList.contains('active')) {
                toggleCart(false);
            }
        }
    });

    // ─── AJAX Add to Cart ───
    document.addEventListener('submit', (e) => {
        const form = e.target.closest('form[action="/cart/add"]');
        if (!form) return;

        e.preventDefault();

        const formData = new FormData(form);
        const submitBtn = form.querySelector('[type="submit"]');

        if (submitBtn) submitBtn.classList.add('loading');
        
        fetch('/cart/add.js', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => Promise.reject(err));
            return response.json();
        })
        .then(item => {
            cartNeedsRefresh = true;
            updateAllCartBadges();
            toggleCart(true); // Open drawer only after success
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            const msg = (error && error.description) || (error && error.message) || 'Could not add item to cart. Please try again.';
            showToast(msg, 'error');
        })
        .finally(() => {
            if (submitBtn) submitBtn.classList.remove('loading');
        });
    });

    // ─── Global Add to Cart Event Listener ───
    document.addEventListener('product:add-to-cart', (e) => {
        const { productId, quantity, target } = e.detail;
        if (!productId) {
            console.warn('Product ID missing in add-to-cart event');
            return;
        }

        if (target) target.classList.add('loading');

        fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    id: productId,
                    quantity: quantity || 1
                }]
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => Promise.reject(err));
            return response.json();
        })
        .then(item => {
            cartNeedsRefresh = true;
            updateAllCartBadges();
            toggleCart(true);
            if (target && target.classList.contains('qv-add-to-cart')) {
                const closeBtn = document.getElementById('qv-close');
                if (closeBtn) closeBtn.click();
            }
        })
        .catch(error => {
            console.error('Error adding to cart via event:', error);
            const msg = (error && error.description) || (error && error.message) || 'Could not add item to cart. Please try again.';
            showToast(msg, 'error');
        })
        .finally(() => {
            if (target) target.classList.remove('loading');
        });
    });

    async function updateAllCartBadges() {
        try {
            const res = await fetch('/cart.js');
            const cart = await res.json();
            const badges = document.querySelectorAll('.cart-badge');
            badges.forEach(badge => {
                badge.textContent = cart.item_count;
                badge.style.display = cart.item_count > 0 ? 'flex' : 'none';
            });
        } catch (e) {
            console.error('Error updating badges:', e);
        }
    }

    async function updateCartQuantity(key, quantity) {
        const loader = document.getElementById('cd-loader');
        if (loader) loader.classList.add('active');

        try {
            const response = await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: key, quantity: quantity })
            });
            await response.json();
            
            // Re-render drawer content by fetching the section
            const cartUrl = (window.routes && window.routes.cart_url) || '/cart';
            const sectionResponse = await fetch(`${cartUrl}?sections=cart-drawer`);
            const sectionData = await sectionResponse.json();
            const html = sectionData['cart-drawer'];
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newInner = doc.querySelector('.cd-drawer').innerHTML;
            
            document.getElementById('cd-drawer').innerHTML = newInner;
            cartNeedsRefresh = false;
            updateCartQuantityButtonsAccessibility();
            
            // Update all badges
            updateAllCartBadges();
        } catch (error) {
            console.error('Error updating cart:', error);
        } finally {
            if (loader) loader.classList.remove('active');
        }
    }

    async function refreshCartDrawer() {
        const cartUrl = (window.routes && window.routes.cart_url) || '/cart';
        const sectionResponse = await fetch(`${cartUrl}?sections=cart-drawer`);
        const sectionData = await sectionResponse.json();
        const html = sectionData['cart-drawer'];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newInner = doc.querySelector('.cd-drawer').innerHTML;
        document.getElementById('cd-drawer').innerHTML = newInner;
        cartNeedsRefresh = false;
        updateCartQuantityButtonsAccessibility();
        updateAllCartBadges();
    }

    // ─── Localization & Disclosure Logic ───
    function initDisclosure() {
        const trigger = document.getElementById('LanguageTrigger');
        const list = document.getElementById('HeaderLanguageList');
        const form = document.getElementById('HeaderLocalizationForm');
        if (!trigger || !list || !form) return;

        const input = form.querySelector('input[name="locale_code"]');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            trigger.setAttribute('aria-expanded', !isExpanded);
        });

        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target)) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });

        list.querySelectorAll('.disclosure-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                input.value = link.dataset.value;
                form.submit();
            });
        });
    }

    // ─── Floating Language Switcher ───
    function initFloatingSwitcher() {
        const switcher = document.getElementById('lang-switcher');
        if (!switcher) return;

        const toggle = switcher.querySelector('.lang-toggle');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = switcher.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target)) {
                switcher.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ─── Back to Top Button ───
    function initBackToTop() {
        const btn = document.getElementById('BackToTop');
        if (!btn) return;

        let isScrolling = false;
        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 300) {
                        btn.classList.add('visible');
                        btn.setAttribute('aria-hidden', 'false');
                        btn.setAttribute('tabindex', '0');
                    } else {
                        btn.classList.remove('visible');
                        btn.setAttribute('aria-hidden', 'true');
                        btn.setAttribute('tabindex', '-1');
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });

        btn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    initBackToTop();
    initFloatingSwitcher();

    // ─── Header Localization Dropdowns (Country/Currency Selectors) ───
    function initHeaderLocalizationDropdowns() {
        const containers = document.querySelectorAll('.hdr-loc-container');
        if (!containers.length) return;

        document.addEventListener('click', (e) => {
            const toggle = e.target.closest('.hdr-loc-toggle');
            if (toggle) {
                e.preventDefault();
                e.stopPropagation();
                const container = toggle.closest('.hdr-loc-container');
                const isOpen = container.classList.contains('open');

                // Close all others
                containers.forEach(c => {
                    if (c !== container) {
                        c.classList.remove('open');
                        const btn = c.querySelector('.hdr-loc-toggle');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle this one
                container.classList.toggle('open', !isOpen);
                toggle.setAttribute('aria-expanded', !isOpen);
                return;
            }

            const option = e.target.closest('.hdr-loc-option');
            if (option) {
                e.preventDefault();
                e.stopPropagation();
                const val = option.dataset.value;
                const form = option.closest('form');
                if (form && val) {
                    const input = form.querySelector('input[name="country_code"]');
                    if (input) {
                        input.value = val;
                        form.submit();
                    }
                }
                return;
            }

            let clickedInside = false;
            containers.forEach(c => {
                if (c.contains(e.target)) {
                    clickedInside = true;
                }
            });
            if (!clickedInside) {
                containers.forEach(c => {
                    c.classList.remove('open');
                    const btn = c.querySelector('.hdr-loc-toggle');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }
    initHeaderLocalizationDropdowns();
});

// Utility for formatting money — uses the store's active currency
function formatMoney(cents) {
    const currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    const locale = document.documentElement.lang || 'en';
    try {
        return (cents / 100).toLocaleString(locale, {
            style: 'currency',
            currency: currency,
        });
    } catch (e) {
        // Fallback for unsupported locale/currency combinations
        return (cents / 100).toFixed(2) + ' ' + currency;
    }
}
