/* assets/section-search.js */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('#search-input');
    const searchBar = document.querySelector('#search-bar');
    const clearBtn = document.getElementById('search-clear');
    
    if (searchInput && clearBtn && searchBar) {
        const toggleClearBtn = () => {
            if (searchInput.value.trim().length > 0) {
                searchBar.classList.add('has-value');
                clearBtn.style.display = 'flex';
            } else {
                searchBar.classList.remove('has-value');
                clearBtn.style.display = 'none';
            }
        };

        // Initial check
        toggleClearBtn();

        searchInput.addEventListener('input', toggleClearBtn);

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            toggleClearBtn();
        });

        // Intercept form submission to append prefix wildcards (*) to each search term
        searchBar.addEventListener('submit', () => {
            let query = searchInput.value.trim();
            if (query.length > 0) {
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
                searchBar.appendChild(hiddenInput);

                // Strip name from visible field
                searchInput.removeAttribute('name');
            }
        });
    }

    // Handle Result Meta Visibility
    const searchMeta = document.getElementById('search-meta');
    if (searchMeta) {
        // If results exist or search was performed, show meta
        const hasResults = document.querySelectorAll('.cpd-product-card').length > 0;
        if (hasResults) {
            searchMeta.classList.add('visible');
        }
    }

    // Handle Category Chips
    const filtersContainer = document.getElementById('search-filters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;

            const activeCategory = chip.getAttribute('data-category');
            
            const url = new URL(window.location.href);
            const params = url.searchParams;
            
            if (activeCategory !== 'all') {
                params.set('q', activeCategory + '*');
            } else {
                params.set('q', '');
            }
            
            // Clear facet parameters if they were there (cleanup)
            params.delete('filter.p.product_type');
            params.delete('filter.p.tag');
            params.delete('page');

            // Add a loading state to the chip
            chip.classList.add('loading');
            
            window.location.href = url.toString();
        });
    }

    // === Custom Sort Dropdown Logic ===
    const dropdowns = document.querySelectorAll('.ccg-dropdown-box');
    
    dropdowns.forEach(box => {
      const trigger = box.querySelector('.ccg-dropdown-trigger');
      const list = box.querySelector('.ccg-dropdown-list');
      const options = box.querySelectorAll('.ccg-dropdown-option');
      const label = box.querySelector('.ccg-dropdown-label');

      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isActive = box.classList.contains('active');
          
          dropdowns.forEach(other => {
            other.classList.remove('active');
            other.querySelector('.ccg-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
          });

          if (!isActive) {
            box.classList.add('active');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      }

      options.forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = opt.getAttribute('data-value');
          if (url) {
            window.location.href = url;
          }
        });
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ccg-dropdown-box')) {
        dropdowns.forEach(box => {
          box.classList.remove('active');
          box.querySelector('.ccg-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });
});
