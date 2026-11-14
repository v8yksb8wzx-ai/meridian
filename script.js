/* ==========================================================================
   Meridian — interactions
   ========================================================================== */

/**
 * MailerLite-configuratie.
 * Plak hier de "action"-URL van je ingebedde MailerLite-formulier, bv.
 * https://assets.mailerlite.com/jsonp/123456/forms/987654321/subscribe
 * Zolang dit leeg is, draait het formulier in demomodus en simuleert het een geslaagde inschrijving.
 */
const MAILERLITE = {
  action: "https://assets.mailerlite.com/jsonp/2795236/forms/204112982232270581/subscribe",
};

document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Image fallbacks: show styled placeholders when assets are missing ---------- */
function initImageFallbacks() {
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    const markMissing = () => img.closest(".media")?.classList.add("is-missing");
    if (img.complete && img.naturalWidth === 0) markMissing();
    else img.addEventListener("error", markMissing, { once: true });
  });
}

/* ---------- Film: fallback, pause control, pause when off-screen ---------- */
function initFilm() {
  const video = document.querySelector("[data-film]");
  const toggle = document.querySelector("[data-video-toggle]");
  if (!video) return;

  const sources = [...video.querySelectorAll("source")];
  sources.at(-1)?.addEventListener("error", () => video.closest(".media")?.classList.add("is-missing"));

  let userPaused = reduceMotion;
  const sync = () => {
    toggle?.classList.toggle("is-paused", video.paused);
    toggle?.setAttribute("aria-label", video.paused ? "Film afspelen" : "Film pauzeren");
  };
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);

  if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
  sync();

  toggle?.addEventListener("click", () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); }
    else { userPaused = true; video.pause(); }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !userPaused) video.play().catch(() => {});
      else if (!entry.isIntersecting) video.pause();
    }, { threshold: 0.15 }).observe(video);
  }
}

/* ---------- Scroll reveal ---------- */
// Once an element has faded in, strip the reveal classes so no compositing
// layer lingers (it can shave pixels off glyphs at the left edge).
function show(el) {
  el.classList.add("is-visible");
  if (reduceMotion) return;
  const last = el.classList.contains("reveal--clip") ? "clip-path" : "transform";
  const done = (e) => {
    if (e.target !== el || e.propertyName !== last) return;
    el.removeEventListener("transitionend", done);
    el.classList.remove("reveal", "reveal--soft", "reveal--clip", "is-visible");
  };
  el.addEventListener("transitionend", done);
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));

  // Safety net: always show what is already in view on first paint
  requestAnimationFrame(() => {
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        show(el);
        io.unobserve(el);
      }
    });
  });
}

/* ---------- Navigation: scrolled state, active link, mobile menu ---------- */
function initNav() {
  const nav = document.querySelector("[data-nav]");
  const hero = document.querySelector(".hero");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  // scrolled state, without a scroll listener
  if (nav && hero) {
    new IntersectionObserver(
      ([entry]) => nav.classList.toggle("is-scrolled", entry.intersectionRatio < 0.85),
      { threshold: [0.85] }
    ).observe(hero);
  }

  // active section highlight
  const links = [...document.querySelectorAll(".nav__links a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  if (!toggle || !menu) return;

  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Menu sluiten");
    document.body.classList.add("menu-open");
  };

  const close = ({ focusToggle = false } = {}) => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menu openen");
    document.body.classList.remove("menu-open");
    const hide = () => { if (!menu.classList.contains("is-open")) menu.hidden = true; };
    reduceMotion ? hide() : setTimeout(hide, 500);
    if (focusToggle) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    toggle.getAttribute("aria-expanded") === "true" ? close() : open();
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") close({ focusToggle: true });
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) close(); });
}

/* ---------- Hero: gentle pointer tilt on the product visual ---------- */
function initTilt() {
  const el = document.querySelector("[data-tilt]");
  const target = el?.querySelector(".bezel");
  if (!el || !target || reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let frame = 0;
  el.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      target.style.transform = `perspective(1200px) rotateY(${x * 5}deg) rotateX(${y * -5}deg)`;
    });
  });
  el.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    target.style.transform = "";
  });
}

/* ---------- Newsletter ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("has-error", Boolean(message));
  field.querySelector(".field__error").textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validate(form) {
  const name = form.elements["fields[name]"];
  const email = form.elements["fields[email]"];
  let firstInvalid = null;

  if (!name.value.trim()) {
    setError(name, "Vul je voornaam in.");
    firstInvalid ??= name;
  } else setError(name, "");

  if (!email.value.trim()) {
    setError(email, "Vul je e-mailadres in.");
    firstInvalid ??= email;
  } else if (!EMAIL_RE.test(email.value.trim())) {
    setError(email, "Dit e-mailadres lijkt niet te kloppen.");
    firstInvalid ??= email;
  } else setError(email, "");

  const optin = form.elements["fields[optin]"];
  if (optin && !optin.checked) {
    setError(optin, "Vink dit aan om je in te schrijven.");
    firstInvalid ??= optin;
  } else if (optin) setError(optin, "");

  firstInvalid?.focus();
  return !firstInvalid;
}

async function subscribe(form) {
  if (!MAILERLITE.action) {
    // demo mode
    await new Promise((resolve) => setTimeout(resolve, 900));
    return;
  }
  const res = await fetch(MAILERLITE.action, {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error("Subscription failed");
}

function initNewsletter() {
  const form = document.querySelector("[data-newsletter]");
  const success = document.querySelector("[data-success]");
  if (!form || !success) return;

  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector(".form__status");

  form.querySelectorAll("input[required]").forEach((input) => {
    input.addEventListener(input.type === "checkbox" ? "change" : "input", () => {
      if (input.closest(".field").classList.contains("has-error")) setError(input, "");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    if (form.elements.company.value) return; // honeypot
    if (!validate(form)) return;

    button.setAttribute("aria-busy", "true");
    button.querySelector(".btn__label").textContent = "Even geduld…";

    try {
      await subscribe(form);
      const firstName = form.elements["fields[name]"].value.trim();
      success.querySelector("[data-success-name]").textContent = firstName ? `, ${firstName}` : "";
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
    } catch {
      status.textContent = "Er ging iets mis. Probeer het zo meteen opnieuw.";
    } finally {
      button.removeAttribute("aria-busy");
      button.querySelector(".btn__label").textContent = "Schrijf me in";
    }
  });
}

/* ---------- Init ---------- */
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
initImageFallbacks();
initFilm();
initReveal();
initNav();
initTilt();
initNewsletter();
