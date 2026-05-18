(() => {
  "use strict";

  // Helpers (если у тебя их нет глобально)
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const createScrollLock = (lenis) => {
    const locks = new Set();

    const apply = () => {
      if (locks.size) {
        document.body.classList.add("no-scroll");
        lenis?.stop?.();
      } else {
        document.body.classList.remove("no-scroll");
        lenis?.start?.();
      }
    };

    return {
      lock: (key) => {
        if (!key) return;
        locks.add(key);
        apply();
      },
      unlock: (key) => {
        if (!key) return;
        locks.delete(key);
        apply();
      },
      reset: () => {
        locks.clear();
        apply();
      },
      has: (key) => locks.has(key),
    };
  };

  const state = {
    multiplier: 1,
    swipers: {},
  };

  // ======================
  // Lenis
  // ======================
  const initLenis = () => {
    if (typeof Lenis === "undefined") return null;
    const lenis = new Lenis({ autoRaf: true });
    window.lenis = lenis;
    return lenis;
  };

  // ======================
  // Multiplier / s()
  // ======================

  const getWidthMultiplier = () => {
    const w = window.innerWidth;
    const minSide = Math.min(window.innerWidth, window.innerHeight);

    if (w <= 767) return minSide / 375;
    if (w <= 1024) return minSide / 768;
    return window.innerWidth / 1920;
  };

  const updateMultiplier = () => {
    state.multiplier = getWidthMultiplier();
  };

  const s = (value) => value * state.multiplier;

  // ======================
  // Phone mask
  // ======================
  const initPhoneMask = () => {
    const inputs = $$('input[type="tel"]');
    if (!inputs.length) return;

    const matrix = "+7 (___) ___ ____";

    const mask = function (event) {
      const keyCode = event.keyCode || event.which;
      const pos = this.selectionStart ?? this.value.length;

      if (pos < 3 && event.type === "keydown") event.preventDefault();

      const def = matrix.replace(/\D/g, "");
      const val = this.value.replace(/\D/g, "");

      let i = 0;
      let newValue = matrix.replace(/[_\d]/g, (a) =>
        i < val.length ? val.charAt(i++) || def.charAt(i) : a
      );

      i = newValue.indexOf("_");
      if (i !== -1) {
        if (i < 5) i = 3;
        newValue = newValue.slice(0, i);
      }

      let reg = matrix
        .substring(0, this.value.length)
        .replace(/_+/g, (a) => `\\d{1,${a.length}}`)
        .replace(/[+()]/g, "\\$&");

      reg = new RegExp(`^${reg}$`);

      if (!reg.test(this.value) || this.value.length < 5 || (keyCode > 47 && keyCode < 58)) {
        this.value = newValue;
      }

      if (event.type === "blur" && this.value.length < 5) this.value = "";
    };

    inputs.forEach((input) => {
      input.addEventListener("input", mask, false);
      input.addEventListener("focus", mask, false);
      input.addEventListener("blur", mask, false);
      input.addEventListener("keydown", mask, false);
    });
  };

  // ======================
  // Modals
  // ======================
  const initModals = ({ scrollLock }) => {
    const wrapper = $(".modals");
    if (!wrapper) return;

    const modals = $$(".modal", wrapper);
    const getModalByType = (type) => wrapper.querySelector(`.modal[data-type="${type}"]`);

    const showWrapper = () => {
      wrapper.style.opacity = 1;
      wrapper.style.pointerEvents = "all";
      scrollLock?.lock?.("modal");
    };

    const hideWrapper = () => {
      wrapper.style.opacity = 0;
      wrapper.style.pointerEvents = "none";
      scrollLock?.unlock?.("modal");
    };

    const openModal = (type) => {
      modals.forEach((m) => {
        m.style.display = "none";
        m.style.removeProperty("transform");
      });

      const modal = getModalByType(type);
      if (!modal) return;

      modal.style.display = "block";
      showWrapper();

      if (window.gsap) {
        window.gsap.fromTo(modal, { y: -100 }, { y: 0, duration: 0.5, ease: "power3.out" });
      }
    };

    const closeCurrentModal = () => {
      const current = modals.find((m) => getComputedStyle(m).display !== "none");

      const finish = () => {
        if (current) current.style.display = "none";
        hideWrapper();
      };

      if (current && window.gsap) {
        window.gsap.to(current, {
          y: -100,
          duration: 0.4,
          ease: "power3.in",
          onComplete: () => {
            current.style.removeProperty("transform");
            finish();
          },
        });
      } else {
        finish();
      }
    };

    $$(".modal-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const type = btn.dataset.type;
        if (!type) return;
        openModal(type);
      });
    });

    wrapper.addEventListener("click", (e) => {
      if (e.target === wrapper || e.target.closest(".modal__close")) closeCurrentModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrapper.style.pointerEvents === "all") closeCurrentModal();
    });

    // Form submissions → show thanks modal
    $$("form[novalidate]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        let valid = true;
        $$("[required]", form).forEach((field) => {
          const empty =
            field.type === "checkbox" ? !field.checked : !field.value.trim();
          if (empty) valid = false;
        });

        if (!valid) return;

        form.reset();
        openModal("thanks");
      });
    });
  };

  // ======================
  // Header on scroll
  // ======================
  const initHeader = () => {
    const header = $(".header");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  // ======================
  // Services stack on scroll
  // ======================
  const initServices = () => {
    if (!window.gsap || !window.ScrollTrigger) return;

    const sections = $$(".services");
    if (!sections.length) return;

    const { gsap, ScrollTrigger } = window;
    const parsePx = (value) => Number.parseFloat(value) || 0;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const cleanups = sections
        .map((section) => {
          const list = $(".services__list", section);
          if (!list) return null;

          const items = $$(".services__item", list);
          if (items.length < 2) return null;

          let metrics = {
            items: [],
            spread: 0,
          };

          const readMetrics = () => {
            const baseTop = items[0].offsetTop;
            let stackedTop = 0;

            const stackItems = items.map((item, index) => {
              const title = $(".services__name", item);
              const itemStyles = window.getComputedStyle(item);
              const titleHeight = title?.offsetHeight || 0;
              const naturalTop = item.offsetTop - baseTop;
              const basePeekHeight = Math.max(
                Math.min(
                  titleHeight +
                    parsePx(itemStyles.paddingTop) +
                    parsePx(itemStyles.paddingBottom) +
                    s(12),
                  s(124)
                ),
                s(72)
              );
              const tailStartIndex = Math.max(items.length - 4, 0);
              const tailStep = index - tailStartIndex;
              const tailBoost =
                index >= tailStartIndex && index < items.length - 1
                  ? [s(0), s(18), s(34)][tailStep] ?? s(34)
                  : 0;
              const peekHeight = Math.min(basePeekHeight + tailBoost, s(168));
              const y = stackedTop - naturalTop;

              if (index < items.length - 1) {
                stackedTop += peekHeight;
              }

              return { y };
            });

            return {
              items: stackItems,
              spread: Math.max(...stackItems.map(({ y }) => Math.abs(y))),
            };
          };

          const syncMetrics = () => {
            metrics = readMetrics();
            return metrics;
          };

          const applyStack = (shift = 0) => {
            metrics.items.forEach(({ y }, index) => {
              const currentY = y < 0 ? Math.min(0, y + shift*1.1) : 0;
              gsap.set(items[index], { y: currentY });
            });
          };

          const getShift = (progress = 0) => {
            const easedProgress = Math.pow(progress, 1);
            return metrics.spread * easedProgress;
          };

          syncMetrics();
          applyStack();

          items.forEach((item, index) => {
            item.style.zIndex = String(items.length + index);
          });

          const trigger = ScrollTrigger.create({
            trigger: list,
            start: "top 90%",
            end: () => `+=${Math.max(list.offsetHeight, metrics.spread * 1.2)}`,
            invalidateOnRefresh: true,
            onRefreshInit: () => {
              syncMetrics();
              applyStack();
            },
            onRefresh: (self) => {
              syncMetrics();
              applyStack(getShift(self.progress));
            },
            onUpdate: (self) => {
              applyStack(getShift(self.progress));
            },
          });

          return () => {
            trigger.kill();
            items.forEach((item) => {
              item.style.removeProperty("z-index");
              item.style.removeProperty("transform");
            });
          };
        })
        .filter(Boolean);

      return () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    });

    window.addEventListener(
      "load",
      () => {
        ScrollTrigger.refresh();
      },
      { once: true }
    );
  };

  // ======================
  // FAQ accordion
  // ======================
  const initFaq = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".faq__btn");
      if (!btn) return;

      const item = btn.closest(".faq__item");
      const isOpen = item.classList.contains("is-open");

      // Close all open items
      $$(".faq__item.is-open").forEach((el) => {
        el.classList.remove("is-open");
        gsap.to(el.querySelector(".faq__answer"), {
          height: 0,
          duration: 0.35,
          ease: "power2.inOut",
          overwrite: true,
        });
      });

      // Open clicked item if it was closed
      if (!isOpen) {
        item.classList.add("is-open");
        gsap.to(item.querySelector(".faq__answer"), {
          height: "auto",
          duration: 0.35,
          ease: "power2.inOut",
          overwrite: true,
        });
      }
    });
  };

  // ======================
  // Boot
  // ======================
  document.addEventListener("DOMContentLoaded", () => {
    const lenis = initLenis();
    updateMultiplier();

    const scrollLock =
      typeof createScrollLock === "function" ? createScrollLock(lenis) : null;

    initPhoneMask();
    initModals({ scrollLock });
    initFaq();
    initHeader();
    initServices();

    window.addEventListener("resize", () => {
      updateMultiplier();
    });
  });
})();
