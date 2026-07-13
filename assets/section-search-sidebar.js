/**
 * Search Sidebar Filters Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.search-sidebar');
    if (!sidebar) return;

    // Handle Checkbox Filters (Category, Brand, etc.)
    const filterInputs = sidebar.querySelectorAll('.sidebar-filter-input');
    filterInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateSearchFilters();
        });
    });

    // Handle Price Range
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    if (priceMin && priceMax) {
        [priceMin, priceMax].forEach(input => {
            input.addEventListener('change', () => {
                updateSearchFilters();
            });
        });
    }

    function updateSearchFilters() {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        let currentTerms = params.get('q') || '';
        
        // Remove existing type/tag/vendor filters from q
        currentTerms = currentTerms.replace(/\s*(type|tag|vendor):"[^"]*"/gi, '')
                                  .replace(/\s*(type|tag|vendor):[^\s]*/gi, '')
                                  .trim();

        // Collect checked filters
        const activeFilters = {};
        sidebar.querySelectorAll('.sidebar-filter-input:checked').forEach(input => {
            const type = input.getAttribute('data-type');
            const value = input.value;
            if (!activeFilters[type]) activeFilters[type] = [];
            activeFilters[type].push(value);
        });

        // Build the filter string using OR for multiple values in the same group
        let filterString = '';
        Object.keys(activeFilters).forEach(type => {
            const values = activeFilters[type];
            if (values.length > 1) {
                const group = values.map(val => {
                    const formattedVal = val.includes(' ') ? `"${val}"` : val;
                    return `${type}:${formattedVal}`;
                }).join(' OR ');
                filterString += ` (${group})`;
            } else {
                const val = values[0];
                const formattedVal = val.includes(' ') ? `"${val}"` : val;
                filterString += ` ${type}:${formattedVal}`;
            }
        });

        params.set('q', (currentTerms + filterString).trim());

        // Handle Price
        if (priceMin && priceMin.value) {
            params.set('filter.v.price.gte', priceMin.value);
        } else {
            params.delete('filter.v.price.gte');
        }
        
        if (priceMax && priceMax.value) {
            params.set('filter.v.price.lte', priceMax.value);
        } else {
            params.delete('filter.v.price.lte');
        }

        params.delete('page');
        
        // Show loading state
        const resultsArea = document.querySelector('.search-results-area');
        if (resultsArea) {
            resultsArea.style.opacity = '0.5';
            resultsArea.style.pointerEvents = 'none';
        }

        window.location.href = url.toString();
    }
});
