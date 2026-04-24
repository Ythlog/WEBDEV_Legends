function setActive(clickedItem) {
  const allNavItems = document.querySelectorAll('.nav-item');
  allNavItems.forEach(item => item.classList.remove('active'));

  clickedItem.classList.add('active');
}

const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', function () {
  const searchValue = searchInput.value.toLowerCase();

  const announcementCards = document.querySelectorAll('.announcement-card');
  announcementCards.forEach(card => {
    const cardText = card.innerText.toLowerCase();
    card.style.display = cardText.includes(searchValue) ? 'block' : 'none';
  });

  const todoCards = document.querySelectorAll('.todo-card');
  todoCards.forEach(card => {
    const cardText = card.innerText.toLowerCase();
    card.style.display = cardText.includes(searchValue) ? 'block' : 'none';
  });
});
