// 현재 카운트 값 (초기값 0)
let count = 0;

// 화면 요소 가져오기
const countEl = document.getElementById("count");
const increaseBtn = document.getElementById("increase");
const decreaseBtn = document.getElementById("decrease");
const resetBtn = document.getElementById("reset");

// 현재 값을 화면에 표시하는 함수
function render() {
  countEl.textContent = count;

  // 양수면 초록색, 음수면 빨간색 클래스를 붙이고, 0이면 둘 다 떼서 기본색으로
  countEl.classList.toggle("positive", count > 0);
  countEl.classList.toggle("negative", count < 0);
}

// + 버튼: 1 증가
increaseBtn.addEventListener("click", function () {
  count = count + 1;
  render();
});

// − 버튼: 1 감소
decreaseBtn.addEventListener("click", function () {
  count = count - 1;
  render();
});

// 리셋 버튼: 0으로 초기화
resetBtn.addEventListener("click", function () {
  count = 0;
  render();
});

// 처음 한 번 화면에 표시
render();
