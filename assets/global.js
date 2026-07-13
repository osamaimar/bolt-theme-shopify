/* global.js: core JS functionality for BoltTheme */

document.addEventListener('DOMContentLoaded', () => {
    console.log('BoltTheme loaded');

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
            mobileToggle.setAttribute('aria-expanded', isOpen);
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
    const toggleSearch = (open) => {
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('search-popup-input');
        if (!searchOverlay) return;
        
        const isOpen = open !== undefined ? open : !searchOverlay.classList.contains('active');
        searchOverlay.classList.toggle('active', isOpen);
        body.classList.toggle('no-scroll', isOpen);
        
        if (isOpen) {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                const mobileToggle = document.getElementById('mobile-toggle');
                if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
            }
        }
        
        if (isOpen && searchInput) {
            setTimeout(() => searchInput.focus(), 150);
        }
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

    // ─── Cart Drawer Logic ───
    const toggleCart = (open) => {
        const cdOverlay = document.getElementById('cd-overlay');
        if (!cdOverlay) return;
        const isOpen = open !== undefined ? open : !cdOverlay.classList.contains('active');
        cdOverlay.classList.toggle('active', isOpen);
        body.classList.toggle('cd-open', isOpen);

        if (isOpen) {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                body.classList.remove('no-scroll');
                const mobileToggle = document.getElementById('mobile-toggle');
                if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
            }
        }

        // Fetch latest cart when opening
        if (isOpen) refreshCartDrawer();
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
        .then(response => response.json())
        .then(item => {
            console.log('Added to cart:', item);
            updateAllCartBadges();
            toggleCart(true); // Open drawer only after success
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
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
        .then(response => response.json())
        .then(item => {
            console.log('Added to cart via event:', item);
            updateAllCartBadges();
            toggleCart(true);
            if (target && target.classList.contains('qv-add-to-cart')) {
                const closeBtn = document.getElementById('qv-close');
                if (closeBtn) closeBtn.click();
            }
        })
        .catch(error => {
            console.error('Error adding to cart via event:', error);
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
            const sectionResponse = await fetch(`${window.location.pathname}?sections=cart-drawer`);
            const sectionData = await sectionResponse.json();
            const html = sectionData['cart-drawer'];
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newInner = doc.querySelector('.cd-drawer').innerHTML;
            
            document.getElementById('cd-drawer').innerHTML = newInner;
            
            // Update all badges
            updateAllCartBadges();
        } catch (error) {
            console.error('Error updating cart:', error);
        } finally {
            if (loader) loader.classList.remove('active');
        }
    }

    async function refreshCartDrawer() {
        const sectionResponse = await fetch(`${window.location.pathname}?sections=cart-drawer`);
        const sectionData = await sectionResponse.json();
        const html = sectionData['cart-drawer'];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newInner = doc.querySelector('.cd-drawer').innerHTML;
        document.getElementById('cd-drawer').innerHTML = newInner;
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
});

// Utility for formatting money
function formatMoney(cents) {
    return (cents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
}
