// import { libWrapper } from "../lib/shim.js";

export const moduleName = "resource-icons";

Hooks.once("init", () => {
    // Register module settings
    game.settings.register(moduleName, "combatOnly", {
        name: `${moduleName}.settings.combatOnly.name`,
        config: true,
        scope: "world",
        type: Boolean,
        default: false
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
        default: "top"
    });

    // Patch Token methods
    
    // Add resource icon drawing to _draw
    libWrapper.register(moduleName, "CONFIG.Token.objectClass.prototype._draw", _drawPatch, "WRAPPER");


    // Create new Token method that draws resource icons
    CONFIG.Token.objectClass.prototype.drawResourceIcons = function () {
        if (game.settings.get(moduleName, "combatOnly") && !this.combatant) return;

        const iconData = this.document.getFlag(moduleName, "iconData");
        if (!Object.values(iconData).length) return;

        
    };

});


async function _drawPatch(wrapper) {
    await wrapper();

    this.resourceIcons = this.addChild(new PIXI.Container());
    this.drawResourceIcons();
}


