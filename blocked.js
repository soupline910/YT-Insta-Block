import { formatRemaining, getCountdownState } from "./countdown.js";

const countdownLabel = document.querySelector("#countdown-label");
const countdownTime = document.querySelector("#countdown-time");
const countdownMessage = document.querySelector("#countdown-message");

function renderCountdown() {
  const state = getCountdownState();

  countdownLabel.textContent = state.ddayLabel ?? "";
  countdownTime.textContent = state.remaining ? formatRemaining(state.remaining) : "";
  countdownMessage.textContent = state.message;
}

renderCountdown();
setInterval(renderCountdown, 1000);
