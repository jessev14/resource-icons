import { libWrapper } from "../lib/shim.js";
import { containerPosition } from "./helpers.js";
import { ResourceIconConfig } from "./ResourceIconConfig.js";

export const moduleName = "resource-icons";


Hooks.once("init", () => {
    // Register module settings
    game.settings.register(moduleName, "combatOnly", {
        name: `${moduleName}.settings.combatOnly.name`,
        config: true,
        scope: "world",
        type: Boolean,
        default: false,
        onChange: () => canvas.tokens.placeables.forEach(t => t.drawResourceIcons())
    });

    game.settings.register(moduleName, "iconAnchor", {
        name: `${moduleName}.settings.iconAnchor.name`,
        config: true,
        scope: "world",
        type: String,
        choices: {
            top: `${moduleName}.settings.iconAnchor.choices.top`,
            bottom: `${moduleName}.settings.iconAnchor.choices.bottom`,
            left: `${moduleName}.settings.iconAnchor.choices.left`,
            right: `${moduleName}.settings.iconAnchor.choices.right`,
        },
        default: "top",
        onChange: () => canvas.tokens.placeables.forEach(t => t.drawResourceIcons())
    });

    game.settings.register(moduleName, "boundingBox", {
        name: `${moduleName}.settings.boundingBox.name`,
        config: true,
        scope: "world",
        type: String,
        choices: {
            outside: `${moduleName}.settings.iconAnchor.choices.outside`,
            inside: `${moduleName}.settings.iconAnchor.choices.inside`,
        },
        default: "outside",
        onChange: () => canvas.tokens.placeables.forEach(t => t.drawResourceIcons())
    });

    game.settings.register(moduleName, "hideZero", {
        name: `${moduleName}.settings.hideZero.name`,
        config: true,
        scope: "world",
        type: Boolean,
        default: false,
        onChange: () => canvas.tokens.placeables.forEach(t => t.drawResourceIcons())
    });

    // New Token methods
    // Draw resource icons
    CONFIG.Token.objectClass.prototype.drawResourceIcons = drawResourceIcons;

    // Update resource icon values
    CONFIG.Token.objectClass.prototype.updateResourceIconValues = updateResourceIconValues;

    // Patch Token methods
    // Add resource icon drawing to Token#_draw
    libWrapper.register(moduleName, "CONFIG.Token.objectClass.prototype._draw", _drawPatch, "WRAPPER");

    // Add visibility control of resource icons to Token#refresh
    libWrapper.register(moduleName, "CONFIG.Token.objectClass.prototype.refresh", refreshPatch, "WRAPPER");

    // Refresh resource icons on update
    libWrapper.register(moduleName, "CONFIG.Token.objectClass.prototype._onUpdate", _onUpdatePatch, "WRAPPER");
});


Hooks.on("renderTokenConfig", (app, html, data) => {
    const displayIcons = document.createElement(`div`);
    displayIcons.classList.add("form-group");
    displayIcons.innerHTML = `
        <label>Resource Icons</label>
        <div class="form-fields">
            <select name="flags.${moduleName}.displayIcons" data-dtype="Number">
                ${Handlebars.helpers.selectOptions.call(
                    this,
                    Object.entries(CONST.TOKEN_DISPLAY_MODES).reduce((obj, e) => {
                        obj[e[1]] = game.i18n.localize(`TOKEN.DISPLAY_${e[0]}`);
                        return obj;
                    }, {}),
                    { hash: {
                        selected: app.object.getFlag(moduleName, "displayIcons")
                    }}
                )}
            </select>
        </div>
    `;

    const resourceIconConfigButton = document.createElement(`button`);
    resourceIconConfigButton.type = "button";
    resourceIconConfigButton.innerText = "Customize";
    resourceIconConfigButton.addEventListener("click", () => new ResourceIconConfig(app.object).render(true));
    displayIcons.appendChild(resourceIconConfigButton);

    html[0].querySelector(`div.tab[data-tab="resources"]`).append(displayIcons);

    ui.activeWindow.setPosition({height: "auto"});
});

Hooks.on("updateActor", (actor, diff, options, userID) => {
    if (!diff.data) return;
    
    const tokens = actor.getActiveTokens();
    for (const token of tokens) token.updateResourceIconValues();
});

Hooks.on("createCombatant", (combatant, options, userID) => {   
    combatant.token.object.refresh();
});

