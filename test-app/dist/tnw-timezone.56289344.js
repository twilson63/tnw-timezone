// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({58:[function(require,module,exports) {
window.JSCompiler_renameProperty=function(e){return e};let e=0;const t=function(t){let s=t.__mixinApplications;s||(s=new WeakMap,t.__mixinApplications=s);let n=e++;return function(e){let i=e.__mixinSet;if(i&&i[n])return e;let r=s,o=r.get(e);o||(o=t(e),r.set(e,o));let a=Object.create(o.__mixinSet||i||null);return a[n]=!0,o.__mixinSet=a,o}};let s=0,n=0,i=[],r=0,o=document.createTextNode("");new window.MutationObserver(function(){const e=i.length;for(let t=0;t<e;t++){let e=i[t];if(e)try{e()}catch(e){setTimeout(()=>{throw e})}}i.splice(0,e),n+=e}).observe(o,{characterData:!0});const a={run:e=>(o.textContent=r++,i.push(e),s++),cancel(e){const t=e-n;if(t>=0){if(!i[t])throw new Error("invalid async handle: "+e);i[t]=null}}},l=t(e=>{return class extends e{static createProperties(e){const t=this.prototype;for(let s in e)s in t||t._createPropertyAccessor(s)}static attributeNameForProperty(e){return e.toLowerCase()}static typeForProperty(e){}_createPropertyAccessor(e,t){this._addPropertyToAttributeMap(e),this.hasOwnProperty("__dataHasAccessor")||(this.__dataHasAccessor=Object.assign({},this.__dataHasAccessor)),this.__dataHasAccessor[e]||(this.__dataHasAccessor[e]=!0,this._definePropertyAccessor(e,t))}_addPropertyToAttributeMap(e){if(this.hasOwnProperty("__dataAttributes")||(this.__dataAttributes=Object.assign({},this.__dataAttributes)),!this.__dataAttributes[e]){const t=this.constructor.attributeNameForProperty(e);this.__dataAttributes[t]=e}}_definePropertyAccessor(e,t){Object.defineProperty(this,e,{get(){return this._getProperty(e)},set:t?function(){}:function(t){this._setProperty(e,t)}})}constructor(){super(),this.__dataEnabled=!1,this.__dataReady=!1,this.__dataInvalid=!1,this.__data={},this.__dataPending=null,this.__dataOld=null,this.__dataInstanceProps=null,this.__serializing=!1,this._initializeProperties()}ready(){this.__dataReady=!0,this._flushProperties()}_initializeProperties(){for(let e in this.__dataHasAccessor)this.hasOwnProperty(e)&&(this.__dataInstanceProps=this.__dataInstanceProps||{},this.__dataInstanceProps[e]=this[e],delete this[e])}_initializeInstanceProperties(e){Object.assign(this,e)}_setProperty(e,t){this._setPendingProperty(e,t)&&this._invalidateProperties()}_getProperty(e){return this.__data[e]}_setPendingProperty(e,t,s){let n=this.__data[e],i=this._shouldPropertyChange(e,t,n);return i&&(this.__dataPending||(this.__dataPending={},this.__dataOld={}),!this.__dataOld||e in this.__dataOld||(this.__dataOld[e]=n),this.__data[e]=t,this.__dataPending[e]=t),i}_invalidateProperties(){!this.__dataInvalid&&this.__dataReady&&(this.__dataInvalid=!0,a.run(()=>{this.__dataInvalid&&(this.__dataInvalid=!1,this._flushProperties())}))}_enableProperties(){this.__dataEnabled||(this.__dataEnabled=!0,this.__dataInstanceProps&&(this._initializeInstanceProperties(this.__dataInstanceProps),this.__dataInstanceProps=null),this.ready())}_flushProperties(){const e=this.__data,t=this.__dataPending,s=this.__dataOld;this._shouldPropertiesChange(e,t,s)&&(this.__dataPending=null,this.__dataOld=null,this._propertiesChanged(e,t,s))}_shouldPropertiesChange(e,t,s){return Boolean(t)}_propertiesChanged(e,t,s){}_shouldPropertyChange(e,t,s){return s!==t&&(s==s||t==t)}attributeChangedCallback(e,t,s,n){t!==s&&this._attributeToProperty(e,s),super.attributeChangedCallback&&super.attributeChangedCallback(e,t,s,n)}_attributeToProperty(e,t,s){if(!this.__serializing){const n=this.__dataAttributes,i=n&&n[e]||e;this[i]=this._deserializeValue(t,s||this.constructor.typeForProperty(i))}}_propertyToAttribute(e,t,s){this.__serializing=!0,this._valueToNodeAttribute(this,s=arguments.length<3?this[e]:s,t||this.constructor.attributeNameForProperty(e)),this.__serializing=!1}_valueToNodeAttribute(e,t,s){const n=this._serializeValue(t);void 0===n?e.removeAttribute(s):e.setAttribute(s,n)}_serializeValue(e){switch(typeof e){case"boolean":return e?"":void 0;default:return null!=e?e.toString():void 0}}_deserializeValue(e,t){switch(t){case Boolean:return null!==e;case Number:return Number(e);default:return e}}}});const h=t(e=>{const t=l(e);function s(e){const t=Object.getPrototypeOf(e);return t.prototype instanceof i?t:null}function n(e){if(!e.hasOwnProperty(JSCompiler_renameProperty("__ownProperties",e))){let t=null;e.hasOwnProperty(JSCompiler_renameProperty("properties",e))&&e.properties&&(t=function(e){const t={};for(let s in e){const n=e[s];t[s]="function"==typeof n?{type:n}:n}return t}(e.properties)),e.__ownProperties=t}return e.__ownProperties}class i extends t{static get observedAttributes(){const e=this._properties;return e?Object.keys(e).map(e=>this.attributeNameForProperty(e)):[]}static finalize(){if(!this.hasOwnProperty(JSCompiler_renameProperty("__finalized",this))){const e=s(this);e&&e.finalize(),this.__finalized=!0,this._finalizeClass()}}static _finalizeClass(){const e=n(this);e&&this.createProperties(e)}static get _properties(){if(!this.hasOwnProperty(JSCompiler_renameProperty("__properties",this))){const e=s(this);this.__properties=Object.assign({},e&&e._properties,n(this))}return this.__properties}static typeForProperty(e){const t=this._properties[e];return t&&t.type}_initializeProperties(){this.constructor.finalize(),super._initializeProperties()}connectedCallback(){super.connectedCallback&&super.connectedCallback(),this._enableProperties()}disconnectedCallback(){super.disconnectedCallback&&super.disconnectedCallback()}}return i}),c=new Map;class d{constructor(e,t,s,n=N){this.strings=e,this.values=t,this.type=s,this.partCallback=n}getHTML(){const e=this.strings.length-1;let t="",s=!0;for(let n=0;n<e;n++){const e=this.strings[n];t+=e;const i=m(e);t+=(s=i>-1?i<e.length:s)?u:_}return t+=this.strings[e]}getTemplateElement(){const e=document.createElement("template");return e.innerHTML=this.getHTML(),e}}const _=`{{lit-${String(Math.random()).slice(2)}}}`,u=`\x3c!--${_}--\x3e`,p=new RegExp(`${_}|${u}`),f=/[ \x09\x0a\x0c\x0d]([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)[ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*)$/;function m(e){const t=e.lastIndexOf(">");return e.indexOf("<",t+1)>-1?e.length:t}class y{constructor(e,t,s,n,i){this.type=e,this.index=t,this.name=s,this.rawName=n,this.strings=i}}const g=e=>-1!==e.index;const v=(e,t)=>b(t)?(t=t(e),P):null===t?void 0:t,b=e=>"function"==typeof e&&!0===e.__litDirective,P={},C=e=>null===e||!("object"==typeof e||"function"==typeof e);class w{constructor(e,t,s,n){this.instance=e,this.element=t,this.name=s,this.strings=n,this.size=n.length-1,this._previousValues=[]}_interpolate(e,t){const s=this.strings,n=s.length-1;let i="";for(let r=0;r<n;r++){i+=s[r];const n=v(this,e[t+r]);if(n&&n!==P&&(Array.isArray(n)||"string"!=typeof n&&n[Symbol.iterator]))for(const e of n)i+=e;else i+=n}return i+s[n]}_equalToPreviousValues(e,t){for(let s=t;s<t+this.size;s++)if(this._previousValues[s]!==e[s]||!C(e[s]))return!1;return!0}setValue(e,t){if(this._equalToPreviousValues(e,t))return;const s=this.strings;let n;2===s.length&&""===s[0]&&""===s[1]?(n=v(this,e[t]),Array.isArray(n)&&(n=n.join(""))):n=this._interpolate(e,t),n!==P&&this.element.setAttribute(this.name,n),this._previousValues=e}}class x{constructor(e,t,s){this.instance=e,this.startNode=t,this.endNode=s,this._previousValue=void 0}setValue(e){if((e=v(this,e))!==P)if(C(e)){if(e===this._previousValue)return;this._setText(e)}else e instanceof d?this._setTemplateResult(e):Array.isArray(e)||e[Symbol.iterator]?this._setIterable(e):e instanceof Node?this._setNode(e):void 0!==e.then?this._setPromise(e):this._setText(e)}_insert(e){this.endNode.parentNode.insertBefore(e,this.endNode)}_setNode(e){this._previousValue!==e&&(this.clear(),this._insert(e),this._previousValue=e)}_setText(e){const t=this.startNode.nextSibling;e=void 0===e?"":e,t===this.endNode.previousSibling&&t.nodeType===Node.TEXT_NODE?t.textContent=e:this._setNode(document.createTextNode(e)),this._previousValue=e}_setTemplateResult(e){const t=this.instance._getTemplate(e);let s;this._previousValue&&this._previousValue.template===t?s=this._previousValue:(s=new S(t,this.instance._partCallback,this.instance._getTemplate),this._setNode(s._clone()),this._previousValue=s),s.update(e.values)}_setIterable(e){Array.isArray(this._previousValue)||(this.clear(),this._previousValue=[]);const t=this._previousValue;let s=0;for(const n of e){let e=t[s];if(void 0===e){let n=this.startNode;if(s>0){n=t[s-1].endNode=document.createTextNode(""),this._insert(n)}e=new x(this.instance,n,this.endNode),t.push(e)}e.setValue(n),s++}if(0===s)this.clear(),this._previousValue=void 0;else if(s<t.length){const e=t[s-1];t.length=s,this.clear(e.endNode.previousSibling),e.endNode=this.endNode}}_setPromise(e){this._previousValue=e,e.then(t=>{this._previousValue===e&&this.setValue(t)})}clear(e=this.startNode){T(this.startNode.parentNode,e.nextSibling,this.endNode)}}const N=(e,t,s)=>{if("attribute"===t.type)return new w(e,s,t.name,t.strings);if("node"===t.type)return new x(e,s,s.nextSibling);throw new Error(`Unknown part type ${t.type}`)};class S{constructor(e,t,s){this._parts=[],this.template=e,this._partCallback=t,this._getTemplate=s}update(e){let t=0;for(const s of this._parts)s?void 0===s.size?(s.setValue(e[t]),t++):(s.setValue(e,t),t+=s.size):t++}_clone(){const e=this.template.element.content.cloneNode(!0),t=this.template.parts;if(t.length>0){const s=document.createTreeWalker(e,133,null,!1);let n=-1;for(let e=0;e<t.length;e++){const i=t[e],r=g(i);if(r)for(;n<i.index;)n++,s.nextNode();this._parts.push(r?this._partCallback(this,i,s.currentNode):void 0)}}return e}}const T=(e,t,s=null)=>{let n=t;for(;n!==s;){const t=n.nextSibling;e.removeChild(n),n=t}},A=NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_COMMENT|NodeFilter.SHOW_TEXT;const V=e=>{let t=1;const s=document.createTreeWalker(e,A,null,!1);for(;s.nextNode();)t++;return t},E=(e,t=-1)=>{for(let s=t+1;s<e.length;s++){if(g(e[s]))return s}return-1};const O=(e,t)=>`${e}--${t}`,k=e=>t=>{const s=O(t.type,e);let n=c.get(s);void 0===n&&(n=new Map,c.set(s,n));let i=n.get(t.strings);if(void 0===i){const s=t.getTemplateElement();"object"==typeof window.ShadyCSS&&window.ShadyCSS.prepareTemplateDom(s,e),i=new class{constructor(e,t){this.parts=[],this.element=t;const s=document.createTreeWalker(this.element.content,133,null,!1);let n=-1,i=0;const r=[];let o,a;for(;s.nextNode();){n++,o=a;const t=a=s.currentNode;if(1===t.nodeType){if(!t.hasAttributes())continue;const s=t.attributes;let r=0;for(let e=0;e<s.length;e++)s[e].value.indexOf(_)>=0&&r++;for(;r-- >0;){const r=f.exec(e.strings[i])[1],o=s.getNamedItem(r),a=o.value.split(p);this.parts.push(new y("attribute",n,o.name,r,a)),t.removeAttribute(o.name),i+=a.length-1}}else if(3===t.nodeType){const e=t.nodeValue;if(e.indexOf(_)<0)continue;const s=t.parentNode,o=e.split(p),a=o.length-1;i+=a;for(let e=0;e<a;e++)s.insertBefore(""===o[e]?document.createComment(""):document.createTextNode(o[e]),t),this.parts.push(new y("node",n++));s.insertBefore(""===o[a]?document.createComment(""):document.createTextNode(o[a]),t),r.push(t)}else if(8===t.nodeType&&t.nodeValue===_){const e=t.parentNode,s=t.previousSibling;null===s||s!==o||s.nodeType!==Node.TEXT_NODE?e.insertBefore(document.createComment(""),t):n--,this.parts.push(new y("node",n++)),r.push(t),null===t.nextSibling?e.insertBefore(document.createComment(""),t):n--,a=o,i++}}for(const e of r)e.parentNode.removeChild(e)}}(t,s),n.set(t.strings,i)}return i},R=["html","svg"];function z(e){R.forEach(t=>{const s=c.get(O(t,e));void 0!==s&&s.forEach(e=>{const{element:{content:t}}=e,s=t.querySelectorAll("style");!function(e,t){const{element:{content:s},parts:n}=e,i=document.createTreeWalker(s,A,null,!1);let r=0,o=n[0],a=-1,l=0;const h=[];let c=null;for(;i.nextNode();){a++;const e=i.currentNode;for(e.previousSibling===c&&(c=null),t.has(e)&&(h.push(e),null===c&&(c=e)),null!==c&&l++;void 0!==o&&o.index===a;)o.index=null!==c?-1:o.index-l,o=n[++r]}h.forEach(e=>e.parentNode.removeChild(e))}(e,new Set(Array.from(s)))})})}const I=new Set,j=(e,t,s)=>{if(!I.has(s)){I.add(s);const n=document.createElement("template");if(Array.from(e.querySelectorAll("style")).forEach(e=>{n.content.appendChild(e)}),window.ShadyCSS.prepareTemplateStyles(n,s),z(s),window.ShadyCSS.nativeShadow){const s=n.content.querySelector("style");null!==s&&(e.insertBefore(s,e.firstChild),function(e,t,s=null){const{element:{content:n},parts:i}=e;if(null===s||void 0===s)return void n.appendChild(t);const r=document.createTreeWalker(n,A,null,!1);let o=E(i),a=0,l=-1;for(;r.nextNode();)for(l++,r.currentNode===s&&(s.parentNode.insertBefore(t,s),a=V(t));-1!==o&&i[o].index===l;){if(a>0){for(;-1!==o;)i[o].index+=a,o=E(i,o);return}o=E(i,o)}}(t,s.cloneNode(!0),t.element.content.firstChild))}}};const M=(e,t,s)=>{if("attribute"===t.type){if("on-"===t.rawName.substr(0,3)){return new class{constructor(e,t,s){this.instance=e,this.element=t,this.eventName=s}setValue(e){const t=v(this,e);t!==this._listener&&(null==t?this.element.removeEventListener(this.eventName,this):null==this._listener&&this.element.addEventListener(this.eventName,this),this._listener=t)}handleEvent(e){"function"==typeof this._listener?this._listener.call(this.element,e):"function"==typeof this._listener.handleEvent&&this._listener.handleEvent(e)}}(e,s,t.rawName.slice(3))}const n=t.name.substr(t.name.length-1);if("$"===n){const n=t.name.slice(0,-1);return new w(e,s,n,t.strings)}if("?"===n){return new class extends w{setValue(e,t){const s=this.strings;if(2!==s.length||""!==s[0]||""!==s[1])throw new Error("boolean attributes can only contain a single expression");{const s=v(this,e[t]);if(s===P)return;s?this.element.setAttribute(this.name,""):this.element.removeAttribute(this.name)}}}(e,s,t.name.slice(0,-1),t.strings)}return new class extends w{setValue(e,t){const s=this.strings;let n;this._equalToPreviousValues(e,t)||((n=2===s.length&&""===s[0]&&""===s[1]?v(this,e[t]):this._interpolate(e,t))!==P&&(this.element[this.name]=n),this._previousValues=e)}}(e,s,t.rawName,t.strings)}return N(e,t,s)};var F=function(e){function t(){var t=this;e.call(this),setInterval(function(){return new Promise(function(e,t){return this.requestRender(),this.renderComplete.then(function(s){try{return this.dispatchEvent(new CustomEvent("change",{detail:{}})),e()}catch(e){return t(e)}}.bind(this),t)}.bind(t))},1e3)}return e&&(t.__proto__=e),(t.prototype=Object.create(e&&e.prototype)).constructor=t,t.prototype._render=function(){return((e,...t)=>new d(e,t,"html",M))(['\n      <style>\n        :host {\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          height: 100%;\n        }\n        .clock {\n          font-size: 3em;\n          font-family: Avenir;\n          border: 8px solid rgba(0,0,0,.32);\n          border-radius: 8px;\n          padding: 16px;\n          background-color: rgba(0,0,0,.8);\n          color: #fff;\n        }\n      </style>\n      <div class="clock">',"</div>\n    "],(new Date).toISOString())},t}(class extends(h(HTMLElement)){constructor(){super(...arguments),this.__renderComplete=null,this.__resolveRenderComplete=null,this.__isInvalid=!1,this.__isChanging=!1}ready(){this._root=this._createRoot(),super.ready(),this._firstRendered()}connectedCallback(){window.ShadyCSS&&this._root&&window.ShadyCSS.styleElement(this),super.connectedCallback()}_firstRendered(){}_createRoot(){return this.attachShadow({mode:"open"})}_shouldPropertiesChange(e,t,s){const n=this._shouldRender(e,t,s);return!n&&this.__resolveRenderComplete&&this.__resolveRenderComplete(!1),n}_shouldRender(e,t,s){return!0}_propertiesChanged(e,t,s){super._propertiesChanged(e,t,s);const n=this._render(e);n&&void 0!==this._root&&this._applyRender(n,this._root),this._didRender(e,t,s),this.__resolveRenderComplete&&this.__resolveRenderComplete(!0)}_flushProperties(){this.__isChanging=!0,this.__isInvalid=!1,super._flushProperties(),this.__isChanging=!1}_shouldPropertyChange(e,t,s){const n=super._shouldPropertyChange(e,t,s);return n&&this.__isChanging&&console.trace("Setting properties in response to other properties changing "+`considered harmful. Setting '${e}' from `+`'${this._getProperty(e)}' to '${t}'.`),n}_render(e){throw new Error("_render() not implemented")}_applyRender(e,t){!function(e,t,s){const n=k(s),i=n(e);let r=t.__templateInstance;if(void 0!==r&&r.template===i&&r._partCallback===e.partCallback)return void r.update(e.values);r=new S(i,e.partCallback,n),t.__templateInstance=r;const o=r._clone();r.update(e.values);const a=t instanceof ShadowRoot?t.host:void 0;void 0!==a&&"object"==typeof window.ShadyCSS&&(j(o,i,s),window.ShadyCSS.styleElement(a)),T(t,t.firstChild),t.appendChild(o)}(e,t,this.localName)}_didRender(e,t,s){}requestRender(){this._invalidateProperties()}_invalidateProperties(){this.__isInvalid=!0,super._invalidateProperties()}get renderComplete(){return this.__renderComplete||(this.__renderComplete=new Promise(e=>{this.__resolveRenderComplete=(t=>{this.__resolveRenderComplete=this.__renderComplete=null,e(t)})}),!this.__isInvalid&&this.__resolveRenderComplete&&Promise.resolve().then(()=>this.__resolveRenderComplete(!1))),this.__renderComplete}});customElements.define("tnw-timezone",F);
//# sourceMappingURL=tnw-timezone.js.map

},{}],55:[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';

var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };

  module.bundle.hotData = null;
}

module.bundle.Module = Module;

var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = '' || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + '54851' + '/');
  ws.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      console.clear();

      data.assets.forEach(function (asset) {
        hmrApply(global.parcelRequire, asset);
      });

      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          hmrAccept(global.parcelRequire, asset.id);
        }
      });
    }

    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');

      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);

      removeErrorOverlay();

      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;

  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';

  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(+k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAccept(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAccept(bundle.parent, id);
  }

  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);

  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAccept(global.parcelRequire, id);
  });
}
},{}]},{},[55,58], null)
//# sourceMappingURL=/tnw-timezone.56289344.map