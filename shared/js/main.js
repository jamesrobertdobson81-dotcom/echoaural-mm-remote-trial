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


// EchoAural pedagogy popout
(() => {
  const modal = document.getElementById("pedagogyPopout");
  const openButtons = document.querySelectorAll("[data-pedagogy-open]");

  if (!modal || !openButtons.length) return;

  const closeButtons = modal.querySelectorAll("[data-pedagogy-close]");
  const closeButton = modal.querySelector("[data-pedagogy-close]");

  function openPedagogyPopout(event) {
    event.preventDefault();

    modal.hidden = false;
    document.body.classList.add("pedagogy-modal-open");

    requestAnimationFrame(() => {
      modal.classList.add("is-visible");
      if (closeButton) closeButton.focus({ preventScroll: true });
    });
  }

  function closePedagogyPopout() {
    modal.classList.remove("is-visible");
    document.body.classList.remove("pedagogy-modal-open");

    setTimeout(() => {
      if (!modal.classList.contains("is-visible")) {
        modal.hidden = true;
      }
    }, 180);

    if (window.location.hash) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    const top = document.getElementById("top");
    if (top) {
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", openPedagogyPopout);
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closePedagogyPopout);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closePedagogyPopout();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closePedagogyPopout();
    }
  });
})();

