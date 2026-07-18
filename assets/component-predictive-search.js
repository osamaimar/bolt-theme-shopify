/* assets/component-predictive-search.js */

class PredictiveSearch {
  constructor(input, wrapper) {
    this.input = input;
    this.wrapper = wrapper;
    this.dropdown = null;
    this.debounceTimer = null;
    this.currentSearchTerm = '';
    this.selectedItemIndex = -1;
    this.items = [];
    this.abortController = null;

    // Get settings
    this.config = window.boltTheme?.predictiveSearch || {
      enabled: true,
      resultsCount: 5,
      showImage: true,
      showPrice: true,
      showVendor: true,
      routes: { search_url: '/search' }
    };

    if (!this.config.enabled) return;

    this.init();
  }

  init() {
    // Create dropdown element
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'ps-dropdown';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.id = `ps-dropdown-${Math.random().toString(36).substr(2, 9)}`;
    this.wrapper.appendChild(this.dropdown);

    // Update wrapper class to allow relative positioning
    this.wrapper.classList.add('predictive-search-wrapper');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', this.dropdown.id);
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.setAttribute('autocomplete', 'off');

    // Bind event listeners
    this.input.addEventListener('input', this.onInput.bind(this));
    this.input.addEventListener('keydown', this.onKeydown.bind(this));
    this.input.addEventListener('focus', this.onFocus.bind(this));
    
    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Intercept clicking on "See all results" link
    this.dropdown.addEventListener('click', (e) => {
      const footerLink = e.target.closest('.ps-footer-link');
      if (footerLink) {
        e.preventDefault();
        this.submitForm();
      }
    });
  }

  onInput() {
    const query = this.input.value.trim();

    if (query === this.currentSearchTerm) return;

    clearTimeout(this.debounceTimer);
    this.currentSearchTerm = query;

    if (query.length < 2) {
      this.close();
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 300);
  }

  onFocus() {
    const query = this.input.value.trim();
    if (query.length >= 2) {
      this.fetchSuggestions(query);
    }
  }

