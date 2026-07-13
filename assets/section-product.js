/**
 * Product Section Logic
 * Handles gallery, quantity selector, and tabs
 */
document.addEventListener('DOMContentLoaded', () => {
  const productSections = document.querySelectorAll('.pd-main-outer');
  productSections.forEach(section => {
    initProductGallery(section);
    initProductQuantity(section);
  });
  
  initProductTabs();
  initRelatedSpotlight();
});

function initProductGallery(container) {
  const mediaItems = container.querySelectorAll('.pd-media-item');
  const thumbs = container.querySelectorAll('.pd-gallery-thumb');
  const track = container.querySelector('.pd-thumbs-track');
  const prevBtn = container.querySelector('.pd-gallery-prev');
  const nextBtn = container.querySelector('.pd-gallery-next');
  const thumbPrev = container.querySelector('.pd-thumb-prev');
  const thumbNext = container.querySelector('.pd-thumb-next');

  if (mediaItems.length === 0 || thumbs.length === 0) return;

  let currentIndex = 0;
  let thumbScrollIndex = 0;
  const visibleThumbs = window.innerWidth > 576 ? 4 : 3;

  function setActiveMedia(index) {
    currentIndex = index;
    
    mediaItems.forEach((item, i) => {
      const isActive = i === index;
      item.classList.toggle('active', isActive);
      
      const video = item.querySelector('video');
      if (video && !isActive) video.pause();
      
      const iframe = item.querySelector('iframe');
      if (iframe && !isActive) {
        const src = iframe.getAttribute('src');
        iframe.setAttribute('src', '');
        iframe.setAttribute('src', src);
      }
    });

    thumbs.forEach((t, i) => {
      t.classList.toggle('active', i === index);
    });

    // Auto-scroll thumbnails to keep active one visible
    if (index >= thumbScrollIndex + visibleThumbs) {
      updateThumbScroll(index - visibleThumbs + 1);
    } else if (index < thumbScrollIndex) {
      updateThumbScroll(index);
    }
  }

  function updateThumbScroll(newIndex) {
    const maxScroll = Math.max(0, thumbs.length - visibleThumbs);
    thumbScrollIndex = Math.min(Math.max(0, newIndex), maxScroll);
    
    if (track) {
      const thumbWidth = thumbs[0].offsetWidth + 12; // width + gap
      track.style.transform = `translateX(-${thumbScrollIndex * thumbWidth}px)`;
    }

    if (thumbPrev) thumbPrev.disabled = thumbScrollIndex === 0;
    if (thumbNext) thumbNext.disabled = thumbScrollIndex === maxScroll;
  }

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => {
      setActiveMedia(idx);
    });
  });

  if (thumbPrev) thumbPrev.addEventListener('click', () => updateThumbScroll(thumbScrollIndex - 1));
  if (thumbNext) thumbNext.addEventListener('click', () => updateThumbScroll(thumbScrollIndex + 1));
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      let nextIdx = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
      setActiveMedia(nextIdx);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      let nextIdx = (currentIndex + 1) % mediaItems.length;
      setActiveMedia(nextIdx);
    });
  }

  // Initialize
  updateThumbScroll(0);
}

function initProductQuantity(container) {
  const minusBtn = container.querySelector('.pd-qty-minus') || container.querySelector('#pd-qty-minus');
  const plusBtn = container.querySelector('.pd-qty-plus') || container.querySelector('#pd-qty-plus');
  const qtyVal = container.querySelector('.pd-qty-value') || container.querySelector('#pd-qty-value');
  const qtyHidden = container.querySelector('.pd-qty-hidden') || container.querySelector('#pd-qty-hidden');

  if (!minusBtn || !plusBtn || !qtyVal) return;

  let qty = 1;

  minusBtn.addEventListener('click', () => {
    if (qty > 1) {
      qty--;
      updateQty();
    }
  });

  plusBtn.addEventListener('click', () => {
    qty++;
    updateQty();
  });

  function updateQty() {
    qtyVal.textContent = qty;
    if (qtyHidden) qtyHidden.value = qty;
  }
}

function initProductTabs() {
  const tabBtns = document.querySelectorAll('.pd-tab-btn');
  const tabContents = document.querySelectorAll('.pd-tab-content');

  if (tabBtns.length === 0) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update Buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update Content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `pd-tab-${tabId}`) {
          content.classList.add('active');
        }
      });
    });
  });
}

function initRelatedSpotlight() {
  const cards = document.querySelectorAll('.pd-related-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}
