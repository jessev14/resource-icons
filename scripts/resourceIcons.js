import { containerPosition, getSetting } from './helpers.js';
import { libWrapper } from '../lib/shim.js';

Hooks.once("init", () => {
    // Register module settings
    game.settings.register("resourceIcons", "world-borderShape", {
        name: "World Default: Border Shape",
        hint: "",
        scope: "world",
        config: true,
        type: String,
        choices: {
            square: "Square",
            circle: "Circle"
        },
        default: "square",
        onChange: () => window.location.reload()
    });

    game.settings.register("resourceIcons", "user-borderShape", {
        name: "Border Shape",
        hint: "",
        scope: "client",
        config: true,
        type: String,
        choices: {
            worldDefault: "World Default",
            square: "Square",
            circle: "Circle"
        },
        default: "worldDefault",
        onChange: async () => { for (let token of canvas.tokens.placeables) await token.drawResourceIcons() }
    });

    game.settings.register("resourceIcons", "world-iconPosition", {
        name: "World Default: Icon Position",
        hint: "",
        scope: "world",
        config: true,
        type: String,
        choices: {
            above: "Above Token",
            below: "Below Token",
            left: "Left of Token",
            right: "Right of Token"
        },
        default: "above",
        onChange: async () => window.location.reload()
    });

    game.settings.register("resourceIcons", "user-iconPosition", {
        name: "Icon Position",
        hint: "",
        scope: "client",
        config: true,
        type: String,
        choices: {
            worldDefault: "World Default",
            above: "Above Token",
            below: "Below Token",
            left: "Left of Token",
            right: "Right of Token"
        },
        default: "worldDefault",
        onChange: async () => { for (let token of canvas.tokens.placeables) await token.drawResourceIcons() }
    });
});

Hooks.once("setup", () => {
    // GM function to toggle resource icon visibility
    game.modules.get("resourceIcons").resourceIconVisibility = toggleResourceIcons;
    function toggleResourceIcons() {
        if (!game.user.isGM) return;

        let currentVisibility = true;
        for (let token of canvas.tokens.placeables) {
            if (!token.resourceIcons.visible) {
                currentVisibility = false;
                break;
            }
        }

        for (let token of canvas.tokens.placeables) token.resourceIcons.visible = !currentVisibility;
        return !currentVisibility;
    }    

    // Patch Token draw method to include resource icon drawing
    libWrapper.register("resourceIcons", "CONFIG.Token.objectClass.prototype.draw", newDraw, "WRAPPER");
    async function newDraw(wrapped, ...args) {
        // Call patched method
        const _this = await wrapped(...args);

        // Create resourceIcons parent container (as child of Token PIXI container)
        _this.resourceIcons = _this.addChild(new PIXI.Container());
        // Draw resource icons
        _this.drawResourceIcons();

        return _this;
    }

    // Create new method in Token class to draw resource icons
    CONFIG.Token.objectClass.prototype.drawResourceIcons = drawResourceIcons;
    async function drawResourceIcons() {
        // Get Resource Icon flag data
        const flagData = this.data.flags.resourceIcons;
        // If no flag data, return
        if (!flagData || !this.resourceIcons) return;

        // Delete pre-existing resource icons to prepare blank slate for drawing
        this.resourceIcons.removeChildren().forEach(c => c.destroy({ children: true }));

        let i = 0;
        // For each resource icon create a PIXI container that is a child of Token.resourceIcons
        for (let icon of Object.keys(flagData)) {
            // Create PIXI container for current resource icon
            this.resourceIcons[icon] = this.resourceIcons.addChild(new PIXI.Container());
            // Set current container position
            const [x, y] = containerPosition(i, this.w, this.h);
            this.resourceIcons[icon].position.set(x, y);
            i++;
        }

        // Use flag data to draw background, border, and value text for each resource icon
        for (let [k, v] of Object.entries(flagData)) {
            // Delete pre-existing children to prepare blank slate
            this.resourceIcons[k].removeChildren().forEach(c => c.destroy({ children: true }));
            // If current resource icon is not activated, skip to next resource icon
            if (!v.resource) continue;

            // Load resource icon image
            const texture = await loadTexture(v.img || "modules/resourceIcons/icons/plain-circle.png");
            // Create PIXI sprite using loaded image
            const icon = new PIXI.Sprite(texture);
            // Set sprite dimensions
            icon.width = icon.height = 0.28 * Math.min(this.w, this.h);
            // Set sprite anchor and and position
            icon.anchor.set(0);
            icon.position.set(0);
            // If icon tint is activated, set sprite tint
            if (v.options.tint.active) icon.tint = foundry.utils.colorStringToHex(v.options.tint.color) || 0x000000;

            // Create background PIXI grahics
            const bg = new PIXI.Graphics();
            // If background is active, fill PIXI graphics with background color (or black by default)
            if (v.options.background.active) bg.beginFill(foundry.utils.colorStringToHex(v.options.background.color) || 0x000000, 0.40);
            // If border is active, set line style for border (black by default)
            if (v.options.border.active) bg.lineStyle(1.0, foundry.utils.colorStringToHex(v.options.border.color) || 0x000000);
            // Draw border based on borderShape module setting
            const shape = getSetting("borderShape");
            if (shape === "square") bg.drawRoundedRect(icon.position.x - 1, icon.position.y - 1, icon.width + 2, icon.height + 2, 2);
            else bg.drawCircle(icon.width / 2, icon.height / 2, icon.width / 2 + 1);

            // Determine value of current resource icon
            const resource = foundry.utils.getProperty(this.actor.data.data, v.resource);
            let value;
            if (Number.isFinite(resource)) value = resource;
            else if ("value" in resource) value = resource.value || 0;
            else value = null;
            const style = this._getTextStyle();
            // Adjust font size linearly based on grid size
            if (canvas.dimensions.size < 101) style.fontSize = (10 / 50) * canvas.dimensions.size;
            else if (canvas.dimensions.size > 100) style.fontSize = 12 + (8 / 100) * canvas.dimensions.size;
            // Create PIXI text
            const text = new PreciseText(`${value}`, style);
            // Set PIXI text anchor and position
            text.anchor.set(1);
            text.position.set(icon.width + 2, icon.height + 5);

            // Add created PIXI elements to current resource icon PIXI container
            this.resourceIcons[k].background = this.resourceIcons[k].addChild(bg);
            this.resourceIcons[k].img = this.resourceIcons[k].addChild(icon);
            this.resourceIcons[k].value = this.resourceIcons[k].addChild(text);
        }
    }

    // Create new method in Token class to update resouce icon values
    CONFIG.Token.objectClass.prototype.updateResourceIconValues = updateResourceIconValues;
    function updateResourceIconValues() {
        for (let icon of ["icon1", "icon2", "icon3"]) {
            // Get value of resource for current icon
            const resourceValue = foundry.utils.getProperty(this.actor.data.data, this.data.flags.resourceIcons[icon].resource);
            if (!resourceValue) continue;
            let value;
            if (Number.isFinite(resourceValue)) value = resourceValue;
            else if ("value" in resourceValue) value = resourceValue.value || 0;
            else value = null;
            // Update current icon text to reflect new value
            this.resourceIcons[icon].value.text = value;
        }
    }

    // Patch _onUpdate method of Token class to re-draw resource icons or update resource icon values
    libWrapper.register("resourceIcons", "CONFIG.Token.objectClass.prototype._onUpdate", new_onUpdate, "WRAPPER");
    function new_onUpdate(wrapped, data, options, userId) {
        wrapped(data, options, userId);
        if (data.flags?.resourceIcons) this.drawResourceIcons();
        else if (data.actorData) this.updateResourceIconValues();
    }
});

