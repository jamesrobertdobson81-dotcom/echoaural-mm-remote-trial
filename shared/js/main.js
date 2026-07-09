const lockedModules = document.querySelectorAll(".module-card.locked");
const lockedPages = document.querySelectorAll(".locked-page");
const moduleMessage = document.getElementById("moduleMessage");

let messageTimer;

function showMessage(message) {
  if (!moduleMessage) {
    alert(message);
    return;
  }

  moduleMessage.textContent = message;
  clearTimeout(messageTimer);

  messageTimer = setTimeout(() => {
    moduleMessage.textContent = "";
  }, 2600);
}

function getModuleName(card) {
  return (
    card.dataset.module ||
    card.querySelector(".sr-only")?.textContent?.trim() ||
    card.querySelector("h3")?.textContent?.trim() ||
    "This module"
  );
}

lockedModules.forEach((card) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    showMessage(`${getModuleName(card)} is coming soon.`);
  });
});

lockedPages.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const pageName = link.dataset.page || link.textContent.trim();
    showMessage(`${pageName} page is coming soon.`);
  });
});
