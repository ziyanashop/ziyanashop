const enhanceProductCards = () => {
  const buttons = [...document.querySelectorAll('button')].filter((button) => /add\s+to\s+bag/i.test(button.textContent || ''));
  buttons.forEach((addButton) => {
    if (addButton.dataset.buyNowEnhanced) return;
    addButton.dataset.buyNowEnhanced = '1';
    const buyNow = document.createElement('button');
    buyNow.type = 'button';
    buyNow.className = `${addButton.className} buy-now-enhanced`;
    buyNow.textContent = 'Buy Now';
    buyNow.setAttribute('aria-label', 'Buy now');
    buyNow.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      addButton.click();
      window.setTimeout(() => {
        window.location.assign('/checkout');
      }, 80);
    });
    addButton.insertAdjacentElement('afterend', buyNow);
  });
};

const style = document.createElement('style');
style.textContent = `
.buy-now-enhanced{margin-left:8px!important;border:1px solid #171717!important;background:#171717!important;color:#fff!important;cursor:pointer!important}
@media(max-width:640px){.buy-now-enhanced{margin-left:0!important;margin-top:6px!important}}
`;
document.head.appendChild(style);

const observer = new MutationObserver(enhanceProductCards);
observer.observe(document.body, { childList: true, subtree: true });
window.setTimeout(enhanceProductCards, 100);
