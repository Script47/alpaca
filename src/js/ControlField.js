(function($) {

    var Alpaca = $.alpaca;

    Alpaca.ControlField = Alpaca.Field.extend(
    /**
     * @lends Alpaca.ControlField.prototype
     */
    {
        /**
         * Called during construction to signal that this field is a control field.
         */
        onConstruct: function()
        {
            this.isControlField = true;
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function()
        {
            var self = this;

            this.base();

            // we require a control descriptor if we're in a non-display mode
            if (this.view.type !== "display")
            {
                var controlTemplateType = self.resolveControlTemplateType();
                if (!controlTemplateType)
                {
                    return Alpaca.throwErrorWithCallback("Unable to find template descriptor for control: " + self.getFieldType());
                }

                this.controlDescriptor = this.view.getTemplateDescriptor("control-" + controlTemplateType);
            }
        },

        getControlEl: function()
        {
            return this.control;
        },

        resolveControlTemplateType: function()
        {
            // we assume the field type and then check the view to see if there is a template for this view
            // if not, we walk the parent chain until we find a template type

            var finished = false;
            var selectedType = null;

            var b = this;
            do
            {
                if (!b.getFieldType)
                {
                    finished = true;
                }
                else
                {
                    var d = this.view.getTemplateDescriptor("control-" + b.getFieldType());
                    if (d)
                    {
                        selectedType = b.getFieldType();
                        finished = true;
                    }
                    else
                    {
                        b = b.constructor.ancestor.prototype;
                    }
                }
            }
            while (!finished);

            return selectedType;
        },

        onSetup: function()
        {

        },

        isAutoFocusable: function()
        {
            return true;
        },

        /**
         * For control fields, we use the "control" template as the primary.
         *
         * @see Alpaca.Field#getTemplateDescriptorId
         * @returns {string}
         */
        getTemplateDescriptorId : function ()
        {
            return "control";
        },

        /**
         * Add a "control" dom element inside of the field which houses our custom control.
         *
         * @see Alpaca.Field#renderField
         */
        renderFieldElements: function(callback) {

            var self = this;

            // find our insertion point
            // this is marked by the handlebars helper
            this.control = $(this.field).find("." + Alpaca.MARKER_CLASS_CONTROL_FIELD);
            this.control.removeClass(Alpaca.MARKER_CLASS_CONTROL_FIELD);

            // render
            self.prepareControlModel(function(model) {
                self.beforeRenderControl(model, function() {
                    self.renderControl(model, function(controlField) {

                        if (controlField)
                        {
                            self.control.replaceWith(controlField);
                            self.control = controlField;

                            self.control.addClass(Alpaca.CLASS_CONTROL);
                        }

                        // CALLBACK: "control"
                        self.fireCallback("control");

                        self.afterRenderControl(model, function() {

                            callback();
                        });

                    });
                });
            });
        },

        /**
         * Prepares the model for use in rendering the control.
         *
         * @param callback function(model)
         */
        prepareControlModel: function(callback)
        {
            var self = this;

            var model = {};
            model.id = this.getId();
            model.name = this.name;
            model.options = this.options;
            model.schema = this.schema;
            model.data = this.data;
            model.required = this.schema.required;

            callback(model);
        },

        /**
         * Called before the control is rendered.
         *
         * @extension-point
         *
         * @param callback
         */
        beforeRenderControl: function(model, callback)
        {
            callback();
        },

        /**
         * Called after the control is rendered.
         *
         * @extension-point
         *
         * @param model
         * @param callback
         */
        afterRenderControl: function(model, callback)
        {
            callback();
        },

        /**
         * Renders the control into the field container.
         *
         * @extension-point
         *
         * @param model
         * @param callback
         */
        renderControl: function(model, callback)
        {
            var control = null;

            if (this.controlDescriptor)
            {
                control = Alpaca.tmpl(this.controlDescriptor, model);
            }

            callback(control);
        },

        /**
         * @see Alpaca.Field#postRender
         */
        postRender: function(callback)
        {
            var self = this;

            /*
            // store reference to the label
            this.labelDiv = $(this.field).find(".alpaca-controlfield-label");
            var labelDiv = $('.alpaca-controlfield-label', this.outerEl);
            if (labelDiv.length) {
                this.labelDiv = labelDiv;
            }

            var helperDiv = $('.alpaca-controlfield-helper', this.outerEl);
            if (helperDiv.length) {
                this.helperDiv = helperDiv;
            }
            */

            this.base(function() {

                callback();

            });
        },

        /**
         * @see Alpaca.Field#setDefault
         */
        setDefault: function() {
            var defaultData = Alpaca.isEmpty(this.schema['default']) ? "" : this.schema['default'];
            this.setValue(defaultData);
        },

        /**
         * Validate against enum property.
         *
         * @returns {Boolean} True if the element value is part of the enum list, false otherwise.
         */
        _validateEnum: function()
        {
            if (this.schema["enum"]) {
                var val = this.data;
                /*this.getValue();*/
                if (!this.schema.required && Alpaca.isValEmpty(val)) {
                    return true;
                }
                if ($.inArray(val, this.schema["enum"]) > -1) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        },

        /**
         * @see Alpaca.Field#handleValidate
         */
        handleValidate: function()
        {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateEnum();
            valInfo["invalidValueOfEnum"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidValueOfEnum"), [this.schema["enum"].join(',')]),
                "status": status
            };

            return baseStatus && valInfo["invalidValueOfEnum"]["status"];
        },

        /**
         * @see Alpaca.Field#initEvents
         */
        initEvents: function()
        {
            this.base();

            var _this = this;

            if (this.control && this.control.length > 0)
            {
                // trigger control level handlers for things that happen to input element
                this.control.change(function(e) {
                    _this.onChange.call(_this, e);
                    _this.triggerWithPropagation("change", e);
                });

                this.control.focus(function(e) {
                    _this.onFocus.call(_this, e);
                    _this.trigger("focus", e);
                });

                this.control.blur(function(e) {
                    _this.onBlur.call(_this, e);
                    _this.trigger("blur", e);
                });

                this.control.keypress(function(e) {
                    _this.onKeyPress.call(_this, e);
                    _this.trigger("keypress", e);
                });

                this.control.keyup(function(e) {
                    _this.onKeyUp.call(_this, e);
                    _this.trigger("keyup", e);
                });

                this.control.keydown(function(e) {
                    _this.onKeyDown.call(_this, e);
                    _this.trigger("keydown", e);
                });

                this.control.click(function(e) {
                    _this.onClick.call(_this, e);
                    _this.trigger("click", e);
                });
            }

        },

        /**
         * Callback for when a key press event is received for the field control.
         *
         * @param {Object} e keypress event
         */
        onKeyPress: function(e)
        {
            var self = this;

            // if the field is currently invalid, then we provide early feedback to the user as to when they enter
            // if the field was valid, we don't render invalidation feedback until they blur the field

            // was the control valid previously?
            var wasValid = this.isValid();
            if (!wasValid)
            {
                //
                // we use a timeout because at this exact moment, the value of the control is still the old value
                // jQuery raises the keypress event ahead of the input receiving the new data which would incorporate
                // the key that was pressed
                //
                // this timeout provides the browser with enough time to plug the value into the input control
                // which the validation logic uses to determine whether the control is now in a valid state
                //
                window.setTimeout(function() {
                    self.refreshValidationState();
                }, 50);
            }

        },

        /**
         * Callback for when a key down event is received for the field control.
         *
         * @param {Object} e keydown event
         */
        onKeyDown: function(e)
        {
        },

        /**
         * Callback for when a key up event is received for the field control.
         *
         * @param {Object} e keyup event
         */
        onKeyUp: function(e)
        {
        },

        /**
         * Handler for click event.
         *
         * @param {Object} e Click event.
         */
        onClick: function(e)
        {
        },


        //__BUILDER_HELPERS

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "enum": {
                        "title": "Enumerated Values",
                        "description": "List of specific values for this property",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "enum": {
                        "itemLabel":"Value",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "name": {
                        "title": "Field Name",
                        "description": "Field Name.",
                        "type": "string"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "name": {
                        "type": "text"
                    }
                }
            });
        }//__END_OF_BUILDER_HELPERS
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "invalidValueOfEnum": "This field should have one of the values in {0}."
    });

})(jQuery);