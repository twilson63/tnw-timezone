import { html, LitElement } from '@polymer/lit-element/lit-element.js'
import { DateTime } from 'luxon'

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

  _render({ tz }) {
    return html`
      <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          flex-direction: column;
        }
        .clock {
          font-size: 3em;
          font-family: Avenir;
          border: 8px solid rgba(0,0,0,.32);
          border-radius: 8px;
          padding: 16px;
          background-color: rgba(0,0,0,.8);
          color: #fff;
        }
        .buttons {
          flex: 1;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
        }
        .dim {
            opacity: 1;
            transition: opacity .15s ease-in;
        }

        .dim:hover, .dim:focus {
            opacity: .5;
            transition: opacity .15s ease-in;
        }

        .dim:active {
            opacity: .8;
            transition: opacity .15s ease-out;
        }
        .link {
            text-decoration: none;
            transition: color .15s ease-in;
        }

        .link:link, .link:visited {
            transition: color .15s ease-in;
        }

        .link:hover {
            transition: color .15s ease-in;
        }

        .link:active {
            transition: color .15s ease-in;
        }

        .link:focus {
            transition: color .15s ease-in;
            outline: 1px dotted currentColor;
        }
        button {
          font-size: .875rem;
          border-radius: .5rem;
          padding-top: .5rem;
          padding-bottom: .5rem;
          padding-left: 1rem;
          padding-right: 1rem;
          background-color: #000;
          color: #fff;
          display: inline-block;
        }
      </style>
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
