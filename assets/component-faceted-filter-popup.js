/**
 * component-faceted-filter-popup.js
 * Handles states, events, and navigation for the faceted search filters popup.
 */
(function() {
  function initFacetedFilterPopup() {
    const overlays = document.querySelectorAll('[data-ffp-overlay]');
    const triggers = document.querySelectorAll('[data-ffp-trigger]');
    
    if (!overlays.length || !triggers.length) return;

    const body = document.body;
    const docEl = document.documentElement;

    const togglePopup = (overlay, open) => {
      const isOpen = open !== undefined ? open : !overlay.classList.contains('active');
      overlay.classList.toggle('active', isOpen);
      body.classList.toggle('no-scroll', isOpen);
      docEl.classList.toggle('no-scroll', isOpen);
      
      const trigger = document.querySelector(`[aria-controls="${overlay.id}"]`);
      if (trigger) {
        trigger.setAttribute('aria-expanded', isOpen);
      }
    };

    // Bind triggers to open their corresponding overlay
    triggers.forEach(trigger => {
      if (trigger.dataset.ffpInitialized === 'true') return;
      trigger.dataset.ffpInitialized = 'true';

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetId = trigger.getAttribute('aria-controls');
        const targetOverlay = document.getElementById(targetId);
        if (targetOverlay) {
          togglePopup(targetOverlay, true);
        }
      });
    });

    overlays.forEach(overlay => {
      if (overlay.dataset.ffpInitialized === 'true') return;
      overlay.dataset.ffpInitialized = 'true';

      const closeBtn = overlay.querySelector('[data-ffp-close]');
      const form = overlay.querySelector('.ffp-form');
      const clearAllBtn = overlay.querySelector('[data-ffp-clear-all]');
      const groupToggles = overlay.querySelectorAll('[data-ffp-group-toggle]');

      // Close on close button click
      if (closeBtn) {
        closeBtn.addEventListener('click', () => togglePopup(overlay, false));
      }

      // Close on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          togglePopup(overlay, false);
        }
      });

      // Clear all filters handler
      if (clearAllBtn && form) {
        clearAllBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Construct clean URL preserving non-filter params (e.g. q, type, sort_by)
          const actionUrl = new URL(form.getAttribute('action') || window.location.pathname, window.location.origin);
          const currentParams = new URLSearchParams(window.location.search);
          
          currentParams.forEach((value, key) => {
            if (!key.startsWith('filter.')) {
              actionUrl.searchParams.append(key, value);
            }
          });

          // Navigate to cleared URL
          window.location.href = actionUrl.toString();
        });
      }

      // Accordion toggle handler
      groupToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          const group = toggle.closest('.ffp-group');
          if (group) {
            const isCollapsed = group.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', !isCollapsed);
          }
        });
      });
    });

    // Close active overlay on Escape key (prevent duplicate keydown listeners)
    if (!window.ffpKeydownBound) {
      window.ffpKeydownBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const activeOverlay = document.querySelector('.ffp-overlay.active');
          if (activeOverlay) {
            togglePopup(activeOverlay, false);
          }
        }
      });
    }
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', initFacetedFilterPopup);

  // Initialize on Shopify Section load (for Theme Customizer compatibility)
  document.addEventListener('shopify:section:load', (event) => {
    // If the section containing the popup reloaded, reset its initialized state so it rebinds
    const targetSection = event.target;
    if (targetSection) {
      const triggersInSection = targetSection.querySelectorAll('[data-ffp-trigger]');
      const overlaysInSection = targetSection.querySelectorAll('[data-ffp-overlay]');
      
      triggersInSection.forEach(trig => trig.dataset.ffpInitialized = 'false');
      overlaysInSection.forEach(over => over.dataset.ffpInitialized = 'false');
    }
    initFacetedFilterPopup();
  });

  // Hot-initialize right away to cover cases where script loads async/defer post-DOMContent
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initFacetedFilterPopup();
  }
})();
