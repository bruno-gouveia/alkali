(function (root, factory) { if (typeof define === 'function' && define.amd) {
        define(['./Variable', './Updater', './util/lang'], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./util/lang'), require('./Variable'), require('./Updater'))
    } else {
        root.alkali.Element = factory(root.alkali.lang, root.alkali.Variable, root.alkali.Updater)
    }
}(this, function (Variable, Updater, lang) {
	var knownElementProperties = {
	}

	function Context(subject){
		this.subject = subject
	}

	var PropertyUpdater = lang.compose(Updater.PropertyUpdater, function PropertyUpdater() {
		Updater.PropertyUpdater.apply(this, arguments)
	}, {
		renderUpdate: function(newValue, element) {
			// TODO: cache or otherwise optimize this
			var rendererName = 'render' + this.name[0].toUpperCase() + this.name.slice(1)
			if (element[rendererName]) {
				// custom renderer
				element[rendererName](newValue)
			} else {
				element[this.name] = newValue
			}
		}
	})
	var StyleUpdater = lang.compose(Updater.StyleUpdater, function StyleUpdater() {
		Updater.StyleUpdater.apply(this, arguments)
	}, {
		renderUpdate: function(newValue, element) {
			var definition = styleDefinitions[this.name]
			element.style[this.name] = definition ? definition(newValue) : newValue
		}
	})
	// TODO: check for renderContent with text updater
	var TextUpdater = Updater.TextUpdater
	var ListUpdater = Updater.ListUpdater
	;['href', 'title', 'role', 'id', 'className'].forEach(function (name) {
		knownElementProperties[name] = true
	})
	var toAddToElementPrototypes = []
	var createdBaseElements = []
	var testStyle = document.createElement('div').style
	var childTagForParent = {
		TABLE: ['tr','td'],
		TBODY: ['tr','td'],
		TR: 'td',
		UL: 'li',
		OL: 'li',
		SELECT: 'option'
	}
	var inputs = {
		INPUT: 1,
		TEXTAREA: 1
		// SELECT: 1, we exclude this, so the default "content" of the element can be the options
	}
	var bidirectionalProperties = {
		value: 1,
		typedValue: 1,
		valueAsNumber: 1,
		valueAsDate: 1,
		checked: 1
	}
	function booleanStyle(options) {
		return function(value) {
			if (typeof value === 'boolean') {
				// has a boolean conversion
				return options[value ? 0 : 1]
			}
			return value
		}
	}

	function defaultStyle(value) {
		return function(value) {
			if (typeof value === 'number') {
				return value + 'px'
			}
			return value
		}
	}
	function identity(value) {
		return value
	}

	var styleDefinitions = {
		display: booleanStyle(['initial', 'none']),
		visibility: booleanStyle(['visible', 'hidden']),
		color: identity,
		opacity: identity,
		zoom: identity,
		minZoom: identity,
		maxZoom: identity,
		position: booleanStyle(['absolute', '']),
		textDecoration: booleanStyle(['underline', '']),
		fontWeight: booleanStyle(['bold', 'normal'])
	}
	;["alignContent","alignItems","alignSelf","animation","animationDelay","animationDirection","animationDuration","animationFillMode","animationIterationCount","animationName","animationPlayState","animationTimingFunction","backfaceVisibility","background","backgroundAttachment","backgroundBlendMode","backgroundClip","backgroundColor","backgroundImage","backgroundOrigin","backgroundPosition","backgroundPositionX","backgroundPositionY","backgroundRepeat","backgroundRepeatX","backgroundRepeatY","backgroundSize","baselineShift","border","borderBottom","borderBottomColor","borderBottomLeftRadius","borderBottomRightRadius","borderBottomStyle","borderBottomWidth","borderCollapse","borderColor","borderImage","borderImageOutset","borderImageRepeat","borderImageSlice","borderImageSource","borderImageWidth","borderLeft","borderLeftColor","borderLeftStyle","borderLeftWidth","borderRadius","borderRight","borderRightColor","borderRightStyle","borderRightWidth","borderSpacing","borderStyle","borderTop","borderTopColor","borderTopLeftRadius","borderTopRightRadius","borderTopStyle","borderTopWidth","borderWidth","bottom","boxShadow","boxSizing","bufferedRendering","captionSide","clear","clip","clipPath","clipRule","color","colorInterpolation","colorInterpolationFilters","colorRendering","counterIncrement","counterReset","cursor","direction","display","emptyCells","fill","fillOpacity","fillRule","filter","flex","flexBasis","flexDirection","flexFlow","flexGrow","flexShrink","flexWrap","float","floodColor","floodOpacity","font","fontFamily","fontFeatureSettings","fontKerning","fontSize","fontStretch","fontStyle","fontVariant","fontVariantLigatures","fontWeight","height","imageRendering","isolation","justifyContent","left","letterSpacing","lightingColor","lineHeight","listStyle","listStyleImage","listStylePosition","listStyleType","margin","marginBottom","marginLeft","marginRight","marginTop","marker","markerEnd","markerMid","markerStart","mask","maskType","maxHeight","maxWidth","maxZoom","minHeight","minWidth","minZoom","mixBlendMode","motion","motionOffset","motionPath","motionRotation","objectFit","objectPosition","opacity","order","orientation","orphans","outline","outlineColor","outlineOffset","outlineStyle","outlineWidth","overflow","overflowWrap","overflowX","overflowY","padding","paddingBottom","paddingLeft","paddingRight","paddingTop","page","pageBreakAfter","pageBreakBefore","pageBreakInside","paintOrder","perspective","perspectiveOrigin","pointerEvents","position","quotes","resize","right","shapeImageThreshold","shapeMargin","shapeOutside","shapeRendering","size","speak","src","stopColor","stopOpacity","stroke","strokeDasharray","strokeDashoffset","strokeLinecap","strokeLinejoin","strokeMiterlimit","strokeOpacity","strokeWidth","tabSize","tableLayout","textAlign","textAlignLast","textAnchor","textCombineUpright","textDecoration","textIndent","textOrientation","textOverflow","textRendering","textShadow","textTransform","top","touchAction","transform","transformOrigin","transformStyle","transition","transitionDelay","transitionDuration","transitionProperty","transitionTimingFunction","unicodeBidi","unicodeRange","userZoom","vectorEffect","verticalAlign","visibility","whiteSpace","widows","width","willChange","wordBreak","wordSpacing","wordWrap","writingMode","zIndex","zoom"].forEach(function(property) {
		styleDefinitions[property] = styleDefinitions[property] || defaultStyle
	})
	var doc = document
	var styleSheet
	var presumptiveParentMap = new WeakMap()

	var setPrototypeOf = Object.setPrototypeOf || (function(base, proto) { base.__proto__ = proto})
	var getPrototypeOf = Object.getPrototypeOf || (function(base) { return base.__proto__ })
	function createCssRule(selector) {
		if (!styleSheet) {
			var styleSheetElement = document.createElement("style")
			styleSheetElement.setAttribute("type", "text/css")
//			styleSheet.appendChild(document.createTextNode(css))
			document.head.insertBefore(styleSheetElement, document.head.firstChild)
			styleSheet = styleSheetElement.sheet
		}
		var cssRules = styleSheet.cssRules || styleSheet.rules
		return cssRules[styleSheet.addRule(selector, ' ', cssRules.length)]
	}
	var invalidatedElements = new WeakMap(null, 'invalidated')
	var queued

	var toRender = []
	function flatten(target, part) {
		var base = target.base
		if (base) {
			var basePart = base[part]
			if (basePart) {
				target[part] || target[part]
			}
		}
	}

	function layoutChildren(parent, children, container) {
		var fragment = children.length > 1 ? document.createDocumentFragment() : parent
		for(var i = 0, l = children.length; i < l; i++) {
			var child = children[i]
			var childNode
			if (child && child.create) {
				// an element constructor
				currentParent = parent
				childNode = child.create()
				fragment.appendChild(childNode)
				if (child.isContentNode) {
					container.contentNode = childNode
				}
			} else if (typeof child == 'function') {
				// TODO: reenable this
//				if (child.for) {
					// a variable constructor that can be contextualized
	//				fragment.appendChild(variableAsText(parent, child))
		//		} else {
					// an element constructor
					childNode = new child()
					fragment.appendChild(childNode)
			//	}
			} else if (typeof child == 'object') {
				if (child instanceof Array) {
					// array of sub-children
					container = container || parent
					layoutChildren(childNode.contentNode || childNode, child, container)
				} else if (child.notifies) {
					// a variable
					fragment.appendChild(variableAsText(parent, child))
				} else if (child.nodeType) {
					// an element itself
					fragment.appendChild(child)
				} else {
					// TODO: apply properties to last child, but with binding to the parent (for events)
					throw new Error('Unknown child type ' + child)
				}
			} else {
				// a primitive value
				childNode = document.createTextNode(child)
				fragment.appendChild(childNode)
			}
		}
		if (fragment != parent) {
			parent.appendChild(fragment)
		}
		return childNode
	}
	function variableAsText(parent, variable) {
		var text = variable.valueOf(new Context(parent))
		var childNode = document.createTextNode(text)
		enterUpdater(TextUpdater, {
			element: parent,
			textNode: childNode,
			variable: variable
		})
		return childNode
	}

	function applyProperties(element, properties, keys) {
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i]
			var value = properties[key]
			var styleDefinition = styleDefinitions[key]
			if (styleDefinition) {
				if (value && value.notifies) {
					enterUpdater(StyleUpdater, {
						name: key,
						variable: value,
						element: element
					})

				} else {
					element.style[key] = styleDefinition(value)
				}
			} else if (value && value.notifies && key !== 'content') {
				enterUpdater(PropertyUpdater, {
					name: key,
					variable: value,
					element: element
				})
				if (bidirectionalProperties[key]) {
					bindChanges(element, value)
				}
			} else if (key.slice(0, 2) === 'on') {
				element.addEventListener(key.slice(2), value)
			} else {
				element[key] = value
			}
		}
	}

	function applySelector(element, selector) {
		selector.replace(/(\.|#)?(\w+)/g, function(t, operator, name) {
			if (operator == '.') {
				element._class = (element._class ? element._class + ' ' : '') + name
			} else if (operator == '#') {
				element._id = name
			} else {
				element._tag = name
			}
		})
	}

	nextClassId = 1
	uniqueSelectors = {}
	function getUniqueSelector(element) {
		var selector = element.hasOwnProperty('_uniqueSelector') ? element._uniqueSelector :
			(element._tag + (element._class ? '.' + element._class.replace(/\s+/g, '.') : '') +
			(element._id ? '#' + element._id : ''))
		if (!selector.match(/[#\.-]/)) {
			if (uniqueSelectors[selector]) {
				element._class = '.x-' + nextClassId++
				selector = getUniqueSelector(element)
			} else {
				uniqueSelectors[selector] = selector
			}
		}
		return selector
	}

	function buildContent(content) {
		var each = this.each
		if (each && content) {
			// render as list
			if (each.create) {
				var ItemClass = this.itemAs || Item
				hasOwn(each, ItemClass, function (element) {
					return new ItemClass(element._item, content)
				})
			}
			if (content.notifies) {
				enterUpdater(ListUpdater, {
					each: each,
					variable: content,
					element: this
				})
			} else {
				var fragment = document.createDocumentFragment()
				var element = this
				content.forEach(function(item) {
					if (each.create) {
						childElement = each.create({parent: element, _item: item}) // TODO: make a faster object here potentially
					} else {
						childElement = each(item, element)
					}
					fragment.appendChild(childElement)
				})
				this.appendChild(fragment)
			}
		} else if (inputs[this.tagName]) {
			// render into input
			this.buildInputContent(content)
		} else {
			// render as string
			try {
				var text = content === undefined ? '' : content.valueOf(new Context(this))
				var textNode = document.createTextNode(text)
			} catch (error) {
				console.error(error.stack)
				var textNode = document.createTextNode(error)
			}
			this.appendChild(textNode)
			if (content && content.notifies) {
				enterUpdater(TextUpdater, {
					variable: content,
					element: this,
					textNode: textNode
				})
			}
		}
	}

	function bindChanges(element, variable) {
		lang.nextTurn(function() { // wait for next turn in case inputChanges isn't set yet
			var inputEvents = element.inputEvents || ['change']
			for (var i = 0, l = inputEvents.length; i < l; i++) {
				element.addEventListener(inputEvents[i], function (event) {
					var result = variable.put(element['typedValue' in element ? 'typedValue' : 'value'], new Context(element))
				})
			}
		})
	}
	function buildInputContent(content) {
		if (content && content.notifies) {
			// a variable, respond to changes
			enterUpdater(PropertyUpdater, {
				variable: content,
				name: 'typedValue' in this ? 'typedValue' : 'value',
				element: this
			})
			// and bind the other way as well, updating the variable in response to input changes
			bindChanges(this, content)
		} else {
			// primitive
			this['typedValue' in this ? 'typedValue' : 'value'] = content
		}
	}
	var classHandlers = {
		hasOwn: function(Element, descriptor) {
			hasOwn(Element, descriptor.value)
		}
	}

	function applyToClass(value, Element) {
		var applyOnCreate = Element._applyOnCreate
		var prototype = Element.prototype
		if (value && typeof value === 'object') {
			if (value instanceof Array) {
				Element.children = value
			} else if (value.notifies) {
				prototype.content = value
			} else {
				Object.getOwnPropertyNames(value).forEach(function(key) {
					var descriptor = Object.getOwnPropertyDescriptor(value, key)
					if (classHandlers[key]) {
						classHandlers[key](Element, descriptor)
					} else {
						var onClassPrototype = (typeof descriptor.value === 'function' && !descriptor.value.notifies) // a plain function/method and not a variable constructor
							|| descriptor.get || descriptor.set // or a getter/setter
						if (onClassPrototype) {
							Object.defineProperty(prototype, key, descriptor)
						}
						if (!onClassPrototype || key.slice(0, 2) == 'on') {
							// TODO: eventually we want to be able to set these as rules statically per element
							/*if (styleDefinitions[key]) {
								var styles = Element.styles || (Element.styles = [])
								styles.push(key)
								styles[key] = descriptor.value
							} else {*/
								if (!(key in applyOnCreate)) {
									var lastLength = applyOnCreate.length || 0
									applyOnCreate[lastLength] = key
									applyOnCreate.length = lastLength + 1
								}
								// TODO: do deep merging of styles and classes, but not variables
								applyOnCreate[key] = descriptor.value
							//}
						}
					}
				})
			}
		} else if (typeof value === 'function' && !value.for) {
			Element.initialize = function() {
				var Base = getPrototypeOf(Element)
				if (Base.initialize && !Base._initialized) {
					Base._initialized = true
					Base.initialize()
				}
				applyToClass(value(Element), Element)
			}
		} else {
			prototype.content = value
		}
	}
	function extend(selector, properties) {
		function Element(selector, properties) {
			if (this instanceof Element){
				// create DOM element
				// Need to detect if we have registered the element and `this` is actually already the correct instance
				return create.apply(this.constructor, arguments)
			} else {
				// extend to create new class
				return extend.apply(Element, arguments)
			}
		}
		setPrototypeOf(Element, this)
		var prototype = Element.prototype = Object.create(this.prototype)
		prototype.constructor = Element

		if (!Element.create) {
			// if we are inheriting from a native prototype, we will create the inherited base static functions
			Element.create = create
			Element.extend = extend
			Element.for = forTarget
			Element.property = propertyForElement
		}
		if (!prototype.buildContent) {
			prototype.buildContent = buildContent
			prototype.buildInputContent = buildInputContent
			prototype.getForClass = getForClass
			prototype.append = append
		}

		var i = 0 // for arguments
		if (typeof selector === 'string') {
			selector.replace(/(\.|#)?([-\w]+)/g, function(t, operator, name) {
				if (operator == '.') {
					Element._class = (Element._class ? Element._class + ' ' : '') + name
				} else if (operator == '#') {
					Element._id = name
				} else {
					Element._tag = name
				}
			})

			i++ // skip the first argument
		}
		Element._applyOnCreate = Object.create(this._applyOnCreate || null)

		for (var l = arguments.length; i < l; i++) {
			applyToClass(arguments[i], Element)
		}
		return Element
	}
	var currentParent
	function create(selector, properties) {
		// TODO: make this a symbol
		var applyOnCreate = this._applyOnCreate
		if (currentParent) {
			var parent = currentParent
			currentParent = null
		}
		var tagName = this._tag
		if (this._initialized != this) {
			this._initialized = this
			this.initialize && this.initialize()
			if (!tagName) {
				throw new Error('No tag name defined for element')
			}
			var styles = this.styles
			if (styles) {
				var rule = createCssRule(getUniqueSelector(this))
				for (var i = 0, l = styles.length; i < l; i++) {
					var key = styles[i]
					var value = styles[key]
					// TODO: if it is a contextualized variable, do this on the element
					var styleDefinition = styleDefinitions[key]
					if (styleDefinition) {
						value = styleDefinition(value)
						rule.style[key] = value
					}
				}
			}
			if (!this.hasOwnProperty('_applyOnCreate')) {
				applyOnCreate = this._applyOnCreate = Object.create(applyOnCreate || null)
				// this means we didn't extend and evaluate the prototype, so we need to at least check the prototype for event handlers
				var keys = Object.getOwnPropertyNames(this.prototype)
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i]
					if (key.slice(0, 2) == 'on') {
						if (!(key in applyOnCreate)) {
							var lastLength = applyOnCreate.length || 0
							applyOnCreate[lastLength] = key
							applyOnCreate.length = lastLength + 1
						}
						applyOnCreate[key] = this.prototype[key]
					}
				}
			}
			if (tagName.indexOf('-') > -1) {
				document.registerElement(tagName, this)
			}
		}
		var element = document.createElement(tagName)
		if (selector && selector.parent) {
			parent = selector.parent
		}
		if (parent) {
			presumptiveParentMap.set(element, parent)
		}
		setPrototypeOf(element, this.prototype)
		if (this._id) {
			element.id = this._id
		}
		if (this._class) {
			element.className = this._class
		}
		var i = 0
		if (typeof selector == 'string') {
			i++
			selector.replace(/(\.|#)?([-\w]+)/g, function(t, operator, name) {
				if (operator == '.') {
					element.className = (element.className ? this.className + ' ' : '') + name
				} else if (operator == '#') {
					element.id = name
				} else {
					throw new Error('Can not assign tag name when directly create an element')
				}
			})
		}
		if (selector && selector._item) {
			// this is kind of hack, to get the Item available before the properties, eventually we may want to
			// order static properties before variable binding applications, but for now.
			element._item = selector._item
		}
		if (applyOnCreate) {
			applyProperties(element, applyOnCreate, applyOnCreate)
		}
		var childrenToRender
		for (var l = arguments.length; i < l; i++) {
			var argument = arguments[i]
			if (argument instanceof Array) {
				childrenToRender = argument
			} else if (argument.notifies) {
				element.content = argument
			} else if (typeof argument === 'function' && argument.for) {
				element.content = argument.for(element)
			} else {
				applyProperties(element, argument, Object.keys(argument))
			}
		}
		// TODO: we may want to put these on the instance so it can be overriden
		if (this.children) {
			layoutChildren(element, this.children, element)
		}
		if (childrenToRender) {
			var contentNode = element.contentNode || element
			layoutChildren(contentNode, argument, contentNode)
		}
		if (element.content) {
			element.buildContent(element.content)
		}
		var classes = this.classes
		if (classes) {
			if (!(classes.length > -1)) {
				// index the classes, if necessary
				var i = 0
				for (var key in classes) {
					if (!classes[i]) {
						classes[i] = key
					}
					i++
				}
				classes.length = i
			}
			for (var i = 0, l = classes.length; i < l; i++) {
				// find each class name
				var className = classes[i]
				var flag = classes[className]
				if (flag && flag.notifies) {
					// if it is a variable, we react to it
					enterUpdater(Updater, {
						element: element,
						className: className,
						variable: flag
					})
				} else if (flag || flag === undefined) {
					element.className += ' ' + className
				}
			}
		}
		element.createdCallback && element.createdCallback()
		element.created && element.created()
		return element
	}

	function append(){
		return layoutChildren(this, arguments, this)
	}

	var Element = extend.call(HTMLElement)

	Element.within = function(element){
		// find closest child
	}

	var typedValueDescriptor = {
		// TODO: eventually make this a getter/setter
		get: function() {
			var inputType = this.type
			return inputType in {date: 1, datetime: 1, time: 1} ?
				this.valueAsDate :
				inputType === 'number' ?
					parseFloat(this.value) :
					inputType === 'checkbox' ? this.checked : this.value
		},
		set: function(value) {
			var inputType = this.type
			inputType in {date: 1, datetime: 1, time: 1} ?
				this.valueAsDate = value :
				inputType === 'checkbox' ?
					this.checked = value :
					this.value = value
		}
	}
	var typedValuePrototype = Object.create(null, {typedValue: typedValueDescriptor})
	generate([
		'Video',
		'Source',
		'Media',
		'Audio',
		'UL',
		'Track',
		'Title',
		'TextArea',
		'Template',
		'TBody',
		'THead',
		'TFoot',
		'TR',
		'Table',
		'Col',
		'ColGroup',
		'TH',
		'TD',
		'Caption',
		'Style',
		'Span',
		'Shadow',
		'Select',
		'Script',
		'Quote',
		'Progress',
		'Pre',
		'Picture',
		'Param',
		'P',
		'Output',
		'Option',
		'Optgroup',
		'Object',
		'OL',
		'Ins',
		'Del',
		'Meter',
		'Meta',
		'Menu',
		'Map',
		'Link',
		'Legend',
		'Label',
		'LI',
		'KeyGen',
		'Image',
		'IFrame',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'H6',
		'Hr',
		'FrameSet',
		'Frame',
		'Form',
		'Font',
		'Embed',
		'Article',
		'Aside',
		'Footer',
		'Figure',
		'FigCaption',
		'Header',
		'Main',
		'Mark',
		'MenuItem',
		'Nav',
		'Section',
		'Summary',
		'WBr',
		'Div',
		'Dialog',
		'Details',
		'DataList',
		'DL',
		'Canvas',
		'Button',
		'Base',
		'Br',
		'Area',
		'A'
	])
	generateInputs([
		'Checkbox',
		'Password',
		'Text',
		'Submit',
		'Radio',
		'Color',
		'Date',
		'DateTime',
		'Email',
		'Month',
		'Number',
		'Range',
		'Search',
		'Tel',
		'Time',
		'Url',
		'Week'])

	var tags = {}
	function getConstructor(tagName) {
		return tags[tagName] ||
			(tags[tagName] =
				augmentBaseElement(extend.call(document.createElement(tagName.toLowerCase()).constructor, tagName.toLowerCase())))
	}

	function generate(elements) {
		elements.forEach(function(elementName) {
			var ElementClass
			Object.defineProperty(Element, elementName, {
				get: function() {
					return ElementClass || (ElementClass = augmentBaseElement(extend.call(document.createElement(elementName.toLowerCase()).constructor, elementName.toLowerCase())))
				}
			})
		})
	}
	function generateInputs(elements) {
		elements.forEach(function(inputType) {
			var ElementClass
			Object.defineProperty(Element, inputType, {
				get: function() {
					// TODO: make all inputs extend from input generated from generate
					return ElementClass || (ElementClass = augmentBaseElement(extend.call(HTMLInputElement, 'input', {
						type: inputType.toLowerCase()
					}, typedValuePrototype)))
				}
			})
			// alias all the inputs with an Input suffix
			Object.defineProperty(Element, inputType + 'Input', {
				get: function() {
					return this[inputType]
				}
			})
		})
	}

	Object.defineProperty(Element.TextArea.prototype, 'typedValue', typedValueDescriptor)
	Object.defineProperty(Element.Select.prototype, 'typedValue', typedValueDescriptor)
	var aliases = {
		Anchor: 'A',
		Paragraph: 'P',
		Textarea: 'TextArea',
		DList: 'Dl',
		UList: 'Ul',
		OList: 'Ol',
		ListItem: 'LI',
		Input: 'Text',
		TableRow: 'TR',
		TableCell: 'TD',
		TableHeaderCell: 'TH',
		TableHeader: 'THead',
		TableBody: 'TBody'
	}
	for (var alias in aliases) {
		(function(alias, to) {
			Object.defineProperty(Element, alias, {
				get: function() {
					return this[to]
				}
			})			
		})(alias, aliases[alias])
	}

	Element.refresh = Updater.refresh
	Element.content = function(element){
		// container marker
		return {
			isContentNode: true,
			create: element.create.bind(element)
		}
	}
	function forTarget(target) {
		return target.getForClass(this)
	}

	function hasOwn(From, Target, createInstance) {
		if (typeof Target === 'object' && Target.Class) {
			return hasOwn(From, Target.Class, Target.createInstance)
		}
		if (Target instanceof Array) {
			return Target.forEach(function(Target) {
				hasOwn(From, Target)
			})
		}
		var ownedClasses = From.ownedClasses || (From.ownedClasses = new WeakMap())
		// TODO: assign to super classes
		ownedClasses.set(Target, createInstance || function() {
			return new Target()
		})
		return From
	}

	var globalInstances = {}
	function getForClass(Target) {
		var element = this
		var createInstance
		while (element && !(createInstance = element.constructor.ownedClasses && element.constructor.ownedClasses.get(Target))) {
			element = element.parentNode || presumptiveParentMap.get(element)
		}
		if (createInstance) {
			var ownedInstances = element.ownedInstances || (element.ownedInstances = new WeakMap())
			var instance = ownedInstances.get(Target)
			if (instance === undefined) {
				ownedInstances.set(Target, instance = createInstance(element))
				instance.subject = element
			}
			return instance
		}
	}

	function propertyForElement(key) {
		// we just need to establish one Variable class for each element, so we cache it
		ThisElementVariable = this._Variable
		if (!ThisElementVariable) {
			// need our own branded variable class for this element class
			ThisElementVariable = this._Variable = Variable()

			hasOwn(this, ThisElementVariable, function(element) {
				// when we create the instance, immediately observe it
				// TODO: we might want to do this in init instead
				var instance = new ThisElementVariable(element)
				Variable.observe(element)
				return instance
			})
		}
		// now actually get the property class
		return ThisElementVariable.property(key)
	}

	var Item = Element.Item = Variable.Item

	function enterUpdater(Updater, options/*, target*/) {
		// this will be used for optimized class-level variables
		/*if (target.started) { // TODO: Might want to pass in started as a parameter
			// this means that the updater has already been created, so we just need to add this instance
			Updater.prototype.renderUpdate.call(options, element)
		} else {*/
		var target = options.element
		var updaters = target.updaters || (target.updaters = [])
		updaters.push(new Updater(options))
		//}
	}

	function cleanup(target) {
		var updaters = target.updaters
		if (updaters) {
			for (var i = 0, l = updaters.length; i < l; i++) {
				updaters[i].stop()
			}
		}
		target.needsRestart = true
	}
	function restart(target) {
		var updaters = target.updaters
		if (updaters) {
			for (var i = 0, l = updaters.length; i < l; i++) {
//				updaters[i].start()
			}
		}
	}
	// setup the mutation observer so we can be notified of attachments and removals
	function traverse(nodes, action) {
		for (var i = 0, l = nodes.length; i < l; i++) {
			var node = nodes[i]
			if (node.nodeType === 1) {
				action(node)
				traverse(node.childNodes, action)
			}
		}
	}
	function elementAttached(element) {
		var Class = element.constructor
		if (Class.create) {
/*			if (Class.attachedInstances) {
				Class.attachedInstances.push(element)
				if (Class.attachedInstances.length === 1 && Class.needsRestart) {
					restart(Class)
				}
			} else {
				Class.attachedInstances = [element]
			}*/
			if (element.attached) {
				element.attached()
			}
			if (element.needsRestart) {
				restart(element)
			}
		}
	}
	function elementDetached(element) {
		/*var attachedInstances = element.constructor.attachedInstances
		if (attachedInstances) {
			var index = attachedInstances.indexOf(element)
			if (index > -1) {
				attachedInstances.splice(index, 1)
				if (attachedInstances.length === 0) {
					cleanup(Class)
				}
			}*/
			if (element.detached) {
				element.detached()
			}
			cleanup(element)
		//}
	}
	if (typeof MutationObserver === 'function') {
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				traverse(mutation.addedNodes, elementAttached)
				traverse(mutation.removedNodes, elementDetached)
			})
		})
		observer.observe(document.body, {
			childList: true,
			subtree: true
		})
	}

	function augmentBaseElement(Element) {
		var prototype = Element.prototype
		for(var i = 0, l = toAddToElementPrototypes.length; i < l; i++) {
			var key = toAddToElementPrototypes[i]
			Object.defineProperty(prototype, key, toAddToElementPrototypes[key])
		}
		createdBaseElements.push(Element)
		return Element
	}
	createdBaseElements.push(Element)
	Element.addToElementPrototypes = function(properties) {
		var i = 0;
		for (var key in properties) {
			toAddToElementPrototypes.push(key)
			toAddToElementPrototypes[key] = Object.getOwnPropertyDescriptor(properties, key)
		}
		for(var i = 0, l = createdBaseElements.length; i < l; i++) {
			augmentBaseElement(createdBaseElements[i])
		}
	}
	return Element
}))