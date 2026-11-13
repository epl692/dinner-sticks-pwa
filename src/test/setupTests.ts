import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { installTestData } from './testData'

// Every test starts with its own empty, in-memory family for the repositories to read and write.
beforeEach(async () => {
  await installTestData()
})

// jsdom doesn't implement HTMLDialogElement.showModal()/close() — real modal/
// focus-trap behavior is verified manually in a real browser; this polyfill
// only needs to toggle the `open` attribute so components using <dialog> are
// testable at all.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
