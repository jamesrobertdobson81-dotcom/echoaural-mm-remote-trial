(() => {
  "use strict";

  const form = document.getElementById("foundingInterestForm");
  const status = document.getElementById("formStatus");

  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const school = String(data.get("school") || "").trim();
    const examBoard = String(data.get("examBoard") || "").trim();

    const subject = encodeURIComponent("EchoAural Founding Partner interest");
    const body = encodeURIComponent(
      [
        "Hello James,",
        "",
        "I would like to register interest in an EchoAural Founding Partner place.",
        "",
        `Name: ${name}`,
        `School email: ${email}`,
        `School: ${school}`,
        `Exam board: ${examBoard}`,
        "",
        "Founding offer: £49 for 12 months, including one teacher login and twenty student logins."
      ].join("\n")
    );

    status.textContent = "Opening your email app…";
    window.location.href = `mailto:hello@echoaural.com?subject=${subject}&body=${body}`;
  });
})();
