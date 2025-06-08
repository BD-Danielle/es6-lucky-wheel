/**
 * 默認配置選項
 * 提取為獨立常量，方便其他專案引用和覆蓋
 */
export const DEFAULT_WHEEL_CONFIG = {
  // 核心元素選擇器
  container: '#lottery-container',
  wheelSelector: '#tunableImg',
  pointerSelector: '#arrowImg',
  resultContainer: '#common_pop',
  prizeNameSelector: '#prizeName',
  prizeImageSelector: '#popup_img',
  prizeTextSelector: '#prizeTxt',
  
  // 動畫相關
  duration: 4000,
  easing: 'ease-out',
  minSpins: 3,
  autoResetDelay: 5000,
  
  // 類名和狀態
  hiddenClass: 'hidden',
  disabledClass: 'disabled',
  pointerAnimationClass: 'boxJumpAnimatePaused',
  
  // 獎品配置
  prizes: [
    { name: 'Green Agate | Raw Crystal', image: 'images/pop_img/01_pop.jpg', text: '' },
    { name: 'Fortune Gold $100', image: 'images/pop_img/03_pop.jpg', text: 'Expires: <span>2025-03-20</span>' },
    { name: '30-Day Divine Offering', image: 'images/pop_img/04_pop.jpg', text: 'Expires: <span>2025-03-20</span>' },
    { name: 'Instant Voucher', image: 'images/pop_award/04_pop.jpg', text: '' },
    { name: 'Thanks for Playing', image: 'images/pop_img/00_pop.jpg', text: '', hideText: true },
    { name: 'Fortune Gold $50', image: 'images/pop_img/05_pop.jpg', text: 'Expires: <span>2025-03-20</span>' },
    { name: 'Zi Wei Career Luck', image: 'images/pop_img/02_pop.jpg', text: 'Expires: <span>2025-03-20</span>' },
  ],
  
  // 特殊獎品處理
  specialPrizeIndex: 2,
  
  // 回調函數
  onStart: () => console.log('Wheel started spinning'),
  onEnd: (prize, index) => console.log(`Congratulations! You won: ${prize.name}`),
  onReset: () => console.log('Wheel reset'),
};

/**
 * A flexible and robust Lucky Wheel component for lottery or prize draws.
 * @class
 * @param {Object} options - Configuration options for the wheel
 */
class LuckyWheel {
  constructor(options = {}) {
    // 合併配置，使用提取出來的默認配置
    this.settings = this.extend({}, DEFAULT_WHEEL_CONFIG, options);

    // Validate settings
    this.validateSettings();

    // Internal state
    this.state = {
      isSpinning: false,
      currentPrize: null,
      elements: {},
      sectorAngle: 0,
    };

    // Initialize
    this.initialized = this.init();
  }

  /**
   * Validates configuration settings to ensure robustness
   * @private
   */
  validateSettings() {
    if (!Array.isArray(this.settings.prizes) || this.settings.prizes.length === 0) {
      throw new Error('Prizes must be a non-empty array.');
    }
    if (!Number.isInteger(this.settings.duration) || this.settings.duration <= 0) {
      this.settings.duration = 4000; // Fallback to default
      console.warn('Invalid duration; using default value of 4000ms.');
    }
    if (!Number.isInteger(this.settings.minSpins) || this.settings.minSpins < 1) {
      this.settings.minSpins = 3; // Fallback
      console.warn('Invalid minSpins; using default value of 3.');
    }
  }

