(function () {
  'use strict';

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  window.JSCompiler_renameProperty = function(prop) { return prop; };

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  // unique global id for deduping mixins.
  let dedupeId = 0;

  /* eslint-disable valid-jsdoc */
  /**
   * Wraps an ES6 class expression mixin such that the mixin is only applied
   * if it has not already been applied its base argument. Also memoizes mixin
   * applications.
   *
   * @template T
   * @param {T} mixin ES6 class expression mixin to wrap
   * @return {T}
   * @suppress {invalidCasts}
   */
  const dedupingMixin = function(mixin) {
    let mixinApplications = /** @type {!MixinFunction} */(mixin).__mixinApplications;
    if (!mixinApplications) {
      mixinApplications = new WeakMap();
      /** @type {!MixinFunction} */(mixin).__mixinApplications = mixinApplications;
    }
    // maintain a unique id for each mixin
    let mixinDedupeId = dedupeId++;
    function dedupingMixin(base) {
      let baseSet = /** @type {!MixinFunction} */(base).__mixinSet;
      if (baseSet && baseSet[mixinDedupeId]) {
        return base;
      }
      let map = mixinApplications;
      let extended = map.get(base);
      if (!extended) {
        extended = /** @type {!Function} */(mixin)(base);
        map.set(base, extended);
      }
      // copy inherited mixin set from the extended class, or the base class
      // NOTE: we avoid use of Set here because some browser (IE11)
      // cannot extend a base Set via the constructor.
      let mixinSet = Object.create(/** @type {!MixinFunction} */(extended).__mixinSet || baseSet || null);
      mixinSet[mixinDedupeId] = true;
      /** @type {!MixinFunction} */(extended).__mixinSet = mixinSet;
      return extended;
    }

    return /** @type {T} */ (dedupingMixin);
  };
  /* eslint-enable valid-jsdoc */

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  // Microtask implemented using Mutation Observer
  let microtaskCurrHandle = 0;
  let microtaskLastHandle = 0;
  let microtaskCallbacks = [];
  let microtaskNodeContent = 0;
  let microtaskNode = document.createTextNode('');
  new window.MutationObserver(microtaskFlush).observe(microtaskNode, {characterData: true});

  function microtaskFlush() {
    const len = microtaskCallbacks.length;
    for (let i = 0; i < len; i++) {
      let cb = microtaskCallbacks[i];
      if (cb) {
        try {
          cb();
        } catch (e) {
          setTimeout(() => { throw e; });
        }
      }
    }
    microtaskCallbacks.splice(0, len);
    microtaskLastHandle += len;
  }

  /**
   * Async interface for enqueuing callbacks that run at microtask timing.
   *
   * Note that microtask timing is achieved via a single `MutationObserver`,
   * and thus callbacks enqueued with this API will all run in a single
   * batch, and not interleaved with other microtasks such as promises.
   * Promises are avoided as an implementation choice for the time being
   * due to Safari bugs that cause Promises to lack microtask guarantees.
   *
   * @namespace
   * @summary Async interface for enqueuing callbacks that run at microtask
   *   timing.
   */
  const microTask = {

    /**
     * Enqueues a function called at microtask timing.
     *
     * @memberof microTask
     * @param {!Function=} callback Callback to run
     * @return {number} Handle used for canceling task
     */
    run(callback) {
      microtaskNode.textContent = microtaskNodeContent++;
      microtaskCallbacks.push(callback);
      return microtaskCurrHandle++;
    },

    /**
     * Cancels a previously enqueued `microTask` callback.
     *
     * @memberof microTask
     * @param {number} handle Handle returned from `run` of callback to cancel
     * @return {void}
     */
    cancel(handle) {
      const idx = handle - microtaskLastHandle;
      if (idx >= 0) {
        if (!microtaskCallbacks[idx]) {
          throw new Error('invalid async handle: ' + handle);
        }
        microtaskCallbacks[idx] = null;
      }
    }

  };

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  /** @const {!AsyncInterface} */
  const microtask = microTask;

  /**
   * Element class mixin that provides basic meta-programming for creating one
   * or more property accessors (getter/setter pair) that enqueue an async
   * (batched) `_propertiesChanged` callback.
   *
   * For basic usage of this mixin, call `MyClass.createProperties(props)`
   * once at class definition time to create property accessors for properties
   * named in props, implement `_propertiesChanged` to react as desired to
   * property changes, and implement `static get observedAttributes()` and
   * include lowercase versions of any property names that should be set from
   * attributes. Last, call `this._enableProperties()` in the element's
   * `connectedCallback` to enable the accessors.
   *
   * @mixinFunction
   * @polymer
   * @summary Element class mixin for reacting to property changes from
   *   generated property accessors.
   */
  const PropertiesChanged = dedupingMixin(superClass => {

    /**
     * @polymer
     * @mixinClass
     * @extends {superClass}
     * @implements {Polymer_PropertiesChanged}
     * @unrestricted
     */
    class PropertiesChanged extends superClass {

      /**
       * Creates property accessors for the given property names.
       * @param {!Object} props Object whose keys are names of accessors.
       * @return {void}
       * @protected
       */
      static createProperties(props) {
        const proto = this.prototype;
        for (let prop in props) {
          // don't stomp an existing accessor
          if (!(prop in proto)) {
            proto._createPropertyAccessor(prop);
          }
        }
      }

      /**
       * Returns an attribute name that corresponds to the given property.
       * The attribute name is the lowercased property name. Override to
       * customize this mapping.
       * @param {string} property Property to convert
       * @return {string} Attribute name corresponding to the given property.
       *
       * @protected
       */
      static attributeNameForProperty(property) {
        return property.toLowerCase();
      }

      /**
       * Override point to provide a type to which to deserialize a value to
       * a given property.
       * @param {string} name Name of property
       *
       * @protected
       */
      static typeForProperty(name) { } //eslint-disable-line no-unused-vars

      /**
       * Creates a setter/getter pair for the named property with its own
       * local storage.  The getter returns the value in the local storage,
       * and the setter calls `_setProperty`, which updates the local storage
       * for the property and enqueues a `_propertiesChanged` callback.
       *
       * This method may be called on a prototype or an instance.  Calling
       * this method may overwrite a property value that already exists on
       * the prototype/instance by creating the accessor.
       *
       * @param {string} property Name of the property
       * @param {boolean=} readOnly When true, no setter is created; the
       *   protected `_setProperty` function must be used to set the property
       * @return {void}
       * @protected
       */
      _createPropertyAccessor(property, readOnly) {
        this._addPropertyToAttributeMap(property);
        if (!this.hasOwnProperty('__dataHasAccessor')) {
          this.__dataHasAccessor = Object.assign({}, this.__dataHasAccessor);
        }
        if (!this.__dataHasAccessor[property]) {
          this.__dataHasAccessor[property] = true;
          this._definePropertyAccessor(property, readOnly);
        }
      }

      /**
       * Adds the given `property` to a map matching attribute names
       * to property names, using `attributeNameForProperty`. This map is
       * used when deserializing attribute values to properties.
       *
       * @param {string} property Name of the property
       */
      _addPropertyToAttributeMap(property) {
        if (!this.hasOwnProperty('__dataAttributes')) {
          this.__dataAttributes = Object.assign({}, this.__dataAttributes);
        }
        if (!this.__dataAttributes[property]) {
          const attr = this.constructor.attributeNameForProperty(property);
          this.__dataAttributes[attr] = property;
        }
      }

      /**
       * Defines a property accessor for the given property.
       * @param {string} property Name of the property
       * @param {boolean=} readOnly When true, no setter is created
       * @return {void}
       */
       _definePropertyAccessor(property, readOnly) {
        Object.defineProperty(this, property, {
          /* eslint-disable valid-jsdoc */
          /** @this {PropertiesChanged} */
          get() {
            return this._getProperty(property);
          },
          /** @this {PropertiesChanged} */
          set: readOnly ? function () {} : function (value) {
            this._setProperty(property, value);
          }
          /* eslint-enable */
        });
      }

      constructor() {
        super();
        this.__dataEnabled = false;
        this.__dataReady = false;
        this.__dataInvalid = false;
        this.__data = {};
        this.__dataPending = null;
        this.__dataOld = null;
        this.__dataInstanceProps = null;
        this.__serializing = false;
        this._initializeProperties();
      }

      /**
       * Lifecycle callback called when properties are enabled via
       * `_enableProperties`.
       *
       * Users may override this function to implement behavior that is
       * dependent on the element having its property data initialized, e.g.
       * from defaults (initialized from `constructor`, `_initializeProperties`),
       * `attributeChangedCallback`, or values propagated from host e.g. via
       * bindings.  `super.ready()` must be called to ensure the data system
       * becomes enabled.
       *
       * @return {void}
       * @public
       */
      ready() {
        this.__dataReady = true;
        this._flushProperties();
      }

      /**
       * Initializes the local storage for property accessors.
       *
       * Provided as an override point for performing any setup work prior
       * to initializing the property accessor system.
       *
       * @return {void}
       * @protected
       */
      _initializeProperties() {
        // Capture instance properties; these will be set into accessors
        // during first flush. Don't set them here, since we want
        // these to overwrite defaults/constructor assignments
        for (let p in this.__dataHasAccessor) {
          if (this.hasOwnProperty(p)) {
            this.__dataInstanceProps = this.__dataInstanceProps || {};
            this.__dataInstanceProps[p] = this[p];
            delete this[p];
          }
        }
      }

      /**
       * Called at ready time with bag of instance properties that overwrote
       * accessors when the element upgraded.
       *
       * The default implementation sets these properties back into the
       * setter at ready time.  This method is provided as an override
       * point for customizing or providing more efficient initialization.
       *
       * @param {Object} props Bag of property values that were overwritten
       *   when creating property accessors.
       * @return {void}
       * @protected
       */
      _initializeInstanceProperties(props) {
        Object.assign(this, props);
      }

      /**
       * Updates the local storage for a property (via `_setPendingProperty`)
       * and enqueues a `_proeprtiesChanged` callback.
       *
       * @param {string} property Name of the property
       * @param {*} value Value to set
       * @return {void}
       * @protected
       */
      _setProperty(property, value) {
        if (this._setPendingProperty(property, value)) {
          this._invalidateProperties();
        }
      }

      /**
       * Returns the value for the given property.
       * @param {string} property Name of property
       * @return {*} Value for the given property
       * @protected
       */
      _getProperty(property) {
        return this.__data[property];
      }

      /* eslint-disable no-unused-vars */
      /**
       * Updates the local storage for a property, records the previous value,
       * and adds it to the set of "pending changes" that will be passed to the
       * `_propertiesChanged` callback.  This method does not enqueue the
       * `_propertiesChanged` callback.
       *
       * @param {string} property Name of the property
       * @param {*} value Value to set
       * @param {boolean=} ext Not used here; affordance for closure
       * @return {boolean} Returns true if the property changed
       * @protected
       */
      _setPendingProperty(property, value, ext) {
        let old = this.__data[property];
        let changed = this._shouldPropertyChange(property, value, old);
        if (changed) {
          if (!this.__dataPending) {
            this.__dataPending = {};
            this.__dataOld = {};
          }
          // Ensure old is captured from the last turn
          if (this.__dataOld && !(property in this.__dataOld)) {
            this.__dataOld[property] = old;
          }
          this.__data[property] = value;
          this.__dataPending[property] = value;
        }
        return changed;
      }
      /* eslint-enable */

      /**
       * Marks the properties as invalid, and enqueues an async
       * `_propertiesChanged` callback.
       *
       * @return {void}
       * @protected
       */
      _invalidateProperties() {
        if (!this.__dataInvalid && this.__dataReady) {
          this.__dataInvalid = true;
          microtask.run(() => {
            if (this.__dataInvalid) {
              this.__dataInvalid = false;
              this._flushProperties();
            }
          });
        }
      }

      /**
       * Call to enable property accessor processing. Before this method is
       * called accessor values will be set but side effects are
       * queued. When called, any pending side effects occur immediately.
       * For elements, generally `connectedCallback` is a normal spot to do so.
       * It is safe to call this method multiple times as it only turns on
       * property accessors once.
       *
       * @return {void}
       * @protected
       */
      _enableProperties() {
        if (!this.__dataEnabled) {
          this.__dataEnabled = true;
          if (this.__dataInstanceProps) {
            this._initializeInstanceProperties(this.__dataInstanceProps);
            this.__dataInstanceProps = null;
          }
          this.ready();
        }
      }

      /**
       * Calls the `_propertiesChanged` callback with the current set of
       * pending changes (and old values recorded when pending changes were
       * set), and resets the pending set of changes. Generally, this method
       * should not be called in user code.
       *
       * @return {void}
       * @protected
       */
      _flushProperties() {
        const props = this.__data;
        const changedProps = this.__dataPending;
        const old = this.__dataOld;
        if (this._shouldPropertiesChange(props, changedProps, old)) {
          this.__dataPending = null;
          this.__dataOld = null;
          this._propertiesChanged(props, changedProps, old);
        }
      }

      /**
       * Called in `_flushProperties` to determine if `_propertiesChanged`
       * should be called. The default implementation returns true if
       * properties are pending. Override to customize when
       * `_propertiesChanged` is called.
       * @param {!Object} currentProps Bag of all current accessor values
       * @param {!Object} changedProps Bag of properties changed since the last
       *   call to `_propertiesChanged`
       * @param {!Object} oldProps Bag of previous values for each property
       *   in `changedProps`
       * @return {boolean} true if changedProps is truthy
       */
      _shouldPropertiesChange(currentProps, changedProps, oldProps) { // eslint-disable-line no-unused-vars
        return Boolean(changedProps);
      }

      /**
       * Callback called when any properties with accessors created via
       * `_createPropertyAccessor` have been set.
       *
       * @param {!Object} currentProps Bag of all current accessor values
       * @param {!Object} changedProps Bag of properties changed since the last
       *   call to `_propertiesChanged`
       * @param {!Object} oldProps Bag of previous values for each property
       *   in `changedProps`
       * @return {void}
       * @protected
       */
      _propertiesChanged(currentProps, changedProps, oldProps) { // eslint-disable-line no-unused-vars
      }

      /**
       * Method called to determine whether a property value should be
       * considered as a change and cause the `_propertiesChanged` callback
       * to be enqueued.
       *
       * The default implementation returns `true` if a strict equality
       * check fails. The method always returns false for `NaN`.
       *
       * Override this method to e.g. provide stricter checking for
       * Objects/Arrays when using immutable patterns.
       *
       * @param {string} property Property name
       * @param {*} value New property value
       * @param {*} old Previous property value
       * @return {boolean} Whether the property should be considered a change
       *   and enqueue a `_proeprtiesChanged` callback
       * @protected
       */
      _shouldPropertyChange(property, value, old) {
        return (
          // Strict equality check
          (old !== value &&
            // This ensures (old==NaN, value==NaN) always returns false
            (old === old || value === value))
        );
      }

      /**
       * Implements native Custom Elements `attributeChangedCallback` to
       * set an attribute value to a property via `_attributeToProperty`.
       *
       * @param {string} name Name of attribute that changed
       * @param {?string} old Old attribute value
       * @param {?string} value New attribute value
       * @param {?string} namespace Attribute namespace.
       * @return {void}
       * @suppress {missingProperties} Super may or may not implement the callback
       */
      attributeChangedCallback(name, old, value, namespace) {
        if (old !== value) {
          this._attributeToProperty(name, value);
        }
        if (super.attributeChangedCallback) {
          super.attributeChangedCallback(name, old, value, namespace);
        }
      }

      /**
       * Deserializes an attribute to its associated property.
       *
       * This method calls the `_deserializeValue` method to convert the string to
       * a typed value.
       *
       * @param {string} attribute Name of attribute to deserialize.
       * @param {?string} value of the attribute.
       * @param {*=} type type to deserialize to, defaults to the value
       * returned from `typeForProperty`
       * @return {void}
       */
      _attributeToProperty(attribute, value, type) {
        if (!this.__serializing) {
          const map = this.__dataAttributes;
          const property = map && map[attribute] || attribute;
          this[property] = this._deserializeValue(value, type ||
            this.constructor.typeForProperty(property));
        }
      }

      /**
       * Serializes a property to its associated attribute.
       *
       * @suppress {invalidCasts} Closure can't figure out `this` is an element.
       *
       * @param {string} property Property name to reflect.
       * @param {string=} attribute Attribute name to reflect to.
       * @param {*=} value Property value to refect.
       * @return {void}
       */
      _propertyToAttribute(property, attribute, value) {
        this.__serializing = true;
        value = (arguments.length < 3) ? this[property] : value;
        this._valueToNodeAttribute(/** @type {!HTMLElement} */(this), value,
          attribute || this.constructor.attributeNameForProperty(property));
        this.__serializing = false;
      }

      /**
       * Sets a typed value to an HTML attribute on a node.
       *
       * This method calls the `_serializeValue` method to convert the typed
       * value to a string.  If the `_serializeValue` method returns `undefined`,
       * the attribute will be removed (this is the default for boolean
       * type `false`).
       *
       * @param {Element} node Element to set attribute to.
       * @param {*} value Value to serialize.
       * @param {string} attribute Attribute name to serialize to.
       * @return {void}
       */
      _valueToNodeAttribute(node, value, attribute) {
        const str = this._serializeValue(value);
        if (str === undefined) {
          node.removeAttribute(attribute);
        } else {
          node.setAttribute(attribute, str);
        }
      }

      /**
       * Converts a typed JavaScript value to a string.
       *
       * This method is called when setting JS property values to
       * HTML attributes.  Users may override this method to provide
       * serialization for custom types.
       *
       * @param {*} value Property value to serialize.
       * @return {string | undefined} String serialized from the provided
       * property  value.
       */
      _serializeValue(value) {
        switch (typeof value) {
          case 'boolean':
            return value ? '' : undefined;
          default:
            return value != null ? value.toString() : undefined;
        }
      }

      /**
       * Converts a string to a typed JavaScript value.
       *
       * This method is called when reading HTML attribute values to
       * JS properties.  Users may override this method to provide
       * deserialization for custom `type`s. Types for `Boolean`, `String`,
       * and `Number` convert attributes to the expected types.
       *
       * @param {?string} value Value to deserialize.
       * @param {*=} type Type to deserialize the string to.
       * @return {*} Typed value deserialized from the provided string.
       */
      _deserializeValue(value, type) {
        switch (type) {
          case Boolean:
            return (value !== null);
          case Number:
            return Number(value);
          default:
            return value;
        }
      }

    }

    return PropertiesChanged;
  });

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  /**
   * Creates a copy of `props` with each property normalized such that
   * upgraded it is an object with at least a type property { type: Type}.
   *
   * @param {Object} props Properties to normalize
   * @return {Object} Copy of input `props` with normalized properties that
   * are in the form {type: Type}
   * @private
   */
  function normalizeProperties(props) {
    const output = {};
    for (let p in props) {
      const o = props[p];
      output[p] = (typeof o === 'function') ? {type: o} : o;
    }
    return output;
  }

  /**
   * Mixin that provides a minimal starting point to using the PropertiesChanged
   * mixin by providing a mechanism to declare properties in a static
   * getter (e.g. static get properties() { return { foo: String } }). Changes
   * are reported via the `_propertiesChanged` method.
   *
   * This mixin provides no specific support for rendering. Users are expected
   * to create a ShadowRoot and put content into it and update it in whatever
   * way makes sense. This can be done in reaction to properties changing by
   * implementing `_propertiesChanged`.
   *
   * @mixinFunction
   * @polymer
   * @appliesMixin PropertiesChanged
   * @summary Mixin that provides a minimal starting point for using
   * the PropertiesChanged mixin by providing a declarative `properties` object.
   */
  const PropertiesMixin = dedupingMixin(superClass => {

   /**
    * @constructor
    * @extends {superClass}
    * @implements {Polymer_PropertiesChanged}
    */
   const base = PropertiesChanged(superClass);

   /**
    * Returns the super class constructor for the given class, if it is an
    * instance of the PropertiesMixin.
    *
    * @param {!PropertiesMixinConstructor} constructor PropertiesMixin constructor
    * @return {PropertiesMixinConstructor} Super class constructor
    */
   function superPropertiesClass(constructor) {
     const superCtor = Object.getPrototypeOf(constructor);

     // Note, the `PropertiesMixin` class below only refers to the class
     // generated by this call to the mixin; the instanceof test only works
     // because the mixin is deduped and guaranteed only to apply once, hence
     // all constructors in a proto chain will see the same `PropertiesMixin`
     return (superCtor.prototype instanceof PropertiesMixin) ?
       /** @type {PropertiesMixinConstructor} */ (superCtor) : null;
   }

   /**
    * Returns a memoized version of the `properties` object for the
    * given class. Properties not in object format are converted to at
    * least {type}.
    *
    * @param {PropertiesMixinConstructor} constructor PropertiesMixin constructor
    * @return {Object} Memoized properties object
    */
   function ownProperties(constructor) {
     if (!constructor.hasOwnProperty(JSCompiler_renameProperty('__ownProperties', constructor))) {
       let props = null;

       if (constructor.hasOwnProperty(JSCompiler_renameProperty('properties', constructor)) && constructor.properties) {
         props = normalizeProperties(constructor.properties);
       }

       constructor.__ownProperties = props;
     }
     return constructor.__ownProperties;
   }

   /**
    * @polymer
    * @mixinClass
    * @extends {base}
    * @implements {Polymer_PropertiesMixin}
    * @unrestricted
    */
   class PropertiesMixin extends base {

     /**
      * Implements standard custom elements getter to observes the attributes
      * listed in `properties`.
      * @suppress {missingProperties} Interfaces in closure do not inherit statics, but classes do
      */
     static get observedAttributes() {
       const props = this._properties;
       return props ? Object.keys(props).map(p => this.attributeNameForProperty(p)) : [];
     }

     /**
      * Finalizes an element definition, including ensuring any super classes
      * are also finalized. This includes ensuring property
      * accessors exist on the element prototype. This method calls
      * `_finalizeClass` to finalize each constructor in the prototype chain.
      * @return {void}
      */
     static finalize() {
       if (!this.hasOwnProperty(JSCompiler_renameProperty('__finalized', this))) {
         const superCtor = superPropertiesClass(/** @type {PropertiesMixinConstructor} */(this));
         if (superCtor) {
           superCtor.finalize();
         }
         this.__finalized = true;
         this._finalizeClass();
       }
     }

     /**
      * Finalize an element class. This includes ensuring property
      * accessors exist on the element prototype. This method is called by
      * `finalize` and finalizes the class constructor.
      *
      * @protected
      */
     static _finalizeClass() {
       const props = ownProperties(/** @type {PropertiesMixinConstructor} */(this));
       if (props) {
         this.createProperties(props);
       }
     }

     /**
      * Returns a memoized version of all properties, including those inherited
      * from super classes. Properties not in object format are converted to
      * at least {type}.
      *
      * @return {Object} Object containing properties for this class
      * @protected
      */
     static get _properties() {
       if (!this.hasOwnProperty(
         JSCompiler_renameProperty('__properties', this))) {
         const superCtor = superPropertiesClass(/** @type {PropertiesMixinConstructor} */(this));
         this.__properties = Object.assign({},
           superCtor && superCtor._properties,
           ownProperties(/** @type {PropertiesMixinConstructor} */(this)));
       }
       return this.__properties;
     }

     /**
      * Overrides `PropertiesChanged` method to return type specified in the
      * static `properties` object for the given property.
      * @param {string} name Name of property
      * @return {*} Type to which to deserialize attribute
      *
      * @protected
      */
     static typeForProperty(name) {
       const info = this._properties[name];
       return info && info.type;
     }

     /**
      * Overrides `PropertiesChanged` method and adds a call to
      * `finalize` which lazily configures the element's property accessors.
      * @override
      * @return {void}
      */
     _initializeProperties() {
       this.constructor.finalize();
       super._initializeProperties();
     }

     /**
      * Called when the element is added to a document.
      * Calls `_enableProperties` to turn on property system from
      * `PropertiesChanged`.
      * @suppress {missingProperties} Super may or may not implement the callback
      * @return {void}
      */
     connectedCallback() {
       if (super.connectedCallback) {
         super.connectedCallback();
       }
       this._enableProperties();
     }

     /**
      * Called when the element is removed from a document
      * @suppress {missingProperties} Super may or may not implement the callback
      * @return {void}
      */
     disconnectedCallback() {
       if (super.disconnectedCallback) {
         super.disconnectedCallback();
       }
     }

   }

   return PropertiesMixin;

  });

  /**
  @license
  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  // The first argument to JS template tags retain identity across multiple
  // calls to a tag for the same literal, so we can cache work done per literal
  // in a Map.
  const templateCaches = new Map();
  /**
   * The return type of `html`, which holds a Template and the values from
   * interpolated expressions.
   */
  class TemplateResult {
      constructor(strings, values, type, partCallback = defaultPartCallback) {
          this.strings = strings;
          this.values = values;
          this.type = type;
          this.partCallback = partCallback;
      }
      /**
       * Returns a string of HTML used to create a <template> element.
       */
      getHTML() {
          const l = this.strings.length - 1;
          let html = '';
          let isTextBinding = true;
          for (let i = 0; i < l; i++) {
              const s = this.strings[i];
              html += s;
              // We're in a text position if the previous string closed its tags.
              // If it doesn't have any tags, then we use the previous text position
              // state.
              const closing = findTagClose(s);
              isTextBinding = closing > -1 ? closing < s.length : isTextBinding;
              html += isTextBinding ? nodeMarker : marker;
          }
          html += this.strings[l];
          return html;
      }
      getTemplateElement() {
          const template = document.createElement('template');
          template.innerHTML = this.getHTML();
          return template;
      }
  }
  /**
   * An expression marker with embedded unique key to avoid collision with
   * possible text in templates.
   */
  const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
  /**
   * An expression marker used text-positions, not attribute positions,
   * in template.
   */
  const nodeMarker = `<!--${marker}-->`;
  const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
  /**
   * This regex extracts the attribute name preceding an attribute-position
   * expression. It does this by matching the syntax allowed for attributes
   * against the string literal directly preceding the expression, assuming that
   * the expression is in an attribute-value position.
   *
   * See attributes in the HTML spec:
   * https://www.w3.org/TR/html5/syntax.html#attributes-0
   *
   * "\0-\x1F\x7F-\x9F" are Unicode control characters
   *
   * " \x09\x0a\x0c\x0d" are HTML space characters:
   * https://www.w3.org/TR/html5/infrastructure.html#space-character
   *
   * So an attribute is:
   *  * The name: any character except a control character, space character, ('),
   *    ("), ">", "=", or "/"
   *  * Followed by zero or more space characters
   *  * Followed by "="
   *  * Followed by zero or more space characters
   *  * Followed by:
   *    * Any character except space, ('), ("), "<", ">", "=", (`), or
   *    * (") then any non-("), or
   *    * (') then any non-(')
   */
  const lastAttributeNameRegex = /[ \x09\x0a\x0c\x0d]([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)[ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*)$/;
  /**
   * Finds the closing index of the last closed HTML tag.
   * This has 3 possible return values:
   *   - `-1`, meaning there is no tag in str.
   *   - `string.length`, meaning the last opened tag is unclosed.
   *   - Some positive number < str.length, meaning the index of the closing '>'.
   */
  function findTagClose(str) {
      const close = str.lastIndexOf('>');
      const open = str.indexOf('<', close + 1);
      return open > -1 ? str.length : close;
  }
  /**
   * A placeholder for a dynamic expression in an HTML template.
   *
   * There are two built-in part types: AttributePart and NodePart. NodeParts
   * always represent a single dynamic expression, while AttributeParts may
   * represent as many expressions are contained in the attribute.
   *
   * A Template's parts are mutable, so parts can be replaced or modified
   * (possibly to implement different template semantics). The contract is that
   * parts can only be replaced, not removed, added or reordered, and parts must
   * always consume the correct number of values in their `update()` method.
   *
   * TODO(justinfagnani): That requirement is a little fragile. A
   * TemplateInstance could instead be more careful about which values it gives
   * to Part.update().
   */
  class TemplatePart {
      constructor(type, index, name, rawName, strings) {
          this.type = type;
          this.index = index;
          this.name = name;
          this.rawName = rawName;
          this.strings = strings;
      }
  }
  const isTemplatePartActive = (part) => part.index !== -1;
  /**
   * An updateable Template that tracks the location of dynamic parts.
   */
  class Template {
      constructor(result, element) {
          this.parts = [];
          this.element = element;
          const content = this.element.content;
          // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
          const walker = document.createTreeWalker(content, 133 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT |
                 NodeFilter.SHOW_TEXT */, null, false);
          let index = -1;
          let partIndex = 0;
          const nodesToRemove = [];
          // The actual previous node, accounting for removals: if a node is removed
          // it will never be the previousNode.
          let previousNode;
          // Used to set previousNode at the top of the loop.
          let currentNode;
          while (walker.nextNode()) {
              index++;
              previousNode = currentNode;
              const node = currentNode = walker.currentNode;
              if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                  if (!node.hasAttributes()) {
                      continue;
                  }
                  const attributes = node.attributes;
                  // Per https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                  // attributes are not guaranteed to be returned in document order. In
                  // particular, Edge/IE can return them out of order, so we cannot assume
                  // a correspondance between part index and attribute index.
                  let count = 0;
                  for (let i = 0; i < attributes.length; i++) {
                      if (attributes[i].value.indexOf(marker) >= 0) {
                          count++;
                      }
                  }
                  while (count-- > 0) {
                      // Get the template literal section leading up to the first
                      // expression in this attribute
                      const stringForPart = result.strings[partIndex];
                      // Find the attribute name
                      const attributeNameInPart = lastAttributeNameRegex.exec(stringForPart)[1];
                      // Find the corresponding attribute
                      // TODO(justinfagnani): remove non-null assertion
                      const attribute = attributes.getNamedItem(attributeNameInPart);
                      const stringsForAttributeValue = attribute.value.split(markerRegex);
                      this.parts.push(new TemplatePart('attribute', index, attribute.name, attributeNameInPart, stringsForAttributeValue));
                      node.removeAttribute(attribute.name);
                      partIndex += stringsForAttributeValue.length - 1;
                  }
              }
              else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                  const nodeValue = node.nodeValue;
                  if (nodeValue.indexOf(marker) < 0) {
                      continue;
                  }
                  const parent = node.parentNode;
                  const strings = nodeValue.split(markerRegex);
                  const lastIndex = strings.length - 1;
                  // We have a part for each match found
                  partIndex += lastIndex;
                  // Generate a new text node for each literal section
                  // These nodes are also used as the markers for node parts
                  for (let i = 0; i < lastIndex; i++) {
                      parent.insertBefore((strings[i] === '')
                          ? document.createComment('')
                          : document.createTextNode(strings[i]), node);
                      this.parts.push(new TemplatePart('node', index++));
                  }
                  parent.insertBefore(strings[lastIndex] === '' ?
                      document.createComment('') :
                      document.createTextNode(strings[lastIndex]), node);
                  nodesToRemove.push(node);
              }
              else if (node.nodeType === 8 /* Node.COMMENT_NODE */ &&
                  node.nodeValue === marker) {
                  const parent = node.parentNode;
                  // Add a new marker node to be the startNode of the Part if any of the
                  // following are true:
                  //  * We don't have a previousSibling
                  //  * previousSibling is being removed (thus it's not the
                  //    `previousNode`)
                  //  * previousSibling is not a Text node
                  //
                  // TODO(justinfagnani): We should be able to use the previousNode here
                  // as the marker node and reduce the number of extra nodes we add to a
                  // template. See https://github.com/PolymerLabs/lit-html/issues/147
                  const previousSibling = node.previousSibling;
                  if (previousSibling === null || previousSibling !== previousNode ||
                      previousSibling.nodeType !== Node.TEXT_NODE) {
                      parent.insertBefore(document.createComment(''), node);
                  }
                  else {
                      index--;
                  }
                  this.parts.push(new TemplatePart('node', index++));
                  nodesToRemove.push(node);
                  // If we don't have a nextSibling add a marker node.
                  // We don't have to check if the next node is going to be removed,
                  // because that node will induce a new marker if so.
                  if (node.nextSibling === null) {
                      parent.insertBefore(document.createComment(''), node);
                  }
                  else {
                      index--;
                  }
                  currentNode = previousNode;
                  partIndex++;
              }
          }
          // Remove text binding nodes after the walk to not disturb the TreeWalker
          for (const n of nodesToRemove) {
              n.parentNode.removeChild(n);
          }
      }
  }
  /**
   * Returns a value ready to be inserted into a Part from a user-provided value.
   *
   * If the user value is a directive, this invokes the directive with the given
   * part. If the value is null, it's converted to undefined to work better
   * with certain DOM APIs, like textContent.
   */
  const getValue = (part, value) => {
      // `null` as the value of a Text node will render the string 'null'
      // so we convert it to undefined
      if (isDirective(value)) {
          value = value(part);
          return noChange;
      }
      return value === null ? undefined : value;
  };
  const isDirective = (o) => typeof o === 'function' && o.__litDirective === true;
  /**
   * A sentinel value that signals that a value was handled by a directive and
   * should not be written to the DOM.
   */
  const noChange = {};
  const isPrimitiveValue = (value) => value === null ||
      !(typeof value === 'object' || typeof value === 'function');
  class AttributePart {
      constructor(instance, element, name, strings) {
          this.instance = instance;
          this.element = element;
          this.name = name;
          this.strings = strings;
          this.size = strings.length - 1;
          this._previousValues = [];
      }
      _interpolate(values, startIndex) {
          const strings = this.strings;
          const l = strings.length - 1;
          let text = '';
          for (let i = 0; i < l; i++) {
              text += strings[i];
              const v = getValue(this, values[startIndex + i]);
              if (v && v !== noChange &&
                  (Array.isArray(v) || typeof v !== 'string' && v[Symbol.iterator])) {
                  for (const t of v) {
                      // TODO: we need to recursively call getValue into iterables...
                      text += t;
                  }
              }
              else {
                  text += v;
              }
          }
          return text + strings[l];
      }
      _equalToPreviousValues(values, startIndex) {
          for (let i = startIndex; i < startIndex + this.size; i++) {
              if (this._previousValues[i] !== values[i] ||
                  !isPrimitiveValue(values[i])) {
                  return false;
              }
          }
          return true;
      }
      setValue(values, startIndex) {
          if (this._equalToPreviousValues(values, startIndex)) {
              return;
          }
          const s = this.strings;
          let value;
          if (s.length === 2 && s[0] === '' && s[1] === '') {
              // An expression that occupies the whole attribute value will leave
              // leading and trailing empty strings.
              value = getValue(this, values[startIndex]);
              if (Array.isArray(value)) {
                  value = value.join('');
              }
          }
          else {
              value = this._interpolate(values, startIndex);
          }
          if (value !== noChange) {
              this.element.setAttribute(this.name, value);
          }
          this._previousValues = values;
      }
  }
  class NodePart {
      constructor(instance, startNode, endNode) {
          this.instance = instance;
          this.startNode = startNode;
          this.endNode = endNode;
          this._previousValue = undefined;
      }
      setValue(value) {
          value = getValue(this, value);
          if (value === noChange) {
              return;
          }
          if (isPrimitiveValue(value)) {
              // Handle primitive values
              // If the value didn't change, do nothing
              if (value === this._previousValue) {
                  return;
              }
              this._setText(value);
          }
          else if (value instanceof TemplateResult) {
              this._setTemplateResult(value);
          }
          else if (Array.isArray(value) || value[Symbol.iterator]) {
              this._setIterable(value);
          }
          else if (value instanceof Node) {
              this._setNode(value);
          }
          else if (value.then !== undefined) {
              this._setPromise(value);
          }
          else {
              // Fallback, will render the string representation
              this._setText(value);
          }
      }
      _insert(node) {
          this.endNode.parentNode.insertBefore(node, this.endNode);
      }
      _setNode(value) {
          if (this._previousValue === value) {
              return;
          }
          this.clear();
          this._insert(value);
          this._previousValue = value;
      }
      _setText(value) {
          const node = this.startNode.nextSibling;
          value = value === undefined ? '' : value;
          if (node === this.endNode.previousSibling &&
              node.nodeType === Node.TEXT_NODE) {
              // If we only have a single text node between the markers, we can just
              // set its value, rather than replacing it.
              // TODO(justinfagnani): Can we just check if _previousValue is
              // primitive?
              node.textContent = value;
          }
          else {
              this._setNode(document.createTextNode(value));
          }
          this._previousValue = value;
      }
      _setTemplateResult(value) {
          const template = this.instance._getTemplate(value);
          let instance;
          if (this._previousValue && this._previousValue.template === template) {
              instance = this._previousValue;
          }
          else {
              instance = new TemplateInstance(template, this.instance._partCallback, this.instance._getTemplate);
              this._setNode(instance._clone());
              this._previousValue = instance;
          }
          instance.update(value.values);
      }
      _setIterable(value) {
          // For an Iterable, we create a new InstancePart per item, then set its
          // value to the item. This is a little bit of overhead for every item in
          // an Iterable, but it lets us recurse easily and efficiently update Arrays
          // of TemplateResults that will be commonly returned from expressions like:
          // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
          // If _previousValue is an array, then the previous render was of an
          // iterable and _previousValue will contain the NodeParts from the previous
          // render. If _previousValue is not an array, clear this part and make a new
          // array for NodeParts.
          if (!Array.isArray(this._previousValue)) {
              this.clear();
              this._previousValue = [];
          }
          // Lets us keep track of how many items we stamped so we can clear leftover
          // items from a previous render
          const itemParts = this._previousValue;
          let partIndex = 0;
          for (const item of value) {
              // Try to reuse an existing part
              let itemPart = itemParts[partIndex];
              // If no existing part, create a new one
              if (itemPart === undefined) {
                  // If we're creating the first item part, it's startNode should be the
                  // container's startNode
                  let itemStart = this.startNode;
                  // If we're not creating the first part, create a new separator marker
                  // node, and fix up the previous part's endNode to point to it
                  if (partIndex > 0) {
                      const previousPart = itemParts[partIndex - 1];
                      itemStart = previousPart.endNode = document.createTextNode('');
                      this._insert(itemStart);
                  }
                  itemPart = new NodePart(this.instance, itemStart, this.endNode);
                  itemParts.push(itemPart);
              }
              itemPart.setValue(item);
              partIndex++;
          }
          if (partIndex === 0) {
              this.clear();
              this._previousValue = undefined;
          }
          else if (partIndex < itemParts.length) {
              const lastPart = itemParts[partIndex - 1];
              // Truncate the parts array so _previousValue reflects the current state
              itemParts.length = partIndex;
              this.clear(lastPart.endNode.previousSibling);
              lastPart.endNode = this.endNode;
          }
      }
      _setPromise(value) {
          this._previousValue = value;
          value.then((v) => {
              if (this._previousValue === value) {
                  this.setValue(v);
              }
          });
      }
      clear(startNode = this.startNode) {
          removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
      }
  }
  const defaultPartCallback = (instance, templatePart, node) => {
      if (templatePart.type === 'attribute') {
          return new AttributePart(instance, node, templatePart.name, templatePart.strings);
      }
      else if (templatePart.type === 'node') {
          return new NodePart(instance, node, node.nextSibling);
      }
      throw new Error(`Unknown part type ${templatePart.type}`);
  };
  /**
   * An instance of a `Template` that can be attached to the DOM and updated
   * with new values.
   */
  class TemplateInstance {
      constructor(template, partCallback, getTemplate) {
          this._parts = [];
          this.template = template;
          this._partCallback = partCallback;
          this._getTemplate = getTemplate;
      }
      update(values) {
          let valueIndex = 0;
          for (const part of this._parts) {
              if (!part) {
                  valueIndex++;
              }
              else if (part.size === undefined) {
                  part.setValue(values[valueIndex]);
                  valueIndex++;
              }
              else {
                  part.setValue(values, valueIndex);
                  valueIndex += part.size;
              }
          }
      }
      _clone() {
          // Clone the node, rather than importing it, to keep the fragment in the
          // template's document. This leaves the fragment inert so custom elements
          // won't upgrade until after the main document adopts the node.
          const fragment = this.template.element.content.cloneNode(true);
          const parts = this.template.parts;
          if (parts.length > 0) {
              // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
              // null
              const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT |
                     NodeFilter.SHOW_TEXT */, null, false);
              let index = -1;
              for (let i = 0; i < parts.length; i++) {
                  const part = parts[i];
                  const partActive = isTemplatePartActive(part);
                  // An inactive part has no coresponding Template node.
                  if (partActive) {
                      while (index < part.index) {
                          index++;
                          walker.nextNode();
                      }
                  }
                  this._parts.push(partActive ? this._partCallback(this, part, walker.currentNode) : undefined);
              }
          }
          return fragment;
      }
  }
  /**
   * Removes nodes, starting from `startNode` (inclusive) to `endNode`
   * (exclusive), from `container`.
   */
  const removeNodes = (container, startNode, endNode = null) => {
      let node = startNode;
      while (node !== endNode) {
          const n = node.nextSibling;
          container.removeChild(node);
          node = n;
      }
  };

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  const walkerNodeFilter = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT |
      NodeFilter.SHOW_TEXT;
  /**
   * Removes the list of nodes from a Template safely. In addition to removing
   * nodes from the Template, the Template part indices are updated to match
   * the mutated Template DOM.
   *
   * As the template is walked the removal state is tracked and
   * part indices are adjusted as needed.
   *
   * div
   *   div#1 (remove) <-- start removing (removing node is div#1)
   *     div
   *       div#2 (remove)  <-- continue removing (removing node is still div#1)
   *         div
   * div <-- stop removing since previous sibling is the removing node (div#1, removed 4 nodes)
   */
  function removeNodesFromTemplate(template, nodesToRemove) {
      const { element: { content }, parts } = template;
      const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
      let partIndex = 0;
      let part = parts[0];
      let nodeIndex = -1;
      let removeCount = 0;
      const nodesToRemoveInTemplate = [];
      let currentRemovingNode = null;
      while (walker.nextNode()) {
          nodeIndex++;
          const node = walker.currentNode;
          // End removal if stepped past the removing node
          if (node.previousSibling === currentRemovingNode) {
              currentRemovingNode = null;
          }
          // A node to remove was found in the template
          if (nodesToRemove.has(node)) {
              nodesToRemoveInTemplate.push(node);
              // Track node we're removing
              if (currentRemovingNode === null) {
                  currentRemovingNode = node;
              }
          }
          // When removing, increment count by which to adjust subsequent part indices
          if (currentRemovingNode !== null) {
              removeCount++;
          }
          while (part !== undefined && part.index === nodeIndex) {
              // If part is in a removed node deactivate it by setting index to -1 or
              // adjust the index as needed.
              part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
              part = parts[++partIndex];
          }
      }
      nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
  }
  const countNodes = (node) => {
      let count = 1;
      const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
      while (walker.nextNode()) {
          count++;
      }
      return count;
  };
  const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
      for (let i = startIndex + 1; i < parts.length; i++) {
          const part = parts[i];
          if (isTemplatePartActive(part)) {
              return i;
          }
      }
      return -1;
  };
  /**
   * Inserts the given node into the Template, optionally before the given
   * refNode. In addition to inserting the node into the Template, the Template
   * part indices are updated to match the mutated Template DOM.
   */
  function insertNodeIntoTemplate(template, node, refNode = null) {
      const { element: { content }, parts } = template;
      // If there's no refNode, then put node at end of template.
      // No part indices need to be shifted in this case.
      if (refNode === null || refNode === undefined) {
          content.appendChild(node);
          return;
      }
      const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
      let partIndex = nextActiveIndexInTemplateParts(parts);
      let insertCount = 0;
      let walkerIndex = -1;
      while (walker.nextNode()) {
          walkerIndex++;
          const walkerNode = walker.currentNode;
          if (walkerNode === refNode) {
              refNode.parentNode.insertBefore(node, refNode);
              insertCount = countNodes(node);
          }
          while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
              // If we've inserted the node, simply adjust all subsequent parts
              if (insertCount > 0) {
                  while (partIndex !== -1) {
                      parts[partIndex].index += insertCount;
                      partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                  }
                  return;
              }
              partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
          }
      }
  }

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  // Get a key to lookup in `templateCaches`.
  const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
  /**
   * Template factory which scopes template DOM using ShadyCSS.
   * @param scopeName {string}
   */
  const shadyTemplateFactory = (scopeName) => (result) => {
      const cacheKey = getTemplateCacheKey(result.type, scopeName);
      let templateCache = templateCaches.get(cacheKey);
      if (templateCache === undefined) {
          templateCache = new Map();
          templateCaches.set(cacheKey, templateCache);
      }
      let template = templateCache.get(result.strings);
      if (template === undefined) {
          const element = result.getTemplateElement();
          if (typeof window.ShadyCSS === 'object') {
              window.ShadyCSS.prepareTemplateDom(element, scopeName);
          }
          template = new Template(result, element);
          templateCache.set(result.strings, template);
      }
      return template;
  };
  const TEMPLATE_TYPES = ['html', 'svg'];
  /**
   * Removes all style elements from Templates for the given scopeName.
   */
  function removeStylesFromLitTemplates(scopeName) {
      TEMPLATE_TYPES.forEach((type) => {
          const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
          if (templates !== undefined) {
              templates.forEach((template) => {
                  const { element: { content } } = template;
                  const styles = content.querySelectorAll('style');
                  removeNodesFromTemplate(template, new Set(Array.from(styles)));
              });
          }
      });
  }
  const shadyRenderSet = new Set();
  /**
   * For the given scope name, ensures that ShadyCSS style scoping is performed.
   * This is done just once per scope name so the fragment and template cannot
   * be modified.
   * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
   * to be scoped and appended to the document
   * (2) removes style elements from all lit-html Templates for this scope name.
   *
   * Note, <style> elements can only be placed into templates for the
   * initial rendering of the scope. If <style> elements are included in templates
   * dynamically rendered to the scope (after the first scope render), they will
   * not be scoped and the <style> will be left in the template and rendered output.
   */
  const ensureStylesScoped = (fragment, template, scopeName) => {
      // only scope element template once per scope name
      if (!shadyRenderSet.has(scopeName)) {
          shadyRenderSet.add(scopeName);
          const styleTemplate = document.createElement('template');
          Array.from(fragment.querySelectorAll('style')).forEach((s) => {
              styleTemplate.content.appendChild(s);
          });
          window.ShadyCSS.prepareTemplateStyles(styleTemplate, scopeName);
          // Fix templates: note the expectation here is that the given `fragment`
          // has been generated from the given `template` which contains
          // the set of templates rendered into this scope.
          // It is only from this set of initial templates from which styles
          // will be scoped and removed.
          removeStylesFromLitTemplates(scopeName);
          // ApplyShim case
          if (window.ShadyCSS.nativeShadow) {
              const style = styleTemplate.content.querySelector('style');
              if (style !== null) {
                  // Insert style into rendered fragment
                  fragment.insertBefore(style, fragment.firstChild);
                  // Insert into lit-template (for subsequent renders)
                  insertNodeIntoTemplate(template, style.cloneNode(true), template.element.content.firstChild);
              }
          }
      }
  };
  // NOTE: We're copying code from lit-html's `render` method here.
  // We're doing this explicitly because the API for rendering templates is likely
  // to change in the near term.
  function render$1(result, container, scopeName) {
      const templateFactory = shadyTemplateFactory(scopeName);
      const template = templateFactory(result);
      let instance = container.__templateInstance;
      // Repeat render, just call update()
      if (instance !== undefined && instance.template === template &&
          instance._partCallback === result.partCallback) {
          instance.update(result.values);
          return;
      }
      // First render, create a new TemplateInstance and append it
      instance =
          new TemplateInstance(template, result.partCallback, templateFactory);
      container.__templateInstance = instance;
      const fragment = instance._clone();
      instance.update(result.values);
      const host = container instanceof ShadowRoot ?
          container.host :
          undefined;
      // If there's a shadow host, do ShadyCSS scoping...
      if (host !== undefined && typeof window.ShadyCSS === 'object') {
          ensureStylesScoped(fragment, template, scopeName);
          window.ShadyCSS.styleElement(host);
      }
      removeNodes(container, container.firstChild);
      container.appendChild(fragment);
  }

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * Interprets a template literal as a lit-extended HTML template.
   */
  const html$1 = (strings, ...values) => new TemplateResult(strings, values, 'html', extendedPartCallback);
  /**
   * A PartCallback which allows templates to set properties and declarative
   * event handlers.
   *
   * Properties are set by default, instead of attributes. Attribute names in
   * lit-html templates preserve case, so properties are case sensitive. If an
   * expression takes up an entire attribute value, then the property is set to
   * that value. If an expression is interpolated with a string or other
   * expressions then the property is set to the string result of the
   * interpolation.
   *
   * To set an attribute instead of a property, append a `$` suffix to the
   * attribute name.
   *
   * Example:
   *
   *     html`<button class$="primary">Buy Now</button>`
   *
   * To set an event handler, prefix the attribute name with `on-`:
   *
   * Example:
   *
   *     html`<button on-click=${(e)=> this.onClickHandler(e)}>Buy Now</button>`
   *
   */
  const extendedPartCallback = (instance, templatePart, node) => {
      if (templatePart.type === 'attribute') {
          if (templatePart.rawName.substr(0, 3) === 'on-') {
              const eventName = templatePart.rawName.slice(3);
              return new EventPart(instance, node, eventName);
          }
          const lastChar = templatePart.name.substr(templatePart.name.length - 1);
          if (lastChar === '$') {
              const name = templatePart.name.slice(0, -1);
              return new AttributePart(instance, node, name, templatePart.strings);
          }
          if (lastChar === '?') {
              const name = templatePart.name.slice(0, -1);
              return new BooleanAttributePart(instance, node, name, templatePart.strings);
          }
          return new PropertyPart(instance, node, templatePart.rawName, templatePart.strings);
      }
      return defaultPartCallback(instance, templatePart, node);
  };
  /**
   * Implements a boolean attribute, roughly as defined in the HTML
   * specification.
   *
   * If the value is truthy, then the attribute is present with a value of
   * ''. If the value is falsey, the attribute is removed.
   */
  class BooleanAttributePart extends AttributePart {
      setValue(values, startIndex) {
          const s = this.strings;
          if (s.length === 2 && s[0] === '' && s[1] === '') {
              const value = getValue(this, values[startIndex]);
              if (value === noChange) {
                  return;
              }
              if (value) {
                  this.element.setAttribute(this.name, '');
              }
              else {
                  this.element.removeAttribute(this.name);
              }
          }
          else {
              throw new Error('boolean attributes can only contain a single expression');
          }
      }
  }
  class PropertyPart extends AttributePart {
      setValue(values, startIndex) {
          const s = this.strings;
          let value;
          if (this._equalToPreviousValues(values, startIndex)) {
              return;
          }
          if (s.length === 2 && s[0] === '' && s[1] === '') {
              // An expression that occupies the whole attribute value will leave
              // leading and trailing empty strings.
              value = getValue(this, values[startIndex]);
          }
          else {
              // Interpolation, so interpolate
              value = this._interpolate(values, startIndex);
          }
          if (value !== noChange) {
              this.element[this.name] = value;
          }
          this._previousValues = values;
      }
  }
  class EventPart {
      constructor(instance, element, eventName) {
          this.instance = instance;
          this.element = element;
          this.eventName = eventName;
      }
      setValue(value) {
          const listener = getValue(this, value);
          if (listener === this._listener) {
              return;
          }
          if (listener == null) {
              this.element.removeEventListener(this.eventName, this);
          }
          else if (this._listener == null) {
              this.element.addEventListener(this.eventName, this);
          }
          this._listener = listener;
      }
      handleEvent(event) {
          if (typeof this._listener === 'function') {
              this._listener.call(this.element, event);
          }
          else if (typeof this._listener.handleEvent === 'function') {
              this._listener.handleEvent(event);
          }
      }
  }

  class LitElement extends PropertiesMixin(HTMLElement) {
      constructor() {
          super(...arguments);
          this.__renderComplete = null;
          this.__resolveRenderComplete = null;
          this.__isInvalid = false;
          this.__isChanging = false;
      }
      /**
       * Override which sets up element rendering by calling* `_createRoot`
       * and `_firstRendered`.
       */
      ready() {
          this._root = this._createRoot();
          super.ready();
          this._firstRendered();
      }
      connectedCallback() {
          if (window.ShadyCSS && this._root) {
              window.ShadyCSS.styleElement(this);
          }
          super.connectedCallback();
      }
      /**
       * Called after the element DOM is rendered for the first time.
       * Implement to perform tasks after first rendering like capturing a
       * reference to a static node which must be directly manipulated.
       * This should not be commonly needed. For tasks which should be performed
       * before first render, use the element constructor.
       */
      _firstRendered() { }
      /**
       * Implement to customize where the element's template is rendered by
       * returning an element into which to render. By default this creates
       * a shadowRoot for the element. To render into the element's childNodes,
       * return `this`.
       * @returns {Element|DocumentFragment} Returns a node into which to render.
       */
      _createRoot() {
          return this.attachShadow({ mode: 'open' });
      }
      /**
       * Override which returns the value of `_shouldRender` which users
       * should implement to control rendering. If this method returns false,
       * _propertiesChanged will not be called and no rendering will occur even
       * if property values change or `requestRender` is called.
       * @param _props Current element properties
       * @param _changedProps Changing element properties
       * @param _prevProps Previous element properties
       * @returns {boolean} Default implementation always returns true.
       */
      _shouldPropertiesChange(_props, _changedProps, _prevProps) {
          const shouldRender = this._shouldRender(_props, _changedProps, _prevProps);
          if (!shouldRender && this.__resolveRenderComplete) {
              this.__resolveRenderComplete(false);
          }
          return shouldRender;
      }
      /**
       * Implement to control if rendering should occur when property values
       * change or `requestRender` is called. By default, this method always
       * returns true, but this can be customized as an optimization to avoid
       * rendering work when changes occur which should not be rendered.
       * @param _props Current element properties
       * @param _changedProps Changing element properties
       * @param _prevProps Previous element properties
       * @returns {boolean} Default implementation always returns true.
       */
      _shouldRender(_props, _changedProps, _prevProps) {
          return true;
      }
      /**
       * Override which performs element rendering by calling
       * `_render`, `_applyRender`, and finally `_didRender`.
       * @param props Current element properties
       * @param changedProps Changing element properties
       * @param prevProps Previous element properties
       */
      _propertiesChanged(props, changedProps, prevProps) {
          super._propertiesChanged(props, changedProps, prevProps);
          const result = this._render(props);
          if (result && this._root !== undefined) {
              this._applyRender(result, this._root);
          }
          this._didRender(props, changedProps, prevProps);
          if (this.__resolveRenderComplete) {
              this.__resolveRenderComplete(true);
          }
      }
      _flushProperties() {
          this.__isChanging = true;
          this.__isInvalid = false;
          super._flushProperties();
          this.__isChanging = false;
      }
      /**
       * Override which warns when a user attempts to change a property during
       * the rendering lifecycle. This is an anti-pattern and should be avoided.
       * @param property {string}
       * @param value {any}
       * @param old {any}
       */
      // tslint:disable-next-line no-any
      _shouldPropertyChange(property, value, old) {
          const change = super._shouldPropertyChange(property, value, old);
          if (change && this.__isChanging) {
              console.trace(`Setting properties in response to other properties changing ` +
                  `considered harmful. Setting '${property}' from ` +
                  `'${this._getProperty(property)}' to '${value}'.`);
          }
          return change;
      }
      /**
       * Implement to describe the DOM which should be rendered in the element.
       * Ideally, the implementation is a pure function using only props to describe
       * the element template. The implementation must return a `lit-html`
       * TemplateResult. By default this template is rendered into the element's
       * shadowRoot. This can be customized by implementing `_createRoot`. This
       * method must be implemented.
       * @param {*} _props Current element properties
       * @returns {TemplateResult} Must return a lit-html TemplateResult.
       */
      _render(_props) {
          throw new Error('_render() not implemented');
      }
      /**
       * Renders the given lit-html template `result` into the given `node`.
       * Implement to customize the way rendering is applied. This is should not
       * typically be needed and is provided for advanced use cases.
       * @param result {TemplateResult} `lit-html` template result to render
       * @param node {Element|DocumentFragment} node into which to render
       */
      _applyRender(result, node) {
          render$1(result, node, this.localName);
      }
      /**
       * Called after element DOM has been rendered. Implement to
       * directly control rendered DOM. Typically this is not needed as `lit-html`
       * can be used in the `_render` method to set properties, attributes, and
       * event listeners. However, it is sometimes useful for calling methods on
       * rendered elements, like calling `focus()` on an element to focus it.
       * @param _props Current element properties
       * @param _changedProps Changing element properties
       * @param _prevProps Previous element properties
       */
      _didRender(_props, _changedProps, _prevProps) { }
      /**
       * Call to request the element to asynchronously re-render regardless
       * of whether or not any property changes are pending.
       */
      requestRender() { this._invalidateProperties(); }
      /**
       * Override which provides tracking of invalidated state.
       */
      _invalidateProperties() {
          this.__isInvalid = true;
          super._invalidateProperties();
      }
      /**
       * Returns a promise which resolves after the element next renders.
       * The promise resolves to `true` if the element rendered and `false` if the
       * element did not render.
       * This is useful when users (e.g. tests) need to react to the rendered state
       * of the element after a change is made.
       * This can also be useful in event handlers if it is desireable to wait
       * to send an event until after rendering. If possible implement the
       * `_didRender` method to directly respond to rendering within the
       * rendering lifecycle.
       */
      get renderComplete() {
          if (!this.__renderComplete) {
              this.__renderComplete = new Promise((resolve) => {
                  this.__resolveRenderComplete = (value) => {
                      this.__resolveRenderComplete = this.__renderComplete = null;
                      resolve(value);
                  };
              });
              if (!this.__isInvalid && this.__resolveRenderComplete) {
                  Promise.resolve().then(() => this.__resolveRenderComplete(false));
              }
          }
          return this.__renderComplete;
      }
  }

  /*
    This is just a junk drawer, containing anything used across multiple classes.
    Because Luxon is small(ish), this should stay small and we won't worry about splitting
    it up into, say, parsingUtil.js and basicUtil.js and so on. But they are divided up by feature area.
  */

  /**
   * @private
   */

  // TYPES

  function isUndefined(o) {
    return typeof o === 'undefined';
  }

  function isNumber(o) {
    return typeof o === 'number';
  }

  function isString(o) {
    return typeof o === 'string';
  }

  function isDate(o) {
    return Object.prototype.toString.call(o) === '[object Date]';
  }

  // CAPABILITIES

  function hasIntl() {
    return typeof Intl !== 'undefined' && Intl.DateTimeFormat;
  }

  function hasFormatToParts() {
    return !isUndefined(Intl.DateTimeFormat.prototype.formatToParts);
  }

  // OBJECTS AND ARRAYS

  function maybeArray(thing) {
    return Array.isArray(thing) ? thing : [thing];
  }

  function bestBy(arr, by, compare) {
    if (arr.length === 0) {
      return undefined;
    }
    return arr.reduce((best, next) => {
      const pair = [by(next), next];
      if (!best) {
        return pair;
      } else if (compare.apply(null, [best[0], pair[0]]) === best[0]) {
        return best;
      } else {
        return pair;
      }
    }, null)[1];
  }

  function pick(obj, keys) {
    return keys.reduce((a, k) => {
      a[k] = obj[k];
      return a;
    }, {});
  }

  // NUMBERS AND STRINGS

  function numberBetween(thing, bottom, top) {
    return isNumber(thing) && thing >= bottom && thing <= top;
  }

  // x % n but takes the sign of n instead of x
  function floorMod(x, n) {
    return x - n * Math.floor(x / n);
  }

  function padStart(input, n = 2) {
    if (input.toString().length < n) {
      return ('0'.repeat(n) + input).slice(-n);
    } else {
      return input.toString();
    }
  }

  function parseMillis(fraction) {
    if (isUndefined(fraction)) {
      return NaN;
    } else {
      const f = parseFloat('0.' + fraction) * 1000;
      return Math.floor(f);
    }
  }

  function roundTo(number, digits) {
    const factor = 10 ** digits;
    return Math.round(number * factor) / factor;
  }

  // DATE BASICS

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }

  function daysInMonth(year, month) {
    const modMonth = floorMod(month - 1, 12) + 1,
      modYear = year + (month - modMonth) / 12;

    if (modMonth === 2) {
      return isLeapYear(modYear) ? 29 : 28;
    } else {
      return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][modMonth - 1];
    }
  }

  function weeksInWeekYear(weekYear) {
    const p1 =
        (weekYear +
          Math.floor(weekYear / 4) -
          Math.floor(weekYear / 100) +
          Math.floor(weekYear / 400)) %
        7,
      last = weekYear - 1,
      p2 = (last + Math.floor(last / 4) - Math.floor(last / 100) + Math.floor(last / 400)) % 7;
    return p1 === 4 || p2 === 3 ? 53 : 52;
  }

  function untruncateYear(year) {
    if (year > 99) {
      return year;
    } else return year > 60 ? 1900 + year : 2000 + year;
  }

  // PARSING

  function parseZoneInfo(ts, offsetFormat, locale, timeZone = null) {
    const date = new Date(ts),
      intlOpts = {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };

    if (timeZone) {
      intlOpts.timeZone = timeZone;
    }

    const modified = Object.assign({ timeZoneName: offsetFormat }, intlOpts),
      intl = hasIntl();

    if (intl && hasFormatToParts()) {
      const parsed = new Intl.DateTimeFormat(locale, modified)
        .formatToParts(date)
        .find(m => m.type.toLowerCase() === 'timezonename');
      return parsed ? parsed.value : null;
    } else if (intl) {
      // this probably doesn't work for all locales
      const without = new Intl.DateTimeFormat(locale, intlOpts).format(date),
        included = new Intl.DateTimeFormat(locale, modified).format(date),
        diffed = included.substring(without.length),
        trimmed = diffed.replace(/^[, ]+/, '');
      return trimmed;
    } else {
      return null;
    }
  }

  // signedOffset('-5', '30') -> -330
  function signedOffset(offHourStr, offMinuteStr) {
    const offHour = parseInt(offHourStr, 10) || 0,
      offMin = parseInt(offMinuteStr, 10) || 0,
      offMinSigned = offHour < 0 ? -offMin : offMin;
    return offHour * 60 + offMinSigned;
  }

  // COERCION

  function normalizeObject(obj, normalizer, ignoreUnknown = false) {
    const normalized = {};
    for (const u in obj) {
      if (obj.hasOwnProperty(u)) {
        const v = obj[u];
        if (v !== null && !isUndefined(v) && !Number.isNaN(v)) {
          const mapped = normalizer(u, ignoreUnknown);
          if (mapped) {
            normalized[mapped] = v;
          }
        }
      }
    }
    return normalized;
  }

  function timeObject(obj) {
    return pick(obj, ['hour', 'minute', 'second', 'millisecond']);
  }

  /**
   * @private
   */

  const n = 'numeric',
    s = 'short',
    l = 'long',
    d2 = '2-digit';

  const DATE_SHORT = {
    year: n,
    month: n,
    day: n
  };

  const DATE_MED = {
    year: n,
    month: s,
    day: n
  };

  const DATE_FULL = {
    year: n,
    month: l,
    day: n
  };

  const DATE_HUGE = {
    year: n,
    month: l,
    day: n,
    weekday: l
  };

  const TIME_SIMPLE = {
    hour: n,
    minute: d2
  };

  const TIME_WITH_SECONDS = {
    hour: n,
    minute: d2,
    second: d2
  };

  const TIME_WITH_SHORT_OFFSET = {
    hour: n,
    minute: d2,
    second: d2,
    timeZoneName: s
  };

  const TIME_WITH_LONG_OFFSET = {
    hour: n,
    minute: d2,
    second: d2,
    timeZoneName: l
  };

  const TIME_24_SIMPLE = {
    hour: n,
    minute: d2,
    hour12: false
  };

  /**
   * {@link toLocaleString}; format like '09:30:23', always 24-hour.
   */
  const TIME_24_WITH_SECONDS = {
    hour: n,
    minute: d2,
    second: d2,
    hour12: false
  };

  /**
   * {@link toLocaleString}; format like '09:30:23 EDT', always 24-hour.
   */
  const TIME_24_WITH_SHORT_OFFSET = {
    hour: n,
    minute: d2,
    second: d2,
    hour12: false,
    timeZoneName: s
  };

  /**
   * {@link toLocaleString}; format like '09:30:23 Eastern Daylight Time', always 24-hour.
   */
  const TIME_24_WITH_LONG_OFFSET = {
    hour: n,
    minute: d2,
    second: d2,
    hour12: false,
    timeZoneName: l
  };

  /**
   * {@link toLocaleString}; format like '10/14/1983, 9:30 AM'. Only 12-hour if the locale is.
   */
  const DATETIME_SHORT = {
    year: n,
    month: n,
    day: n,
    hour: n,
    minute: d2
  };

  /**
   * {@link toLocaleString}; format like '10/14/1983, 9:30:33 AM'. Only 12-hour if the locale is.
   */
  const DATETIME_SHORT_WITH_SECONDS = {
    year: n,
    month: n,
    day: n,
    hour: n,
    minute: d2,
    second: d2
  };

  const DATETIME_MED = {
    year: n,
    month: s,
    day: n,
    hour: n,
    minute: d2
  };

  const DATETIME_MED_WITH_SECONDS = {
    year: n,
    month: s,
    day: n,
    hour: n,
    minute: d2,
    second: d2
  };

  const DATETIME_FULL = {
    year: n,
    month: l,
    day: n,
    hour: n,
    minute: d2,
    timeZoneName: s
  };

  const DATETIME_FULL_WITH_SECONDS = {
    year: n,
    month: l,
    day: n,
    hour: n,
    minute: d2,
    second: d2,
    timeZoneName: s
  };

  const DATETIME_HUGE = {
    year: n,
    month: l,
    day: n,
    weekday: l,
    hour: n,
    minute: d2,
    timeZoneName: l
  };

  const DATETIME_HUGE_WITH_SECONDS = {
    year: n,
    month: l,
    day: n,
    weekday: l,
    hour: n,
    minute: d2,
    second: d2,
    timeZoneName: l
  };

  function stringify(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * @private
   */

  const monthsLong = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const monthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  const monthsNarrow = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  function months(length) {
    switch (length) {
      case 'narrow':
        return monthsNarrow;
      case 'short':
        return monthsShort;
      case 'long':
        return monthsLong;
      case 'numeric':
        return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      case '2-digit':
        return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      default:
        return null;
    }
  }

  const weekdaysLong = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const weekdaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weekdaysNarrow = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function weekdays(length) {
    switch (length) {
      case 'narrow':
        return weekdaysNarrow;
      case 'short':
        return weekdaysShort;
      case 'long':
        return weekdaysLong;
      case 'numeric':
        return ['1', '2', '3', '4', '5', '6', '7'];
      default:
        return null;
    }
  }

  const meridiems = ['AM', 'PM'];

  const erasLong = ['Before Christ', 'Anno Domini'];

  const erasShort = ['BC', 'AD'];

  const erasNarrow = ['B', 'A'];

  function eras(length) {
    switch (length) {
      case 'narrow':
        return erasNarrow;
      case 'short':
        return erasShort;
      case 'long':
        return erasLong;
      default:
        return null;
    }
  }

  function meridiemForDateTime(dt) {
    return meridiems[dt.hour < 12 ? 0 : 1];
  }

  function weekdayForDateTime(dt, length) {
    return weekdays(length)[dt.weekday - 1];
  }

  function monthForDateTime(dt, length) {
    return months(length)[dt.month - 1];
  }

  function eraForDateTime(dt, length) {
    return eras(length)[dt.year < 0 ? 0 : 1];
  }

  function formatString(knownFormat) {
    // these all have the offsets removed because we don't have access to them
    // without all the intl stuff this is backfilling
    const filtered = pick(knownFormat, [
        'weekday',
        'era',
        'year',
        'month',
        'day',
        'hour',
        'minute',
        'second',
        'timeZoneName',
        'hour12'
      ]),
      key = stringify(filtered),
      dateTimeHuge = 'EEEE, LLLL d, yyyy, h:mm a';
    switch (key) {
      case stringify(DATE_SHORT):
        return 'M/d/yyyy';
      case stringify(DATE_MED):
        return 'LLL d, yyyy';
      case stringify(DATE_FULL):
        return 'LLLL d, yyyy';
      case stringify(DATE_HUGE):
        return 'EEEE, LLLL d, yyyy';
      case stringify(TIME_SIMPLE):
        return 'h:mm a';
      case stringify(TIME_WITH_SECONDS):
        return 'h:mm:ss a';
      case stringify(TIME_WITH_SHORT_OFFSET):
        return 'h:mm a';
      case stringify(TIME_WITH_LONG_OFFSET):
        return 'h:mm a';
      case stringify(TIME_24_SIMPLE):
        return 'HH:mm';
      case stringify(TIME_24_WITH_SECONDS):
        return 'HH:mm:ss';
      case stringify(TIME_24_WITH_SHORT_OFFSET):
        return 'HH:mm';
      case stringify(TIME_24_WITH_LONG_OFFSET):
        return 'HH:mm';
      case stringify(DATETIME_SHORT):
        return 'M/d/yyyy, h:mm a';
      case stringify(DATETIME_MED):
        return 'LLL d, yyyy, h:mm a';
      case stringify(DATETIME_FULL):
        return 'LLLL d, yyyy, h:mm a';
      case stringify(DATETIME_HUGE):
        return dateTimeHuge;
      case stringify(DATETIME_SHORT_WITH_SECONDS):
        return 'M/d/yyyy, h:mm:ss a';
      case stringify(DATETIME_MED_WITH_SECONDS):
        return 'LLL d, yyyy, h:mm:ss a';
      case stringify(DATETIME_FULL_WITH_SECONDS):
        return 'LLLL d, yyyy, h:mm:ss a';
      case stringify(DATETIME_HUGE_WITH_SECONDS):
        return 'EEEE, LLLL d, yyyy, h:mm:ss a';
      default:
        return dateTimeHuge;
    }
  }

  // these aren't really private, but nor are they really useful to document

  /**
   * @private
   */
  class LuxonError extends Error {}

  /**
   * @private
   */
  class InvalidDateTimeError extends LuxonError {
    constructor(reason) {
      super(`Invalid DateTime: ${reason}`);
    }
  }

  /**
   * @private
   */
  class InvalidIntervalError extends LuxonError {
    constructor(reason) {
      super(`Invalid Interval: ${reason}`);
    }
  }

  /**
   * @private
   */
  class InvalidDurationError extends LuxonError {
    constructor(reason) {
      super(`Invalid Duration: ${reason}`);
    }
  }

  /**
   * @private
   */
  class ConflictingSpecificationError extends LuxonError {}

  /**
   * @private
   */
  class InvalidUnitError extends LuxonError {
    constructor(unit) {
      super(`Invalid unit ${unit}`);
    }
  }

  /**
   * @private
   */
  class InvalidArgumentError extends LuxonError {}

  /**
   * @private
   */
  class ZoneIsAbstractError extends LuxonError {
    constructor() {
      super('Zone is an abstract class');
    }
  }

  /* eslint no-unused-vars: "off" */

  /**
   * @interface
  */
  class Zone {
    /**
     * The type of zone
     * @abstract
     * @type {string}
     */
    get type() {
      throw new ZoneIsAbstractError();
    }

    /**
     * The name of this zone.
     * @abstract
     * @type {string}
     */
    get name() {
      throw new ZoneIsAbstractError();
    }

    /**
     * Returns whether the offset is known to be fixed for the whole year.
     * @abstract
     * @type {boolean}
     */
    get universal() {
      throw new ZoneIsAbstractError();
    }

    /**
     * Returns the offset's common name (such as EST) at the specified timestamp
     * @abstract
     * @param {number} ts - Epoch milliseconds for which to get the name
     * @param {Object} opts - Options to affect the format
     * @param {string} opts.format - What style of offset to return. Accepts 'long' or 'short'.
     * @param {string} opts.locale - What locale to return the offset name in.
     * @return {string}
     */
    offsetName(ts, opts) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return the offset in minutes for this zone at the specified timestamp.
     * @abstract
     * @param {number} ts - Epoch milliseconds for which to compute the offset
     * @return {number}
     */
    offset(ts) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return whether this Zone is equal to another zoner
     * @abstract
     * @param {Zone} otherZone - the zone to compare
     * @return {boolean}
     */
    equals(otherZone) {
      throw new ZoneIsAbstractError();
    }

    /**
     * Return whether this Zone is valid.
     * @abstract
     * @type {boolean}
     */
    get isValid() {
      throw new ZoneIsAbstractError();
    }
  }

  let singleton = null;

  class LocalZone extends Zone {
    static get instance() {
      if (singleton === null) {
        singleton = new LocalZone();
      }
      return singleton;
    }

    get type() {
      return 'local';
    }

    get name() {
      if (hasIntl()) {
        return new Intl.DateTimeFormat().resolvedOptions().timeZone;
      } else return 'local';
    }

    get universal() {
      return false;
    }

    offsetName(ts, { format, locale }) {
      return parseZoneInfo(ts, format, locale);
    }

    offset(ts) {
      return -new Date(ts).getTimezoneOffset();
    }

    equals(otherZone) {
      return otherZone.type === 'local';
    }

    get isValid() {
      return true;
    }
  }

  const dtfCache = {};
  function makeDTF(zone) {
    if (!dtfCache[zone]) {
      dtfCache[zone] = new Intl.DateTimeFormat('en-US', {
        hour12: false,
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return dtfCache[zone];
  }

  const typeToPos = {
    year: 0,
    month: 1,
    day: 2,
    hour: 3,
    minute: 4,
    second: 5
  };

  function hackyOffset(dtf, date) {
    const formatted = dtf.format(date).replace(/\u200E/g, ''),
      parsed = /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+):(\d+)/.exec(formatted),
      [, fMonth, fDay, fYear, fHour, fMinute, fSecond] = parsed;
    return [fYear, fMonth, fDay, fHour, fMinute, fSecond];
  }

  function partsOffset(dtf, date) {
    const formatted = dtf.formatToParts(date),
      filled = [];
    for (let i = 0; i < formatted.length; i++) {
      const { type, value } = formatted[i],
        pos = typeToPos[type];

      if (!isUndefined(pos)) {
        filled[pos] = parseInt(value, 10);
      }
    }
    return filled;
  }

  class IANAZone extends Zone {
    static isValidSpecifier(s) {
      return s && s.match(/^[a-z_+-]{1,256}\/[a-z_+-]{1,256}(\/[a-z_+-]{1,256})?$/i);
    }

    static isValidZone(zone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: zone }).format();
        return true;
      } catch (e) {
        return false;
      }
    }

    // Etc/GMT+8 -> 480
    static parseGMTOffset(specifier) {
      if (specifier) {
        const match = specifier.match(/^Etc\/GMT([+-]\d{1,2})$/i);
        if (match) {
          return 60 * parseInt(match[1]);
        }
      }
      return null;
    }

    constructor(name) {
      super();
      this.zoneName = name;
      this.valid = IANAZone.isValidZone(name);
    }

    get type() {
      return 'iana';
    }

    get name() {
      return this.zoneName;
    }

    get universal() {
      return false;
    }

    offsetName(ts, { format, locale }) {
      return parseZoneInfo(ts, format, locale, this.zoneName);
    }

    offset(ts) {
      const date = new Date(ts),
        dtf = makeDTF(this.zoneName),
        [fYear, fMonth, fDay, fHour, fMinute, fSecond] = dtf.formatToParts
          ? partsOffset(dtf, date)
          : hackyOffset(dtf, date),
        asUTC = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond);
      let asTS = date.valueOf();
      asTS -= asTS % 1000;
      return (asUTC - asTS) / (60 * 1000);
    }

    equals(otherZone) {
      return otherZone.type === 'iana' && otherZone.zoneName === this.zoneName;
    }

    get isValid() {
      return this.valid;
    }
  }

  let singleton$1 = null;

  function hoursMinutesOffset(z) {
    const hours = Math.trunc(z.fixed / 60),
      minutes = Math.abs(z.fixed % 60),
      sign = hours > 0 ? '+' : '-',
      base = sign + Math.abs(hours);
    return minutes > 0 ? `${base}:${padStart(minutes, 2)}` : base;
  }

  class FixedOffsetZone extends Zone {
    static get utcInstance() {
      if (singleton$1 === null) {
        singleton$1 = new FixedOffsetZone(0);
      }
      return singleton$1;
    }

    static instance(offset) {
      return offset === 0 ? FixedOffsetZone.utcInstance : new FixedOffsetZone(offset);
    }

    static parseSpecifier(s) {
      if (s) {
        const r = s.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);
        if (r) {
          return new FixedOffsetZone(signedOffset(r[1], r[2]));
        }
      }
      return null;
    }

    constructor(offset) {
      super();
      this.fixed = offset;
    }

    get type() {
      return 'fixed';
    }

    get name() {
      return this.fixed === 0 ? 'UTC' : `UTC${hoursMinutesOffset(this)}`;
    }

    offsetName() {
      return this.name;
    }

    get universal() {
      return true;
    }

    offset() {
      return this.fixed;
    }

    equals(otherZone) {
      return otherZone.type === 'fixed' && otherZone.fixed === this.fixed;
    }

    get isValid() {
      return true;
    }
  }

  let singleton$2 = null;

  class InvalidZone extends Zone {
    static get instance() {
      if (singleton$2 === null) {
        singleton$2 = new InvalidZone();
      }
      return singleton$2;
    }

    get type() {
      return 'invalid';
    }

    get name() {
      return null;
    }

    get universal() {
      return false;
    }

    offsetName() {
      return null;
    }

    offset() {
      return NaN;
    }

    equals() {
      return false;
    }

    get isValid() {
      return false;
    }
  }

  /**
   * @private
   */

  function normalizeZone(input, defaultZone) {
    let offset;
    if (isUndefined(input) || input === null) {
      return defaultZone;
    } else if (input instanceof Zone) {
      return input;
    } else if (isString(input)) {
      const lowered = input.toLowerCase();
      if (lowered === 'local') return LocalZone.instance;
      else if (lowered === 'utc' || lowered === 'gmt') return FixedOffsetZone.utcInstance;
      else if ((offset = IANAZone.parseGMTOffset(input)) != null) {
        // handle Etc/GMT-4, which V8 chokes on
        return FixedOffsetZone.instance(offset);
      } else if (IANAZone.isValidSpecifier(lowered)) return new IANAZone(input);
      else return FixedOffsetZone.parseSpecifier(lowered) || InvalidZone.instance;
    } else if (isNumber(input)) {
      return FixedOffsetZone.instance(input);
    } else if (typeof input === 'object' && input.offset) {
      // This is dumb, but the instanceof check above doesn't seem to really work
      // so we're duck checking it
      return input;
    } else {
      return InvalidZone.instance;
    }
  }

  let now = () => new Date().valueOf(),
    defaultZone = null, // not setting this directly to LocalZone.instance bc loading order issues
    defaultLocale = null,
    defaultNumberingSystem = null,
    defaultOutputCalendar = null,
    throwOnInvalid = false;

  /**
   * Settings contains static getters and setters that control Luxon's overall behavior. Luxon is a simple library with few options, but the ones it does have live here.
   */
  class Settings {
    /**
     * Get the callback for returning the current timestamp.
     * @type {function}
     */
    static get now() {
      return now;
    }

    /**
     * Set the callback for returning the current timestamp.
     * @type {function}
     */
    static set now(n) {
      now = n;
    }

    /**
     * Get the default time zone to create DateTimes in.
     * @type {string}
     */
    static get defaultZoneName() {
      return (defaultZone || LocalZone.instance).name;
    }

    /**
     * Set the default time zone to create DateTimes in. Does not affect existing instances.
     * @type {string}
     */
    static set defaultZoneName(z) {
      if (!z) {
        defaultZone = null;
      } else {
        defaultZone = normalizeZone(z);
      }
    }

    /**
     * Get the default time zone object to create DateTimes in. Does not affect existing instances.
     * @type {Zone}
     */
    static get defaultZone() {
      return defaultZone || LocalZone.instance;
    }

    /**
     * Get the default locale to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static get defaultLocale() {
      return defaultLocale;
    }

    /**
     * Set the default locale to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static set defaultLocale(locale) {
      defaultLocale = locale;
    }

    /**
     * Get the default numbering system to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static get defaultNumberingSystem() {
      return defaultNumberingSystem;
    }

    /**
     * Set the default numbering system to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static set defaultNumberingSystem(numberingSystem) {
      defaultNumberingSystem = numberingSystem;
    }

    /**
     * Get the default output calendar to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static get defaultOutputCalendar() {
      return defaultOutputCalendar;
    }

    /**
     * Set the default output calendar to create DateTimes with. Does not affect existing instances.
     * @type {string}
     */
    static set defaultOutputCalendar(outputCalendar) {
      defaultOutputCalendar = outputCalendar;
    }

    /**
     * Get whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
     * @type {boolean}
     */
    static get throwOnInvalid() {
      return throwOnInvalid;
    }

    /**
     * Set whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
     * @type {boolean}
     */
    static set throwOnInvalid(t) {
      throwOnInvalid = t;
    }

    /**
     * Reset Luxon's global caches. Should only be necessary in testing scenarios.
     * @return {void}
     */
    static resetCaches() {
      Locale.resetCache();
    }
  }

  function stringifyTokens(splits, tokenToString) {
    let s = '';
    for (const token of splits) {
      if (token.literal) {
        s += token.val;
      } else {
        s += tokenToString(token.val);
      }
    }
    return s;
  }

  const tokenToObject = {
    D: DATE_SHORT,
    DD: DATE_MED,
    DDD: DATE_FULL,
    DDDD: DATE_HUGE,
    t: TIME_SIMPLE,
    tt: TIME_WITH_SECONDS,
    ttt: TIME_WITH_SHORT_OFFSET,
    tttt: TIME_WITH_LONG_OFFSET,
    T: TIME_24_SIMPLE,
    TT: TIME_24_WITH_SECONDS,
    TTT: TIME_24_WITH_SHORT_OFFSET,
    TTTT: TIME_24_WITH_LONG_OFFSET,
    f: DATETIME_SHORT,
    ff: DATETIME_MED,
    fff: DATETIME_FULL,
    ffff: DATETIME_HUGE,
    F: DATETIME_SHORT_WITH_SECONDS,
    FF: DATETIME_MED_WITH_SECONDS,
    FFF: DATETIME_FULL_WITH_SECONDS,
    FFFF: DATETIME_HUGE_WITH_SECONDS
  };

  /**
   * @private
   */

  class Formatter {
    static create(locale, opts = {}) {
      const formatOpts = Object.assign({}, { round: true }, opts);
      return new Formatter(locale, formatOpts);
    }

    static parseFormat(fmt) {
      let current = null,
        currentFull = '',
        bracketed = false;
      const splits = [];
      for (let i = 0; i < fmt.length; i++) {
        const c = fmt.charAt(i);
        if (c === "'") {
          if (currentFull.length > 0) {
            splits.push({ literal: bracketed, val: currentFull });
          }
          current = null;
          currentFull = '';
          bracketed = !bracketed;
        } else if (bracketed) {
          currentFull += c;
        } else if (c === current) {
          currentFull += c;
        } else {
          if (currentFull.length > 0) {
            splits.push({ literal: false, val: currentFull });
          }
          currentFull = c;
          current = c;
        }
      }

      if (currentFull.length > 0) {
        splits.push({ literal: bracketed, val: currentFull });
      }

      return splits;
    }

    constructor(locale, formatOpts) {
      this.opts = formatOpts;
      this.loc = locale;
      this.systemLoc = null;
    }

    formatWithSystemDefault(dt, opts) {
      if (this.systemLoc === null) {
        this.systemLoc = this.loc.redefaultToSystem();
      }
      const df = this.systemLoc.dtFormatter(dt, Object.assign({}, this.opts, opts));
      return df.format();
    }

    formatDateTime(dt, opts = {}) {
      const df = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
      return df.format();
    }

    formatDateTimeParts(dt, opts = {}) {
      const df = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
      return df.formatToParts();
    }

    resolvedOptions(dt, opts = {}) {
      const df = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
      return df.resolvedOptions();
    }

    num(n, p = 0) {
      // we get some perf out of doing this here, annoyingly
      if (this.opts.forceSimple) {
        return padStart(n, p);
      }

      const opts = Object.assign({}, this.opts);

      if (p > 0) {
        opts.padTo = p;
      }

      return this.loc.numberFormatter(opts).format(n);
    }

    formatDateTimeFromString(dt, fmt) {
      const knownEnglish = this.loc.listingMode() === 'en';
      const string = (opts, extract) => this.loc.extract(dt, opts, extract),
        formatOffset = opts => {
          if (dt.isOffsetFixed && dt.offset === 0 && opts.allowZ) {
            return 'Z';
          }

          const hours = Math.trunc(dt.offset / 60),
            minutes = Math.abs(dt.offset % 60),
            sign = hours >= 0 ? '+' : '-',
            base = `${sign}${Math.abs(hours)}`;

          switch (opts.format) {
            case 'short':
              return `${sign}${this.num(Math.abs(hours), 2)}:${this.num(minutes, 2)}`;
            case 'narrow':
              return minutes > 0 ? `${base}:${minutes}` : base;
            case 'techie':
              return `${sign}${this.num(Math.abs(hours), 2)}${this.num(minutes, 2)}`;
            default:
              throw new RangeError(`Value format ${opts.format} is out of range for property format`);
          }
        },
        meridiem = () =>
          knownEnglish
            ? meridiemForDateTime(dt)
            : string({ hour: 'numeric', hour12: true }, 'dayperiod'),
        month = (length, standalone) =>
          knownEnglish
            ? monthForDateTime(dt, length)
            : string(standalone ? { month: length } : { month: length, day: 'numeric' }, 'month'),
        weekday = (length, standalone) =>
          knownEnglish
            ? weekdayForDateTime(dt, length)
            : string(
                standalone ? { weekday: length } : { weekday: length, month: 'long', day: 'numeric' },
                'weekday'
              ),
        maybeMacro = token => {
          const macro = tokenToObject[token];
          if (macro) {
            return this.formatWithSystemDefault(dt, macro);
          } else {
            return token;
          }
        },
        era = length =>
          knownEnglish ? eraForDateTime(dt, length) : string({ era: length }, 'era'),
        tokenToString = token => {
          const outputCal = this.loc.outputCalendar;

          // Where possible: http://cldr.unicode.org/translation/date-time#TOC-Stand-Alone-vs.-Format-Styles
          switch (token) {
            // ms
            case 'S':
              return this.num(dt.millisecond);
            case 'u':
            // falls through
            case 'SSS':
              return this.num(dt.millisecond, 3);
            // seconds
            case 's':
              return this.num(dt.second);
            case 'ss':
              return this.num(dt.second, 2);
            // minutes
            case 'm':
              return this.num(dt.minute);
            case 'mm':
              return this.num(dt.minute, 2);
            // hours
            case 'h':
              return this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12);
            case 'hh':
              return this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12, 2);
            case 'H':
              return this.num(dt.hour);
            case 'HH':
              return this.num(dt.hour, 2);
            // offset
            case 'Z':
              // like +6
              return formatOffset({ format: 'narrow', allowZ: this.opts.allowZ });
            case 'ZZ':
              // like +06:00
              return formatOffset({ format: 'short', allowZ: this.opts.allowZ });
            case 'ZZZ':
              // like +0600
              return formatOffset({ format: 'techie', allowZ: false });
            case 'ZZZZ':
              // like EST
              return dt.offsetNameShort;
            case 'ZZZZZ':
              // like Eastern Standard Time
              return dt.offsetNameLong;
            // zone
            case 'z':
              // like America/New_York
              return dt.zoneName;
            // meridiems
            case 'a':
              return meridiem();
            // dates
            case 'd':
              return outputCal ? string({ day: 'numeric' }, 'day') : this.num(dt.day);
            case 'dd':
              return outputCal ? string({ day: '2-digit' }, 'day') : this.num(dt.day, 2);
            // weekdays - standalone
            case 'c':
              // like 1
              return this.num(dt.weekday);
            case 'ccc':
              // like 'Tues'
              return weekday('short', true);
            case 'cccc':
              // like 'Tuesday'
              return weekday('long', true);
            case 'ccccc':
              // like 'T'
              return weekday('narrow', true);
            // weekdays - format
            case 'E':
              // like 1
              return this.num(dt.weekday);
            case 'EEE':
              // like 'Tues'
              return weekday('short', false);
            case 'EEEE':
              // like 'Tuesday'
              return weekday('long', false);
            case 'EEEEE':
              // like 'T'
              return weekday('narrow', false);
            // months - standalone
            case 'L':
              // like 1
              return outputCal
                ? string({ month: 'numeric', day: 'numeric' }, 'month')
                : this.num(dt.month);
            case 'LL':
              // like 01, doesn't seem to work
              return outputCal
                ? string({ month: '2-digit', day: 'numeric' }, 'month')
                : this.num(dt.month, 2);
            case 'LLL':
              // like Jan
              return month('short', true);
            case 'LLLL':
              // like January
              return month('long', true);
            case 'LLLLL':
              // like J
              return month('narrow', true);
            // months - format
            case 'M':
              // like 1
              return outputCal ? string({ month: 'numeric' }, 'month') : this.num(dt.month);
            case 'MM':
              // like 01
              return outputCal ? string({ month: '2-digit' }, 'month') : this.num(dt.month, 2);
            case 'MMM':
              // like Jan
              return month('short', false);
            case 'MMMM':
              // like January
              return month('long', false);
            case 'MMMMM':
              // like J
              return month('narrow', false);
            // years
            case 'y':
              // like 2014
              return outputCal ? string({ year: 'numeric' }, 'year') : this.num(dt.year);
            case 'yy':
              // like 14
              return outputCal
                ? string({ year: '2-digit' }, 'year')
                : this.num(dt.year.toString().slice(-2), 2);
            case 'yyyy':
              // like 0012
              return outputCal ? string({ year: 'numeric' }, 'year') : this.num(dt.year, 4);
            case 'yyyyyy':
              // like 000012
              return outputCal ? string({ year: 'numeric' }, 'year') : this.num(dt.year, 6);
            // eras
            case 'G':
              // like AD
              return era('short');
            case 'GG':
              // like Anno Domini
              return era('long');
            case 'GGGGG':
              return era('narrow');
            case 'kk':
              return this.num(dt.weekYear.toString().slice(-2), 2);
            case 'kkkk':
              return this.num(dt.weekYear, 4);
            case 'W':
              return this.num(dt.weekNumber);
            case 'WW':
              return this.num(dt.weekNumber, 2);
            case 'o':
              return this.num(dt.ordinal);
            case 'ooo':
              return this.num(dt.ordinal, 3);
            case 'q':
              // like 1
              return this.num(dt.quarter);
            case 'qq':
              // like 01
              return this.num(dt.quarter, 2);
            default:
              return maybeMacro(token);
          }
        };

      return stringifyTokens(Formatter.parseFormat(fmt), tokenToString);
    }

    formatDurationFromString(dur, fmt) {
      const tokenToField = token => {
          switch (token[0]) {
            case 'S':
              return 'millisecond';
            case 's':
              return 'second';
            case 'm':
              return 'minute';
            case 'h':
              return 'hour';
            case 'd':
              return 'day';
            case 'M':
              return 'month';
            case 'y':
              return 'year';
            default:
              return null;
          }
        },
        tokenToString = lildur => token => {
          const mapped = tokenToField(token);
          if (mapped) {
            return this.num(lildur.get(mapped), token.length);
          } else {
            return token;
          }
        },
        tokens = Formatter.parseFormat(fmt),
        realTokens = tokens.reduce(
          (found, { literal, val }) => (literal ? found : found.concat(val)),
          []
        ),
        collapsed = dur.shiftTo(...realTokens.map(tokenToField).filter(t => t));
      return stringifyTokens(tokens, tokenToString(collapsed));
    }
  }

  let sysLocaleCache = null;
  function systemLocale() {
    if (sysLocaleCache) {
      return sysLocaleCache;
    } else if (hasIntl()) {
      const computedSys = new Intl.DateTimeFormat().resolvedOptions().locale;
      // node sometimes defaults to "und". Override that because that is dumb
      sysLocaleCache = computedSys === 'und' ? 'en-US' : computedSys;
      return sysLocaleCache;
    } else {
      sysLocaleCache = 'en-US';
      return sysLocaleCache;
    }
  }

  function intlConfigString(locale, numberingSystem, outputCalendar) {
    if (hasIntl()) {
      locale = Array.isArray(locale) ? locale : [locale];

      if (outputCalendar || numberingSystem) {
        locale = locale.map(l => {
          l += '-u';

          if (outputCalendar) {
            l += '-ca-' + outputCalendar;
          }

          if (numberingSystem) {
            l += '-nu-' + numberingSystem;
          }
          return l;
        });
      }
      return locale;
    } else {
      return [];
    }
  }

  function mapMonths(f) {
    const ms = [];
    for (let i = 1; i <= 12; i++) {
      const dt = DateTime.utc(2016, i, 1);
      ms.push(f(dt));
    }
    return ms;
  }

  function mapWeekdays(f) {
    const ms = [];
    for (let i = 1; i <= 7; i++) {
      const dt = DateTime.utc(2016, 11, 13 + i);
      ms.push(f(dt));
    }
    return ms;
  }

  function listStuff(loc, length, defaultOK, englishFn, intlFn) {
    const mode = loc.listingMode(defaultOK);

    if (mode === 'error') {
      return null;
    } else if (mode === 'en') {
      return englishFn(length);
    } else {
      return intlFn(length);
    }
  }

  function supportsFastNumbers(loc) {
    if (loc.numberingSystem && loc.numberingSystem !== 'latn') {
      return false;
    } else {
      return (
        loc.numberingSystem === 'latn' ||
        !loc.locale ||
        loc.locale.startsWith('en') ||
        (hasIntl() && Intl.DateTimeFormat(loc.intl).resolvedOptions().numberingSystem === 'latn')
      );
    }
  }

  /**
   * @private
   */

  class SimpleNumberFormatter {
    constructor(opts) {
      this.padTo = opts.padTo || 0;
      this.round = opts.round || false;
      this.floor = opts.floor || false;
    }

    format(i) {
      // to match the browser's numberformatter defaults
      const fixed = this.floor ? Math.floor(i) : roundTo(i, this.round ? 0 : 3);
      return padStart(fixed, this.padTo);
    }
  }

  class IntlNumberFormatter {
    constructor(intl, opts) {

      const intlOpts = { useGrouping: false };

      if (opts.padTo > 0) {
        intlOpts.minimumIntegerDigits = opts.padTo;
      }

      if (opts.round) {
        intlOpts.maximumFractionDigits = 0;
      }

      this.floor = opts.floor;
      this.intl = new Intl.NumberFormat(intl, intlOpts);
    }

    format(i) {
      const fixed = this.floor ? Math.floor(i) : i;
      return this.intl.format(fixed);
    }
  }

  /**
   * @private
   */

  class PolyDateFormatter {
    constructor(dt, intl, opts) {
      this.opts = opts;
      this.hasIntl = hasIntl();

      let z;
      if (dt.zone.universal && this.hasIntl) {
        // Chromium doesn't support fixed-offset zones like Etc/GMT+8 in its formatter,
        // See https://bugs.chromium.org/p/chromium/issues/detail?id=364374.
        // So we have to make do. Two cases:
        // 1. The format options tell us to show the zone. We can't do that, so the best
        // we can do is format the date in UTC.
        // 2. The format options don't tell us to show the zone. Then we can adjust them
        // the time and tell the formatter to show it to us in UTC, so that the time is right
        // and the bad zone doesn't show up.
        // We can clean all this up when Chrome fixes this.
        z = 'UTC';
        if (opts.timeZoneName) {
          this.dt = dt;
        } else {
          this.dt = dt.offset === 0 ? dt : DateTime.fromMillis(dt.ts + dt.offset * 60 * 1000);
        }
      } else if (dt.zone.type === 'local') {
        this.dt = dt;
      } else {
        this.dt = dt;
        z = dt.zone.name;
      }

      if (this.hasIntl) {
        const realIntlOpts = Object.assign({}, this.opts);
        if (z) {
          realIntlOpts.timeZone = z;
        }
        this.dtf = new Intl.DateTimeFormat(intl, realIntlOpts);
      }
    }

    format() {
      if (this.hasIntl) {
        return this.dtf.format(this.dt.toJSDate());
      } else {
        const tokenFormat = formatString(this.opts),
          loc = Locale.create('en-US');
        return Formatter.create(loc).formatDateTimeFromString(this.dt, tokenFormat);
      }
    }

    formatToParts() {
      if (this.hasIntl && hasFormatToParts()) {
        return this.dtf.formatToParts(this.dt.toJSDate());
      } else {
        // This is kind of a cop out. We actually could do this for English. However, we couldn't do it for intl strings
        // and IMO it's too weird to have an uncanny valley like that
        return [];
      }
    }

    resolvedOptions() {
      if (this.hasIntl) {
        return this.dtf.resolvedOptions();
      } else {
        return {
          locale: 'en-US',
          numberingSystem: 'latn',
          outputCalendar: 'gregory'
        };
      }
    }
  }

  /**
   * @private
   */

  class Locale {
    static fromOpts(opts) {
      return Locale.create(opts.locale, opts.numberingSystem, opts.outputCalendar, opts.defaultToEN);
    }

    static create(locale, numberingSystem, outputCalendar, defaultToEN = false) {
      const specifiedLocale = locale || Settings.defaultLocale,
        // the system locale is useful for human readable strings but annoying for parsing/formatting known formats
        localeR = specifiedLocale || (defaultToEN ? 'en-US' : systemLocale()),
        numberingSystemR = numberingSystem || Settings.defaultNumberingSystem,
        outputCalendarR = outputCalendar || Settings.defaultOutputCalendar;
      return new Locale(localeR, numberingSystemR, outputCalendarR, specifiedLocale);
    }

    static resetCache() {
      sysLocaleCache = null;
    }

    static fromObject({ locale, numberingSystem, outputCalendar } = {}) {
      return Locale.create(locale, numberingSystem, outputCalendar);
    }

    constructor(locale, numbering, outputCalendar, specifiedLocale) {
      this.locale = locale;
      this.numberingSystem = numbering;
      this.outputCalendar = outputCalendar;
      this.intl = intlConfigString(this.locale, this.numberingSystem, this.outputCalendar);

      this.weekdaysCache = { format: {}, standalone: {} };
      this.monthsCache = { format: {}, standalone: {} };
      this.meridiemCache = null;
      this.eraCache = {};

      this.specifiedLocale = specifiedLocale;
      this.fastNumbersCached = null;
    }

    get fastNumbers() {
      if (this.fastNumbersCached == null) {
        this.fastNumbersCached = supportsFastNumbers(this);
      }

      return this.fastNumbersCached;
    }

    // todo: cache me
    listingMode(defaultOK = true) {
      const intl = hasIntl(),
        hasFTP = intl && hasFormatToParts(),
        isActuallyEn =
          this.locale === 'en' ||
          this.locale.toLowerCase() === 'en-us' ||
          (intl &&
            Intl.DateTimeFormat(this.intl)
              .resolvedOptions()
              .locale.startsWith('en-us')),
        hasNoWeirdness =
          (this.numberingSystem === null || this.numberingSystem === 'latn') &&
          (this.outputCalendar === null || this.outputCalendar === 'gregory');

      if (!hasFTP && !(isActuallyEn && hasNoWeirdness) && !defaultOK) {
        return 'error';
      } else if (!hasFTP || (isActuallyEn && hasNoWeirdness)) {
        return 'en';
      } else {
        return 'intl';
      }
    }

    clone(alts) {
      if (!alts || Object.getOwnPropertyNames(alts).length === 0) {
        return this;
      } else {
        return Locale.create(
          alts.locale || this.specifiedLocale,
          alts.numberingSystem || this.numberingSystem,
          alts.outputCalendar || this.outputCalendar,
          alts.defaultToEN || false
        );
      }
    }

    redefaultToEN(alts = {}) {
      return this.clone(Object.assign({}, alts, { defaultToEN: true }));
    }

    redefaultToSystem(alts = {}) {
      return this.clone(Object.assign({}, alts, { defaultToEN: false }));
    }

    months(length, format = false, defaultOK = true) {
      return listStuff(this, length, defaultOK, months, () => {
        const intl = format ? { month: length, day: 'numeric' } : { month: length },
          formatStr = format ? 'format' : 'standalone';
        if (!this.monthsCache[formatStr][length]) {
          this.monthsCache[formatStr][length] = mapMonths(dt => this.extract(dt, intl, 'month'));
        }
        return this.monthsCache[formatStr][length];
      });
    }

    weekdays(length, format = false, defaultOK = true) {
      return listStuff(this, length, defaultOK, weekdays, () => {
        const intl = format
            ? { weekday: length, year: 'numeric', month: 'long', day: 'numeric' }
            : { weekday: length },
          formatStr = format ? 'format' : 'standalone';
        if (!this.weekdaysCache[formatStr][length]) {
          this.weekdaysCache[formatStr][length] = mapWeekdays(dt =>
            this.extract(dt, intl, 'weekday')
          );
        }
        return this.weekdaysCache[formatStr][length];
      });
    }

    meridiems(defaultOK = true) {
      return listStuff(
        this,
        undefined,
        defaultOK,
        () => meridiems,
        () => {
          // In theory there could be aribitrary day periods. We're gonna assume there are exactly two
          // for AM and PM. This is probably wrong, but it's makes parsing way easier.
          if (!this.meridiemCache) {
            const intl = { hour: 'numeric', hour12: true };
            this.meridiemCache = [
              DateTime.utc(2016, 11, 13, 9),
              DateTime.utc(2016, 11, 13, 19)
            ].map(dt => this.extract(dt, intl, 'dayperiod'));
          }

          return this.meridiemCache;
        }
      );
    }

    eras(length, defaultOK = true) {
      return listStuff(this, length, defaultOK, eras, () => {
        const intl = { era: length };

        // This is utter bullshit. Different calendars are going to define eras totally differently. What I need is the minimum set of dates
        // to definitely enumerate them.
        if (!this.eraCache[length]) {
          this.eraCache[length] = [DateTime.utc(-40, 1, 1), DateTime.utc(2017, 1, 1)].map(dt =>
            this.extract(dt, intl, 'era')
          );
        }

        return this.eraCache[length];
      });
    }

    extract(dt, intlOpts, field) {
      const df = this.dtFormatter(dt, intlOpts),
        results = df.formatToParts(),
        matching = results.find(m => m.type.toLowerCase() === field);

      return matching ? matching.value : null;
    }

    numberFormatter(opts = {}) {
      // this forcesimple option is never used (the only caller short-circuits on it, but it seems safer to leave)
      // (in contrast, the rest of the condition is used heavily)
      if (opts.forceSimple || this.fastNumbers || !hasIntl()) {
        return new SimpleNumberFormatter(opts);
      } else {
        return new IntlNumberFormatter(this.intl, opts);
      }
    }

    dtFormatter(dt, intlOpts = {}) {
      return new PolyDateFormatter(dt, this.intl, intlOpts);
    }

    equals(other) {
      return (
        this.locale === other.locale &&
        this.numberingSystem === other.numberingSystem &&
        this.outputCalendar === other.outputCalendar
      );
    }
  }

  /*
   * This file handles parsing for well-specified formats. Here's how it works:
   * Two things go into parsing: a regex to match with and an extractor to take apart the groups in the match.
   * An extractor is just a function that takes a regex match array and returns a { year: ..., month: ... } object
   * parse() does the work of executing the regex and applying the extractor. It takes multiple regex/extractor pairs to try in sequence.
   * Extractors can take a "cursor" representing the offset in the match to look at. This makes it easy to combine extractors.
   * combineExtractors() does the work of combining them, keeping track of the cursor through multiple extractions.
   * Some extractions are super dumb and simpleParse and fromStrings help DRY them.
   */

  function combineRegexes(...regexes) {
    const full = regexes.reduce((f, r) => f + r.source, '');
    return RegExp(`^${full}$`);
  }

  function combineExtractors(...extractors) {
    return m =>
      extractors
        .reduce(
          ([mergedVals, mergedZone, cursor], ex) => {
            const [val, zone, next] = ex(m, cursor);
            return [Object.assign(mergedVals, val), mergedZone || zone, next];
          },
          [{}, null, 1]
        )
        .slice(0, 2);
  }

  function parse(s, ...patterns) {
    if (s == null) {
      return [null, null];
    }

    for (const [regex, extractor] of patterns) {
      const m = regex.exec(s);
      if (m) {
        return extractor(m);
      }
    }
    return [null, null];
  }

  function simpleParse(...keys) {
    return (match, cursor) => {
      const ret = {};
      let i;

      for (i = 0; i < keys.length; i++) {
        ret[keys[i]] = parseInt(match[cursor + i]);
      }
      return [ret, null, cursor + i];
    };
  }

  // ISO and SQL parsing
  const offsetRegex = /(?:(Z)|([+-]\d\d)(?::?(\d\d))?)/,
    isoTimeBaseRegex = /(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,9}))?)?)?/,
    isoTimeRegex = RegExp(`${isoTimeBaseRegex.source}${offsetRegex.source}?`),
    isoTimeExtensionRegex = RegExp(`(?:T${isoTimeRegex.source})?`),
    isoYmdRegex = /([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,
    isoWeekRegex = /(\d{4})-?W(\d\d)-?(\d)/,
    isoOrdinalRegex = /(\d{4})-?(\d{3})/,
    extractISOWeekData = simpleParse('weekYear', 'weekNumber', 'weekDay'),
    extractISOOrdinalData = simpleParse('year', 'ordinal'),
    sqlYmdRegex = /(\d{4})-(\d\d)-(\d\d)/, // dumbed-down version of the ISO one
    sqlTimeRegex = RegExp(
      `${isoTimeBaseRegex.source} ?(?:${offsetRegex.source}|([a-zA-Z_]{1,256}/[a-zA-Z_]{1,256}))?`
    ),
    sqlTimeExtensionRegex = RegExp(`(?: ${sqlTimeRegex.source})?`);

  function extractISOYmd(match, cursor) {
    const item = {
      year: parseInt(match[cursor]),
      month: parseInt(match[cursor + 1]) || 1,
      day: parseInt(match[cursor + 2]) || 1
    };

    return [item, null, cursor + 3];
  }

  function extractISOTime(match, cursor) {
    const item = {
      hour: parseInt(match[cursor]) || 0,
      minute: parseInt(match[cursor + 1]) || 0,
      second: parseInt(match[cursor + 2]) || 0,
      millisecond: parseMillis(match[cursor + 3])
    };

    return [item, null, cursor + 4];
  }

  function extractISOOffset(match, cursor) {
    const local = !match[cursor] && !match[cursor + 1],
      fullOffset = signedOffset(match[cursor + 1], match[cursor + 2]),
      zone = local ? null : FixedOffsetZone.instance(fullOffset);
    return [{}, zone, cursor + 3];
  }

  function extractIANAZone(match, cursor) {
    const zone = match[cursor] ? new IANAZone(match[cursor]) : null;
    return [{}, zone, cursor + 1];
  }

  // ISO duration parsing

  const isoDuration = /^P(?:(?:(\d{1,9})Y)?(?:(\d{1,9})M)?(?:(\d{1,9})D)?(?:T(?:(\d{1,9})H)?(?:(\d{1,9})M)?(?:(\d{1,9})(?:[.,](\d{1,9}))?S)?)?|(\d{1,9})W)$/;

  function extractISODuration(match) {
    const [
      ,
      yearStr,
      monthStr,
      dayStr,
      hourStr,
      minuteStr,
      secondStr,
      millisecondsStr,
      weekStr
    ] = match;

    return [
      {
        years: parseInt(yearStr),
        months: parseInt(monthStr),
        weeks: parseInt(weekStr),
        days: parseInt(dayStr),
        hours: parseInt(hourStr),
        minutes: parseInt(minuteStr),
        seconds: parseInt(secondStr),
        milliseconds: parseMillis(millisecondsStr)
      }
    ];
  }

  // These are a little braindead. EDT *should* tell us that we're in, say, America/New_York
  // and not just that we're in -240 *right now*. But since I don't think these are used that often
  // I'm just going to ignore that
  const obsOffsets = {
    GMT: 0,
    EDT: -4 * 60,
    EST: -5 * 60,
    CDT: -5 * 60,
    CST: -6 * 60,
    MDT: -6 * 60,
    MST: -7 * 60,
    PDT: -7 * 60,
    PST: -8 * 60
  };

  function fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
    const result = {
      year: yearStr.length === 2 ? untruncateYear(parseInt(yearStr)) : parseInt(yearStr),
      month:
        monthStr.length === 2 ? parseInt(monthStr, 10) : monthsShort.indexOf(monthStr) + 1,
      day: parseInt(dayStr),
      hour: parseInt(hourStr),
      minute: parseInt(minuteStr)
    };

    if (secondStr) result.second = parseInt(secondStr);
    if (weekdayStr) {
      result.weekday =
        weekdayStr.length > 3
          ? weekdaysLong.indexOf(weekdayStr) + 1
          : weekdaysShort.indexOf(weekdayStr) + 1;
    }

    return result;
  }

  // RFC 2822/5322
  const rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;

  function extractRFC2822(match) {
    const [
        ,
        weekdayStr,
        dayStr,
        monthStr,
        yearStr,
        hourStr,
        minuteStr,
        secondStr,
        obsOffset,
        milOffset,
        offHourStr,
        offMinuteStr
      ] = match,
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);

    let offset;
    if (obsOffset) {
      offset = obsOffsets[obsOffset];
    } else if (milOffset) {
      offset = 0;
    } else {
      offset = signedOffset(offHourStr, offMinuteStr);
    }

    return [result, new FixedOffsetZone(offset)];
  }

  function preprocessRFC2822(s) {
    // Remove comments and folding whitespace and replace multiple-spaces with a single space
    return s
      .replace(/\([^)]*\)|[\n\t]/g, ' ')
      .replace(/(\s\s+)/g, ' ')
      .trim();
  }

  // http date

  const rfc1123 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,
    rfc850 = /^(Monday|Tuesday|Wedsday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,
    ascii = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;

  function extractRFC1123Or850(match) {
    const [, weekdayStr, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] = match,
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
    return [result, FixedOffsetZone.utcInstance];
  }

  function extractASCII(match) {
    const [, weekdayStr, monthStr, dayStr, hourStr, minuteStr, secondStr, yearStr] = match,
      result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
    return [result, FixedOffsetZone.utcInstance];
  }

  /**
   * @private
   */

  function parseISODate(s) {
    return parse(
      s,
      [
        combineRegexes(isoYmdRegex, isoTimeExtensionRegex),
        combineExtractors(extractISOYmd, extractISOTime, extractISOOffset)
      ],
      [
        combineRegexes(isoWeekRegex, isoTimeExtensionRegex),
        combineExtractors(extractISOWeekData, extractISOTime, extractISOOffset)
      ],
      [
        combineRegexes(isoOrdinalRegex, isoTimeExtensionRegex),
        combineExtractors(extractISOOrdinalData, extractISOTime)
      ],
      [combineRegexes(isoTimeRegex), combineExtractors(extractISOTime, extractISOOffset)]
    );
  }

  function parseRFC2822Date(s) {
    return parse(preprocessRFC2822(s), [rfc2822, extractRFC2822]);
  }

  function parseHTTPDate(s) {
    return parse(
      s,
      [rfc1123, extractRFC1123Or850],
      [rfc850, extractRFC1123Or850],
      [ascii, extractASCII]
    );
  }

  function parseISODuration(s) {
    return parse(s, [isoDuration, extractISODuration]);
  }

  function parseSQL(s) {
    return parse(
      s,
      [
        combineRegexes(sqlYmdRegex, sqlTimeExtensionRegex),
        combineExtractors(extractISOYmd, extractISOTime, extractISOOffset, extractIANAZone)
      ],
      [
        combineRegexes(sqlTimeRegex),
        combineExtractors(extractISOTime, extractISOOffset, extractIANAZone)
      ]
    );
  }

  const INVALID = 'Invalid Duration',
    UNPARSABLE = 'unparsable';

  // unit conversion constants
  const lowOrderMatrix = {
      weeks: {
        days: 7,
        hours: 7 * 24,
        minutes: 7 * 24 * 60,
        seconds: 7 * 24 * 60 * 60,
        milliseconds: 7 * 24 * 60 * 60 * 1000
      },
      days: {
        hours: 24,
        minutes: 24 * 60,
        seconds: 24 * 60 * 60,
        milliseconds: 24 * 60 * 60 * 1000
      },
      hours: { minutes: 60, seconds: 60 * 60, milliseconds: 60 * 60 * 1000 },
      minutes: { seconds: 60, milliseconds: 60 * 1000 },
      seconds: { milliseconds: 1000 }
    },
    casualMatrix = Object.assign(
      {
        years: {
          months: 12,
          weeks: 52,
          days: 365,
          hours: 365 * 24,
          minutes: 365 * 24 * 60,
          seconds: 365 * 24 * 60 * 60,
          milliseconds: 365 * 24 * 60 * 60 * 1000
        },
        quarters: {
          months: 3,
          weeks: 13,
          days: 91,
          hours: 91 * 24,
          minutes: 91 * 24 * 60,
          milliseconds: 91 * 24 * 60 * 60 * 1000
        },
        months: {
          weeks: 4,
          days: 30,
          hours: 30 * 24,
          minutes: 30 * 24 * 60,
          seconds: 30 * 24 * 60 * 60,
          milliseconds: 30 * 24 * 60 * 60 * 1000
        }
      },
      lowOrderMatrix
    ),
    daysInYearAccurate = 146097.0 / 400,
    daysInMonthAccurate = 146097.0 / 4800,
    accurateMatrix = Object.assign(
      {
        years: {
          months: 12,
          weeks: daysInYearAccurate / 7,
          days: daysInYearAccurate,
          hours: daysInYearAccurate * 24,
          minutes: daysInYearAccurate * 24 * 60,
          seconds: daysInYearAccurate * 24 * 60 * 60,
          milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1000
        },
        quarters: {
          months: 3,
          weeks: daysInYearAccurate / 28,
          days: daysInYearAccurate / 4,
          hours: daysInYearAccurate * 24 / 4,
          minutes: daysInYearAccurate * 24 * 60 / 4,
          seconds: daysInYearAccurate * 24 * 60 * 60 / 4,
          milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1000 / 4
        },
        months: {
          weeks: daysInMonthAccurate / 7,
          days: daysInMonthAccurate,
          hours: daysInMonthAccurate * 24,
          minutes: daysInMonthAccurate * 24 * 60,
          seconds: daysInMonthAccurate * 24 * 60 * 60,
          milliseconds: daysInMonthAccurate * 24 * 60 * 60 * 1000
        }
      },
      lowOrderMatrix
    );

  // units ordered by size
  const orderedUnits = [
    'years',
    'quarters',
    'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds',
    'milliseconds'
  ];

  const reverseUnits = orderedUnits.slice(0).reverse();

  // clone really means "create another instance just like this one, but with these changes"
  function clone(dur, alts, clear = false) {
    // deep merge for vals
    const conf = {
      values: clear ? alts.values : Object.assign({}, dur.values, alts.values || {}),
      loc: dur.loc.clone(alts.loc),
      conversionAccuracy: alts.conversionAccuracy || dur.conversionAccuracy
    };
    return new Duration(conf);
  }

  // some functions really care about the absolute value of a duration, so combined with
  // normalize() this tells us whether this duration is positive or negative
  function isHighOrderNegative(obj) {
    // only rule is that the highest-order part must be non-negative
    for (const k of orderedUnits) {
      if (obj[k]) return obj[k] < 0;
    }
    return false;
  }

  // NB: mutates parameters
  function convert(matrix, fromMap, fromUnit, toMap, toUnit) {
    const conv = matrix[toUnit][fromUnit],
      added = Math.floor(fromMap[fromUnit] / conv);
    toMap[toUnit] += added;
    fromMap[fromUnit] -= added * conv;
  }

  // NB: mutates parameters
  function normalizeValues(matrix, vals) {
    reverseUnits.reduce((previous, current) => {
      if (!isUndefined(vals[current])) {
        if (previous) {
          convert(matrix, vals, previous, vals, current);
        }
        return current;
      } else {
        return previous;
      }
    }, null);
  }

  /**
   * @private
   */
  function friendlyDuration(duration) {
    if (isNumber(duration)) {
      return Duration.fromMillis(duration);
    } else if (duration instanceof Duration) {
      return duration;
    } else if (duration instanceof Object) {
      return Duration.fromObject(duration);
    } else {
      throw new InvalidArgumentError('Unknown duration argument');
    }
  }

  /**
   * A Duration object represents a period of time, like "2 months" or "1 day, 1 hour". Conceptually, it's just a map of units to their quantities, accompanied by some additional configuration and methods for creating, parsing, interrogating, transforming, and formatting them. They can be used on their own or in conjunction with other Luxon types; for example, you can use {@link DateTime.plus} to add a Duration object to a DateTime, producing another DateTime.
   *
   * Here is a brief overview of commonly used methods and getters in Duration:
   *
   * * **Creation** To create a Duration, use {@link Duration.fromMillis}, {@link Duration.fromObject}, or {@link Duration.fromISO}.
   * * **Unit values** See the {@link years}, {@link months}, {@link weeks}, {@link days}, {@link hours}, {@link minutes}, {@link seconds}, {@link milliseconds} accessors.
   * * **Configuration** See  {@link locale} and {@link numberingSystem} accessors.
   * * **Transformation** To create new Durations out of old ones use {@link plus}, {@link minus}, {@link normalize}, {@link set}, {@link reconfigure}, {@link shiftTo}, and {@link negate}.
   * * **Output** To convert the Duration into other representations, see {@link as}, {@link toISO}, {@link toFormat}, and {@link toJSON}
   *
   * There's are more methods documented below. In addition, for more information on subtler topics like internationalization and validity, see the external documentation.
   */
  class Duration {
    /**
     * @private
     */
    constructor(config) {
      const accurate = config.conversionAccuracy === 'longterm' || false;
      /**
       * @access private
       */
      this.values = config.values;
      /**
       * @access private
       */
      this.loc = config.loc || Locale.create();
      /**
       * @access private
       */
      this.conversionAccuracy = accurate ? 'longterm' : 'casual';
      /**
       * @access private
       */
      this.invalid = config.invalidReason || null;
      /**
       * @access private
       */
      this.matrix = accurate ? accurateMatrix : casualMatrix;
    }

    /**
     * Create Duration from a number of milliseconds.
     * @param {number} count of milliseconds
     * @param {Object} opts - options for parsing
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @return {Duration}
     */
    static fromMillis(count, opts) {
      return Duration.fromObject(Object.assign({ milliseconds: count }, opts));
    }

    /**
     * Create a Duration from a Javascript object with keys like 'years' and 'hours. 
     * If this object is empty then zero  milliseconds duration is returned.
     * @param {Object} obj - the object to create the DateTime from
     * @param {number} obj.years
     * @param {number} obj.quarters
     * @param {number} obj.months
     * @param {number} obj.weeks
     * @param {number} obj.days
     * @param {number} obj.hours
     * @param {number} obj.minutes
     * @param {number} obj.seconds
     * @param {number} obj.milliseconds
     * @param {string} [obj.locale='en-US'] - the locale to use
     * @param {string} obj.numberingSystem - the numbering system to use
     * @param {string} [obj.conversionAccuracy='casual'] - the conversion system to use
     * @return {Duration}
     */
    static fromObject(obj) {
      if (obj == null || typeof obj !== 'object') {
        throw new InvalidArgumentError(
          'Duration.fromObject: argument expected to be an object.'
        );
      }
      return new Duration({
        values: normalizeObject(obj, Duration.normalizeUnit, true),
        loc: Locale.fromObject(obj),
        conversionAccuracy: obj.conversionAccuracy
      });
    }

    /**
     * Create a Duration from an ISO 8601 duration string.
     * @param {string} text - text to parse
     * @param {Object} opts - options for parsing
     * @param {string} [opts.locale='en-US'] - the locale to use
     * @param {string} opts.numberingSystem - the numbering system to use
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     * @example Duration.fromISO('P3Y6M4DT12H30M5S').toObject() //=> { years: 3, months: 6, day: 4, hours: 12, minutes: 30, seconds: 5 }
     * @example Duration.fromISO('PT23H').toObject() //=> { hours: 23 }
     * @example Duration.fromISO('P5Y3M').toObject() //=> { years: 5, months: 3 }
     * @return {Duration}
     */
    static fromISO(text, opts) {
      const [parsed] = parseISODuration(text);
      if (parsed) {
        const obj = Object.assign(parsed, opts);
        return Duration.fromObject(obj);
      } else {
        return Duration.invalid(UNPARSABLE);
      }
    }

    /**
     * Create an invalid Duration.
     * @param {string} reason - reason this is invalid
     * @return {Duration}
     */
    static invalid(reason) {
      if (!reason) {
        throw new InvalidArgumentError('need to specify a reason the Duration is invalid');
      }
      if (Settings.throwOnInvalid) {
        throw new InvalidDurationError(reason);
      } else {
        return new Duration({ invalidReason: reason });
      }
    }

    /**
     * @private
     */
    static normalizeUnit(unit, ignoreUnknown = false) {
      const normalized = {
        year: 'years',
        years: 'years',
        quarter: 'quarters',
        quarters: 'quarters',
        month: 'months',
        months: 'months',
        week: 'weeks',
        weeks: 'weeks',
        day: 'days',
        days: 'days',
        hour: 'hours',
        hours: 'hours',
        minute: 'minutes',
        minutes: 'minutes',
        second: 'seconds',
        seconds: 'seconds',
        millisecond: 'milliseconds',
        milliseconds: 'milliseconds'
      }[unit ? unit.toLowerCase() : unit];

      if (!ignoreUnknown && !normalized) throw new InvalidUnitError(unit);

      return normalized;
    }

    /**
     * Get  the locale of a Duration, such 'en-GB'
     * @type {string}
     */
    get locale() {
      return this.isValid ? this.loc.locale : null;
    }

    /**
     * Get the numbering system of a Duration, such 'beng'. The numbering system is used when formatting the Duration
     *
     * @type {string}
     */
    get numberingSystem() {
      return this.isValid ? this.loc.numberingSystem : null;
    }

    /**
     * Returns a string representation of this Duration formatted according to the specified format string.
     * @param {string} fmt - the format string
     * @param {Object} opts - options
     * @param {boolean} [opts.floor=true] - floor numerical values
     * @return {string}
     */
    toFormat(fmt, opts = {}) {

      // reverse-compat since 1.2; we always round down now, never up, and we do it by default. So:
      // 1. always turn off rounding in the underlying formatter
      // 2. turn off flooring if either rounding is turned off or flooring is turned off, otherwise leave it on
      const fmtOpts = Object.assign({}, opts, { floor: true, round: false });
      if (opts.round === false || opts.floor === false) {
        fmtOpts.floor = false;
      }

      return this.isValid
        ? Formatter.create(this.loc, fmtOpts).formatDurationFromString(this, fmt)
        : INVALID;
    }

    /**
     * Returns a Javascript object with this Duration's values.
     * @param opts - options for generating the object
     * @param {boolean} [opts.includeConfig=false] - include configuration attributes in the output
     * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toObject() //=> { years: 1, days: 6, seconds: 2 }
     * @return {Object}
     */
    toObject(opts = {}) {
      if (!this.isValid) return {};

      const base = Object.assign({}, this.values);

      if (opts.includeConfig) {
        base.conversionAccuracy = this.conversionAccuracy;
        base.numberingSystem = this.loc.numberingSystem;
        base.locale = this.loc.locale;
      }
      return base;
    }

    /**
     * Returns an ISO 8601-compliant string representation of this Duration.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
     * @example Duration.fromObject({ years: 3, seconds: 45 }).toISO() //=> 'P3YT45S'
     * @example Duration.fromObject({ months: 4, seconds: 45 }).toISO() //=> 'P4MT45S'
     * @example Duration.fromObject({ months: 5 }).toISO() //=> 'P5M'
     * @example Duration.fromObject({ minutes: 5 }).toISO() //=> 'PT5M'
     * @return {string}
     */
    toISO() {
      // we could use the formatter, but this is an easier way to get the minimum string
      if (!this.isValid) return null;

      let s = 'P',
        norm = this.normalize();

      // ISO durations are always positive, so take the absolute value
      norm = isHighOrderNegative(norm.values) ? norm.negate() : norm;

      if (norm.years > 0) s += norm.years + 'Y';
      if (norm.months > 0 || norm.quarters > 0) s += norm.months + norm.quarters * 3 + 'M';
      if (norm.days > 0 || norm.weeks > 0) s += norm.days + norm.weeks * 7 + 'D';
      if (norm.hours > 0 || norm.minutes > 0 || norm.seconds > 0 || norm.milliseconds > 0) s += 'T';
      if (norm.hours > 0) s += norm.hours + 'H';
      if (norm.minutes > 0) s += norm.minutes + 'M';
      if (norm.seconds > 0) s += norm.seconds + 'S';
      return s;
    }

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in JSON.
     * @return {string}
     */
    toJSON() {
      return this.toISO();
    }

    /**
     * Returns an ISO 8601 representation of this Duration appropriate for use in debugging.
     * @return {string}
     */
    toString() {
      return this.toISO();
    }

    /**
     * Returns an milliseconds value of this Duration.
     * @return {number}
     */
    valueOf() {
      return this.as('milliseconds');
    }

    /**
     * Returns a string representation of this Duration appropriate for the REPL.
     * @return {string}
     */
    inspect() {
      if (this.isValid) {
        const valsInspect = JSON.stringify(this.toObject());
        return `Duration {\n  values: ${valsInspect},\n  locale: ${this
        .locale},\n  conversionAccuracy: ${this.conversionAccuracy} }`;
      } else {
        return `Duration { Invalid, reason: ${this.invalidReason} }`;
      }
    }

    /**
     * Make this Duration longer by the specified amount. Return a newly-constructed Duration.
     * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @return {Duration}
     */
    plus(duration) {
      if (!this.isValid) return this;

      const dur = friendlyDuration(duration),
        result = {};

      for (const k of orderedUnits) {
        const val = dur.get(k) + this.get(k);
        if (val !== 0) {
          result[k] = val;
        }
      }

      return clone(this, { values: result }, true);
    }

    /**
     * Make this Duration shorter by the specified amount. Return a newly-constructed Duration.
     * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @return {Duration}
     */
    minus(duration) {
      if (!this.isValid) return this;

      const dur = friendlyDuration(duration);
      return this.plus(dur.negate());
    }

    /**
     * Get the value of unit.
     * @param {string} unit - a unit such as 'minute' or 'day'
     * @example Duration.fromObject({years: 2, days: 3}).years //=> 2
     * @example Duration.fromObject({years: 2, days: 3}).months //=> 0
     * @example Duration.fromObject({years: 2, days: 3}).days //=> 3
     * @return {number}
     */
    get(unit) {
      return this[Duration.normalizeUnit(unit)];
    }

    /**
     * "Set" the values of specified units. Return a newly-constructed Duration.
     * @param {Object} values - a mapping of units to numbers
     * @example dur.set({ years: 2017 })
     * @example dur.set({ hours: 8, minutes: 30 })
     * @return {Duration}
     */
    set(values) {
      const mixed = Object.assign(this.values, normalizeObject(values, Duration.normalizeUnit));
      return clone(this, { values: mixed });
    }

    /**
     * "Set" the locale and/or numberingSystem.  Returns a newly-constructed Duration.
     * @example dur.reconfigure({ locale: 'en-GB' })
     * @return {Duration}
     */
    reconfigure({ locale, numberingSystem, conversionAccuracy } = {}) {
      const loc = this.loc.clone({ locale, numberingSystem }),
        opts = { loc };

      if (conversionAccuracy) {
        opts.conversionAccuracy = conversionAccuracy;
      }

      return clone(this, opts);
    }

    /**
     * Return the length of the duration in the specified unit.
     * @param {string} unit - a unit such as 'minutes' or 'days'
     * @example Duration.fromObject({years: 1}).as('days') //=> 365
     * @example Duration.fromObject({years: 1}).as('months') //=> 12
     * @example Duration.fromObject({hours: 60}).as('days') //=> 2.5
     * @return {number}
     */
    as(unit) {
      return this.isValid ? this.shiftTo(unit).get(unit) : NaN;
    }

    /**
     * Reduce this Duration to its canonical representation in its current units.
     * @example Duration.fromObject({ years: 2, days: 5000 }).normalize().toObject() //=> { years: 15, days: 255 }
     * @example Duration.fromObject({ hours: 12, minutes: -45 }).normalize().toObject() //=> { hours: 11, minutes: 15 }
     * @return {Duration}
     */
    normalize() {
      if (!this.isValid) return this;

      const neg = isHighOrderNegative(this.values),
        vals = (neg ? this.negate() : this).toObject();
      normalizeValues(this.matrix, vals);
      const dur = Duration.fromObject(vals);
      return neg ? dur.negate() : dur;
    }

    /**
     * Convert this Duration into its representation in a different set of units.
     * @example Duration.fromObject({ hours: 1, seconds: 30 }).shiftTo('minutes', 'milliseconds').toObject() //=> { minutes: 60, milliseconds: 30000 }
     * @return {Duration}
     */
    shiftTo(...units) {
      if (!this.isValid) return this;

      if (units.length === 0) {
        return this;
      }

      units = units.map(u => Duration.normalizeUnit(u));

      const built = {},
        accumulated = {},
        vals = this.toObject();
      let lastUnit;

      normalizeValues(this.matrix, vals);

      for (const k of orderedUnits) {
        if (units.indexOf(k) >= 0) {
          lastUnit = k;

          let own = 0;

          // anything we haven't boiled down yet should get boiled to this unit
          for (const ak in accumulated) {
            if (accumulated.hasOwnProperty(ak)) {
              own += this.matrix[ak][k] * accumulated[ak];
              accumulated[ak] = 0;
            }
          }

          // plus anything that's already in this unit
          if (isNumber(vals[k])) {
            own += vals[k];
          }

          const i = Math.trunc(own);
          built[k] = i;
          accumulated[k] = own - i;

          // plus anything further down the chain that should be rolled up in to this
          for (const down in vals) {
            if (orderedUnits.indexOf(down) > orderedUnits.indexOf(k)) {
              convert(this.matrix, vals, down, built, k);
            }
          }
          // otherwise, keep it in the wings to boil it later
        } else if (isNumber(vals[k])) {
          accumulated[k] = vals[k];
        }
      }

      // anything leftover becomes the decimal for the last unit
      if (lastUnit) {
        for (const key in accumulated) {
          if (accumulated.hasOwnProperty(key)) {
            if (accumulated[key] > 0) {
              built[lastUnit] +=
                key === lastUnit ? accumulated[key] : accumulated[key] / this.matrix[lastUnit][key];
            }
          }
        }
      }
      return clone(this, { values: built }, true);
    }

    /**
     * Return the negative of this Duration.
     * @example Duration.fromObject({ hours: 1, seconds: 30 }).negate().toObject() //=> { hours: -1, seconds: -30 }
     * @return {Duration}
     */
    negate() {
      if (!this.isValid) return this;
      const negated = {};
      for (const k of Object.keys(this.values)) {
        negated[k] = -this.values[k];
      }
      return clone(this, { values: negated }, true);
    }

    /**
     * Get the years.
     * @type {number}
     */
    get years() {
      return this.isValid ? this.values.years || 0 : NaN;
    }

    /**
     * Get the quarters.
     * @type {number}
     */
    get quarters() {
      return this.isValid ? this.values.quarters || 0 : NaN;
    }

    /**
     * Get the months.
     * @type {number}
     */
    get months() {
      return this.isValid ? this.values.months || 0 : NaN;
    }

    /**
     * Get the weeks
     * @type {number}
     */
    get weeks() {
      return this.isValid ? this.values.weeks || 0 : NaN;
    }

    /**
     * Get the days.
     * @type {number}
     */
    get days() {
      return this.isValid ? this.values.days || 0 : NaN;
    }

    /**
     * Get the hours.
     * @type {number}
     */
    get hours() {
      return this.isValid ? this.values.hours || 0 : NaN;
    }

    /**
     * Get the minutes.
     * @type {number}
     */
    get minutes() {
      return this.isValid ? this.values.minutes || 0 : NaN;
    }

    /**
     * Get the seconds.
     * @return {number}
     */
    get seconds() {
      return this.isValid ? this.values.seconds || 0 : NaN;
    }

    /**
     * Get the milliseconds.
     * @return {number}
     */
    get milliseconds() {
      return this.isValid ? this.values.milliseconds || 0 : NaN;
    }

    /**
     * Returns whether the Duration is invalid. Invalid durations are returned by diff operations
     * on invalid DateTimes or Intervals.
     * @return {boolean}
     */
    get isValid() {
      return this.invalidReason === null;
    }

    /**
     * Returns an explanation of why this Duration became invalid, or null if the Duration is valid
     * @return {string}
     */
    get invalidReason() {
      return this.invalid;
    }

    /**
     * Equality check
     * Two Durations are equal iff they have the same units and the same values for each unit.
     * @param {Duration} other
     * @return {boolean}
     */
    equals(other) {
      if (!this.isValid || !other.isValid) {
        return false;
      }

      if (!this.loc.equals(other.loc)) {
        return false;
      }

      for (const u of orderedUnits) {
        if (this.values[u] !== other.values[u]) {
          return false;
        }
      }
      return true;
    }
  }

  const INVALID$1 = 'Invalid Interval';

  // checks if the start is equal to or before the end
  function validateStartEnd(start, end) {
    return !!start && !!end && start.isValid && end.isValid && start <= end;
  }

  /**
   * An Interval object represents a half-open interval of time, where each endpoint is a {@link DateTime}. Conceptually, it's a container for those two endpoints, accompanied by methods for creating, parsing, interrogating, comparing, transforming, and formatting them.
   *
   * Here is a brief overview of the most commonly used methods and getters in Interval:
   *
   * * **Creation** To create an Interval, use {@link fromDateTimes}, {@link after}, {@link before}, or {@link fromISO}.
   * * **Accessors** Use {@link start} and {@link end} to get the start and end.
   * * **Interrogation** To analyze the Interval, use {@link count}, {@link length}, {@link hasSame}, {@link contains}, {@link isAfter}, or {@link isBefore}.
   * * **Transformation** To create other Intervals out of this one, use {@link set}, {@link splitAt}, {@link splitBy}, {@link divideEqually}, {@link merge}, {@link xor}, {@link union}, {@link intersection}, or {@link difference}.
   * * **Comparison** To compare this Interval to another one, use {@link equals}, {@link overlaps}, {@link abutsStart}, {@link abutsEnd}, {@link engulfs}
   * * **Output*** To convert the Interval into other representations, see {@link toString}, {@link toISO}, {@link toFormat}, and {@link toDuration}.
   */
  class Interval {
    /**
     * @private
     */
    constructor(config) {
      /**
       * @access private
       */
      this.s = config.start;
      /**
       * @access private
       */
      this.e = config.end;
      /**
       * @access private
       */
      this.invalid = config.invalidReason || null;
    }

    /**
     * Create an invalid Interval.
     * @return {Interval}
     */
    static invalid(reason) {
      if (!reason) {
        throw new InvalidArgumentError('need to specify a reason the DateTime is invalid');
      }
      if (Settings.throwOnInvalid) {
        throw new InvalidIntervalError(reason);
      } else {
        return new Interval({ invalidReason: reason });
      }
    }

    /**
     * Create an Interval from a start DateTime and an end DateTime. Inclusive of the start but not the end.
     * @param {DateTime|Date|Object} start
     * @param {DateTime|Date|Object} end
     * @return {Interval}
     */
    static fromDateTimes(start, end) {
      const builtStart = friendlyDateTime(start),
        builtEnd = friendlyDateTime(end);

      return new Interval({
        start: builtStart,
        end: builtEnd,
        invalidReason: validateStartEnd(builtStart, builtEnd) ? null : 'invalid endpoints'
      });
    }

    /**
     * Create an Interval from a start DateTime and a Duration to extend to.
     * @param {DateTime|Date|Object} start
     * @param {Duration|Object|number} duration - the length of the Interval.
     * @return {Interval}
     */
    static after(start, duration) {
      const dur = friendlyDuration(duration),
        dt = friendlyDateTime(start);
      return Interval.fromDateTimes(dt, dt.plus(dur));
    }

    /**
     * Create an Interval from an end DateTime and a Duration to extend backwards to.
     * @param {DateTime|Date|Object} end
     * @param {Duration|Object|number} duration - the length of the Interval.
     * @return {Interval}
     */
    static before(end, duration) {
      const dur = friendlyDuration(duration),
        dt = friendlyDateTime(end);
      return Interval.fromDateTimes(dt.minus(dur), dt);
    }

    /**
     * Create an Interval from an ISO 8601 string
     * @param {string} string - the ISO string to parse
     * @param {Object} opts - options to pass {@see DateTime.fromISO}
     * @return {Interval}
     */
    static fromISO(string, opts) {
      if (string) {
        const [s, e] = string.split(/\//);
        if (s && e) {
          return Interval.fromDateTimes(DateTime.fromISO(s, opts), DateTime.fromISO(e, opts));
        }
      }
      return Interval.invalid('invalid ISO format');
    }

    /**
     * Returns the start of the Interval
     * @type {DateTime}
     */
    get start() {
      return this.isValid ? this.s : null;
    }

    /**
     * Returns the end of the Interval
     * @type {DateTime}
     */
    get end() {
      return this.isValid ? this.e : null;
    }

    /**
     * Returns whether this Interval's end is at least its start, i.e. that the Interval isn't 'backwards'.
     * @type {boolean}
     */
    get isValid() {
      return this.invalidReason === null;
    }

    /**
     * Returns an explanation of why this Interval became invalid, or null if the Interval is valid
     * @type {string}
     */
    get invalidReason() {
      return this.invalid;
    }

    /**
     * Returns the length of the Interval in the specified unit.
     * @param {string} unit - the unit (such as 'hours' or 'days') to return the length in.
     * @return {number}
     */
    length(unit = 'milliseconds') {
      return this.isValid ? this.toDuration(...[unit]).get(unit) : NaN;
    }

    /**
     * Returns the count of minutes, hours, days, months, or years included in the Interval, even in part.
     * Unlike {@link length} this counts sections of the calendar, not periods of time, e.g. specifying 'day'
     * asks 'what dates are included in this interval?', not 'how many days long is this interval?'
     * @param {string} [unit='milliseconds'] - the unit of time to count.
     * @return {number}
     */
    count(unit = 'milliseconds') {
      if (!this.isValid) return NaN;
      const start = this.start.startOf(unit),
        end = this.end.startOf(unit);
      return Math.floor(end.diff(start, unit).get(unit)) + 1;
    }

    /**
     * Returns whether this Interval's start and end are both in the same unit of time
     * @param {string} unit - the unit of time to check sameness on
     * @return {boolean}
     */
    hasSame(unit) {
      return this.isValid ? this.e.minus(1).hasSame(this.s, unit) : false;
    }

    /**
     * Return whether this Interval has the same start and end DateTimes.
     * @return {boolean}
     */
    isEmpty() {
      return this.s.valueOf() === this.e.valueOf();
    }

    /**
     * Return whether this Interval's start is after the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */
    isAfter(dateTime) {
      if (!this.isValid) return false;
      return this.s > dateTime;
    }

    /**
     * Return whether this Interval's end is before the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */
    isBefore(dateTime) {
      if (!this.isValid) return false;
      return this.e <= dateTime;
    }

    /**
     * Return whether this Interval contains the specified DateTime.
     * @param {DateTime} dateTime
     * @return {boolean}
     */
    contains(dateTime) {
      if (!this.isValid) return false;
      return this.s <= dateTime && this.e > dateTime;
    }

    /**
     * "Sets" the start and/or end dates. Returns a newly-constructed Interval.
     * @param {Object} values - the values to set
     * @param {DateTime} values.start - the starting DateTime
     * @param {DateTime} values.end - the ending DateTime
     * @return {Interval}
     */
    set({ start, end } = {}) {
      if (!this.isValid) return this;
      return Interval.fromDateTimes(start || this.s, end || this.e);
    }

    /**
     * Split this Interval at each of the specified DateTimes
     * @param {...[DateTime]} dateTimes - the unit of time to count.
     * @return {[Interval]}
     */
    splitAt(...dateTimes) {
      if (!this.isValid) return [];
      const sorted = dateTimes.map(friendlyDateTime).sort(),
        results = [];
      let { s } = this,
        i = 0;

      while (s < this.e) {
        const added = sorted[i] || this.e,
          next = +added > +this.e ? this.e : added;
        results.push(Interval.fromDateTimes(s, next));
        s = next;
        i += 1;
      }

      return results;
    }

    /**
     * Split this Interval into smaller Intervals, each of the specified length.
     * Left over time is grouped into a smaller interval
     * @param {Duration|Object|number} duration - The length of each resulting interval.
     * @return {[Interval]}
     */
    splitBy(duration) {
      const dur = friendlyDuration(duration);

      if (!this.isValid || !dur.isValid || dur.as("milliseconds") === 0) {
        return [];
      }

      let { s } = this,
        added,
        next;

      const results = [];
      while (s < this.e) {
        added = s.plus(dur);
        next = +added > +this.e ? this.e : added;
        results.push(Interval.fromDateTimes(s, next));
        s = next;
      }

      return results;
    }

    /**
     * Split this Interval into the specified number of smaller intervals.
     * @param {number} numberOfParts - The number of Intervals to divide the Interval into.
     * @return {[Interval]}
     */
    divideEqually(numberOfParts) {
      if (!this.isValid) return [];
      return this.splitBy(this.length() / numberOfParts).slice(0, numberOfParts);
    }

    /**
     * Return whether this Interval overlaps with the specified Interval
     * @param {Interval} other
     * @return {boolean}
     */
    overlaps(other) {
      return this.e > other.s && this.s < other.e;
    }

    /**
     * Return whether this Interval's end is adjacent to the specified Interval's start.
     * @param {Interval} other
     * @return {boolean}
     */
    abutsStart(other) {
      if (!this.isValid) return false;
      return +this.e === +other.s;
    }

    /**
     * Return whether this Interval's start is adjacent to the specified Interval's end.
     * @param {Interval} other
     * @return {boolean}
     */
    abutsEnd(other) {
      if (!this.isValid) return false;
      return +other.e === +this.s;
    }

    /**
     * Return whether this Interval engulfs the start and end of the specified Interval.
     * @param {Interval} other
     * @return {boolean}
     */
    engulfs(other) {
      if (!this.isValid) return false;
      return this.s <= other.s && this.e >= other.e;
    }

    /**
     * Return whether this Interval has the same start and end as the specified Interval.
     * @param {Interval} other
     * @return {boolean}
     */
    equals(other) {
      if (!this.isValid || !other.isValid) {
        return false;
      }

      return this.s.equals(other.s) && this.e.equals(other.e);
    }

    /**
     * Return an Interval representing the intersection of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the maximum start time and the minimum end time of the two Intervals.
     * Returns null if the intersection is empty, i.e., the intervals don't intersect.
     * @param {Interval} other
     * @return {Interval}
     */
    intersection(other) {
      if (!this.isValid) return this;
      const s = this.s > other.s ? this.s : other.s,
        e = this.e < other.e ? this.e : other.e;

      if (s > e) {
        return null;
      } else {
        return Interval.fromDateTimes(s, e);
      }
    }

    /**
     * Return an Interval representing the union of this Interval and the specified Interval.
     * Specifically, the resulting Interval has the minimum start time and the maximum end time of the two Intervals.
     * @param {Interval} other
     * @return {Interval}
     */
    union(other) {
      if (!this.isValid) return this;
      const s = this.s < other.s ? this.s : other.s,
        e = this.e > other.e ? this.e : other.e;
      return Interval.fromDateTimes(s, e);
    }

    /**
     * Merge an array of Intervals into a equivalent minimal set of Intervals.
     * Combines overlapping and adjacent Intervals.
     * @param {[Interval]} intervals
     * @return {[Interval]}
     */
    static merge(intervals) {
      const [found, final] = intervals.sort((a, b) => a.s - b.s).reduce(([sofar, current], item) => {
        if (!current) {
          return [sofar, item];
        } else if (current.overlaps(item) || current.abutsStart(item)) {
          return [sofar, current.union(item)];
        } else {
          return [sofar.concat([current]), item];
        }
      },
      [[], null]);
      if (final) {
        found.push(final);
      }
      return found;
    }

    /**
     * Return an array of Intervals representing the spans of time that only appear in one of the specified Intervals.
     * @param {[Interval]} intervals
     * @return {[Interval]}
     */
    static xor(intervals) {
      let start = null,
        currentCount = 0;
      const results = [],
        ends = intervals.map(i => [{ time: i.s, type: 's' }, { time: i.e, type: 'e' }]),
        flattened = Array.prototype.concat(...ends),
        arr = flattened.sort((a, b) => a.time - b.time);

      for (const i of arr) {
        currentCount += i.type === 's' ? 1 : -1;

        if (currentCount === 1) {
          start = i.time;
        } else {
          if (start && +start !== +i.time) {
            results.push(Interval.fromDateTimes(start, i.time));
          }

          start = null;
        }
      }

      return Interval.merge(results);
    }

    /**
     * Return an Interval representing the span of time in this Interval that doesn't overlap with any of the specified Intervals.
     * @param {...Interval} intervals
     * @return {[Interval]}
     */
    difference(...intervals) {
      return Interval.xor([this].concat(intervals))
        .map(i => this.intersection(i))
        .filter(i => i && !i.isEmpty());
    }

    /**
     * Returns a string representation of this Interval appropriate for debugging.
     * @return {string}
     */
    toString() {
      if (!this.isValid) return INVALID$1;
      return `[${this.s.toISO()} – ${this.e.toISO()})`;
    }

    /**
     * Returns a string representation of this Interval appropriate for the REPL.
     * @return {string}
     */
    inspect() {
      if (this.isValid) {
        return `Interval {\n  start: ${this.start.toISO()},\n  end: ${this.end.toISO()},\n  zone:   ${this
        .start.zone.name},\n  locale:   ${this.start.locale} }`;
      } else {
        return `Interval { Invalid, reason: ${this.invalidReason} }`;
      }
    }

    /**
     * Returns an ISO 8601-compliant string representation of this Interval.
     * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
     * @param {Object} opts - The same options as {@link DateTime.toISO}
     * @return {string}
     */
    toISO(opts) {
      if (!this.isValid) return INVALID$1;
      return `${this.s.toISO(opts)}/${this.e.toISO(opts)}`;
    }

    /**
     * Returns a string representation of this Interval formatted according to the specified format string.
     * @param {string} dateFormat - the format string. This string formats the start and end time. See {@link DateTime.toFormat} for details.
     * @param {Object} opts - options
     * @param {string} [opts.separator =  ' – '] - a separator to place between the start and end representations
     * @return {string}
     */
    toFormat(dateFormat, { separator = ' – ' } = {}) {
      if (!this.isValid) return INVALID$1;
      return `${this.s.toFormat(dateFormat)}${separator}${this.e.toFormat(dateFormat)}`;
    }

    /**
     * Return a Duration representing the time spanned by this interval.
     * @param {string|string[]} [unit=['milliseconds']] - the unit or units (such as 'hours' or 'days') to include in the duration.
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @example Interval.fromDateTimes(dt1, dt2).toDuration().toObject() //=> { milliseconds: 88489257 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration('days').toObject() //=> { days: 1.0241812152777778 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes']).toObject() //=> { hours: 24, minutes: 34.82095 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes', 'seconds']).toObject() //=> { hours: 24, minutes: 34, seconds: 49.257 }
     * @example Interval.fromDateTimes(dt1, dt2).toDuration('seconds').toObject() //=> { seconds: 88489.257 }
     * @return {Duration}
     */
    toDuration(unit, opts) {
      if (!this.isValid) {
        return Duration.invalid(this.invalidReason);
      }
      return this.e.diff(this.s, unit, opts);
    }
  }

  /**
   * The Info class contains static methods for retrieving general time and date related data. For example, it has methods for finding out if a time zone has a DST, for listing the months in any supported locale, and for discovering which of Luxon features are available in the current environment.
   */
  class Info {
    /**
     * Return whether the specified zone contains a DST.
     * @param {string|Zone} [zone='local'] - Zone to check. Defaults to the environment's local zone.
     * @return {boolean}
     */
    static hasDST(zone = Settings.defaultZone) {
      const proto = DateTime.local()
        .setZone(zone)
        .set({ month: 12 });

      return !zone.universal && proto.offset !== proto.set({ month: 6 }).offset;
    }

    /**
     * Return whether the specified zone is a valid IANA specifier.
     * @param {string} zone - Zone to check
     * @return {boolean}
     */
    static isValidIANAZone(zone) {
      return !!IANAZone.isValidSpecifier(zone) && IANAZone.isValidZone(zone);
    }

    /**
     * Return an array of standalone month names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.outputCalendar='gregory'] - the calendar
     * @example Info.months()[0] //=> 'January'
     * @example Info.months('short')[0] //=> 'Jan'
     * @example Info.months('numeric')[0] //=> '1'
     * @example Info.months('short', { locale: 'fr-CA' } )[0] //=> 'janv.'
     * @example Info.months('numeric', { locale: 'ar' })[0] //=> '١'
     * @example Info.months('long', { outputCalendar: 'islamic' })[0] //=> 'Rabiʻ I'
     * @return {[string]}
     */
    static months(
      length = 'long',
      { locale = null, numberingSystem = null, outputCalendar = 'gregory' } = {}
    ) {
      return Locale.create(locale, numberingSystem, outputCalendar).months(length);
    }

    /**
     * Return an array of format month names.
     * Format months differ from standalone months in that they're meant to appear next to the day of the month. In some languages, that
     * changes the string.
     * See {@link months}
     * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @param {string} [opts.outputCalendar='gregory'] - the calendar
     * @return {[string]}
     */
    static monthsFormat(
      length = 'long',
      { locale = null, numberingSystem = null, outputCalendar = 'gregory' } = {}
    ) {
      return Locale.create(locale, numberingSystem, outputCalendar).months(length, true);
    }

    /**
     * Return an array of standalone week names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param {string} [length='long'] - the length of the month representation, such as "narrow", "short", "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @example Info.weekdays()[0] //=> 'Monday'
     * @example Info.weekdays('short')[0] //=> 'Mon'
     * @example Info.weekdays('short', { locale: 'fr-CA' })[0] //=> 'lun.'
     * @example Info.weekdays('short', { locale: 'ar' })[0] //=> 'الاثنين'
     * @return {[string]}
     */
    static weekdays(length = 'long', { locale = null, numberingSystem = null } = {}) {
      return Locale.create(locale, numberingSystem, null).weekdays(length);
    }

    /**
     * Return an array of format week names.
     * Format weekdays differ from standalone weekdays in that they're meant to appear next to more date information. In some languages, that
     * changes the string.
     * See {@link weekdays}
     * @param {string} [length='long'] - the length of the month representation, such as "narrow", "short", "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale=null] - the locale code
     * @param {string} [opts.numberingSystem=null] - the numbering system
     * @return {[string]}
     */
    static weekdaysFormat(length = 'long', { locale = null, numberingSystem = null } = {}) {
      return Locale.create(locale, numberingSystem, null).weekdays(length, true);
    }

    /**
     * Return an array of meridiems.
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @example Info.meridiems() //=> [ 'AM', 'PM' ]
     * @example Info.meridiems({ locale: 'de' }) //=> [ 'vorm.', 'nachm.' ]
     * @return {[string]}
     */
    static meridiems({ locale = null } = {}) {
      return Locale.create(locale).meridiems();
    }

    /**
     * Return an array of eras, such as ['BC', 'AD']. The locale can be specified, but the calendar system is always Gregorian.
     * @param {string} [length='short'] - the length of the era representation, such as "short" or "long".
     * @param {Object} opts - options
     * @param {string} [opts.locale] - the locale code
     * @example Info.eras() //=> [ 'BC', 'AD' ]
     * @example Info.eras('long') //=> [ 'Before Christ', 'Anno Domini' ]
     * @example Info.eras('long', { locale: 'fr' }) //=> [ 'avant Jésus-Christ', 'après Jésus-Christ' ]
     * @return {[string]}
     */
    static eras(length = 'short', { locale = null } = {}) {
      return Locale.create(locale, null, 'gregory').eras(length);
    }

    /**
     * Return the set of available features in this environment.
     * Some features of Luxon are not available in all environments. For example, on older browsers, timezone support is not available. Use this function to figure out if that's the case.
     * Keys:
     * * `zones`: whether this environment supports IANA timezones
     * * `intlTokens`: whether this environment supports internationalized token-based formatting/parsing
     * * `intl`: whether this environment supports general internationalization
     * @example Info.features() //=> { intl: true, intlTokens: false, zones: true }
     * @return {Object}
     */
    static features() {
      let intl = false,
        intlTokens = false,
        zones = false;

      if (hasIntl()) {
        intl = true;
        intlTokens = hasFormatToParts();

        try {
          zones =
            new Intl.DateTimeFormat('en', { timeZone: 'America/New_York' }).resolvedOptions()
              .timeZone === 'America/New_York';
        } catch (e) {
          zones = false;
        }
      }

      return { intl, intlTokens, zones };
    }
  }

  function dayDiff(earlier, later) {
    const utcDayStart = dt =>
        dt
          .toUTC(0, { keepLocalTime: true })
          .startOf('day')
          .valueOf(),
      ms = utcDayStart(later) - utcDayStart(earlier);
    return Math.floor(Duration.fromMillis(ms).as('days'));
  }

  function highOrderDiffs(cursor, later, units) {
    const differs = [
      ['years', (a, b) => b.year - a.year],
      ['months', (a, b) => b.month - a.month + (b.year - a.year) * 12],
      [
        'weeks',
        (a, b) => {
          const days = dayDiff(a, b);
          return (days - days % 7) / 7;
        }
      ],
      ['days', dayDiff]
    ];

    const results = {};
    let lowestOrder, highWater;

    for (const [unit, differ] of differs) {
      if (units.indexOf(unit) >= 0) {
        lowestOrder = unit;

        let delta = differ(cursor, later);

        highWater = cursor.plus({ [unit]: delta });

        if (highWater > later) {
          cursor = highWater.minus({ [unit]: 1 });
          delta -= 1;
        } else {
          cursor = highWater;
        }

        if (delta > 0) {
          results[unit] = delta;
        }
      }
    }

    return [cursor, results, highWater, lowestOrder];
  }

  function diff(earlier, later, units, opts) {
    let [cursor, results, highWater, lowestOrder] = highOrderDiffs(earlier, later, units);

    const remainingMillis = later - cursor;

    const lowerOrderUnits = units.filter(
      u => ['hours', 'minutes', 'seconds', 'milliseconds'].indexOf(u) >= 0
    );

    if (lowerOrderUnits.length === 0) {
      if (highWater < later) {
        highWater = cursor.plus({ [lowestOrder]: 1 });
      }

      if (highWater !== cursor) {
        results[lowestOrder] = (results[lowestOrder] || 0) + remainingMillis / (highWater - cursor);
      }
    }

    const duration = Duration.fromObject(Object.assign(results, opts));

    if (lowerOrderUnits.length > 0) {
      return Duration.fromMillis(remainingMillis, opts)
        .shiftTo(...lowerOrderUnits)
        .plus(duration);
    } else {
      return duration;
    }
  }

  const MISSING_FTP = 'missing Intl.DateTimeFormat.formatToParts support';

  function intUnit(regex, post = i => i) {
    return { regex, deser: ([s]) => post(parseInt(s)) };
  }

  function fixListRegex(s) {
    // make dots optional and also make them literal
    return s.replace(/\./, '\\.?');
  }

  function stripInsensitivities(s) {
    return s.replace(/\./, '').toLowerCase();
  }

  function oneOf(strings, startIndex) {
    if (strings === null) {
      return null;
    } else {
      return {
        regex: RegExp(strings.map(fixListRegex).join('|')),
        deser: ([s]) =>
          strings.findIndex(i => stripInsensitivities(s) === stripInsensitivities(i)) + startIndex
      };
    }
  }

  function offset(regex, groups) {
    return { regex, deser: ([, h, m]) => signedOffset(h, m), groups };
  }

  function simple(regex) {
    return { regex, deser: ([s]) => s };
  }

  function unitForToken(token, loc) {
    const one = /\d/,
      two = /\d{2}/,
      three = /\d{3}/,
      four = /\d{4}/,
      oneOrTwo = /\d{1,2}/,
      oneToThree = /\d{1,3}/,
      twoToFour = /\d{2,4}/,
      literal = t => ({ regex: RegExp(t.val), deser: ([s]) => s, literal: true }),
      unitate = t => {
        if (token.literal) {
          return literal(t);
        }
        switch (t.val) {
          // era
          case 'G':
            return oneOf(loc.eras('short', false), 0);
          case 'GG':
            return oneOf(loc.eras('long', false), 0);
          // years
          case 'y':
            return intUnit(/\d{1,6}/);
          case 'yy':
            return intUnit(twoToFour, untruncateYear);
          case 'yyyy':
            return intUnit(four);
          case 'yyyyy':
            return intUnit(/\d{4,6}/);
          case 'yyyyyy':
            return intUnit(/\d{6}/);
          // months
          case 'M':
            return intUnit(oneOrTwo);
          case 'MM':
            return intUnit(two);
          case 'MMM':
            return oneOf(loc.months('short', false, false), 1);
          case 'MMMM':
            return oneOf(loc.months('long', false, false), 1);
          case 'L':
            return intUnit(oneOrTwo);
          case 'LL':
            return intUnit(two);
          case 'LLL':
            return oneOf(loc.months('short', true, false), 1);
          case 'LLLL':
            return oneOf(loc.months('long', true, false), 1);
          // dates
          case 'd':
            return intUnit(oneOrTwo);
          case 'dd':
            return intUnit(two);
          // ordinals
          case 'o':
            return intUnit(oneToThree);
          case 'ooo':
            return intUnit(three);
          // time
          case 'HH':
            return intUnit(two);
          case 'H':
            return intUnit(oneOrTwo);
          case 'hh':
            return intUnit(two);
          case 'h':
            return intUnit(oneOrTwo);
          case 'mm':
            return intUnit(two);
          case 'm':
            return intUnit(oneOrTwo);
          case 's':
            return intUnit(oneOrTwo);
          case 'ss':
            return intUnit(two);
          case 'S':
            return intUnit(oneToThree);
          case 'SSS':
            return intUnit(three);
          case 'u':
            return simple(/\d{1,9}/);
          // meridiem
          case 'a':
            return oneOf(loc.meridiems(), 0);
          // weekYear (k)
          case 'kkkk':
            return intUnit(four);
          case 'kk':
            return intUnit(twoToFour, untruncateYear);
          // weekNumber (W)
          case 'W':
            return intUnit(oneOrTwo);
          case 'WW':
            return intUnit(two);
          // weekdays
          case 'E':
          case 'c':
            return intUnit(one);
          case 'EEE':
            return oneOf(loc.weekdays('short', false, false), 1);
          case 'EEEE':
            return oneOf(loc.weekdays('long', false, false), 1);
          case 'ccc':
            return oneOf(loc.weekdays('short', true, false), 1);
          case 'cccc':
            return oneOf(loc.weekdays('long', true, false), 1);
          // offset/zone
          case 'Z':
          case 'ZZ':
            return offset(/([+-]\d{1,2})(?::(\d{2}))?/, 2);
          case 'ZZZ':
            return offset(/([+-]\d{1,2})(\d{2})?/, 2);
          // we don't support ZZZZ (PST) or ZZZZZ (Pacific Standard Time) in parsing
          // because we don't have any way to figure out what they are
          case 'z':
            return simple(/[A-Za-z_]{1,256}\/[A-Za-z_]{1,256}/);
          default:
            return literal(t);
        }
      };

    const unit = unitate(token) || {
      invalidReason: MISSING_FTP
    };

    unit.token = token;

    return unit;
  }

  function buildRegex(units) {
    const re = units.map(u => u.regex).reduce((f, r) => `${f}(${r.source})`, '');
    return [`^${re}$`, units];
  }

  function match(input, regex, handlers) {
    const matches = input.match(regex);

    if (matches) {
      const all = {};
      let matchIndex = 1;
      for (const i in handlers) {
        if (handlers.hasOwnProperty(i)) {
          const h = handlers[i],
            groups = h.groups ? h.groups + 1 : 1;
          if (!h.literal && h.token) {
            all[h.token.val[0]] = h.deser(matches.slice(matchIndex, matchIndex + groups));
          }
          matchIndex += groups;
        }
      }
      return [matches, all];
    } else {
      return [matches, {}];
    }
  }

  function dateTimeFromMatches(matches) {
    const toField = token => {
      switch (token) {
        case 'S':
          return 'millisecond';
        case 's':
          return 'second';
        case 'm':
          return 'minute';
        case 'h':
        case 'H':
          return 'hour';
        case 'd':
          return 'day';
        case 'o':
          return 'ordinal';
        case 'L':
        case 'M':
          return 'month';
        case 'y':
          return 'year';
        case 'E':
        case 'c':
          return 'weekday';
        case 'W':
          return 'weekNumber';
        case 'k':
          return 'weekYear';
        default:
          return null;
      }
    };

    let zone;
    if (!isUndefined(matches.Z)) {
      zone = new FixedOffsetZone(matches.Z);
    } else if (!isUndefined(matches.z)) {
      zone = new IANAZone(matches.z);
    } else {
      zone = null;
    }

    if (!isUndefined(matches.h)) {
      if (matches.h < 12 && matches.a === 1) {
        matches.h += 12;
      } else if (matches.h === 12 && matches.a === 0) {
        matches.h = 0;
      }
    }

    if (matches.G === 0 && matches.y) {
      matches.y = -matches.y;
    }

    if (!isUndefined(matches.u)) {
      matches.S = parseMillis(matches.u);
    }

    const vals = Object.keys(matches).reduce((r, k) => {
      const f = toField(k);
      if (f) {
        r[f] = matches[k];
      }

      return r;
    }, {});

    return [vals, zone];
  }

  /**
   * @private
   */

  function explainFromTokens(locale, input, format) {
    const tokens = Formatter.parseFormat(format),
      units = tokens.map(t => unitForToken(t, locale)),
      disqualifyingUnit = units.find(t => t.invalidReason);

    if (disqualifyingUnit) {
      return { input, tokens, invalidReason: disqualifyingUnit.invalidReason };
    } else {
      const [regexString, handlers] = buildRegex(units),
        regex = RegExp(regexString, 'i'),
        [rawMatches, matches] = match(input, regex, handlers),
        [result, zone] = matches ? dateTimeFromMatches(matches) : [null, null];

      return { input, tokens, regex, rawMatches, matches, result, zone };
    }
  }

  function parseFromTokens(locale, input, format) {
    const { result, zone, invalidReason } = explainFromTokens(locale, input, format);
    return [result, zone, invalidReason];
  }

  const nonLeapLadder = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
    leapLadder = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

  function dayOfWeek(year, month, day) {
    const js = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return js === 0 ? 7 : js;
  }

  function computeOrdinal(year, month, day) {
    return day + (isLeapYear(year) ? leapLadder : nonLeapLadder)[month - 1];
  }

  function uncomputeOrdinal(year, ordinal) {
    const table = isLeapYear(year) ? leapLadder : nonLeapLadder,
      month0 = table.findIndex(i => i < ordinal),
      day = ordinal - table[month0];
    return { month: month0 + 1, day };
  }

  /**
   * @private
   */

  function gregorianToWeek(gregObj) {
    const { year, month, day } = gregObj,
      ordinal = computeOrdinal(year, month, day),
      weekday = dayOfWeek(year, month, day);

    let weekNumber = Math.floor((ordinal - weekday + 10) / 7),
      weekYear;

    if (weekNumber < 1) {
      weekYear = year - 1;
      weekNumber = weeksInWeekYear(weekYear);
    } else if (weekNumber > weeksInWeekYear(year)) {
      weekYear = year + 1;
      weekNumber = 1;
    } else {
      weekYear = year;
    }

    return Object.assign({ weekYear, weekNumber, weekday }, timeObject(gregObj));
  }

  function weekToGregorian(weekData) {
    const { weekYear, weekNumber, weekday } = weekData,
      weekdayOfJan4 = dayOfWeek(weekYear, 1, 4),
      yearInDays = daysInYear(weekYear);
    let ordinal = weekNumber * 7 + weekday - weekdayOfJan4 - 3,
      year;

    if (ordinal < 1) {
      year = weekYear - 1;
      ordinal += daysInYear(year);
    } else if (ordinal > yearInDays) {
      year = weekYear + 1;
      ordinal -= daysInYear(year);
    } else {
      year = weekYear;
    }

    const { month, day } = uncomputeOrdinal(year, ordinal);

    return Object.assign({ year, month, day }, timeObject(weekData));
  }

  function gregorianToOrdinal(gregData) {
    const { year, month, day } = gregData,
      ordinal = computeOrdinal(year, month, day);

    return Object.assign({ year, ordinal }, timeObject(gregData));
  }

  function ordinalToGregorian(ordinalData) {
    const { year, ordinal } = ordinalData,
      { month, day } = uncomputeOrdinal(year, ordinal);

    return Object.assign({ year, month, day }, timeObject(ordinalData));
  }

  function hasInvalidWeekData(obj) {
    const validYear = isNumber(obj.weekYear),
      validWeek = numberBetween(obj.weekNumber, 1, weeksInWeekYear(obj.weekYear)),
      validWeekday = numberBetween(obj.weekday, 1, 7);

    if (!validYear) {
      return 'weekYear out of range';
    } else if (!validWeek) {
      return 'week out of range';
    } else if (!validWeekday) {
      return 'weekday out of range';
    } else return false;
  }

  function hasInvalidOrdinalData(obj) {
    const validYear = isNumber(obj.year),
      validOrdinal = numberBetween(obj.ordinal, 1, daysInYear(obj.year));

    if (!validYear) {
      return 'year out of range';
    } else if (!validOrdinal) {
      return 'ordinal out of range';
    } else return false;
  }

  function hasInvalidGregorianData(obj) {
    const validYear = isNumber(obj.year),
      validMonth = numberBetween(obj.month, 1, 12),
      validDay = numberBetween(obj.day, 1, daysInMonth(obj.year, obj.month));

    if (!validYear) {
      return 'year out of range';
    } else if (!validMonth) {
      return 'month out of range';
    } else if (!validDay) {
      return 'day out of range';
    } else return false;
  }

  function hasInvalidTimeData(obj) {
    const validHour = numberBetween(obj.hour, 0, 23),
      validMinute = numberBetween(obj.minute, 0, 59),
      validSecond = numberBetween(obj.second, 0, 59),
      validMillisecond = numberBetween(obj.millisecond, 0, 999);

    if (!validHour) {
      return 'hour out of range';
    } else if (!validMinute) {
      return 'minute out of range';
    } else if (!validSecond) {
      return 'second out of range';
    } else if (!validMillisecond) {
      return 'millisecond out of range';
    } else return false;
  }

  const INVALID$2 = 'Invalid DateTime',
    INVALID_INPUT = 'invalid input',
    UNSUPPORTED_ZONE = 'unsupported zone',
    UNPARSABLE$1 = 'unparsable';

  // we cache week data on the DT object and this intermediates the cache
  function possiblyCachedWeekData(dt) {
    if (dt.weekData === null) {
      dt.weekData = gregorianToWeek(dt.c);
    }
    return dt.weekData;
  }

  // clone really means, "make a new object with these modifications". all "setters" really use this
  // to create a new object while only changing some of the properties
  function clone$1(inst, alts) {
    const current = {
      ts: inst.ts,
      zone: inst.zone,
      c: inst.c,
      o: inst.o,
      loc: inst.loc,
      invalidReason: inst.invalidReason
    };
    return new DateTime(Object.assign({}, current, alts, { old: current }));
  }

  // find the right offset a given local time. The o input is our guess, which determines which
  // offset we'll pick in ambiguous cases (e.g. there are two 3 AMs b/c Fallback DST)
  function fixOffset(localTS, o, tz) {
    // Our UTC time is just a guess because our offset is just a guess
    let utcGuess = localTS - o * 60 * 1000;

    // Test whether the zone matches the offset for this ts
    const o2 = tz.offset(utcGuess);

    // If so, offset didn't change and we're done
    if (o === o2) {
      return [utcGuess, o];
    }

    // If not, change the ts by the difference in the offset
    utcGuess -= (o2 - o) * 60 * 1000;

    // If that gives us the local time we want, we're done
    const o3 = tz.offset(utcGuess);
    if (o2 === o3) {
      return [utcGuess, o2];
    }

    // If it's different, we're in a hole time. The offset has changed, but the we don't adjust the time
    return [localTS - Math.min(o2, o3) * 60 * 1000, Math.max(o2, o3)];
  }

  // convert an epoch timestamp into a calendar object with the given offset
  function tsToObj(ts, offset) {
    ts += offset * 60 * 1000;

    const d = new Date(ts);

    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      millisecond: d.getUTCMilliseconds()
    };
  }

  // covert a calendar object to a local timestamp (epoch, but with the offset baked in)
  function objToLocalTS(obj) {
    let d = Date.UTC(
      obj.year,
      obj.month - 1,
      obj.day,
      obj.hour,
      obj.minute,
      obj.second,
      obj.millisecond
    );

    // javascript is stupid and i hate it
    if (obj.year < 100 && obj.year >= 0) {
      d = new Date(d);
      d.setUTCFullYear(obj.year);
    }
    return +d;
  }

  // convert a calendar object to a epoch timestamp
  function objToTS(obj, offset, zone) {
    return fixOffset(objToLocalTS(obj), offset, zone);
  }

  // create a new DT instance by adding a duration, adjusting for DSTs
  function adjustTime(inst, dur) {
    const oPre = inst.o,
      year = inst.c.year + dur.years,
      month = inst.c.month + dur.months + dur.quarters * 3,
      c = Object.assign({}, inst.c, {
        year,
        month,
        day: Math.min(inst.c.day, daysInMonth(year, month)) + dur.days + dur.weeks * 7
      }),
      millisToAdd = Duration.fromObject({
        hours: dur.hours,
        minutes: dur.minutes,
        seconds: dur.seconds,
        milliseconds: dur.milliseconds
      }).as('milliseconds'),
      localTS = objToLocalTS(c);

    let [ts, o] = fixOffset(localTS, oPre, inst.zone);

    if (millisToAdd !== 0) {
      ts += millisToAdd;
      // that could have changed the offset by going over a DST, but we want to keep the ts the same
      o = inst.zone.offset(ts);
    }

    return { ts, o };
  }

  // helper useful in turning the results of parsing into real dates
  // by handling the zone options
  function parseDataToDateTime(parsed, parsedZone, opts) {
    const { setZone, zone } = opts;
    if (parsed && Object.keys(parsed).length !== 0) {
      const interpretationZone = parsedZone || zone,
        inst = DateTime.fromObject(
          Object.assign(parsed, opts, {
            zone: interpretationZone
          })
        );
      return setZone ? inst : inst.setZone(zone);
    } else {
      return DateTime.invalid(UNPARSABLE$1);
    }
  }

  // if you want to output a technical format (e.g. RFC 2822), this helper
  // helps handle the details
  function toTechFormat(dt, format) {
    return dt.isValid
      ? Formatter.create(Locale.create('en-US'), {
          allowZ: true,
          forceSimple: true
        }).formatDateTimeFromString(dt, format)
      : null;
  }

  // technical time formats (e.g. the time part of ISO 8601), take some options
  // and this commonizes their handling
  function toTechTimeFormat(
    dt,
    {
      suppressSeconds = false,
      suppressMilliseconds = false,
      includeOffset = true,
      includeZone = false,
      spaceZone = false
    }
  ) {
    let fmt = 'HH:mm';

    if (!suppressSeconds || dt.second !== 0 || dt.millisecond !== 0) {
      fmt += ':ss';
      if (!suppressMilliseconds || dt.millisecond !== 0) {
        fmt += '.SSS';
      }
    }

    if ((includeZone || includeOffset) && spaceZone) {
      fmt += ' ';
    }

    if (includeZone) {
      fmt += 'z';
    } else if (includeOffset) {
      fmt += 'ZZ';
    }

    return toTechFormat(dt, fmt);
  }

  // defaults for unspecified units in the supported calendars
  const defaultUnitValues = {
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    defaultWeekUnitValues = {
      weekNumber: 1,
      weekday: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    defaultOrdinalUnitValues = {
      ordinal: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    };

  // Units in the supported calendars, sorted by bigness
  const orderedUnits$1 = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'],
    orderedWeekUnits = [
      'weekYear',
      'weekNumber',
      'weekday',
      'hour',
      'minute',
      'second',
      'millisecond'
    ],
    orderedOrdinalUnits = ['year', 'ordinal', 'hour', 'minute', 'second', 'millisecond'];

  // standardize case and plurality in units
  function normalizeUnit(unit, ignoreUnknown = false) {
    const normalized = {
      year: 'year',
      years: 'year',
      month: 'month',
      months: 'month',
      day: 'day',
      days: 'day',
      hour: 'hour',
      hours: 'hour',
      minute: 'minute',
      minutes: 'minute',
      second: 'second',
      seconds: 'second',
      millisecond: 'millisecond',
      milliseconds: 'millisecond',
      weekday: 'weekday',
      weekdays: 'weekday',
      weeknumber: 'weekNumber',
      weeksnumber: 'weekNumber',
      weeknumbers: 'weekNumber',
      weekyear: 'weekYear',
      weekyears: 'weekYear',
      ordinal: 'ordinal'
    }[unit ? unit.toLowerCase() : unit];

    if (!ignoreUnknown && !normalized) throw new InvalidUnitError(unit);

    return normalized;
  }

  // this is a dumbed down version of fromObject() that runs about 60% faster
  // but doesn't do any validation, makes a bunch of assumptions about what units
  // are present, and so on.
  function quickDT(obj, zone) {
    // assume we have the higher-order units
    for (const u of orderedUnits$1) {
      if (isUndefined(obj[u])) {
        obj[u] = defaultUnitValues[u];
      }
    }

    const invalidReason = hasInvalidGregorianData(obj) || hasInvalidTimeData(obj);
    if (invalidReason) {
      return DateTime.invalid(invalidReason);
    }

    const tsNow = Settings.now(),
      offsetProvis = zone.offset(tsNow),
      [ts, o] = objToTS(obj, offsetProvis, zone);

    return new DateTime({
      ts,
      zone,
      o
    });
  }

  /**
   * A DateTime is an immutable data structure representing a specific date and time and accompanying methods. It contains class and instance methods for creating, parsing, interrogating, transforming, and formatting them.
   *
   * A DateTime comprises of:
   * * A timestamp. Each DateTime instance refers to a specific millisecond of the Unix epoch.
   * * A time zone. Each instance is considered in the context of a specific zone (by default the local system's zone).
   * * Configuration properties that effect how output strings are formatted, such as `locale`, `numberingSystem`, and `outputCalendar`.
   *
   * Here is a brief overview of the most commonly used functionality it provides:
   *
   * * **Creation**: To create a DateTime from its components, use one of its factory class methods: {@link local}, {@link utc}, and (most flexibly) {@link fromObject}. To create one from a standard string format, use {@link fromISO}, {@link fromHTTP}, and {@link fromRFC2822}. To create one from a custom string format, use {@link fromFormat}. To create one from a native JS date, use {@link fromJSDate}.
   * * **Gregorian calendar and time**: To examine the Gregorian properties of a DateTime individually (i.e as opposed to collectively through {@link toObject}), use the {@link year}, {@link month},
   * {@link day}, {@link hour}, {@link minute}, {@link second}, {@link millisecond} accessors.
   * * **Week calendar**: For ISO week calendar attributes, see the {@link weekYear}, {@link weekNumber}, and {@link weekday} accessors.
   * * **Configuration** See the {@link locale} and {@link numberingSystem} accessors.
   * * **Transformation**: To transform the DateTime into other DateTimes, use {@link set}, {@link reconfigure}, {@link setZone}, {@link setLocale}, {@link plus}, {@link minus}, {@link endOf}, {@link startOf}, {@link toUTC}, and {@link toLocal}.
   * * **Output**: To convert the DateTime to other representations, use the {@link toJSON}, {@link toISO}, {@link toHTTP}, {@link toObject}, {@link toRFC2822}, {@link toString}, {@link toLocaleString}, {@link toFormat}, {@link valueOf} and {@link toJSDate}.
   *
   * There's plenty others documented below. In addition, for more information on subtler topics like internationalization, time zones, alternative calendars, validity, and so on, see the external documentation.
   */
  class DateTime {
    /**
     * @access private
     */
    constructor(config) {
      const zone = config.zone || Settings.defaultZone,
        invalidReason =
          config.invalidReason ||
          (Number.isNaN(config.ts) ? INVALID_INPUT : null) ||
          (!zone.isValid ? UNSUPPORTED_ZONE : null);
      /**
       * @access private
       */
      this.ts = isUndefined(config.ts) ? Settings.now() : config.ts;

      let c = null,
        o = null;
      if (!invalidReason) {
        const unchanged = config.old && config.old.ts === this.ts && config.old.zone.equals(zone);
        c = unchanged ? config.old.c : tsToObj(this.ts, zone.offset(this.ts));
        o = unchanged ? config.old.o : zone.offset(this.ts);
      }

      /**
       * @access private
       */
      this.zone = zone;
      /**
       * @access private
       */
      this.loc = config.loc || Locale.create();
      /**
       * @access private
       */
      this.invalid = invalidReason;
      /**
       * @access private
       */
      this.weekData = null;
      /**
       * @access private
       */
      this.c = c;
      /**
       * @access private
       */
      this.o = o;
    }

    // CONSTRUCT

    /**
     * Create a local DateTime
     * @param {number} year - The calendar year. If omitted (as in, call `local()` with no arguments), the current time will be used
     * @param {number} [month=1] - The month, 1-indexed
     * @param {number} [day=1] - The day of the month
     * @param {number} [hour=0] - The hour of the day, in 24-hour time
     * @param {number} [minute=0] - The minute of the hour, i.e. a number between 0 and 59
     * @param {number} [second=0] - The second of the minute, i.e. a number between 0 and 59
     * @param {number} [millisecond=0] - The millisecond of the second, i.e. a number between 0 and 999
     * @example DateTime.local()                            //~> now
     * @example DateTime.local(2017)                        //~> 2017-01-01T00:00:00
     * @example DateTime.local(2017, 3)                     //~> 2017-03-01T00:00:00
     * @example DateTime.local(2017, 3, 12)                 //~> 2017-03-12T00:00:00
     * @example DateTime.local(2017, 3, 12, 5)              //~> 2017-03-12T05:00:00
     * @example DateTime.local(2017, 3, 12, 5, 45)          //~> 2017-03-12T05:45:00
     * @example DateTime.local(2017, 3, 12, 5, 45, 10)      //~> 2017-03-12T05:45:10
     * @example DateTime.local(2017, 3, 12, 5, 45, 10, 765) //~> 2017-03-12T05:45:10.765
     * @return {DateTime}
     */
    static local(year, month, day, hour, minute, second, millisecond) {
      if (isUndefined(year)) {
        return new DateTime({ ts: Settings.now() });
      } else {
        return quickDT(
          {
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond
          },
          Settings.defaultZone
        );
      }
    }

    /**
     * Create a DateTime in UTC
     * @param {number} year - The calendar year. If omitted (as in, call `utc()` with no arguments), the current time will be used
     * @param {number} [month=1] - The month, 1-indexed
     * @param {number} [day=1] - The day of the month
     * @param {number} [hour=0] - The hour of the day, in 24-hour time
     * @param {number} [minute=0] - The minute of the hour, i.e. a number between 0 and 59
     * @param {number} [second=0] - The second of the minute, i.e. a number between 0 and 59
     * @param {number} [millisecond=0] - The millisecond of the second, i.e. a number between 0 and 999
     * @example DateTime.utc()                            //~> now
     * @example DateTime.utc(2017)                        //~> 2017-01-01T00:00:00Z
     * @example DateTime.utc(2017, 3)                     //~> 2017-03-01T00:00:00Z
     * @example DateTime.utc(2017, 3, 12)                 //~> 2017-03-12T00:00:00Z
     * @example DateTime.utc(2017, 3, 12, 5)              //~> 2017-03-12T05:00:00Z
     * @example DateTime.utc(2017, 3, 12, 5, 45)          //~> 2017-03-12T05:45:00Z
     * @example DateTime.utc(2017, 3, 12, 5, 45, 10)      //~> 2017-03-12T05:45:10Z
     * @example DateTime.utc(2017, 3, 12, 5, 45, 10, 765) //~> 2017-03-12T05:45:10.765Z
     * @return {DateTime}
     */
    static utc(year, month, day, hour, minute, second, millisecond) {
      if (isUndefined(year)) {
        return new DateTime({
          ts: Settings.now(),
          zone: FixedOffsetZone.utcInstance
        });
      } else {
        return quickDT(
          {
            year,
            month,
            day,
            hour,
            minute,
            second,
            millisecond
          },
          FixedOffsetZone.utcInstance
        );
      }
    }

    /**
     * Create a DateTime from a Javascript Date object. Uses the default zone.
     * @param {Date} date - a Javascript Date object
     * @param {Object} options - configuration options for the DateTime
     * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
     * @return {DateTime}
     */
    static fromJSDate(date, options = {}) {
      return new DateTime({
        ts: isDate(date) ? date.valueOf() : NaN,
        zone: normalizeZone(options.zone, Settings.defaultZone),
        loc: Locale.fromObject(options)
      });
    }

    /**
     * Create a DateTime from a number of milliseconds since the epoch (i.e. since 1 January 1970 00:00:00 UTC). Uses the default zone.
     * @param {number} milliseconds - a number of milliseconds since 1970 UTC
     * @param {Object} options - configuration options for the DateTime
     * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
     * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @return {DateTime}
     */
    static fromMillis(milliseconds, options = {}) {
      return new DateTime({
        ts: milliseconds,
        zone: normalizeZone(options.zone, Settings.defaultZone),
        loc: Locale.fromObject(options)
      });
    }

    /**
     * Create a DateTime from a Javascript object with keys like 'year' and 'hour' with reasonable defaults.
     * @param {Object} obj - the object to create the DateTime from
     * @param {number} obj.year - a year, such as 1987
     * @param {number} obj.month - a month, 1-12
     * @param {number} obj.day - a day of the month, 1-31, depending on the month
     * @param {number} obj.ordinal - day of the year, 1-365 or 366
     * @param {number} obj.weekYear - an ISO week year
     * @param {number} obj.weekNumber - an ISO week number, between 1 and 52 or 53, depending on the year
     * @param {number} obj.weekday - an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
     * @param {number} obj.hour - hour of the day, 0-23
     * @param {number} obj.minute - minute of the hour, 0-59
     * @param {number} obj.second - second of the minute, 0-59
     * @param {number} obj.millisecond - millisecond of the second, 0-999
     * @param {string|Zone} [obj.zone='local'] - interpret the numbers in the context of a particular zone. Can take any value taken as the first argument to setZone()
     * @param {string} [obj.locale='en-US'] - a locale to set on the resulting DateTime instance
     * @param {string} obj.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} obj.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @example DateTime.fromObject({ year: 1982, month: 5, day: 25}).toISODate() //=> '1982-05-25'
     * @example DateTime.fromObject({ year: 1982 }).toISODate() //=> '1982-01-01T00'
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }) //~> today at 10:26:06
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6, zone: 'utc' }),
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6, zone: 'local' })
     * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6, zone: 'America/New_York' })
     * @example DateTime.fromObject({ weekYear: 2016, weekNumber: 2, weekday: 3 }).toISODate() //=> '2016-01-13'
     * @return {DateTime}
     */
    static fromObject(obj) {
      const zoneToUse = normalizeZone(obj.zone, Settings.defaultZone);
      if (!zoneToUse.isValid) {
        return DateTime.invalid(UNSUPPORTED_ZONE);
      }

      const tsNow = Settings.now(),
        offsetProvis = zoneToUse.offset(tsNow),
        normalized = normalizeObject(obj, normalizeUnit, true),
        containsOrdinal = !isUndefined(normalized.ordinal),
        containsGregorYear = !isUndefined(normalized.year),
        containsGregorMD = !isUndefined(normalized.month) || !isUndefined(normalized.day),
        containsGregor = containsGregorYear || containsGregorMD,
        definiteWeekDef = normalized.weekYear || normalized.weekNumber,
        loc = Locale.fromObject(obj);

      // cases:
      // just a weekday -> this week's instance of that weekday, no worries
      // (gregorian data or ordinal) + (weekYear or weekNumber) -> error
      // (gregorian month or day) + ordinal -> error
      // otherwise just use weeks or ordinals or gregorian, depending on what's specified

      if ((containsGregor || containsOrdinal) && definiteWeekDef) {
        throw new ConflictingSpecificationError(
          "Can't mix weekYear/weekNumber units with year/month/day or ordinals"
        );
      }

      if (containsGregorMD && containsOrdinal) {
        throw new ConflictingSpecificationError("Can't mix ordinal dates with month/day");
      }

      const useWeekData = definiteWeekDef || (normalized.weekday && !containsGregor);

      // configure ourselves to deal with gregorian dates or week stuff
      let units,
        defaultValues,
        objNow = tsToObj(tsNow, offsetProvis);
      if (useWeekData) {
        units = orderedWeekUnits;
        defaultValues = defaultWeekUnitValues;
        objNow = gregorianToWeek(objNow);
      } else if (containsOrdinal) {
        units = orderedOrdinalUnits;
        defaultValues = defaultOrdinalUnitValues;
        objNow = gregorianToOrdinal(objNow);
      } else {
        units = orderedUnits$1;
        defaultValues = defaultUnitValues;
      }

      // set default values for missing stuff
      let foundFirst = false;
      for (const u of units) {
        const v = normalized[u];
        if (!isUndefined(v)) {
          foundFirst = true;
        } else if (foundFirst) {
          normalized[u] = defaultValues[u];
        } else {
          normalized[u] = objNow[u];
        }
      }

      // make sure the values we have are in range
      const higherOrderInvalid = useWeekData
          ? hasInvalidWeekData(normalized)
          : containsOrdinal ? hasInvalidOrdinalData(normalized) : hasInvalidGregorianData(normalized),
        invalidReason = higherOrderInvalid || hasInvalidTimeData(normalized);

      if (invalidReason) {
        return DateTime.invalid(invalidReason);
      }

      // compute the actual time
      const gregorian = useWeekData
          ? weekToGregorian(normalized)
          : containsOrdinal ? ordinalToGregorian(normalized) : normalized,
        [tsFinal, offsetFinal] = objToTS(gregorian, offsetProvis, zoneToUse),
        inst = new DateTime({
          ts: tsFinal,
          zone: zoneToUse,
          o: offsetFinal,
          loc
        });

      // gregorian data + weekday serves only to validate
      if (normalized.weekday && containsGregor && obj.weekday !== inst.weekday) {
        return DateTime.invalid('mismatched weekday');
      }

      return inst;
    }

    /**
     * Create a DateTime from an ISO 8601 string
     * @param {string} text - the ISO string
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the time to this zone
     * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='en-US'] - a locale to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @example DateTime.fromISO('2016-05-25T09:08:34.123')
     * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00')
     * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00', {setZone: true})
     * @example DateTime.fromISO('2016-05-25T09:08:34.123', {zone: 'utc'})
     * @example DateTime.fromISO('2016-W05-4')
     * @return {DateTime}
     */
    static fromISO(text, opts = {}) {
      const [vals, parsedZone] = parseISODate(text);
      return parseDataToDateTime(vals, parsedZone, opts);
    }

    /**
     * Create a DateTime from an RFC 2822 string
     * @param {string} text - the RFC 2822 string
     * @param {Object} opts - options to affect the creation
     * @param {string|Zone} [opts.zone='local'] - convert the time to this zone. Since the offset is always specified in the string itself, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
     * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
     * @param {string} [opts.locale='en-US'] - a locale to set on the resulting DateTime instance
     * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @example DateTime.fromRFC2822('25 Nov 2016 13:23:12 GMT')
     * @example DateTime.fromRFC2822('Tue, 25 Nov 2016 13:23:12 +0600')
     * @example DateTime.fromRFC2822('25 Nov 2016 13:23 Z')
     * @return {DateTime}
     */
    static fromRFC2822(text, opts = {}) {
      const [vals, parsedZone] = parseRFC2822Date(text);
      return parseDataToDateTime(vals, parsedZone, opts);
    }

    /**
     * Create a DateTime from an HTTP header date
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     * @param {string} text - the HTTP header date
     * @param {Object} options - options to affect the creation
     * @param {string|Zone} [options.zone='local'] - convert the time to this zone. Since HTTP dates are always in UTC, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
     * @param {boolean} [options.setZone=false] - override the zone with the fixed-offset zone specified in the string. For HTTP dates, this is always UTC, so this option is equivalent to setting the `zone` option to 'utc', but this option is included for consistency with similar methods.
     * @param {string} [options.locale='en-US'] - a locale to set on the resulting DateTime instance
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
     * @example DateTime.fromHTTP('Sun, 06 Nov 1994 08:49:37 GMT')
     * @example DateTime.fromHTTP('Sunday, 06-Nov-94 08:49:37 GMT')
     * @example DateTime.fromHTTP('Sun Nov  6 08:49:37 1994')
     * @return {DateTime}
     */
    static fromHTTP(text, options = {}) {
      const [vals, parsedZone] = parseHTTPDate(text);
      return parseDataToDateTime(vals, parsedZone, options);
    }

    /**
     * Create a DateTime from an input string and format string
     * Defaults to en-US if no locale has been specified, regardless of the system's locale
     * @param {string} text - the string to parse
     * @param {string} fmt - the format the string is expected to be in (see description)
     * @param {Object} options - options to affect the creation
     * @param {string|Zone} [options.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
     * @param {boolean} [options.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
     * @param {string} [options.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
     * @param {string} options.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @return {DateTime}
     */
    static fromFormat(text, fmt, options = {}) {
      if (isUndefined(text) || isUndefined(fmt)) {
        throw new InvalidArgumentError('fromFormat requires an input string and a format');
      }

      const { locale = null, numberingSystem = null } = options,
        localeToUse = Locale.fromOpts({ locale, numberingSystem, defaultToEN: true }),
        [vals, parsedZone, invalidReason] = parseFromTokens(localeToUse, text, fmt);
      if (invalidReason) {
        return DateTime.invalid(invalidReason);
      } else {
        return parseDataToDateTime(vals, parsedZone, options);
      }
    }

    /**
     * @deprecated use fromFormat instead
     */
    static fromString(text, fmt, opts = {}) {
      return DateTime.fromFormat(text, fmt, opts);
    }

    /**
     * Create a DateTime from a SQL date, time, or datetime
     * Defaults to en-US if no locale has been specified, regardless of the system's locale
     * @param {string} text - the string to parse
     * @param {Object} options - options to affect the creation
     * @param {string|Zone} [options.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
     * @param {boolean} [options.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
     * @param {string} [options.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
     * @param {string} options.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
     * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
     * @example DateTime.fromSQL('2017-05-15')
     * @example DateTime.fromSQL('2017-05-15 09:12:34')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342+06:00')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles')
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles', { setZone: true })
     * @example DateTime.fromSQL('2017-05-15 09:12:34.342', { zone: 'America/Los_Angeles' })
     * @example DateTime.fromSQL('09:12:34.342')
     * @return {DateTime}
     */
    static fromSQL(text, options = {}) {
      const [vals, parsedZone] = parseSQL(text);
      return parseDataToDateTime(vals, parsedZone, options);
    }

    /**
     * Create an invalid DateTime.
     * @return {DateTime}
     */
    static invalid(reason) {
      if (!reason) {
        throw new InvalidArgumentError('need to specify a reason the DateTime is invalid');
      }
      if (Settings.throwOnInvalid) {
        throw new InvalidDateTimeError(reason);
      } else {
        return new DateTime({ invalidReason: reason });
      }
    }

    // INFO

    /**
     * Get the value of unit.
     * @param {string} unit - a unit such as 'minute' or 'day'
     * @example DateTime.local(2017, 7, 4).get('month'); //=> 7
     * @example DateTime.local(2017, 7, 4).get('day'); //=> 4
     * @return {number}
     */
    get(unit) {
      return this[unit];
    }

    /**
     * Returns whether the DateTime is valid. Invalid DateTimes occur when:
     * * The DateTime was created from invalid calendar information, such as the 13th month or February 30
     * * The DateTime was created by an operation on another invalid date
     * @type {boolean}
     */
    get isValid() {
      return this.invalidReason === null;
    }

    /**
     * Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid
     * @type {string}
     */
    get invalidReason() {
      return this.invalid;
    }

    /**
     * Get the locale of a DateTime, such 'en-GB'. The locale is used when formatting the DateTime
     *
     * @type {string}
     */
    get locale() {
      return this.isValid ? this.loc.locale : null;
    }

    /**
     * Get the numbering system of a DateTime, such 'beng'. The numbering system is used when formatting the DateTime
     *
     * @type {string}
     */
    get numberingSystem() {
      return this.isValid ? this.loc.numberingSystem : null;
    }

    /**
     * Get the output calendar of a DateTime, such 'islamic'. The output calendar is used when formatting the DateTime
     *
     * @type {string}
     */
    get outputCalendar() {
      return this.isValid ? this.loc.outputCalendar : null;
    }

    /**
     * Get the name of the time zone.
     * @type {string}
     */
    get zoneName() {
      return this.isValid ? this.zone.name : null;
    }

    /**
     * Get the year
     * @example DateTime.local(2017, 5, 25).year //=> 2017
     * @type {number}
     */
    get year() {
      return this.isValid ? this.c.year : NaN;
    }

    /**
     * Get the quarter
     * @example DateTime.local(2017, 5, 25).quarter //=> 2
     * @type {number}
     */
    get quarter() {
      return this.isValid ? Math.ceil(this.c.month / 3) : NaN;
    }
    /**
     * Get the month (1-12).
     * @example DateTime.local(2017, 5, 25).month //=> 5
     * @type {number}
     */
    get month() {
      return this.isValid ? this.c.month : NaN;
    }

    /**
     * Get the day of the month (1-30ish).
     * @example DateTime.local(2017, 5, 25).day //=> 25
     * @type {number}
     */
    get day() {
      return this.isValid ? this.c.day : NaN;
    }

    /**
     * Get the hour of the day (0-23).
     * @example DateTime.local(2017, 5, 25, 9).hour //=> 9
     * @type {number}
     */
    get hour() {
      return this.isValid ? this.c.hour : NaN;
    }

    /**
     * Get the minute of the hour (0-59).
     * @example DateTime.local(2017, 5, 25, 9, 30).minute //=> 30
     * @type {number}
     */
    get minute() {
      return this.isValid ? this.c.minute : NaN;
    }

    /**
     * Get the second of the minute (0-59).
     * @example DateTime.local(2017, 5, 25, 9, 30, 52).second //=> 52
     * @type {number}
     */
    get second() {
      return this.isValid ? this.c.second : NaN;
    }

    /**
     * Get the millisecond of the second (0-999).
     * @example DateTime.local(2017, 5, 25, 9, 30, 52, 654).millisecond //=> 654
     * @type {number}
     */
    get millisecond() {
      return this.isValid ? this.c.millisecond : NaN;
    }

    /**
     * Get the week year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     * @example DateTime.local(2014, 11, 31).weekYear //=> 2015
     * @type {number}
     */
    get weekYear() {
      return this.isValid ? possiblyCachedWeekData(this).weekYear : NaN;
    }

    /**
     * Get the week number of the week year (1-52ish).
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     * @example DateTime.local(2017, 5, 25).weekNumber //=> 21
     * @type {number}
     */
    get weekNumber() {
      return this.isValid ? possiblyCachedWeekData(this).weekNumber : NaN;
    }

    /**
     * Get the day of the week.
     * 1 is Monday and 7 is Sunday
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     * @example DateTime.local(2014, 11, 31).weekday //=> 4
     * @type {number}
     */
    get weekday() {
      return this.isValid ? possiblyCachedWeekData(this).weekday : NaN;
    }

    /**
     * Get the ordinal (i.e. the day of the year)
     * @example DateTime.local(2017, 5, 25).ordinal //=> 145
     * @type {number|DateTime}
     */
    get ordinal() {
      return this.isValid ? gregorianToOrdinal(this.c).ordinal : NaN;
    }

    /**
     * Get the human readable short month name, such as 'Oct'.
     * Defaults to the system's locale if no locale has been specified
     * @example DateTime.local(2017, 10, 30).monthShort //=> Oct
     * @type {string}
     */
    get monthShort() {
      return this.isValid ? Info.months('short', { locale: this.locale })[this.month - 1] : null;
    }

    /**
     * Get the human readable long month name, such as 'October'.
     * Defaults to the system's locale if no locale has been specified
     * @example DateTime.local(2017, 10, 30).monthLong //=> October
     * @type {string}
     */
    get monthLong() {
      return this.isValid ? Info.months('long', { locale: this.locale })[this.month - 1] : null;
    }

    /**
     * Get the human readable short weekday, such as 'Mon'.
     * Defaults to the system's locale if no locale has been specified
     * @example DateTime.local(2017, 10, 30).weekdayShort //=> Mon
     * @type {string}
     */
    get weekdayShort() {
      return this.isValid ? Info.weekdays('short', { locale: this.locale })[this.weekday - 1] : null;
    }

    /**
     * Get the human readable long weekday, such as 'Monday'.
     * Defaults to the system's locale if no locale has been specified
     * @example DateTime.local(2017, 10, 30).weekdayLong //=> Monday
     * @type {string}
     */
    get weekdayLong() {
      return this.isValid ? Info.weekdays('long', { locale: this.locale })[this.weekday - 1] : null;
    }

    /**
     * Get the UTC offset of this DateTime in minutes
     * @example DateTime.local().offset //=> -240
     * @example DateTime.utc().offset //=> 0
     * @type {number}
     */
    get offset() {
      return this.isValid ? this.zone.offset(this.ts) : NaN;
    }

    /**
     * Get the short human name for the zone's current offset, for example "EST" or "EDT".
     * Defaults to the system's locale if no locale has been specified
     * @type {string}
     */
    get offsetNameShort() {
      if (this.isValid) {
        return this.zone.offsetName(this.ts, {
          format: 'short',
          locale: this.locale
        });
      } else {
        return null;
      }
    }

    /**
     * Get the long human name for the zone's current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".
     * Defaults to the system's locale if no locale has been specified
     * @type {string}
     */
    get offsetNameLong() {
      if (this.isValid) {
        return this.zone.offsetName(this.ts, {
          format: 'long',
          locale: this.locale
        });
      } else {
        return null;
      }
    }

    /**
     * Get whether this zone's offset ever changes, as in a DST.
     * @type {boolean}
     */
    get isOffsetFixed() {
      return this.isValid ? this.zone.universal : null;
    }

    /**
     * Get whether the DateTime is in a DST.
     * @type {boolean}
     */
    get isInDST() {
      if (this.isOffsetFixed) {
        return false;
      } else {
        return (
          this.offset > this.set({ month: 1 }).offset || this.offset > this.set({ month: 5 }).offset
        );
      }
    }

    /**
     * Returns true if this DateTime is in a leap year, false otherwise
     * @example DateTime.local(2016).isInLeapYear //=> true
     * @example DateTime.local(2013).isInLeapYear //=> false
     * @type {boolean}
     */
    get isInLeapYear() {
      return isLeapYear(this.year);
    }

    /**
     * Returns the number of days in this DateTime's month
     * @example DateTime.local(2016, 2).daysInMonth //=> 29
     * @example DateTime.local(2016, 3).daysInMonth //=> 31
     * @type {number}
     */
    get daysInMonth() {
      return daysInMonth(this.year, this.month);
    }

    /**
     * Returns the number of days in this DateTime's year
     * @example DateTime.local(2016).daysInYear //=> 366
     * @example DateTime.local(2013).daysInYear //=> 365
     * @type {number}
     */
    get daysInYear() {
      return this.isValid ? daysInYear(this.year) : NaN;
    }

    /**
     * Returns the number of weeks in this DateTime's year
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     * @example DateTime.local(2004).weeksInWeekYear //=> 53
     * @example DateTime.local(2013).weeksInWeekYear //=> 52
     * @type {number}
     */
    get weeksInWeekYear() {
      return this.isValid ? weeksInWeekYear(this.weekYear) : NaN;
    }

    /**
     * Returns the resolved Intl options for this DateTime.
     * This is useful in understanding the behavior of formatting methods
     * @param {Object} opts - the same options as toLocaleString
     * @return {Object}
     */
    resolvedLocaleOpts(opts = {}) {
      const { locale, numberingSystem, calendar } = Formatter.create(
        this.loc.clone(opts),
        opts
      ).resolvedOptions(this);
      return { locale, numberingSystem, outputCalendar: calendar };
    }

    // TRANSFORM

    /**
     * "Set" the DateTime's zone to UTC. Returns a newly-constructed DateTime.
     *
     * Equivalent to {@link setZone}('utc')
     * @param {number} [offset=0] - optionally, an offset from UTC in minutes
     * @param {Object} [opts={}] - options to pass to `setZone()`
     * @return {DateTime}
     */
    toUTC(offset = 0, opts = {}) {
      return this.setZone(FixedOffsetZone.instance(offset), opts);
    }

    /**
     * "Set" the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.
     *
     * Equivalent to `setZone('local')`
     * @return {DateTime}
     */
    toLocal() {
      return this.setZone(new LocalZone());
    }

    /**
     * "Set" the DateTime's zone to specified zone. Returns a newly-constructed DateTime.
     *
     * By default, the setter keeps the underlying time the same (as in, the same UTC timestamp), but the new instance will report different local times and consider DSTs when making computations, as with {@link plus}. You may wish to use {@link toLocal} and {@link toUTC} which provide simple convenience wrappers for commonly used zones.
     * @param {string|Zone} [zone='local'] - a zone identifier. As a string, that can be any IANA zone supported by the host environment, or a fixed-offset name of the form 'utc+3', or the strings 'local' or 'utc'. You may also supply an instance of a {@link Zone} class.
     * @param {Object} opts - options
     * @param {boolean} [opts.keepLocalTime=false] - If true, adjust the underlying time so that the local time stays the same, but in the target zone. You should rarely need this.
     * @return {DateTime}
     */
    setZone(zone, { keepLocalTime = false, keepCalendarTime = false } = {}) {
      zone = normalizeZone(zone, Settings.defaultZone);
      if (zone.equals(this.zone)) {
        return this;
      } else if (!zone.isValid) {
        return DateTime.invalid(UNSUPPORTED_ZONE);
      } else {
        const newTS =
          keepLocalTime || keepCalendarTime // keepCalendarTime is the deprecated name for keepLocalTime
            ? this.ts + (this.o - zone.offset(this.ts)) * 60 * 1000
            : this.ts;
        return clone$1(this, { ts: newTS, zone });
      }
    }

    /**
     * "Set" the locale, numberingSystem, or outputCalendar. Returns a newly-constructed DateTime.
     * @param {Object} properties - the properties to set
     * @example DateTime.local(2017, 5, 25).reconfigure({ locale: 'en-GB' })
     * @return {DateTime}
     */
    reconfigure({ locale, numberingSystem, outputCalendar } = {}) {
      const loc = this.loc.clone({ locale, numberingSystem, outputCalendar });
      return clone$1(this, { loc });
    }

    /**
     * "Set" the locale. Returns a newly-constructed DateTime.
     * Just a convenient alias for reconfigure({ locale })
     * @example DateTime.local(2017, 5, 25).setLocale('en-GB')
     * @return {DateTime}
     */
    setLocale(locale) {
      return this.reconfigure({ locale });
    }

    /**
     * "Set" the values of specified units. Returns a newly-constructed DateTime.
     * You can only set units with this method; for "setting" metadata, see {@link reconfigure} and {@link setZone}.
     * @param {Object} values - a mapping of units to numbers
     * @example dt.set({ year: 2017 })
     * @example dt.set({ hour: 8, minute: 30 })
     * @example dt.set({ weekday: 5 })
     * @example dt.set({ year: 2005, ordinal: 234 })
     * @return {DateTime}
     */
    set(values) {
      if (!this.isValid) return this;

      const normalized = normalizeObject(values, normalizeUnit),
        settingWeekStuff =
          !isUndefined(normalized.weekYear) ||
          !isUndefined(normalized.weekNumber) ||
          !isUndefined(normalized.weekday);

      let mixed;
      if (settingWeekStuff) {
        mixed = weekToGregorian(Object.assign(gregorianToWeek(this.c), normalized));
      } else if (!isUndefined(normalized.ordinal)) {
        mixed = ordinalToGregorian(Object.assign(gregorianToOrdinal(this.c), normalized));
      } else {
        mixed = Object.assign(this.toObject(), normalized);

        // if we didn't set the day but we ended up on an overflow date,
        // use the last day of the right month
        if (isUndefined(normalized.day)) {
          mixed.day = Math.min(daysInMonth(mixed.year, mixed.month), mixed.day);
        }
      }

      const [ts, o] = objToTS(mixed, this.o, this.zone);
      return clone$1(this, { ts, o });
    }

    /**
     * Add a period of time to this DateTime and return the resulting DateTime
     *
     * Adding hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds. Adding days, months, or years shifts the calendar, accounting for DSTs and leap years along the way. Thus, `dt.plus({ hours: 24 })` may result in a different time than `dt.plus({ days: 1 })` if there's a DST shift in between.
     * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     * @example DateTime.local().plus(123) //~> in 123 milliseconds
     * @example DateTime.local().plus({ minutes: 15 }) //~> in 15 minutes
     * @example DateTime.local().plus({ days: 1 }) //~> this time tomorrow
     * @example DateTime.local().plus({ days: -1 }) //~> this time yesterday
     * @example DateTime.local().plus({ hours: 3, minutes: 13 }) //~> in 1 hr, 13 min
     * @example DateTime.local().plus(Duration.fromObject({ hours: 3, minutes: 13 })) //~> in 1 hr, 13 min
     * @return {DateTime}
     */
    plus(duration) {
      if (!this.isValid) return this;
      const dur = friendlyDuration(duration);
      return clone$1(this, adjustTime(this, dur));
    }

    /**
     * Subtract a period of time to this DateTime and return the resulting DateTime
     * See {@link plus}
     * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
     @return {DateTime}
    */
    minus(duration) {
      if (!this.isValid) return this;
      const dur = friendlyDuration(duration).negate();
      return clone$1(this, adjustTime(this, dur));
    }

    /**
     * "Set" this DateTime to the beginning of a unit of time.
     * @param {string} unit - The unit to go to the beginning of. Can be 'year', 'month', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @example DateTime.local(2014, 3, 3).startOf('month').toISODate(); //=> '2014-03-01'
     * @example DateTime.local(2014, 3, 3).startOf('year').toISODate(); //=> '2014-01-01'
     * @example DateTime.local(2014, 3, 3, 5, 30).startOf('day').toISOTime(); //=> '00:00.000-05:00'
     * @example DateTime.local(2014, 3, 3, 5, 30).startOf('hour').toISOTime(); //=> '05:00:00.000-05:00'
     * @return {DateTime}
     */
    startOf(unit) {
      if (!this.isValid) return this;
      const o = {},
        normalizedUnit = Duration.normalizeUnit(unit);
      switch (normalizedUnit) {
        case 'years':
          o.month = 1;
        // falls through
        case 'quarters':
        case 'months':
          o.day = 1;
        // falls through
        case 'weeks':
        case 'days':
          o.hour = 0;
        // falls through
        case 'hours':
          o.minute = 0;
        // falls through
        case 'minutes':
          o.second = 0;
        // falls through
        case 'seconds':
          o.millisecond = 0;
          break;
        case 'milliseconds':
          break;
        default:
          throw new InvalidUnitError(unit);
      }

      if (normalizedUnit === 'weeks') {
        o.weekday = 1;
      }

      if (normalizedUnit === 'quarters') {
        const q = Math.ceil(this.month / 3);
        o.month = (q - 1) * 3 + 1;
      }

      return this.set(o);
    }

    /**
     * "Set" this DateTime to the end (i.e. the last millisecond) of a unit of time
     * @param {string} unit - The unit to go to the end of. Can be 'year', 'month', 'day', 'hour', 'minute', 'second', or 'millisecond'.
     * @example DateTime.local(2014, 3, 3).endOf('month').toISO(); //=> '2014-03-31T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3).endOf('year').toISO(); //=> '2014-12-31T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3, 5, 30).endOf('day').toISO(); //=> '2014-03-03T23:59:59.999-05:00'
     * @example DateTime.local(2014, 3, 3, 5, 30).endOf('hour').toISO(); //=> '2014-03-03T05:59:59.999-05:00'
     * @return {DateTime}
     */
    endOf(unit) {
      return this.isValid
        ? this.startOf(unit)
            .plus({ [unit]: 1 })
            .minus(1)
        : this;
    }

    // OUTPUT

    /**
     * Returns a string representation of this DateTime formatted according to the specified format string.
     * **You may not want this.** See {@link toLocaleString} for a more flexible formatting tool. See the documentation for the specific format tokens supported.
     * Defaults to en-US if no locale has been specified, regardless of the system's locale
     * @param {string} fmt - the format string
     * @param {Object} opts - options
     * @param {boolean} opts.round - round numerical values
     * @example DateTime.local().toFormat('yyyy LLL dd') //=> '2017 Apr 22'
     * @example DateTime.local().setLocale('fr').toFormat('yyyy LLL dd') //=> '2017 avr. 22'
     * @example DateTime.local().toFormat("HH 'hours and' mm 'minutes'") //=> '20 hours and 55 minutes'
     * @return {string}
     */
    toFormat(fmt, opts = {}) {
      return this.isValid
        ? Formatter.create(this.loc.redefaultToEN(), opts).formatDateTimeFromString(this, fmt)
        : INVALID$2;
    }

    /**
     * Returns a localized string representing this date. Accepts the same options as the Intl.DateTimeFormat constructor and any presets defined by Luxon, such as `DateTime.DATE_FULL` or `DateTime.TIME_SIMPLE`.
     * The exact behavior of this method is browser-specific, but in general it will return an appropriate representation.
     * of the DateTime in the assigned locale.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     * @param opts {Object} - Intl.DateTimeFormat constructor options
     * @example DateTime.local().toLocaleString(); //=> 4/20/2017
     * @example DateTime.local().setLocale('en-gb').toLocaleString(); //=> '20/04/2017'
     * @example DateTime.local().toLocaleString(DateTime.DATE_FULL); //=> 'April 20, 2017'
     * @example DateTime.local().toLocaleString(DateTime.TIME_SIMPLE); //=> '11:32 AM'
     * @example DateTime.local().toLocaleString(DateTime.DATETIME_SHORT); //=> '4/20/2017, 11:32 AM'
     * @example DateTime.local().toLocaleString({weekday: 'long', month: 'long', day: '2-digit'}); //=> 'Thu, Apr 20'
     * @example DateTime.local().toLocaleString({weekday: 'long', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit'}); //=> 'Thu, Apr 20, 11:27'
     * @example DateTime.local().toLocaleString({hour: '2-digit', minute: '2-digit'}); //=> '11:32'
     * @return {string}
     */
    toLocaleString(opts = DATE_SHORT) {
      return this.isValid
        ? Formatter.create(this.loc.clone(opts), opts).formatDateTime(this)
        : INVALID$2;
    }

    /**
     * Returns an array of format "parts", i.e. individual tokens along with metadata. This is allows callers to post-process individual sections of the formatted output.
     * Defaults to the system's locale if no locale has been specified
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts
     * @param opts {Object} - Intl.DateTimeFormat constructor options, same as `toLocaleString`.
     * @example DateTime.local().toLocaleString(); //=> [
     *                                    //=>   { type: 'day', value: '25' },
     *                                    //=>   { type: 'literal', value: '/' },
     *                                    //=>   { type: 'month', value: '05' },
     *                                    //=>   { type: 'literal', value: '/' },
     *                                    //=>   { type: 'year', value: '1982' }
     *                                    //=> ]
     */
    toLocaleParts(opts = {}) {
      return this.isValid
        ? Formatter.create(this.loc.clone(opts), opts).formatDateTimeParts(this)
        : [];
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime
     * @param {Object} opts - options
     * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
     * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @example DateTime.utc(1982, 5, 25).toISO() //=> '1982-05-25T00:00:00.000Z'
     * @example DateTime.local().toISO() //=> '2017-04-22T20:47:05.335-04:00'
     * @example DateTime.local().toISO({ includeOffset: false }) //=> '2017-04-22T20:47:05.335'
     * @return {string}
     */
    toISO(opts = {}) {
      if (!this.isValid) {
        return null;
      }

      return `${this.toISODate()}T${this.toISOTime(opts)}`;
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's date component
     * @example DateTime.utc(1982, 5, 25).toISODate() //=> '1982-05-25'
     * @return {string}
     */
    toISODate() {
      return toTechFormat(this, 'yyyy-MM-dd');
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's week date
     * @example DateTime.utc(1982, 5, 25).toISOWeekDate() //=> '1982-W21-2'
     * @return {string}
     */
    toISOWeekDate() {
      return toTechFormat(this, "kkkk-'W'WW-c");
    }

    /**
     * Returns an ISO 8601-compliant string representation of this DateTime's time component
     * @param {Object} opts - options
     * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
     * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @example DateTime.utc().hour(7).minute(34).toISOTime() //=> '07:34:19.361Z'
     * @example DateTime.utc().hour(7).minute(34).toISOTime({ suppressSeconds: true }) //=> '07:34Z'
     * @return {string}
     */
    toISOTime({ suppressMilliseconds = false, suppressSeconds = false, includeOffset = true } = {}) {
      return toTechTimeFormat(this, { suppressSeconds, suppressMilliseconds, includeOffset });
    }

    /**
     * Returns an RFC 2822-compatible string representation of this DateTime, always in UTC
     * @example DateTime.utc(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 +0000'
     * @example DateTime.local(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 -0400'
     * @return {string}
     */
    toRFC2822() {
      return toTechFormat(this, 'EEE, dd LLL yyyy hh:mm:ss ZZZ');
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in HTTP headers.
     * Specifically, the string conforms to RFC 1123.
     * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
     * @example DateTime.utc(2014, 7, 13).toHTTP() //=> 'Sun, 13 Jul 2014 00:00:00 GMT'
     * @example DateTime.utc(2014, 7, 13, 19).toHTTP() //=> 'Sun, 13 Jul 2014 19:00:00 GMT'
     * @return {string}
     */
    toHTTP() {
      return toTechFormat(this.toUTC(), "EEE, dd LLL yyyy HH:mm:ss 'GMT'");
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Date
     * @example DateTime.utc(2014, 7, 13).toSQLDate() //=> '2014-07-13'
     * @return {string}
     */
    toSQLDate() {
      return toTechFormat(this, 'yyyy-MM-dd');
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL Time
     * @param {Object} opts - options
     * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overides includeOffset.
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @example DateTime.utc().toSQL() //=> '05:15:16.345'
     * @example DateTime.local().toSQL() //=> '05:15:16.345 -04:00'
     * @example DateTime.local().toSQL({ includeOffset: false }) //=> '05:15:16.345'
     * @example DateTime.local().toSQL({ includeZone: false }) //=> '05:15:16.345 America/New_York'
     * @return {string}
     */
    toSQLTime({ includeOffset = true, includeZone = false } = {}) {
      return toTechTimeFormat(this, { includeOffset, includeZone, spaceZone: true });
    }

    /**
     * Returns a string representation of this DateTime appropriate for use in SQL DateTime
     * @param {Object} opts - options
     * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overrides includeOffset.
     * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
     * @example DateTime.utc(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 Z'
     * @example DateTime.local(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 -04:00'
     * @example DateTime.local(2014, 7, 13).toSQL({ includeOffset: false }) //=> '2014-07-13 00:00:00.000'
     * @example DateTime.local(2014, 7, 13).toSQL({ includeZone: false }) //=> '2014-07-13 00:00:00.000 America/New_York'
     * @return {string}
     */
    toSQL(opts = {}) {
      if (!this.isValid) {
        return null;
      }

      return `${this.toSQLDate()} ${this.toSQLTime(opts)}`;
    }

    /**
     * Returns a string representation of this DateTime appropriate for debugging
     * @return {string}
     */
    toString() {
      return this.isValid ? this.toISO() : INVALID$2;
    }

    /**
     * Returns a string representation of this DateTime appropriate for the REPL.
     * @return {string}
     */
    inspect() {
      if (this.isValid) {
        return `DateTime {\n  ts: ${this.toISO()},\n  zone: ${this.zone.name},\n  locale: ${this
        .locale} }`;
      } else {
        return `DateTime { Invalid, reason: ${this.invalidReason} }`;
      }
    }

    /**
     * Returns the epoch milliseconds of this DateTime
     * @return {number}
     */
    valueOf() {
      return this.isValid ? this.ts : NaN;
    }

    /**
     * Returns the epoch milliseconds of this DateTime. Alias of {@link valueOf}
     * @return {number}
     */
    toMillis() {
      return this.valueOf();
    }

    /**
     * Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.
     * @return {string}
     */
    toJSON() {
      return this.toISO();
    }

    /**
     * Returns a BSON serializable equivalent to this DateTime.
     * @return {Date}
     */
    toBSON() {
      return this.toJSDate();
    }

    /**
     * Returns a Javascript object with this DateTime's year, month, day, and so on.
     * @param opts - options for generating the object
     * @param {boolean} [opts.includeConfig=false] - include configuration attributes in the output
     * @example DateTime.local().toObject() //=> { year: 2017, month: 4, day: 22, hour: 20, minute: 49, second: 42, millisecond: 268 }
     * @return {Object}
     */
    toObject(opts = {}) {
      if (!this.isValid) return {};

      const base = Object.assign({}, this.c);

      if (opts.includeConfig) {
        base.outputCalendar = this.outputCalendar;
        base.numberingSystem = this.loc.numberingSystem;
        base.locale = this.loc.locale;
      }
      return base;
    }

    /**
     * Returns a Javascript Date equivalent to this DateTime.
     * @return {Date}
     */
    toJSDate() {
      return new Date(this.isValid ? this.ts : NaN);
    }

    // COMPARE

    /**
     * Return the difference between two DateTimes as a Duration.
     * @param {DateTime} otherDateTime - the DateTime to compare this one to
     * @param {string|string[]} [unit=['milliseconds']] - the unit or array of units (such as 'hours' or 'days') to include in the duration.
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @example
     * var i1 = DateTime.fromISO('1982-05-25T09:45'),
     *     i2 = DateTime.fromISO('1983-10-14T10:30');
     * i2.diff(i1).toObject() //=> { milliseconds: 43807500000 }
     * i2.diff(i1, 'hours').toObject() //=> { hours: 12168.75 }
     * i2.diff(i1, ['months', 'days']).toObject() //=> { months: 16, days: 19.03125 }
     * i2.diff(i1, ['months', 'days', 'hours']).toObject() //=> { months: 16, days: 19, hours: 0.75 }
     * @return {Duration}
     */
    diff(otherDateTime, unit = 'milliseconds', opts = {}) {
      if (!this.isValid || !otherDateTime.isValid)
        return Duration.invalid(this.invalidReason || otherDateTime.invalidReason);

      const units = maybeArray(unit).map(Duration.normalizeUnit),
        otherIsLater = otherDateTime.valueOf() > this.valueOf(),
        earlier = otherIsLater ? this : otherDateTime,
        later = otherIsLater ? otherDateTime : this,
        diffed = diff(earlier, later, units, opts);

      return otherIsLater ? diffed.negate() : diffed;
    }

    /**
     * Return the difference between this DateTime and right now.
     * See {@link diff}
     * @param {string|string[]} [unit=['milliseconds']] - the unit or units units (such as 'hours' or 'days') to include in the duration
     * @param {Object} opts - options that affect the creation of the Duration
     * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
     * @return {Duration}
     */
    diffNow(unit = 'milliseconds', opts = {}) {
      return this.diff(DateTime.local(), unit, opts);
    }

    /**
     * Return an Interval spanning between this DateTime and another DateTime
     * @param {DateTime} otherDateTime - the other end point of the Interval
     * @return {Interval}
     */
    until(otherDateTime) {
      return this.isValid ? Interval.fromDateTimes(this, otherDateTime) : this;
    }

    /**
     * Return whether this DateTime is in the same unit of time as another DateTime
     * @param {DateTime} otherDateTime - the other DateTime
     * @param {string} unit - the unit of time to check sameness on
     * @example DateTime.local().hasSame(otherDT, 'day'); //~> true if both the same calendar day
     * @return {boolean}
     */
    hasSame(otherDateTime, unit) {
      if (!this.isValid) return false;
      if (unit === 'millisecond') {
        return this.valueOf() === otherDateTime.valueOf();
      } else {
        const inputMs = otherDateTime.valueOf();
        return this.startOf(unit) <= inputMs && inputMs <= this.endOf(unit);
      }
    }

    /**
     * Equality check
     * Two DateTimes are equal iff they represent the same millisecond
     * @param {DateTime} other - the other DateTime
     * @return {boolean}
     */
    equals(other) {
      return this.isValid && other.isValid
        ? this.valueOf() === other.valueOf() &&
            this.zone.equals(other.zone) &&
            this.loc.equals(other.loc)
        : false;
    }

    /**
     * Return the min of several date times
     * @param {...DateTime} dateTimes - the DateTimes from which to choose the minimum
     * @return {DateTime} the min DateTime, or undefined if called with no argument
     */
    static min(...dateTimes) {
      return bestBy(dateTimes, i => i.valueOf(), Math.min);
    }

    /**
     * Return the max of several date times
     * @param {...DateTime} dateTimes - the DateTimes from which to choose the maximum
     * @return {DateTime} the max DateTime, or undefined if called with no argument
     */
    static max(...dateTimes) {
      return bestBy(dateTimes, i => i.valueOf(), Math.max);
    }

    // MISC

    /**
     * Explain how a string would be parsed by fromFormat()
     * @param {string} text - the string to parse
     * @param {string} fmt - the format the string is expected to be in (see description)
     * @param {Object} options - options taken by fromFormat()
     * @return {Object}
     */
    static fromFormatExplain(text, fmt, options = {}) {
      const { locale = null, numberingSystem = null } = options,
        localeToUse = Locale.fromOpts({ locale, numberingSystem, defaultToEN: true });
      return explainFromTokens(localeToUse, text, fmt);
    }

    /**
     * @deprecated use fromFormatExplain instead
     */
    static fromStringExplain(text, fmt, options = {}) {
      return DateTime.fromFormatExplain(text, fmt, options);
    }

    // FORMAT PRESETS

    /**
     * {@link toLocaleString} format like 10/14/1983
     * @type {Object}
     */
    static get DATE_SHORT() {
      return DATE_SHORT;
    }

    /**
     * {@link toLocaleString} format like 'Oct 14, 1983'
     * @type {Object}
     */
    static get DATE_MED() {
      return DATE_MED;
    }

    /**
     * {@link toLocaleString} format like 'October 14, 1983'
     * @type {Object}
     */
    static get DATE_FULL() {
      return DATE_FULL;
    }

    /**
     * {@link toLocaleString} format like 'Tuesday, October 14, 1983'
     * @type {Object}
     */
    static get DATE_HUGE() {
      return DATE_HUGE;
    }

    /**
     * {@link toLocaleString} format like '09:30 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get TIME_SIMPLE() {
      return TIME_SIMPLE;
    }

    /**
     * {@link toLocaleString} format like '09:30:23 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get TIME_WITH_SECONDS() {
      return TIME_WITH_SECONDS;
    }

    /**
     * {@link toLocaleString} format like '09:30:23 AM EDT'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get TIME_WITH_SHORT_OFFSET() {
      return TIME_WITH_SHORT_OFFSET;
    }

    /**
     * {@link toLocaleString} format like '09:30:23 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get TIME_WITH_LONG_OFFSET() {
      return TIME_WITH_LONG_OFFSET;
    }

    /**
     * {@link toLocaleString} format like '09:30', always 24-hour.
     * @type {Object}
     */
    static get TIME_24_SIMPLE() {
      return TIME_24_SIMPLE;
    }

    /**
     * {@link toLocaleString} format like '09:30:23', always 24-hour.
     * @type {Object}
     */
    static get TIME_24_WITH_SECONDS() {
      return TIME_24_WITH_SECONDS;
    }

    /**
     * {@link toLocaleString} format like '09:30:23 EDT', always 24-hour.
     * @type {Object}
     */
    static get TIME_24_WITH_SHORT_OFFSET() {
      return TIME_24_WITH_SHORT_OFFSET;
    }

    /**
     * {@link toLocaleString} format like '09:30:23 Eastern Daylight Time', always 24-hour.
     * @type {Object}
     */
    static get TIME_24_WITH_LONG_OFFSET() {
      return TIME_24_WITH_LONG_OFFSET;
    }

    /**
     * {@link toLocaleString} format like '10/14/1983, 9:30 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_SHORT() {
      return DATETIME_SHORT;
    }

    /**
     * {@link toLocaleString} format like '10/14/1983, 9:30:33 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_SHORT_WITH_SECONDS() {
      return DATETIME_SHORT_WITH_SECONDS;
    }

    /**
     * {@link toLocaleString} format like 'Oct 14, 1983, 9:30 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_MED() {
      return DATETIME_MED;
    }

    /**
     * {@link toLocaleString} format like 'Oct 14, 1983, 9:30:33 AM'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_MED_WITH_SECONDS() {
      return DATETIME_MED_WITH_SECONDS;
    }

    /**
     * {@link toLocaleString} format like 'October 14, 1983, 9:30 AM EDT'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_FULL() {
      return DATETIME_FULL;
    }

    /**
     * {@link toLocaleString} format like 'October 14, 1983, 9:303 AM EDT'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_FULL_WITH_SECONDS() {
      return DATETIME_FULL_WITH_SECONDS;
    }

    /**
     * {@link toLocaleString} format like 'Friday, October 14, 1983, 9:30 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_HUGE() {
      return DATETIME_HUGE;
    }

    /**
     * {@link toLocaleString} format like 'Friday, October 14, 1983, 9:30:33 AM Eastern Daylight Time'. Only 12-hour if the locale is.
     * @type {Object}
     */
    static get DATETIME_HUGE_WITH_SECONDS() {
      return DATETIME_HUGE_WITH_SECONDS;
    }
  }

  /**
   * @private
   */
  function friendlyDateTime(dateTimeish) {
    if (dateTimeish instanceof DateTime) {
      return dateTimeish;
    } else if (dateTimeish.valueOf && isNumber(dateTimeish.valueOf())) {
      return DateTime.fromJSDate(dateTimeish);
    } else if (dateTimeish instanceof Object) {
      return DateTime.fromObject(dateTimeish);
    } else {
      throw new InvalidArgumentError('Unknown datetime argument');
    }
  }

  class Timezone extends LitElement {
    static get properties() {
      return {
        tz: String
      }
    }

    constructor() {
      super();
      this.tz = 'America/New_York';
      this._handleTzChange = this._handleTzChange.bind(this);

      setInterval(async () => {
        this.requestRender();
      }, 1000);
    }

    _handleTzChange(zone) {
      this.tz = zone;
      this.dispatchEvent(
        new CustomEvent('change', {
          bubbles: true,
          composed: true,
          detail: { tz: this.tz }
        })
      );
    }

    _render({ tz }) {
      return html$1`
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
          this._handleTzChange('America/Los_Angeles');
        }} class="dim link">Los Angeles</button>
        <button on-click=${() => {
          this._handleTzChange('Europe/London');
        }} class="dim link">London</button>
      </div>
    `
    }
  }

  customElements.define('tnw-timezone', Timezone);

}());
