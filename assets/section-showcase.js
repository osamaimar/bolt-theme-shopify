/**
 * section-showcase.js
 * Handles product showcase interactions: sliders, filters, view toggles, and spotlight effects.
 */

document.addEventListener('DOMContentLoaded', () => {
    initShowcaseFilters();
    initShowcaseViewToggle();
    initShowcaseSlider();
    initShowcaseSpotlight();
});

/**
 * Category filtering logic
 */
function initShowcaseFilters() {
    const pills = document.querySelectorAll('.csh-pill');
    const productCards = document.querySelectorAll('.csh-product-card');

    if (!pills.length || !productCards.length) return;

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            const filterValue = pill.getAttribute('data-filter');

            productCards.forEach(card => {
                const category = card.getAttribute('data-category');
                const visible = filterValue === 'all' || category === filterValue;
                
                if (visible) {
                    card.style.display = '';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transition = 'opacity 0.4s ease';
                    }, 10);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

/**
 * Grid/List view toggle
 */
function initShowcaseViewToggle() {
    const viewBtns = document.querySelectorAll('.csh-view-btn');
    const productGrid = document.getElementById('csh-product-grid');

    if (!viewBtns.length || !productGrid) return;

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.getAttribute('data-view');
            productGrid.classList.toggle('list-view', view === 'list');
        });
    });
}

/**
 * Top Picks Horizontal Slider
 */
function initShowcaseSlider() {
    const pickPrev = document.getElementById('csh-pick-prev');
    const pickNext = document.getElementById('csh-pick-next');
    const track = document.getElementById('csh-featured-track');

    if (!pickPrev || !pickNext || !track) return;

    // Card width (320px) + gap (var(--spacing-lg) which is usually 24px)
    const scrollAmount = 344; 

    pickPrev.addEventListener('click', () => {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    pickNext.addEventListener('click', () => {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}

/**
 * Spotlight mouse-tracking effect for cards
 */
function initShowcaseSpotlight() {
    const allCards = document.querySelectorAll('.csh-product-card, .csh-pick-card');
    
    allCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}
