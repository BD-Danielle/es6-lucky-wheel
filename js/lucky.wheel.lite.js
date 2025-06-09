/**
 * LuckyWheelLite - 最簡化抽獎轉盤
 * 適用場景：一次性抽獎活動、無需模組封裝、固定樣式與獎項數量
 * 無模組依賴、不使用 class，不支援可擴展 hook、特殊邏輯等
 */

export function initLuckyWheelLite({
  wheelSelector = '#tunableImg',
  pointerSelector = '#arrowImg',
  prizeNameSelector = '#prizeName',
  prizeImageSelector = '#popup_img',
  prizeTextSelector = '#prizeTxt',
  resultContainer = '#common_pop',
  hiddenClass = 'hidden',
  disabledClass = 'disabled',
  pointerAnimationClass = 'boxJumpAnimatePaused',
  duration = 4000,
  easing = 'ease-out',
  minSpins = 3,
  autoResetDelay = 5000,
  prizes = [],
}) {
  if (!Array.isArray(prizes) || prizes.length === 0) throw new Error('Invalid prize list.');

  const wheel = document.querySelector(wheelSelector);
  const pointer = document.querySelector(pointerSelector);
  const prizeName = document.querySelector(prizeNameSelector);
  const prizeImage = document.querySelector(prizeImageSelector);
  const prizeText = document.querySelector(prizeTextSelector);
  const result = document.querySelector(resultContainer);

  const sectorAngle = 360 / prizes.length;
  let isSpinning = false;

  function calculateDegree(index) {
    const base = 360 - index * sectorAngle - sectorAngle / 2;
    return base + minSpins * 360;
  }

  function spin(targetIndex) {
    if (isSpinning) return;
    isSpinning = true;

    pointer.classList.remove(pointerAnimationClass);
    pointer.classList.add(disabledClass);

    const degree = typeof targetIndex === 'number'
      ? calculateDegree(targetIndex)
      : Math.floor(Math.random() * 360) + minSpins * 360;

    // 強制重繪動畫起始點
    wheel.style.transition = 'none';
    const currentDeg = getCurrentRotation();
    wheel.style.transform = `rotate(${currentDeg}deg)`;
    wheel.offsetHeight;

    // 設定動畫
    wheel.style.transition = `transform ${duration}ms ${easing}`;
    wheel.style.transform = `rotate(${degree}deg)`;

    // 完成後顯示結果
    wheel.addEventListener('transitionend', () => showResult(degree), { once: true });
    setTimeout(() => showResult(degree), duration * 1.1);
  }

  function getCurrentRotation() {
    const transform = getComputedStyle(wheel).transform;
    if (transform === 'none') return 0;
    const matrix = new DOMMatrix(transform);
    return Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
  }

  function showResult(degree) {
    const index = Math.floor((degree % 360) / sectorAngle) % prizes.length;
    const prize = prizes[index];

    prizeName.textContent = prize.name;
    prizeImage.src = prize.image;
    prizeText.innerHTML = prize.hideText ? '' : prize.text || '';
    prizeText.style.display = prize.hideText ? 'none' : '';
    result.classList.remove(hiddenClass);

    setTimeout(reset, autoResetDelay);
  }

  function reset() {
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    pointer.classList.remove(disabledClass);
    result.classList.add(hiddenClass);
    prizeName.textContent = '';
    prizeImage.src = '';
    prizeText.innerHTML = '';
    isSpinning = false;
  }

  pointer.addEventListener('click', () => spin());
}

// ✅ Example usage:
// initLuckyWheelLite({ prizes: [...] });
