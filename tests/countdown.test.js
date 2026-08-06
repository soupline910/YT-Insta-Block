import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test, { before } from 'node:test';

const countdownModuleUrl = new URL('../countdown.js', import.meta.url);
let countdownModule;

before(async () => {
  assert.equal(
    existsSync(countdownModuleUrl),
    true,
    'countdown.js must exist before countdown behavior can be tested'
  );

  if (existsSync(countdownModuleUrl)) {
    countdownModule = await import(countdownModuleUrl.href);
  }
});

function getState(isoString) {
  return countdownModule.getCountdownState(Date.parse(isoString));
}

test('returns D-N and live time before the exam', () => {
  const state = getState('2027-11-16T13:58:59.000Z');

  assert.equal(state.status, 'before');
  assert.equal(state.ddayLabel, 'D-2');
  assert.deepEqual(state.remaining, {
    totalSeconds: 90061,
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1
  });
});

test('returns one second remaining on the day before the exam', () => {
  const state = getState('2027-11-17T14:59:59.000Z');

  assert.equal(state.status, 'before');
  assert.equal(state.ddayLabel, 'D-1');
  assert.deepEqual(state.remaining, {
    totalSeconds: 1,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1
  });
});

test('returns D-Day and zero time at the exam start date', () => {
  const state = getState('2027-11-17T15:00:00.000Z');

  assert.equal(state.status, 'exam-day');
  assert.equal(state.ddayLabel, 'D-Day');
  assert.deepEqual(state.remaining, {
    totalSeconds: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
});

test('keeps D-Day through the final moment of the exam date', () => {
  const state = getState('2027-11-18T14:59:59.000Z');

  assert.equal(state.status, 'exam-day');
  assert.equal(state.ddayLabel, 'D-Day');
  assert.equal(state.remaining.totalSeconds, 0);
});

test('returns the finished state after the exam date', () => {
  const state = getState('2027-11-18T15:00:00.000Z');

  assert.equal(state.status, 'finished');
  assert.equal(state.ddayLabel, null);
  assert.equal(state.remaining, null);
  assert.equal(state.message, '시험이 종료되었습니다');
});

test('uses the same KST result for a timestamp and an equivalent Date', () => {
  const timestamp = Date.parse('2027-11-17T15:00:00.000Z');

  assert.deepEqual(
    countdownModule.getCountdownState(timestamp),
    countdownModule.getCountdownState(new Date(timestamp))
  );
});
