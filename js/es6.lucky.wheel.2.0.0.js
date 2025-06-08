/**
 * @package LuckyWheel
 * @version 2.0.0
 * @description ES6 Lucky Wheel Component with modular architecture
 * @author [YILING CHEN]
 * @license MIT
 */

// PrizeManager.js
export class PrizeManager {
  constructor(prizes = [], specialPrizeIndex = -1) {
    this.prizes = prizes;
    this.specialPrizeIndex = specialPrizeIndex;
    this.sectorAngle = 360 / prizes.length;
  }

  validate() {
    if (!Array.isArray(this.prizes) || this.prizes.length === 0) {
      throw new Error('Prizes must be a non-empty array.');
    }
  }

  getPrizeByDegree(degree) {
    const index = Math.floor((degree % 360) / this.sectorAngle) % this.prizes.length;
    return { prize: this.prizes[index], index };
  }

  getAllPrizes() {
    return [...this.prizes];
  }
}

// WheelAnimator.js
export class WheelAnimator {
  constructor(wheelElement, duration = 4000, easing = 'ease-out', minSpins = 3) {
    this.wheel = wheelElement;
    this.duration = duration;
    this.easing = easing;
    this.minSpins = minSpins;
  }

  calculateDegree(targetIndex, sectorAngle, totalPrizes) {
    if (typeof targetIndex === 'number') {
      const baseDegree = 360 - targetIndex * sectorAngle - sectorAngle / 2;
      return baseDegree + this.minSpins * 360;
    }
    return Math.floor(Math.random() * 360) + this.minSpins * 360;
  }

  spinTo(degree) {
    this.wheel.style.transition = `transform ${this.duration}ms ${this.easing}`;
    this.wheel.style.transform = `rotate(${degree}deg)`;
  }

  reset() {
    this.wheel.style.transition = 'none';
    this.wheel.style.transform = 'rotate(0deg)';
  }
}

// DOMController.js
export class DOMController {
  constructor(selectors, hiddenClass = 'hidden') {
    this.elements = {};
    this.hiddenClass = hiddenClass;
    for (const [key, selector] of Object.entries(selectors)) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Missing DOM element: ${selector}`);
      this.elements[key] = el;
    }
  }

  toggleVisibility(key, show = true) {
    if (show) {
      this.elements[key]?.classList.remove(this.hiddenClass);
    } else {
      this.elements[key]?.classList.add(this.hiddenClass);
    }
  }

  updatePrizeDisplay(prize) {
    this.elements.prizeName.textContent = prize.name;
    this.elements.prizeImage.src = prize.image;
    this.elements.prizeText.style.display = prize.hideText ? 'none' : '';
    this.elements.prizeText.innerHTML = prize.text || '';
  }

  clearPrizeDisplay() {
    this.elements.prizeName.textContent = '';
    this.elements.prizeImage.src = '';
    this.elements.prizeText.innerHTML = '';
  }
}

// LuckyWheel.js
// import { PrizeManager } from './PrizeManager.js';
// import { WheelAnimator } from './WheelAnimator.js';
// import { DOMController } from './DOMController.js';

export class LuckyWheel {
  constructor(config = {}) {
    const {
      wheelSelector = '#tunableImg',
      pointerSelector = '#arrowImg',
      resultContainer = '#common_pop',
      prizeNameSelector = '#prizeName',
      prizeImageSelector = '#popup_img',
      prizeTextSelector = '#prizeTxt',
      hiddenClass = 'hidden',
      disabledClass = 'disabled',
      pointerAnimationClass = 'boxJumpAnimatePaused',
      duration = 4000,
      easing = 'ease-out',
      minSpins = 3,
      autoResetDelay = 5000,
      prizes = [],
      specialPrizeIndex = -1,
      onStart = () => { },
      onEnd = () => { },
      onReset = () => { },
    } = Object.freeze(config);

    this.config = Object.freeze({ disabledClass, pointerAnimationClass, autoResetDelay });
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.onReset = onReset;

    this.pointer = document.querySelector(pointerSelector);
    if (!this.pointer) throw new Error(`Missing pointer element: ${pointerSelector}`);

    this.animator = new WheelAnimator(document.querySelector(wheelSelector), duration, easing, minSpins);
    this.dom = new DOMController({
      prizeName: prizeNameSelector,
      prizeImage: prizeImageSelector,
      prizeText: prizeTextSelector,
      resultContainer,
    }, hiddenClass);
    this.prizeManager = new PrizeManager(prizes, specialPrizeIndex);
    this.prizeManager.validate();

    this.state = { isSpinning: false, currentPrize: null };
    this.resetTimer = null;

    this.handlePointerClick = this.handlePointerClick.bind(this);
    this.handleSpinEnd = this.handleSpinEnd.bind(this);

    this.init();
  }

  init() {
    this.pointer.addEventListener('click', this.handlePointerClick);
  }

  handlePointerClick() {
    if (!this.state.isSpinning) this.spin();
  }

  spin(targetIndex) {
    this.state.isSpinning = true;
    try { this.onStart?.(); } catch (err) { console.warn('onStart error:', err); }
    this.pointer.classList.remove(this.config.pointerAnimationClass);
    this.pointer.classList.add(this.config.disabledClass);

    const degree = this.animator.calculateDegree(targetIndex, this.prizeManager.sectorAngle, this.prizeManager.prizes.length);
    this.animator.spinTo(degree);

    this.state.elements = this.state.elements || {};
    const wheel = this.animator.wheel;
    wheel.addEventListener('transitionend', () => this.handleSpinEnd(degree), { once: true });
  }

  handleSpinEnd(degree) {
    const { prize, index } = this.prizeManager.getPrizeByDegree(degree);
    this.state.currentPrize = prize;
    this.dom.updatePrizeDisplay(prize);
    this.dom.toggleVisibility('resultContainer', true);
    try { this.onEnd?.(prize, index); } catch (err) { console.warn('onEnd error:', err); }
    this.resetTimer = setTimeout(() => this.reset(), this.config.autoResetDelay);
  }

  reset() {
    clearTimeout(this.resetTimer);
    this.animator.reset();
    this.pointer.classList.remove(this.config.disabledClass);
    this.state.isSpinning = false;
    this.dom.toggleVisibility('resultContainer', false);
    this.dom.clearPrizeDisplay();
    try { this.onReset?.(); } catch (err) { console.warn('onReset error:', err); }
  }

  destroy() {
    this.pointer.removeEventListener('click', this.handlePointerClick);
    clearTimeout(this.resetTimer);
    this.reset();
  }
}

