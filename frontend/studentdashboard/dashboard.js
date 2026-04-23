// ===== SET ACTIVE NAV ITEM =====
function setActive(clickedItem) {
  // Remove active class from all nav items
  const allNavItems = document.querySelectorAll('.nav-item');
  allNavItems.forEach(item => item.classList.remove('active'));

  // Add active class to the clicked one
  clickedItem.classList.add('active');
}

// ===== SEARCH INPUT =====
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', function () {
  const searchValue = searchInput.value.toLowerCase();

  // Search through announcement cards
  const announcementCards = document.querySelectorAll('.announcement-card');
  announcementCards.forEach(card => {
    const cardText = card.innerText.toLowerCase();
    card.style.display = cardText.includes(searchValue) ? 'block' : 'none';
  });

  // Search through to-do cards
  const todoCards = document.querySelectorAll('.todo-card');
  todoCards.forEach(card => {
    const cardText = card.innerText.toLowerCase();
    card.style.display = cardText.includes(searchValue) ? 'block' : 'none';
  });
});
