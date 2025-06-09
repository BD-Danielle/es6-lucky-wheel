/**
 * @package LuckyWheel
 * @version 2.1.2
 * @description Optimized ES6 Lucky Wheel Component with resilience and visibility extensions
 * @author [YILING CHEN]
 * @license MIT
 */

// PrizeManager.js
export class PrizeManager {
  #prizes;
  #sectorAngle;

  constructor(prizes = []) {
    this.#prizes = prizes;
    this.#sectorAngle = 360 / prizes.length;
  }

  validate() {
    if (!Array.isArray(this.#prizes) || this.#prizes.length === 0) {
      throw new Error('Prizes must be a non-empty array.');
    }
  }

  getPrizeByDegree(degree) {
    const index = Math.floor((degree % 360) / this.#sectorAngle) % this.#prizes.length;
    return { prize: this.#prizes[index], index };
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

    this.#wheel.style.willChange = 'transform';
    this.#wheel.style.backfaceVisibility = 'hidden';
  }

  calculateDegree(targetIndex, sectorAngle) {
    if (typeof targetIndex === 'number') {
      const baseDegree = 360 - targetIndex * sectorAngle - sectorAngle / 2;
      return baseDegree + this.#minSpins * 360;
    }
    return (Math.random() * 360 >> 0) + this.#minSpins * 360;
  }

  spinTo(degree) {
    cancelAnimationFrame(this.#animationFrame);

    // 先重置 transition
    this.#wheel.style.transition = 'none';
    this.#wheel.style.transform = `rotate(${this.getCurrentRotation()}deg)`;

    // 強制重繪
    this.#wheel.offsetHeight;

    // 設置新的 transition 和 transform
    this.#wheel.style.transition = `transform ${this.#duration}ms ${this.#easing}`;
    this.#wheel.style.transform = `rotate(${degree}deg)`;
  }

  getCurrentRotation() {
    const transform = getComputedStyle(this.#wheel).transform;
    const matrix = new DOMMatrix(transform);
    return Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
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

    this.#prizeManager = new PrizeManager(this.#config.prizes);
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
    if (this.#state.isSpinning) return; // 防止重複觸發

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
      this.#prizeManager.sectorAngle
    );

    // 確保在設置 transition 之前移除之前的監聽器
    const oldTransitionEnd = this.#animator.wheel.ontransitionend;
    if (oldTransitionEnd) {
      this.#animator.wheel.removeEventListener('transitionend', oldTransitionEnd);
    }

    // 使用 Promise 處理動畫完成
    const animationPromise = new Promise(resolve => {
      const handleSpinEnd = () => {
        this.#boundHandlers.spinEnd(degree);
        resolve();
      };

      // 先設置 transition
      requestAnimationFrame(() => {
        this.#animator.spinTo(degree);

        // 然後添加事件監聽
        this.#animator.wheel.addEventListener('transitionend', handleSpinEnd, {
          once: true,
          passive: true
        });

        // 設置更精確的 fallback
        setTimeout(handleSpinEnd, this.#config.duration * 1.1);
      });
    });

    return animationPromise;
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

  getCurrentRotation() {
    return this.#animator.getCurrentRotation();
  }
}
