(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(title, message) {
    const host = $("#toasts");
    if (!host) return;

    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<p class="t">${title}</p><p class="d">${message}</p>`;
    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 220);
    }, 1600);
  }

  async function copyToClipboard(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Copied", successMsg || text);
  }

  const THEME_KEY = "resume_theme";

  function setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const current = document.body.getAttribute("data-theme");
    setTheme(current === "light" ? "dark" : "light");
  }

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setAccordionItem(item, expanded) {
    item.setAttribute("aria-expanded", expanded ? "true" : "false");
    const panel = item.querySelector(".acc-panel");
    if (!panel) return;
    panel.style.maxHeight = expanded ? `${panel.scrollHeight}px` : "0px";
  }

  function initAccordions() {
    $$(".acc-item").forEach((item) => {
      const btn = item.querySelector(".acc-btn");
      const isExpanded = item.getAttribute("aria-expanded") === "true";
      setAccordionItem(item, isExpanded);

      btn?.addEventListener("click", () => {
        const now = item.getAttribute("aria-expanded") === "true";
        setAccordionItem(item, !now);
      });
    });

    window.addEventListener("resize", () => {
      $$(".acc-item[aria-expanded='true']").forEach((item) => {
        const panel = item.querySelector(".acc-panel");
        if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
    });
  }

  function expandAllAccordions(expand) {
    $$(".acc-item").forEach((item) => setAccordionItem(item, expand));
  }

  let activeSkillFilter = null;

  function applySkillFilter(filter) {
    activeSkillFilter = filter;

    $$("#skillFilters .chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.filter === filter);
    });

    const empty = $("#skillsEmpty");
    const grid = $("#skillGrid");
    const cards = $$("#skillGrid .skill-card");
    if (!empty || !grid) return;

    grid.classList.toggle("skills-view", Boolean(filter));

    if (!filter) {
      empty.style.display = "";
      cards.forEach((card) => (card.style.display = "none"));
      return;
    }

    empty.style.display = "none";
    cards.forEach((card) => {
      const tags = (card.getAttribute("data-tags") || "").split(/\s+/).filter(Boolean);
      card.style.display = tags.includes(filter) ? "" : "none";
    });
  }

  function initSectionSpy() {
    const links = $$(".navlink");
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const activeId = `#${visible.target.id}`;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === activeId));
      },
      { threshold: [0.25, 0.45, 0.6] }
    );

    sections.forEach((s) => io.observe(s));
  }

  function openModal() {
    $("#modal")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("#modal")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function initFab() {
    const fab = $("#fab");
    if (!fab) return;
    const onScroll = () => fab.classList.toggle("show", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function getPdfUrl(fromEl) {
    return fromEl?.dataset?.pdf || "Giuzwald_Balallo_CV.pdf";
  }

  function openPdf(fromEl) {
    const pdfUrl = getPdfUrl(fromEl);
    window.open(pdfUrl, "_blank", "noopener");
  }

  async function downloadPdf(fromEl) {
    const pdfUrl = getPdfUrl(fromEl);
    const filename = fromEl?.dataset?.name || "Giuzwald_Balallo_CV.pdf";

    try {
      const res = await fetch(pdfUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(objUrl);
      toast("Download started", filename);
    } catch {
      toast("Download fallback", "Opening PDF instead (hosting may block direct download).");
      openPdf(fromEl);
    }
  }

  const printState = { theme: null, skillFilter: null, expanded: [] };

  function prepareForPrint() {
    printState.theme = document.body.getAttribute("data-theme");
    printState.skillFilter = activeSkillFilter;
    printState.expanded = $$(".acc-item").map((i) => i.getAttribute("aria-expanded") === "true");

    setTheme("light");
    expandAllAccordions(true);

    $("#skillsEmpty").style.display = "none";
    $("#skillGrid").classList.remove("skills-view");
    $$("#skillGrid .skill-card").forEach((card) => (card.style.display = ""));

    closeModal();
  }

  function restoreAfterPrint() {
    $$(".acc-item").forEach((item, idx) => setAccordionItem(item, Boolean(printState.expanded[idx])));
    applySkillFilter(printState.skillFilter);
    if (printState.theme) setTheme(printState.theme);
  }

  function bindEvents() {
    $$(".navlink").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToId(a.getAttribute("href").slice(1));
      });
    });

    $("#btnTheme")?.addEventListener("click", toggleTheme);
    $("#btnContact")?.addEventListener("click", openModal);

    $("#btnCopyEmail")?.addEventListener("click", () => copyToClipboard("waldxbalallo@gmail.com", "Email copied"));
    $("#btnCopyPhone")?.addEventListener("click", () => copyToClipboard("0969-314-0418", "Phone copied"));

    $("#btnViewExperience")?.addEventListener("click", () => scrollToId("experience"));

    $("#btnExpandAll")?.addEventListener("click", () => expandAllAccordions(true));
    $("#btnCollapseAll")?.addEventListener("click", () => expandAllAccordions(false));

    $$("#skillFilters .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const f = chip.dataset.filter;
        applySkillFilter(activeSkillFilter === f ? null : f);
      });
    });
    $("#btnClearSkills")?.addEventListener("click", () => applySkillFilter(null));

    $("#btnCloseModal")?.addEventListener("click", closeModal);
    $("#modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "modal") closeModal();
    });

    $("#btnEmailNow")?.addEventListener("click", () => {
      const subject = encodeURIComponent($("#subj")?.value || "");
      const body = encodeURIComponent($("#msg")?.value || "");
      window.open(`mailto:waldxbalallo@gmail.com?subject=${subject}&body=${body}`, "_blank", "noopener");
    });

    $("#btnCopyDraft")?.addEventListener("click", () => {
      const subject = $("#subj")?.value || "";
      const body = $("#msg")?.value || "";
      copyToClipboard(`Subject: ${subject}\n\n${body}`, "Draft copied");
    });

    $("#btnTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    $("#btnOpenPDF")?.addEventListener("click", (e) => openPdf(e.currentTarget));
    $("#btnDownloadPDF")?.addEventListener("click", (e) => downloadPdf(e.currentTarget));

    window.addEventListener("beforeprint", prepareForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      if (key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleTheme();
      }

      if (key === "escape") closeModal();

      if ((e.ctrlKey || e.metaKey) && key === "p") prepareForPrint();
    });
  }

  function init() {
    setTheme(localStorage.getItem(THEME_KEY) || "dark");
    initAccordions();
    initSectionSpy();
    initFab();
    applySkillFilter(null);
    bindEvents();
  }

  init();
})();
