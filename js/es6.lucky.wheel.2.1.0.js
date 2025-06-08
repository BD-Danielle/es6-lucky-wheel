/**
 * @package LuckyWheel
 * @version 2.1.0
 * @description Optimized ES6 Lucky Wheel Component
 * @author [YILING CHEN]
 * @license MIT
 */

// PrizeManager.js
export class PrizeManager {
  #prizes;
  #prizeMap;
  #sectorAngle;
  #specialPrizeIndex;

  constructor(prizes = [], specialPrizeIndex = -1) {
    this.#prizes = prizes;
    this.#specialPrizeIndex = specialPrizeIndex;
    this.#sectorAngle = 360 / prizes.length;
    // 預建立獎品查找表提升效能
    this.#prizeMap = new Map(prizes.map((prize, index) => [index, prize]));
  }

  validate() {
    if (!Array.isArray(this.#prizes) || this.#prizes.length === 0) {
      throw new Error('Prizes must be a non-empty array.');
    }
  }

  getPrizeByDegree(degree) {
    const index = Math.floor((degree % 360) / this.#sectorAngle) % this.#prizes.length;
    return { prize: this.#prizeMap.get(index), index };
  }

  get sectorAngle() {
    return this.#sectorAngle;
  }

  get prizes() {
    return this.#prizes;
  }
}

// WheelAnimator.js
export class WheelAnimator {
  #wheel;
  #duration;
  #easing;
  #minSpins;
  #animationFrame;

  constructor(wheelElement, duration = 4000, easing = 'ease-out', minSpins = 3) {
    this.#wheel = wheelElement;
    this.#duration = duration;
    this.#easing = easing;
    this.#minSpins = minSpins;

    // 優化動畫性能
    this.#wheel.style.willChange = 'transform';
    this.#wheel.style.backfaceVisibility = 'hidden';
  }

  calculateDegree(targetIndex, sectorAngle, totalPrizes) {
    if (typeof targetIndex === 'number') {
      const baseDegree = 360 - targetIndex * sectorAngle - sectorAngle / 2;
      return baseDegree + this.#minSpins * 360;
    }
    return (Math.random() * 360 >> 0) + this.#minSpins * 360;
  }

  spinTo(degree) {
    cancelAnimationFrame(this.#animationFrame);

    const start = performance.now();
    const startRotation = this.#getCurrentRotation();

    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / this.#duration, 1);

      this.#wheel.style.transform =
        `rotate(${startRotation + (degree * progress)}deg)`;

      if (progress < 1) {
        this.#animationFrame = requestAnimationFrame(animate);
      }
    };

    this.#animationFrame = requestAnimationFrame(animate);
  }

  #getCurrentRotation() {
    const transform = getComputedStyle(this.#wheel).transform;
    const matrix = new DOMMatrix(transform);
    return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
  }

  reset() {
    cancelAnimationFrame(this.#animationFrame);
    this.#wheel.style.transition = 'none';
    this.#wheel.style.transform = 'rotate(0deg)';
  }

  get wheel() {
    return this.#wheel;
  }
}

// DOMController.js
export class DOMController {
  #elements = new Map();
  #hiddenClass;
  #handlers = new WeakMap();

  constructor(selectors, hiddenClass = 'hidden') {
    this.#hiddenClass = hiddenClass;

    for (const [key, selector] of Object.entries(selectors)) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Missing DOM element: ${selector}`);
      this.#elements.set(key, el);
    }
  }

  toggleVisibility(key, show = true) {
    const element = this.#elements.get(key);
    if (!element) return;

    element.classList.toggle(this.#hiddenClass, !show);
  }

  updatePrizeDisplay(prize) {
    const name = this.#elements.get('prizeName');
    const image = this.#elements.get('prizeImage');
    const text = this.#elements.get('prizeText');

    if (name) name.textContent = prize.name;
    if (image) image.src = prize.image;
    if (text) {
      text.style.display = prize.hideText ? 'none' : '';
      text.innerHTML = prize.text || '';
    }
  }

  clearPrizeDisplay() {
    const name = this.#elements.get('prizeName');
    const image = this.#elements.get('prizeImage');
    const text = this.#elements.get('prizeText');

    if (name) name.textContent = '';
    if (image) image.src = '';
    if (text) text.innerHTML = '';
  }
}

// LuckyWheel.js
export class LuckyWheel {
  static #defaultConfig = {
    wheelSelector: '#tunableImg',
    pointerSelector: '#arrowImg',
    resultContainer: '#common_pop',
    prizeNameSelector: '#prizeName',
    prizeImageSelector: '#popup_img',
    prizeTextSelector: '#prizeTxt',
    hiddenClass: 'hidden',
    disabledClass: 'disabled',
    pointerAnimationClass: 'boxJumpAnimatePaused',
    duration: 4000,
    easing: 'ease-out',
    minSpins: 3,
    autoResetDelay: 5000,
    prizes: [],
    specialPrizeIndex: -1,
    onStart: () => { },
    onEnd: () => { },
    onReset: () => { },
  };

  #config;
  #pointer;
  #animator;
  #dom;
  #prizeManager;
  #state;
  #resetTimer;
  #boundHandlers;

  constructor(config = {}) {
    this.#config = Object.freeze({ ...LuckyWheel.#defaultConfig, ...config });
    this.#initComponents();
    this.#bindHandlers();
    this.#init();
  }

  #initComponents() {
    this.#pointer = document.querySelector(this.#config.pointerSelector);
    if (!this.#pointer) throw new Error(`Missing pointer: ${this.#config.pointerSelector}`);

    this.#animator = new WheelAnimator(
      document.querySelector(this.#config.wheelSelector),
      this.#config.duration,
      this.#config.easing,
      this.#config.minSpins
    );

    this.#dom = new DOMController({
      prizeName: this.#config.prizeNameSelector,
      prizeImage: this.#config.prizeImageSelector,
      prizeText: this.#config.prizeTextSelector,
      resultContainer: this.#config.resultContainer,
    }, this.#config.hiddenClass);

    this.#prizeManager = new PrizeManager(this.#config.prizes, this.#config.specialPrizeIndex);
    this.#prizeManager.validate();

    this.#state = { isSpinning: false, currentPrize: null };
  }

  #bindHandlers() {
    this.#boundHandlers = {
      pointerClick: this.#handlePointerClick.bind(this),
      spinEnd: this.#handleSpinEnd.bind(this)
    };
  }

  #init() {
    this.#pointer.addEventListener('click', this.#boundHandlers.pointerClick, { passive: true });
  }

  #handlePointerClick() {
    if (!this.#state.isSpinning) this.spin();
  }

  spin(targetIndex) {
    this.#state.isSpinning = true;
    try {
      this.#config.onStart?.();
    } catch (err) {
      console.warn('onStart error:', err);
    }

    this.#pointer.classList.remove(this.#config.pointerAnimationClass);
    this.#pointer.classList.add(this.#config.disabledClass);

    const degree = this.#animator.calculateDegree(
      targetIndex,
      this.#prizeManager.sectorAngle,
      this.#prizeManager.prizes.length
    );

    this.#animator.spinTo(degree);
    this.#animator.wheel.addEventListener(
      'transitionend',
      () => this.#boundHandlers.spinEnd(degree),
      { once: true, passive: true }
    );
  }

  #handleSpinEnd(degree) {
    const { prize, index } = this.#prizeManager.getPrizeByDegree(degree);
    this.#state.currentPrize = prize;

    this.#dom.updatePrizeDisplay(prize);
    this.#dom.toggleVisibility('resultContainer', true);

    try {
      this.#config.onEnd?.(prize, index);
    } catch (err) {
      console.warn('onEnd error:', err);
    }

    this.#resetTimer = setTimeout(
      () => this.reset(),
      this.#config.autoResetDelay
    );
  }

  reset() {
    clearTimeout(this.#resetTimer);
    this.#animator.reset();
    this.#pointer.classList.remove(this.#config.disabledClass);
    this.#state.isSpinning = false;
    this.#dom.toggleVisibility('resultContainer', false);
    this.#dom.clearPrizeDisplay();

    try {
      this.#config.onReset?.();
    } catch (err) {
      console.warn('onReset error:', err);
    }
  }

  destroy() {
    this.#pointer.removeEventListener('click', this.#boundHandlers.pointerClick);
    clearTimeout(this.#resetTimer);
    this.reset();
    this.#boundHandlers = null;
  }
}