  onKeydown(event) {
    if (!this.dropdown.classList.contains('active')) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigate(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigate(-1);
        break;
      case 'Enter':
        if (this.selectedItemIndex > -1) {
          event.preventDefault();
          const activeItem = this.items[this.selectedItemIndex];
          if (activeItem) {
            activeItem.click();
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  fetchSuggestions(query) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.showLoading();

    const limit = this.config.resultsCount;
    const url = `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${limit}`;

    fetch(url, { signal })
      .then((res) => {
        if (!res.ok) throw new Error('Search request failed');
        return res.json();
      })
      .then((data) => {
        const products = data.resources?.results?.products || [];
        this.renderResults(products, query);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Predictive Search Error:', err);
        this.renderEmptyState(query);
      });
  }

  showLoading() {
    this.dropdown.classList.add('active');
    this.input.setAttribute('aria-expanded', 'true');
    
    // Localization
    const loadingText = window.boltTheme?.strings?.predictiveLoading || 'Searching...';
    
    this.dropdown.innerHTML = `
      <div class="ps-status-container">
        <div class="ps-spinner" aria-hidden="true"></div>
        <span class="ps-status-text">${loadingText}</span>
      </div>
    `;
    this.selectedItemIndex = -1;
    this.items = [];
  }

  renderResults(products, query) {
    if (products.length === 0) {
      this.renderEmptyState(query);
      return;
    }

    const searchUrl = this.config.routes.search_url;
    const showImage = this.config.showImage;
    const showPrice = this.config.showPrice;
    const showVendor = this.config.showVendor !== undefined ? this.config.showVendor : true;
    
    // Localization
    const productsTitle = window.boltTheme?.strings?.products || 'Products';
    const viewAllText = window.boltTheme?.strings?.predictiveViewAll || 'See all results for "{{ terms }}"';
    const viewAllFormatted = viewAllText.replace('{{ terms }}', this.escapeHtml(query));

    let html = `<div class="ps-group">`;
    html += `<div class="ps-group-title" id="ps-group-products">${productsTitle}</div>`;
    html += `<ul class="ps-results" role="listbox" aria-labelledby="ps-group-products">`;

    products.forEach((product, index) => {
      const formattedPrice = this.formatPrice(product.price);
      const comparePrice = product.compare_at_price ? this.formatPrice(product.compare_at_price) : '';
      
      html += `
        <li role="option" id="ps-item-${index}">
          <a href="${product.url}" class="ps-item" tabindex="-1">
            ${showImage ? `
              <div class="ps-item-image-wrapper">
                ${product.image ? `
                  <img class="ps-item-image" src="${product.image}" alt="${this.escapeHtml(product.title)}" loading="lazy" width="48" height="48">
                ` : `
                  <div class="ps-item-image-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                `}
              </div>
            ` : ''}
            <div class="ps-item-info">
              <span class="ps-item-title">${this.escapeHtml(product.title)}</span>
              ${showVendor && product.vendor ? `<span class="ps-item-vendor">${this.escapeHtml(product.vendor)}</span>` : ''}
              ${showPrice ? `
                <span class="ps-item-price">
                  ${formattedPrice}
                  ${comparePrice ? `<s>${comparePrice}</s>` : ''}
                </span>
              ` : ''}
            </div>
          </a>
        </li>
      `;
    });

    html += `</ul></div>`;
    
    // See all results link
    html += `
      <div class="ps-footer">
        <a href="${searchUrl}?q=${encodeURIComponent(query)}&type=product" class="ps-footer-link" tabindex="-1">
          <span>${viewAllFormatted}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>
    `;

    this.dropdown.innerHTML = html;
    this.dropdown.classList.add('active');
    this.input.setAttribute('aria-expanded', 'true');

    // Collect interactable elements for keyboard navigation
    this.items = Array.from(this.dropdown.querySelectorAll('.ps-item, .ps-footer-link'));
    this.selectedItemIndex = -1;
  }

  renderEmptyState(query) {
    const emptyText = window.boltTheme?.strings?.predictiveEmpty || 'No suggestions found';
    
    this.dropdown.innerHTML = `
      <div class="ps-status-container">
        <svg class="ps-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <p class="ps-empty-text">${emptyText}</p>
      </div>
    `;
    this.dropdown.classList.add('active');
    this.input.setAttribute('aria-expanded', 'true');
    this.items = [];
    this.selectedItemIndex = -1;
  }

  navigate(direction) {
    if (this.items.length === 0) return;

    // Remove active state from current item
    if (this.selectedItemIndex > -1 && this.items[this.selectedItemIndex]) {
      this.items[this.selectedItemIndex].classList.remove('ps-item--active');
    }

    // Calculate next index
    this.selectedItemIndex += direction;

    if (this.selectedItemIndex < 0) {
      this.selectedItemIndex = this.items.length - 1;
    } else if (this.selectedItemIndex >= this.items.length) {
      this.selectedItemIndex = 0;
    }

    const currentActiveItem = this.items[this.selectedItemIndex];
    if (currentActiveItem) {
      currentActiveItem.classList.add('ps-item--active');
      this.input.setAttribute('aria-activedescendant', currentActiveItem.parentElement?.id || '');
      
      // Scroll into view if needed
      currentActiveItem.scrollIntoView({ block: 'nearest' });
    }
  }

  close() {
    if (this.dropdown) {
      this.dropdown.classList.remove('active');
      this.input.setAttribute('aria-expanded', 'false');
      this.input.removeAttribute('aria-activedescendant');
    }
    this.selectedItemIndex = -1;
  }

  // Price formatting helper
  formatPrice(priceVal) {
    if (!priceVal) return '';

    // If it's already a formatted string containing a currency symbol, return it
    if (typeof priceVal === 'string' && (priceVal.includes('$') || priceVal.match(/[^\d.,]/))) {
      return priceVal;
    }

    // Otherwise, parse and try to format
    const parsed = parseFloat(priceVal);
    if (isNaN(parsed)) return priceVal;

    // Check if global formatMoney utility is present (from global.js)
    if (typeof window.formatMoney === 'function') {
      // Shopify API returns price as a decimal string (e.g. "19.99" or cents depending on response)
      // Usually suggest.json returns it as decimal or string, but sometimes raw value. Let's format it.
      // If parsed value has decimal points, it's already in dollars/main currency unit.
      // formatMoney expects cents. Let's multiply if it looks like main units.
      const isMainUnit = (priceVal.toString().indexOf('.') !== -1) || parsed < 50000; 
      const cents = isMainUnit ? Math.round(parsed * 100) : parsed;
      return window.formatMoney(cents);
    }

    // Fallback format
    const symbol = window.boltTheme?.strings?.currencySymbol || '$';
    return symbol + parsed.toFixed(2);
  }

  submitForm() {
    if (!this.wrapper) return;
    if (typeof this.wrapper.requestSubmit === 'function') {
      this.wrapper.requestSubmit();
    } else {
      const event = new Event('submit', { cancelable: true, bubbles: true });
      if (this.wrapper.dispatchEvent(event)) {
        this.wrapper.submit();
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Initialise on load
document.addEventListener('DOMContentLoaded', () => {
  const initPredictiveSearch = () => {
    // 1. Search Popup Input
    const popupWrapper = document.querySelector('[data-predictive-target="popup"]');
    const popupInput = document.getElementById('search-popup-input');
    if (popupWrapper && popupInput) {
      new PredictiveSearch(popupInput, popupWrapper);
    }

    // 2. Standalone Search Bar Section Inputs
    const barWrappers = document.querySelectorAll('[data-predictive-target="bar"]');
    barWrappers.forEach((wrapper) => {
      const input = wrapper.querySelector('input[type="search"]');
      if (input) {
        new PredictiveSearch(input, wrapper);
      }
    });
  };

  initPredictiveSearch();
  
  // Re-run init if shopify section loads dynamically (e.g. Theme Editor changes)
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target.querySelector('[data-predictive-target]')) {
      initPredictiveSearch();
    }
  });
});
