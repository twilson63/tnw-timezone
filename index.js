import { html, LitElement } from '@polymer/lit-element/lit-element.js'
import { DateTime } from 'luxon'
import { style } from './style'

class Timezone extends LitElement {
  static get properties() {
    return {
      tz: String
    }
  }

  constructor() {
    super()
    this.tz = 'America/New_York'
    this._handleTzChange = this._handleTzChange.bind(this)

    setInterval(async () => {
      this.requestRender()
    }, 1000)
  }

  _handleTzChange(zone) {
    this.tz = zone
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { tz: this.tz }
      })
    )
  }

  _renderStyle() {
    return style
  }

  _render({ tz }) {
    return html`
      ${this._renderStyle()}
      <div class="clock">${DateTime.local()
        .setZone(tz)
        .toFormat('h:mm:ss a z')}</div>
      <div class="buttons">
        <button on-click=${() =>
          this._handleTzChange(
            'America/New_York'
          )} class="dim link">New York</button>
        <button on-click=${() => {
          this._handleTzChange('America/Los_Angeles')
        }} class="dim link">Los Angeles</button>
        <button on-click=${() => {
          this._handleTzChange('Europe/London')
        }} class="dim link">London</button>
      </div>
    `
  }
}

customElements.define('tnw-timezone', Timezone)