Hooks.once("ready", () => {
    // Hook onto 'renderTokenConfig' to inject Resource Icon HTML
    Hooks.on("renderTokenConfig", async (app, html, data) => {
        // If current token has no Resource Icon flag data, render template using "blank" default data
        if (!data.object.flags.resourceIcons) {
            const flagData = {};
            for (let i = 0; i < 3; i++) {
                flagData[`icon${i + 1}`] = {
                    resource: "",
                    img: "",
                    options: {
                        background: {
                            active: false,
                            color: null
                        },
                        border: {
                            active: false,
                            color: null
                        },
                        tint: {
                            active: false,
                            color: null
                        }
                    }
                }
            }
            data.object.flags.resourceIcons = flagData;
        }
        // Create array of numbers to render Resource Icon templates
        data.resourceIcons = ["1", "2", "3"];
        const snippet = await renderTemplate('modules/resourceIcons/templates/resourceIconsHTML.hbs', data);
        // Add rendered HTML to token-config application
        html.find(`.tab[data-tab="resources"`).append(snippet);
        // Activate listeners of new HTML elements (using Token class' parent class)
        FormApplication.prototype.activateListeners.call(app, html);
    });

    // Hook onto 'update' actor to initiate re-draw or update of resource icons for active tokens
    Hooks.on("updateActor", (actor, diff, options, userID) => {
        if (!diff.data) return;
        const tokens = actor.getActiveTokens();
        for (let token of tokens) {
            token._onUpdate({ actorData: diff.data });
        }
    });
});

// Handlebars helpers that just call core counterparts 
Handlebars.registerHelper('resourceIcons-select', (resource, options) => {
    return HandlebarsHelpers.select(options.data.root.object.flags.resourceIcons[`icon${resource}`].resource, options);
});

Handlebars.registerHelper('resourceIcons-filePicker', (options) => {
    options.hash['target'] = `flags.resourceIcons.icon${options.hash['resource']}.img`;
    return HandlebarsHelpers.filePicker(options);
});

Handlebars.registerHelper('resourceIcons-colorPicker', (options) => {
    const { resource, key } = options.hash;
    options.hash['name'] = `flags.resourceIcons.icon${resource}.options.${key}.color`;
    options.hash['value'] = options.data.root.object.flags.resourceIcons[`icon${resource}`].options[`${key}`].color;
    return HandlebarsHelpers.colorPicker(options);
});

// Handlebars helper that facilitates getting data of current resource icon (in #each block of Resource Icons template)
Handlebars.registerHelper('resourceIcons-getData', (resource, key, options) => {
    let res = options.data.root.object.flags.resourceIcons[`icon${resource}`];
    const subKeys = key.split(".");
    subKeys.forEach(s => res = res[s]);
    return res || null;
});