Hooks.on("deleteCombatant", (combatant, options, userID) => {   
    combatant.token.object.refresh();
});


async function drawResourceIcons() {
    if (game.settings.get(moduleName, "combatOnly") && !this.combatant) return;

    const iconData = this.document.getFlag(moduleName, "iconData");
    if (!Object.values(iconData).length) return;

    this.resourceIcons.removeChildren().forEach(c => c.destroy({ children: true }));
    
    for (const icon of Object.keys(iconData)) {
        // Create PIXI container for current icon
        this.resourceIcons[icon] = this.resourceIcons.addChild(new PIXI.Container());
        // Set container position
        const [x, y] = containerPosition(parseInt(icon.slice(-1) - 1), this.w, this.h);
        this.resourceIcons[icon].position.set(x, y);
    }

    for (const [k, v] of Object.entries(iconData)) {
        const currentResourceIcon = this.resourceIcons[k];
        currentResourceIcon.removeChildren().forEach(c => c.destroy({ children: true }));
        if (!v.resource) continue;

        // Icon
        const texture = await loadTexture(v.img || `modules/${moduleName}/icons/plain-circle.png`);
        const icon = new PIXI.Sprite(texture);
        icon.width = icon.height = 0.28 * Math.min(this.w, this.h);
        icon.anchor.set(0);
        icon.position.set(0);
        if (v.tint) icon.tint = foundry.utils.Color.from(v.tint) || 0x000000;

        // Background
        const bg = new PIXI.Graphics();
        if (v.bg) bg.beginFill(foundry.utils.Color.from(v.background) || 0x000000);
        if (v.border) bg.lineStyle(1.0, foundry.utils.Color.from(v.border) || 0x000000);
        if (v.shape === "circle") bg.drawCircle(icon.width / 2, icon.height / 2, icon.width / 2 + 1);
        else bg.drawRoundedRect(icon.position.x - 1, icon.position.y - 1, icon.width + 2, icon.height + 2, 2);

        // Value
        const resource = foundry.utils.getProperty(this.actor.data.data, v.resource);
        let value;
        if (Number.isFinite(resource)) value = resource;
        else if ("value" in resource) value = resource.value || 0;
        const style = this._getTextStyle();
        // Adjust font size linearly based on grid size
        if (canvas.dimensions.size < 101) style.fontSize = (10 / 50) * canvas.dimensions.size;
        else if (canvas.dimensions.size > 100) style.fontSize = 12 + (8 / 100) * canvas.dimensions.size;
        // If the token height and width in grid units > 1, scale font based on largest value
        if (this.data.height > 1 || this.data.width > 1) {
            const bigger = Math.max(this.data.height, this.data.width);
            style.fontSize = style.fontSize * bigger;
        }

        // Text
        const text = new PreciseText(`${value}`, style);
        text.anchor.set(1);
        text.position.set(icon.width + 2, icon.height + 5);

        // Add PIXI elements to container
        currentResourceIcon.background = currentResourceIcon.addChild(bg);
        currentResourceIcon.img = currentResourceIcon.addChild(icon);
        currentResourceIcon.value = currentResourceIcon.addChild(text);

        if (!value && game.settings.get(moduleName, "hideZero")) currentResourceIcon.alpha = 0;
    }
};

function updateResourceIconValues() {
    for (const [k, v] of Object.entries(this.document.getFlag(moduleName, "iconData"))) {
        const resource = foundry.utils.getProperty(this.actor.data.data, v.resource);
        if (resource === null || resource === undefined) continue;
        let value;
        if (Number.isFinite(resource)) value = resource;
        else if ("value" in resource) value = resource.value || 0;
        this.resourceIcons[k].value.text = value;
        if (!value && game.settings.get("resource-icons", "hideZero")) this.resourceIcons[k].alpha = 0;
        else this.resourceIcons[k].alpha = 1;
    }
};

async function _drawPatch(wrapper) {
    await wrapper();

    this.resourceIcons = this.addChild(new PIXI.Container());
    this.drawResourceIcons();
}

function refreshPatch(wrapper) {
    wrapper();

    if (game.settings.get(moduleName, "combatOnly") && !this.combatant) this.resourceIcons.visible = false;
    else this.resourceIcons.visible = this._canViewMode(this.document.getFlag(moduleName, "displayIcons") ?? 40);
}

function _onUpdatePatch(wrapper, data, options, userID) {
    wrapper(data, options, userID);
    if (data.flags?.[moduleName]) this.refresh();
}