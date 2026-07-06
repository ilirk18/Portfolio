(function () {
  "use strict";

  const THEME_KEY = "ilirTheme";
  const CONTROLS_WIDTH_KEY = "portfolioControlsWidth";
  const LAYERS_PANEL_WIDTH_KEY = "portfolioLayersPanelWidth";
  const SECTION_KEY = "portfolioSection";
  const CONTROLS_WIDTH_MIN = 200;
  const CONTROLS_WIDTH_MAX = 480;
  const LAYERS_WIDTH_MIN = 180;
  const LAYERS_WIDTH_MAX = 420;

  const SECTIONS = ["home", "experience", "projects", "tech", "education", "contact"];

  const SECTION_LABELS = {
    home: "Home",
    experience: "Experience",
    projects: "Key Projects",
    tech: "Tech Stack",
    education: "Education",
    contact: "Contact"
  };

  const SECTION_SUBTITLES = {
    home: "Software Engineer",
    experience: "Work history",
    projects: "Selected web applications",
    tech: "Tools & technologies",
    education: "Formal training",
    contact: "Get in touch"
  };

  const PROJECTS = [
    {
      id: "markdown-editor",
      title: "Markdown Editor",
      reason: "Built for my own personal use: I wanted a single place to write and preview markdown in the browser without relying on external tools, with export to HTML and PDF for sharing or printing. It doubles as a lightweight writing environment with an outline and optional draft recovery.",
      uiUx: "Photoshop-style dark UI with resizable panels (file/settings left, outline right) and a clear split between edit and preview. Dark/light theme, consistent typography (Segoe UI), and accent color (#0d7acc) for focus and links. Toolbar offers Edit / Split / Preview modes; formatting and find/replace are within reach without clutter.",
      overview: "A client-side markdown editor with a Photoshop-style dark UI. Edit in split view (markdown + live preview) or edit-only/preview-only. Features include a heading outline with scroll sync, export to HTML/PDF/Word, find & replace, formatting toolbar (bold, lists, tables, etc.), dark/light theme, resizable panels, and optional auto-save draft. Built with vanilla JavaScript, marked.js for parsing, and html2pdf for PDF export.",
      images: [
        { src: "https://ilir.netlify.app/images/markdown-editor.png", alt: "Markdown Editor screenshot" }
      ],
      liveUrl: "https://ilirk-markdown.netlify.app/",
      codeUrl: null,
      tags: ["HTML", "CSS", "JavaScript", "marked.js", "html2pdf"]
    },
    {
      id: "label-designer",
      title: "Label Designer (Label Maker)",
      reason: "Built for my own personal use: I needed a way to design and print labels (QR, barcodes, text, shapes) without depending on third-party label software. Everything runs in the browser and exports to PNG, PDF, or ZPL for printers.",
      uiUx: "Same Photoshop-style language as the Markdown Editor: dark panels on the left (tools, file, layers) and right (properties), with a central canvas. Collapsible sections, consistent buttons and inputs, and a layers list for reordering. Designed so power users can work quickly while the layout stays clear.",
      overview: "Client-side web app for designing printable labels with a canvas-based editor. Add text, QR codes, barcodes (Code 128/39, EAN, UPC), shapes, lines, and SVG/images. Layers panel with reorder and properties; import/export JSON, XML, PNG, PDF, ZPL; print support. Built with Fabric.js, Vite, QRCode.js, JsBarcode, and jsPDF.",
      images: [
        { src: "https://ilir.netlify.app/images/label-designer.png", alt: "Label Designer screenshot" }
      ],
      liveUrl: "https://ilirk-label-maker.netlify.app/",
      codeUrl: null,
      tags: ["HTML", "CSS", "JavaScript", "Fabric.js", "Vite", "jsPDF"]
    },
    {
      id: "planet-accounting",
      title: "Planet Accounting Web Program",
      reason: "Built for Planet Accounting to support daily accounting workflows, reporting, and centralized access to financial data. The goal was a single, reliable web program that could grow with the business.",
      uiUx: "Role-based dashboards and clear navigation so accountants and admins can move between tasks without clutter. Forms and tables are laid out for data entry and review; export and filters are easy to find.",
      overview: "Full-stack web application for accounting workflows: invoicing, reporting, and data management. Includes role-based access, dashboards, and export features for business use. I led a total redesign of the front end—drag the slider below to compare the layout before and after (illustrative wireframes; real screenshots available on request).",
      beforeAfter: true,
      images: [
        { src: "images/planet-before.svg", alt: "Planet Accounting legacy layout — illustrative wireframe" },
        { src: "images/planet-after.svg", alt: "Planet Accounting redesigned layout — illustrative wireframe" }
      ],
      liveUrl: null,
      codeUrl: null,
      tags: ["React", "TypeScript", "Node.js", "PostgreSQL"]
    },
    {
      id: "lead-generator",
      title: "Lead Generator (ImportInfo → Seamless AI)",
      reason: "Built to automate the lead generation pipeline from ImportInfo data to Seamless AI, reducing manual steps and ensuring consistent, timely lead flow for sales and outreach.",
      uiUx: "Clear dashboards for pipeline status and run history; configuration for sources and mappings. Alerts and logs keep operators informed; minimal clicks for scheduling and monitoring automated runs.",
      overview: "Automation tool that pulls lead data from ImportInfo and feeds it into Seamless AI. Handles mapping, validation, and scheduled runs so sales teams get qualified leads without manual export/import.",
      images: [
        { src: "images/lead-generator.svg", alt: "Lead Generator pipeline — illustrative terminal view (confidential client work)" }
      ],
      liveUrl: null,
      codeUrl: null,
      tags: ["JavaScript", "Node.js", "API", "Automation"]
    },
    {
      id: "national-theater-kosovo",
      title: "National Theater of Kosovo — Management Tool",
      reason: "Built for the National Theater of Kosovo to manage productions, schedules, cast, and operations in one place. Replaces spreadsheets and ad-hoc tools with a single system for the organization.",
      uiUx: "Role-appropriate views for staff and admins: calendar and production lists, cast and crew assignment, and reporting. Forms and filters are tuned for theater workflows like rehearsals and show dates.",
      overview: "Management system for the National Theater of Kosovo: productions, scheduling, cast and crew, and operational reporting. Supports planning, resource allocation, and day-to-day theater administration.",
      images: [
        { src: "images/national-theater.svg", alt: "National Theater production board — illustrative view (confidential client work)" }
      ],
      liveUrl: null,
      codeUrl: null,
      tags: ["React", "TypeScript", "Node.js", "PostgreSQL"]
    }
  ];

  function getTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark") return v;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
      return "dark";
    } catch (e) {
      return "dark";
    }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
    document.documentElement.classList.toggle("theme-light", theme === "light");
    var fav = document.getElementById("favicon");
    if (fav && window._portfolioFaviconPaths) fav.href = window._portfolioFaviconPaths[theme === "light" ? "light" : "dark"];
  }

  function getStoredPanelWidths() {
    try {
      const c = parseInt(localStorage.getItem(CONTROLS_WIDTH_KEY), 10);
      const l = parseInt(localStorage.getItem(LAYERS_PANEL_WIDTH_KEY), 10);
      return {
        controls: (!isNaN(c) && c >= CONTROLS_WIDTH_MIN && c <= CONTROLS_WIDTH_MAX) ? c : 260,
        layers: (!isNaN(l) && l >= LAYERS_WIDTH_MIN && l <= LAYERS_WIDTH_MAX) ? l : 220
      };
    } catch (e) {
      return { controls: 260, layers: 220 };
    }
  }

  function applyPanelWidths(controlsW, layersW) {
    if (controlsW != null) document.documentElement.style.setProperty("--controls-width", String(controlsW) + "px");
    if (layersW != null) document.documentElement.style.setProperty("--layers-panel-width", String(layersW) + "px");
  }

  function setupPanelResizers() {
    const resizerLeft = document.getElementById("resizerLeft");
    const resizerRight = document.getElementById("resizerRight");
    if (!resizerLeft || !resizerRight) return;

    const widths = getStoredPanelWidths();
    applyPanelWidths(widths.controls, widths.layers);

    function onLeftMove(e) {
      const dx = e.clientX - (resizerLeft._startX || 0);
      let w = Math.round((resizerLeft._startWidth || 260) + dx);
      w = Math.max(CONTROLS_WIDTH_MIN, Math.min(CONTROLS_WIDTH_MAX, w));
      applyPanelWidths(w, null);
    }

    function onLeftUp() {
      resizerLeft.classList.remove("resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onLeftMove);
      document.removeEventListener("mouseup", onLeftUp);
      const w = document.documentElement.style.getPropertyValue("--controls-width");
      if (w) try { localStorage.setItem(CONTROLS_WIDTH_KEY, parseInt(w, 10)); } catch (err) {}
    }

    resizerLeft.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      resizerLeft._startX = e.clientX;
      resizerLeft._startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--controls-width"), 10) || 260;
      resizerLeft.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onLeftMove);
      document.addEventListener("mouseup", onLeftUp);
    });

    function onRightMove(e) {
      const dx = e.clientX - (resizerRight._startX || 0);
      let w = Math.round((resizerRight._startWidth || 220) - dx);
      w = Math.max(LAYERS_WIDTH_MIN, Math.min(LAYERS_WIDTH_MAX, w));
      applyPanelWidths(null, w);
    }

    function onRightUp() {
      resizerRight.classList.remove("resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onRightMove);
      document.removeEventListener("mouseup", onRightUp);
      const w = document.documentElement.style.getPropertyValue("--layers-panel-width");
      if (w) try { localStorage.setItem(LAYERS_PANEL_WIDTH_KEY, parseInt(w, 10)); } catch (err) {}
    }

    resizerRight.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      resizerRight._startX = e.clientX;
      resizerRight._startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--layers-panel-width"), 10) || 220;
      resizerRight.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onRightMove);
      document.addEventListener("mouseup", onRightUp);
    });
  }

  function closeMobileNav() {
    var panel = document.getElementById("controlsPanel");
    var toggle = document.getElementById("navToggle");
    var backdrop = document.getElementById("navBackdrop");
    if (panel) panel.classList.remove("is-open");
    if (backdrop) {
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function openMobileNav() {
    var panel = document.getElementById("controlsPanel");
    var toggle = document.getElementById("navToggle");
    var backdrop = document.getElementById("navBackdrop");
    if (panel) panel.classList.add("is-open");
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add("is-visible");
      backdrop.setAttribute("aria-hidden", "false");
    }
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }

  function setupMobileNav() {
    var toggle = document.getElementById("navToggle");
    var backdrop = document.getElementById("navBackdrop");

    if (toggle) {
      toggle.addEventListener("click", function () {
        var panel = document.getElementById("controlsPanel");
        if (panel && panel.classList.contains("is-open")) closeMobileNav();
        else openMobileNav();
      });
    }

    if (backdrop) backdrop.addEventListener("click", closeMobileNav);

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
          closeMobileNav();
        }
      });
    });
  }

  function updateSectionChrome(id) {
    var subtitle = document.getElementById("contentSubtitle");
    if (subtitle) subtitle.textContent = SECTION_SUBTITLES[id] || "Software Engineer";

    var toolbar = document.querySelector(".content-toolbar");
    if (toolbar) toolbar.classList.toggle("content-toolbar--hidden", false);

    var contentScroll = document.getElementById("contentScroll");
    if (contentScroll) contentScroll.classList.toggle("is-home", id === "home");

    var skylineHint = document.querySelector(".about-skyline-hint");
    if (skylineHint) skylineHint.hidden = id !== "home";

    if (window.WelcomeAnimation) {
      if (id === "home") {
        window.WelcomeAnimation.resize();
        window.WelcomeAnimation.start();
      } else {
        window.WelcomeAnimation.stop();
      }
    }
  }

  function announceSection(id) {
    var announcer = document.getElementById("sectionAnnouncer");
    if (announcer) announcer.textContent = "Showing " + (SECTION_LABELS[id] || id) + " section";
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  function getActiveSection() {
    for (var i = 0; i < SECTIONS.length; i++) {
      var sid = SECTIONS[i];
      var el = document.getElementById("section-" + sid);
      if (el && el.classList.contains("active") && !el.hidden) return sid;
    }
    return "home";
  }

  function showSection(id, options) {
    options = options || {};
    if (!SECTIONS.includes(id)) return;

    if (!options.skipMorph && getActiveSection() === "home" && id !== "home" &&
        window.WelcomeAnimation && window.WelcomeAnimation.morphTo) {
      window.WelcomeAnimation.morphTo(id, function () {
        showSection(id, Object.assign({}, options, { skipMorph: true }));
      });
      return;
    }

    var sectionEl = document.getElementById("section-" + id);
    var navEl = document.querySelector('.nav-item[data-section="' + id + '"]');
    var alreadyShowing = sectionEl && sectionEl.classList.contains("active") && !sectionEl.hidden
      && navEl && navEl.classList.contains("active");

    if (options.initial && alreadyShowing) {
      updateSectionChrome(id);
      if (!options.skipHash && history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }
      try { localStorage.setItem(SECTION_KEY, id); } catch (e) {}
      return;
    }

    document.querySelectorAll(".content-section").forEach(function (el) {
      el.classList.remove("active", "is-animating");
      el.hidden = true;
    });
    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.remove("active");
      el.removeAttribute("aria-current");
    });

    if (sectionEl) {
      sectionEl.classList.add("active");
      sectionEl.hidden = false;
      if (!options.skipAnimate) {
        sectionEl.classList.add("is-animating");
        sectionEl.addEventListener("animationend", function onEnd() {
          sectionEl.classList.remove("is-animating");
          sectionEl.removeEventListener("animationend", onEnd);
        });
      }
    }
    if (id === "projects") showProjectList({ skipHash: true });
    if (navEl) {
      navEl.classList.add("active");
      navEl.setAttribute("aria-current", "page");
    }

    updateSectionChrome(id);
    if (!options.initial) announceSection(id);

    if (!options.skipHash && history.replaceState) {
      history.replaceState(null, "", "#" + id);
    }

    try {
      localStorage.setItem(SECTION_KEY, id);
    } catch (e) {}
  }

  function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-section");
        if (id) showSection(id);
      });
    });

    var hash = (location.hash || "").replace(/^#/, "");
    var projectFromHash = parseProjectHash(hash);
    if (projectFromHash) hash = "projects";
    var saved = null;
    try { saved = localStorage.getItem(SECTION_KEY); } catch (e) {}
    var initial = SECTIONS.includes(hash) ? hash : (SECTIONS.includes(saved) ? saved : "home");
    showSection(initial, {
      skipHash: SECTIONS.includes(hash),
      initial: true,
      skipAnimate: true,
      skipMorph: !!projectFromHash
    });
    if (projectFromHash) showProjectDetail(projectFromHash, { skipHash: true });

    window.addEventListener("hashchange", function () {
      var next = (location.hash || "").replace(/^#/, "");
      var projectId = parseProjectHash(next);
      if (projectId) {
        showSection("projects", { skipHash: true, skipMorph: true });
        showProjectDetail(projectId, { skipHash: true });
        return;
      }
      if (SECTIONS.includes(next)) showSection(next, { skipHash: true });
    });
  }

  function parseProjectHash(hash) {
    if (!hash || hash.indexOf("projects/") !== 0) return null;
    var id = hash.slice("projects/".length);
    return PROJECTS.some(function (p) { return p.id === id; }) ? id : null;
  }

  function showProjectDetail(projectId, options) {
    options = options || {};
    var project = PROJECTS.find(function (p) { return p.id === projectId; });
    if (!project) return;
    var listView = document.getElementById("projectListViewModel");
    var detailView = document.getElementById("projectDetailView");
    if (!listView || !detailView) return;

    var titleEl = document.getElementById("projectDetailTitle");
    var reasonEl = document.getElementById("projectDetailReason");
    var uiUxEl = document.getElementById("projectDetailUiUx");
    var overviewEl = document.getElementById("projectDetailOverview");
    var galleryEl = document.getElementById("projectDetailGallery");
    var techEl = document.getElementById("projectDetailTech");
    var linksEl = document.getElementById("projectDetailLinks");

    if (titleEl) titleEl.textContent = project.title;
    if (reasonEl) reasonEl.textContent = project.reason || "";
    if (uiUxEl) uiUxEl.textContent = project.uiUx || "";
    if (overviewEl) overviewEl.textContent = project.overview || "";

    if (galleryEl) {
      galleryEl.innerHTML = "";
      var images = project.images || [];
      if (images.length > 0) {
        if (project.beforeAfter && images.length >= 2) {
          // Base on origin+pathname: location.href would drag the #hash in
          var baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
          var resolveSrc = function (src) {
            if (!src) return "";
            if (/^https?:\/\//i.test(src) || /^data:/.test(src)) return src;
            return baseUrl + src.replace(/^\.\//, "");
          };
          var wrap = document.createElement("div");
          wrap.className = "project-detail-comparison";
          wrap.setAttribute("aria-label", "Before and after comparison — drag to compare");
          var beforeImg = document.createElement("img");
          beforeImg.className = "project-detail-comparison-before";
          beforeImg.src = resolveSrc(images[0].src);
          beforeImg.alt = images[0].alt || "Before";
          var afterImg = document.createElement("img");
          afterImg.className = "project-detail-comparison-after";
          afterImg.src = resolveSrc(images[1].src);
          afterImg.alt = images[1].alt || "After";
          var handle = document.createElement("div");
          handle.className = "project-detail-comparison-handle";
          handle.setAttribute("role", "slider");
          handle.setAttribute("aria-valuemin", "5");
          handle.setAttribute("aria-valuemax", "95");
          handle.setAttribute("aria-valuenow", "50");
          handle.setAttribute("aria-label", "Drag to compare before and after");
          handle.innerHTML = '<span class="project-detail-comparison-handle-grip"><span class="material-symbols-outlined">swap_horiz</span></span>';
          var labelBefore = document.createElement("span");
          labelBefore.className = "project-detail-comparison-label project-detail-comparison-label-after";
          labelBefore.textContent = "Before";
          var labelAfter = document.createElement("span");
          labelAfter.className = "project-detail-comparison-label project-detail-comparison-label-before";
          labelAfter.textContent = "After";
          wrap.appendChild(beforeImg);
          wrap.appendChild(afterImg);
          wrap.appendChild(handle);
          wrap.appendChild(labelBefore);
          wrap.appendChild(labelAfter);
          var expandBtn = document.createElement("button");
          expandBtn.type = "button";
          expandBtn.className = "project-detail-comparison-expand-btn";
          expandBtn.setAttribute("aria-label", "Expand to view full images");
          expandBtn.innerHTML = '<span class="material-symbols-outlined">open_in_full</span>';
          expandBtn.addEventListener("click", function () {
            var modal = document.getElementById("comparisonExpandModal");
            var body = document.getElementById("comparisonExpandBody");
            if (!modal || !body) return;
            body.innerHTML = "";
            var row = document.createElement("div");
            row.className = "comparison-expand-row";
            [images[0], images[1]].forEach(function (imgData, i) {
              var cell = document.createElement("div");
              cell.className = "comparison-expand-cell";
              var label = document.createElement("span");
              label.className = "comparison-expand-cell-label";
              label.textContent = i === 0 ? "Before" : "After";
              var zoomWrap = document.createElement("div");
              zoomWrap.className = "comparison-expand-zoom-wrap";
              var zoomInner = document.createElement("div");
              zoomInner.className = "comparison-expand-zoom-inner";
              var im = document.createElement("img");
              im.alt = imgData.alt || (i === 0 ? "Before" : "After");
              zoomInner.appendChild(im);
              zoomWrap.appendChild(zoomInner);
              var zoom = 1;
              var minZoom = 0.5;
              var maxZoom = 3;
              var naturalW = 0;
              var naturalH = 0;
              function setZoom(v) {
                zoom = Math.max(minZoom, Math.min(maxZoom, v));
                if (naturalW && naturalH) {
                  zoomInner.style.width = (naturalW * zoom) + "px";
                  zoomInner.style.height = (naturalH * zoom) + "px";
                }
              }
              im.addEventListener("load", function () {
                naturalW = im.naturalWidth;
                naturalH = im.naturalHeight;
                setZoom(zoom);
              });
              zoomWrap.addEventListener("wheel", function (e) {
                e.preventDefault();
                var delta = e.deltaY > 0 ? -0.08 : 0.08;
                setZoom(zoom + delta);
              }, { passive: false });
              zoomWrap.addEventListener("click", function (e) {
                e.preventDefault();
                setZoom(zoom + 0.25);
              });
              im.src = resolveSrc(imgData.src);
              cell.appendChild(label);
              cell.appendChild(zoomWrap);
              row.appendChild(cell);
            });
            body.appendChild(row);
            modal.classList.remove("hidden");
            document.getElementById("comparisonExpandClose").focus();
          });
          wrap.appendChild(expandBtn);
          galleryEl.appendChild(wrap);
          var hint = document.createElement("p");
          hint.className = "project-detail-comparison-hint";
          hint.textContent = "Drag the handle or click the image to compare before and after.";
          galleryEl.appendChild(hint);
          var pct = 50;
          function setPct(value) {
            pct = Math.max(5, Math.min(95, value));
            afterImg.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
            handle.style.left = pct + "%";
            handle.setAttribute("aria-valuenow", String(Math.round(pct)));
          }
          setPct(50);
          function onMove(e) {
            var rect = wrap.getBoundingClientRect();
            var x = e.clientX - rect.left;
            setPct((x / rect.width) * 100);
          }
          var isDragging = false;
          handle.addEventListener("mousedown", function (e) {
            e.preventDefault();
            isDragging = true;
            setPct((e.clientX - wrap.getBoundingClientRect().left) / wrap.getBoundingClientRect().width * 100);
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", function up() {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", up);
              setTimeout(function () { isDragging = false; }, 0);
            });
          });
          wrap.addEventListener("click", function (e) {
            if (isDragging) return;
            if (e.target === wrap || (wrap.contains(e.target) && !handle.contains(e.target))) {
              var rect = wrap.getBoundingClientRect();
              setPct((e.clientX - rect.left) / rect.width * 100);
            }
          });
        } else {
          var carousel = document.createElement("div");
          carousel.className = "project-detail-carousel";
          var track = document.createElement("div");
          track.className = "project-detail-track";
          images.forEach(function (imgData) {
            var slide = document.createElement("div");
            slide.className = "project-detail-slide";
            var im = document.createElement("img");
            im.src = imgData.src;
            im.alt = imgData.alt || "";
            slide.appendChild(im);
            track.appendChild(slide);
          });
          carousel.appendChild(track);
          if (images.length > 1) {
            var prevBtn = document.createElement("button");
            prevBtn.type = "button";
            prevBtn.className = "project-detail-carousel-btn project-detail-carousel-prev";
            prevBtn.setAttribute("aria-label", "Previous image");
            prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
            var nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.className = "project-detail-carousel-btn project-detail-carousel-next";
            nextBtn.setAttribute("aria-label", "Next image");
            nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
            carousel.appendChild(prevBtn);
            carousel.appendChild(nextBtn);
            var dotsWrap = document.createElement("div");
            dotsWrap.className = "project-detail-dots";
            images.forEach(function (_, i) {
              var dot = document.createElement("button");
              dot.type = "button";
              dot.className = "project-detail-dot" + (i === 0 ? " active" : "");
              dot.setAttribute("aria-label", "Go to image " + (i + 1));
              dot.dataset.index = String(i);
              dotsWrap.appendChild(dot);
            });
            galleryEl.appendChild(carousel);
            galleryEl.appendChild(dotsWrap);
            var currentIndex = 0;
            function updateCarousel() {
              track.style.transform = "translateX(-" + currentIndex * 100 + "%)";
              dotsWrap.querySelectorAll(".project-detail-dot").forEach(function (d, i) {
                d.classList.toggle("active", i === currentIndex);
              });
            }
            prevBtn.addEventListener("click", function () {
              currentIndex = (currentIndex - 1 + images.length) % images.length;
              updateCarousel();
            });
            nextBtn.addEventListener("click", function () {
              currentIndex = (currentIndex + 1) % images.length;
              updateCarousel();
            });
            dotsWrap.querySelectorAll(".project-detail-dot").forEach(function (dot) {
              dot.addEventListener("click", function () {
                currentIndex = parseInt(dot.dataset.index, 10) || 0;
                updateCarousel();
              });
            });
          } else {
            galleryEl.appendChild(carousel);
          }
        }
      }
    }

    if (techEl) {
      techEl.innerHTML = "";
      (project.tags || []).forEach(function (tag) {
        var span = document.createElement("span");
        span.className = "tech-badge";
        span.textContent = tag;
        techEl.appendChild(span);
      });
    }

    if (linksEl) {
      linksEl.innerHTML = "";
      if (project.liveUrl) {
        var liveLink = document.createElement("a");
        var theme = getTheme();
        liveLink.href = project.liveUrl + (project.liveUrl.indexOf("?") >= 0 ? "&" : "?") + "theme=" + theme;
        liveLink.target = "_blank";
        liveLink.rel = "noopener noreferrer";
        liveLink.className = "btn-panel btn-primary project-detail-link";
        liveLink.innerHTML = '<span class="material-symbols-outlined">open_in_new</span> View live';
        linksEl.appendChild(liveLink);
      }
      if (project.codeUrl) {
        var codeLink = document.createElement("a");
        codeLink.href = project.codeUrl;
        codeLink.target = "_blank";
        codeLink.rel = "noopener noreferrer";
        codeLink.className = "btn-panel project-detail-link";
        codeLink.innerHTML = '<span class="material-symbols-outlined">code</span> View code';
        linksEl.appendChild(codeLink);
      }
    }

    listView.classList.add("hidden");
    detailView.classList.remove("hidden");
    document.getElementById("projectDetailBack").focus();

    if (!options.skipHash && history.replaceState) {
      history.replaceState(null, "", "#projects/" + projectId);
    }
  }

  function showProjectList(options) {
    options = options || {};
    var listView = document.getElementById("projectListViewModel");
    var detailView = document.getElementById("projectDetailView");
    if (listView) listView.classList.remove("hidden");
    if (detailView) detailView.classList.add("hidden");
    // Only rewrite the hash when leaving a project deep link
    if (!options.skipHash && history.replaceState && /^#projects\//.test(location.hash)) {
      history.replaceState(null, "", "#projects");
    }
  }

  function setupProjectCards() {
    document.querySelectorAll(".project-card[data-project-id]").forEach(function (card) {
      var id = card.getAttribute("data-project-id");
      if (!id) return;
      function open() { showProjectDetail(id); }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });

    var backBtn = document.getElementById("projectDetailBack");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        e.preventDefault();
        showProjectList();
      });
    }
  }

  function setupKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMobileNav();
        var modal = document.getElementById("comparisonExpandModal");
        if (modal && !modal.classList.contains("hidden")) return;
      }

      if (isTypingTarget(document.activeElement)) return;

      var detailView = document.getElementById("projectDetailView");
      if (detailView && !detailView.classList.contains("hidden")) {
        if (e.key === "Escape") {
          showProjectList();
          e.preventDefault();
        }
        return;
      }
      const currentIndex = SECTIONS.indexOf(document.querySelector(".nav-item.active")?.getAttribute("data-section") || "home");
      if (e.key >= "1" && e.key <= "6") {
        const i = parseInt(e.key, 10) - 1;
        if (SECTIONS[i]) {
          showSection(SECTIONS[i]);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "<") {
        const prev = currentIndex <= 0 ? SECTIONS.length - 1 : currentIndex - 1;
        showSection(SECTIONS[prev]);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowRight" || e.key === ">") {
        const next = currentIndex >= SECTIONS.length - 1 ? 0 : currentIndex + 1;
        showSection(SECTIONS[next]);
        e.preventDefault();
      }
    });
  }

  function setupQuoteCalculator() {
    var typeSelect = document.getElementById("quote-type");
    var scopeSelect = document.getElementById("quote-scope");
    var timelineSelect = document.getElementById("quote-timeline");
    var resultEl = document.getElementById("quote-result-value");
    var emailBtn = document.getElementById("quoteEmailBtn");
    if (!typeSelect || !scopeSelect || !timelineSelect || !resultEl) return;

    function selectedLabel(sel) {
      return sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : sel.value;
    }

    function updateEmailLink() {
      if (!emailBtn) return;
      var subject = "Project inquiry — " + selectedLabel(typeSelect);
      var body = "Hi Ilir,\n\n"
        + "I used the quote tool on your portfolio:\n"
        + "- Project type: " + selectedLabel(typeSelect) + "\n"
        + "- Scope: " + selectedLabel(scopeSelect) + "\n"
        + "- Timeline: " + selectedLabel(timelineSelect) + "\n"
        + "- Indicative range shown: " + resultEl.textContent + "\n\n"
        + "About the project:\n";
      emailBtn.href = "mailto:ilirk18@gmail.com?subject=" + encodeURIComponent(subject)
        + "&body=" + encodeURIComponent(body);
    }

    var QUOTE_RANGES = {
      website: { small: [1500, 3500], medium: [3500, 8000], large: [8000, 18000] },
      webapp: { small: [4000, 9000], medium: [9000, 22000], large: [22000, 50000] },
      consulting: { small: [800, 2000], medium: [2000, 5000], large: [5000, 12000] },
      maintenance: { small: [400, 900], medium: [900, 2000], large: [2000, 4500] },
      other: { small: [2000, 5000], medium: [5000, 12000], large: [12000, 28000] }
    };
    var RUSH_MULTIPLIER = 1.25;

    function formatEur(n) {
      return "€" + Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
    }

    function updateQuote() {
      var type = typeSelect.value;
      var scope = scopeSelect.value;
      var rush = timelineSelect.value === "rush";
      var range = QUOTE_RANGES[type] && QUOTE_RANGES[type][scope];
      if (!range) {
        resultEl.textContent = "—";
        return;
      }
      var min = range[0];
      var max = range[1];
      if (rush) {
        min *= RUSH_MULTIPLIER;
        max *= RUSH_MULTIPLIER;
      }
      if (type === "consulting") {
        resultEl.textContent = formatEur(min) + " – " + formatEur(max) + " / engagement";
      } else if (type === "maintenance") {
        resultEl.textContent = formatEur(min) + " – " + formatEur(max) + " / month";
      } else {
        resultEl.textContent = formatEur(min) + " – " + formatEur(max);
      }
      updateEmailLink();
    }

    typeSelect.addEventListener("change", updateQuote);
    scopeSelect.addEventListener("change", updateQuote);
    timelineSelect.addEventListener("change", updateQuote);
    updateQuote();
  }

  function setupThemeSwitch() {
    const themeSwitch = document.getElementById("themeSwitch");
    if (!themeSwitch) return;

    function updateThemeSwitch() {
      const t = getTheme();
      const isLight = t === "light";
      themeSwitch.setAttribute("aria-checked", isLight);
      themeSwitch.setAttribute("aria-label", isLight ? "Use dark theme" : "Use light theme");
    }
    updateThemeSwitch();

    themeSwitch.addEventListener("click", function () {
      const next = getTheme() === "light" ? "dark" : "light";
      setTheme(next);
      updateThemeSwitch();
      setupHomeWebAppLinks();
      if (window.WelcomeAnimation && window.WelcomeAnimation.refresh) {
        window.WelcomeAnimation.refresh();
      }
    });
  }

  function setupHomeWebAppLinks() {
    const theme = getTheme();
    const markdown = PROJECTS.find(function (p) { return p.id === "markdown-editor"; });
    const label = PROJECTS.find(function (p) { return p.id === "label-designer"; });
    const sep = function (url) { return url.indexOf("?") >= 0 ? "&" : "?"; };
    const mdEl = document.getElementById("homeWebAppMarkdown");
    const lbEl = document.getElementById("homeWebAppLabel");
    if (markdown && markdown.liveUrl && mdEl) mdEl.href = markdown.liveUrl + sep(markdown.liveUrl) + "theme=" + theme;
    if (label && label.liveUrl && lbEl) lbEl.href = label.liveUrl + sep(label.liveUrl) + "theme=" + theme;
  }

  function setupKonamiCode() {
    var konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    var index = 0;
    document.addEventListener("keydown", function (e) {
      var key = e.key === "B" ? "b" : e.key === "A" ? "a" : e.key;
      if (key === konami[index]) {
        index++;
        if (index === konami.length) {
          index = 0;
          triggerEasterEgg();
        }
      } else {
        index = 0;
      }
    });
  }

  function triggerEasterEgg() {
    var toast = document.createElement("div");
    toast.className = "easter-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = "You found the secret! 🎉";
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("easter-toast-visible"); });
    setTimeout(function () {
      toast.classList.remove("easter-toast-visible");
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);

    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var colors = ["#0d7acc", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#1abc9c"];
      var container = document.createElement("div");
      container.className = "easter-confetti";
      container.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 50; i++) {
        var piece = document.createElement("div");
        piece.className = "easter-confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.animationDelay = Math.random() * 0.5 + "s";
        piece.style.animationDuration = (2 + Math.random() * 1.5) + "s";
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
        container.appendChild(piece);
      }
      document.body.appendChild(container);
      setTimeout(function () { container.remove(); }, 4000);
    }
  }

  function setupComparisonExpandModal() {
    var modal = document.getElementById("comparisonExpandModal");
    var closeBtn = document.getElementById("comparisonExpandClose");
    var backdrop = document.getElementById("comparisonExpandBackdrop");
    function closeExpand() {
      if (modal) modal.classList.add("hidden");
    }
    if (closeBtn) closeBtn.addEventListener("click", closeExpand);
    if (backdrop) backdrop.addEventListener("click", closeExpand);
    document.addEventListener("keydown", function (e) {
      if (!modal || modal.classList.contains("hidden")) return;
      if (e.key === "Escape") {
        closeExpand();
        e.preventDefault();
        return;
      }
      // Keep Tab cycling inside the dialog while it is open
      if (e.key === "Tab") {
        var focusables = modal.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        } else if (!modal.contains(document.activeElement)) {
          first.focus();
          e.preventDefault();
        }
      }
    });
  }

  setTheme(getTheme());
  if (window.WelcomeAnimation) {
    window.WelcomeAnimation.init();
  }
  setupPanelResizers();
  setupMobileNav();
  setupNavigation();
  setupProjectCards();
  setupHomeWebAppLinks();
  setupComparisonExpandModal();
  setupKeyboard();
  setupThemeSwitch();
  setupQuoteCalculator();
  setupKonamiCode();
})();