  /**
   * Initializes the wheel by setting up DOM elements and event listeners
   * @private
   * @returns {boolean} - Whether initialization was successful
   */
  init() {
    try {
      this.state.elements = {
        wheel: document.querySelector(this.settings.wheelSelector),
        pointer: document.querySelector(this.settings.pointerSelector),
        prizeName: document.querySelector(this.settings.prizeNameSelector),
        prizeImage: document.querySelector(this.settings.prizeImageSelector),
        prizeText: document.querySelector(this.settings.prizeTextSelector),
        resultContainer: document.querySelector(this.settings.resultContainer),
      };

      const { wheel, pointer } = this.state.elements;
      if (!wheel || !pointer) {
        throw new Error('Required DOM elements (wheel or pointer) not found.');
      }

      // Calculate sector angle
      this.state.sectorAngle = 360 / this.settings.prizes.length;

      // Bind event listener
      this.handlePointerClick = this.handlePointerClick.bind(this);
      pointer.addEventListener('click', this.handlePointerClick);

      return true;
    } catch (error) {
      console.error(`LuckyWheel initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handles pointer click to start spinning
   * @private
   */
  handlePointerClick() {
    if (!this.state.isSpinning) {
      this.spin();
    }
  }

  /**
   * Starts spinning the wheel
   * @param {number} [targetIndex] - Optional index of the target prize
   */
  spin(targetIndex) {
    if (!this.initialized || this.state.isSpinning) return;

    this.state.isSpinning = true;
    this.settings.onStart();

    const { wheel, pointer } = this.state.elements;
    pointer.classList.remove(this.settings.pointerAnimationClass);
    pointer.classList.add(this.settings.disabledClass); // Disable pointer during spin

    wheel.style.transition = `transform ${this.settings.duration}ms ${this.settings.easing}`;
    const randomDegree = this.calculateSpinDegree(targetIndex);
    wheel.style.transform = `rotate(${randomDegree}deg)`;

    wheel.addEventListener(
      'transitionend',
      () => this.showResult(randomDegree),
      { once: true }
    );
  }

  /**
   * Calculates the degree for spinning
   * @private
   * @param {number} [targetIndex] - Optional target prize index
   * @returns {number} - Calculated degree
   */
  calculateSpinDegree(targetIndex) {
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < this.settings.prizes.length) {
      const targetDegree = 360 - targetIndex * this.state.sectorAngle - this.state.sectorAngle / 2;
      return targetDegree + this.settings.minSpins * 360;
    }
    return Math.floor(Math.random() * 360) + this.settings.minSpins * 360;
  }

  /**
   * Displays the result after spinning
   * @private
   * @param {number} degree - Final degree of rotation
   */
  showResult(degree) {
    const prizeIndex = Math.floor((degree % 360) / this.state.sectorAngle) % this.settings.prizes.length;
    const prize = this.settings.prizes[prizeIndex];
    this.state.currentPrize = prize;

    const { prizeName, prizeImage, prizeText, resultContainer } = this.state.elements;
    prizeName.textContent = prize.name;
    prizeImage.src = prize.image;
    prizeText.style.display = prize.hideText ? 'none' : '';
    prizeText.innerHTML = prize.text || '';

    this.showElement(resultContainer);
    const awardResults = resultContainer.querySelectorAll('.award_result');
    if (prizeIndex === this.settings.specialPrizeIndex && awardResults.length > 1) {
      this.showElement(awardResults[1]);
    } else if (awardResults.length > 0) {
      this.showElement(awardResults[0]);
    }

    this.settings.onEnd(prize, prizeIndex);

    setTimeout(() => this.reset(), this.settings.autoResetDelay);
  }

  /**
   * Resets the wheel to its initial state
   */
  reset() {
    if (!this.initialized) return;

    const { wheel, pointer, resultContainer, prizeName, prizeImage, prizeText } = this.state.elements;
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    pointer.classList.remove(this.settings.disabledClass);
    this.state.isSpinning = false;

    this.hideElement(resultContainer);
    prizeName.textContent = '';
    prizeImage.src = '';
    prizeText.innerHTML = '';

    const awardResults = resultContainer.querySelectorAll('.award_result');
    awardResults.forEach((result) => this.hideElement(result));

    this.settings.onReset();
  }

  /**
   * Shows an element by removing the hidden class
   * @private
   * @param {HTMLElement} element - DOM element to show
   */
  showElement(element) {
    element?.classList.remove(this.settings.hiddenClass);
  }

  /**
   * Hides an element by adding the hidden class
   * @private
   * @param {HTMLElement} element - DOM element to hide
   */
  hideElement(element) {
    element?.classList.add(this.settings.hiddenClass);
  }

  /**
   * Deep extends target object with source objects
   * @private
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object} - Merged object
   */
  extend(target, ...sources) {
    target = target || {};
    for (const source of sources) {
      if (!source) continue;
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            target[key] = this.extend(target[key] || {}, source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  }

  /**
   * Gets the current prize
   * @returns {Object|null} - Current prize object
   */
  getCurrentPrize() {
    return this.state.currentPrize;
  }

  /**
   * Gets all prizes
   * @returns {Array} - Copy of the prizes array
   */
  getPrizes() {
    return [...this.settings.prizes];
  }

  /**
   * Cleans up event listeners and resources
   */
  destroy() {
    if (this.initialized) {
      this.state.elements.pointer.removeEventListener('click', this.handlePointerClick);
      this.reset();
    }
  }
}

// Example usage
window.addEventListener('load', () => {
  const wheel = new LuckyWheel({
    duration: 5000,
    autoResetDelay: 3000, // Custom reset delay
  });

  // Clean up on page unload (optional)
  window.addEventListener('pagehide', () => wheel.destroy());

  // Alternatively, you can use visibilitychange event
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      wheel.destroy();
    }
  });
});

export default LuckyWheel; // For ES6 module compatibility