import { html } from '@polymer/lit-element/lit-element.js'

export const style = html`
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
`
