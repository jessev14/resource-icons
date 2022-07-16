
import { moduleName } from "./main.js";

export class ActorTypeSelector extends FormApplication {
    constructor() {
        super();
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${moduleName}-actorTypeSelector`,
            title: "Select Actor Type",
            template: `modules/${moduleName}/templates/actor-type-selector.hbs`
        });
    }

    getData() {
        const data = {};
        data.types = {};
        for (const [k, v] of Object.entries(CONFIG.Actor.typeLabels)) {
            data.types[k] = game.i18n.localize(v);
        }

        return data;
    }

    activateListeners(html) {
        html[0].querySelectorAll(`button`).forEach(n => {
            n.addEventListener("click", ev => {
                const actorType = ev.currentTarget.value;
                new SetDefaults(actorType).render(true);
            });
        });
    }
}

export class SetDefaults extends FormApplication {
    constructor(actorType) {
        super();

        this.actorType = actorType;
        this.displayIcons = game.settings.get(moduleName, "actorTypeDefaults")?.[actorType]?.displayIcons;
        this.iconData = game.settings.get(moduleName, "actorTypeDefaults")?.[actorType]?.iconData;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: `${moduleName}-${this.actorType}-defaults`,
            classes: [moduleName, "sheet"],
            template: `modules/${moduleName}/templates/resource-icon-config.hbs`,
            tabs: [
                { navSelector: '.tabs[data-group="main"]', contentSelector: "form", initial: "icon1" }
            ],
            resizable: true
        });
    }

    get title() {
        return `${this.actorType} Default Resource Icons`;
    }

    getData() {
        const data = {};

        if (this.iconData) data.iconData = this.iconData;
        else {
            const empty = {
                resource: "",
                img: "",
                tint: "",
                background: "",
                border: "",
                shape: "circle"
            };
            data.iconData = {
                icon1: empty,
                icon2: empty,
                icon3: empty
            };
        }

        const attributes = TokenDocument.implementation.getTrackedAttributes();
        const resourceChoices = TokenDocument.implementation.getTrackedAttributeChoices(attributes);
        data.resourceChoices = resourceChoices;

        data.displayIcons = this.displayIcons ?? 0;
        data.displayModes = Object.entries(CONST.TOKEN_DISPLAY_MODES).reduce((obj, e) => {
            obj[e[1]] = game.i18n.localize(`TOKEN.DISPLAY_${e[0]}`);
            return obj;
        }, {});

        data.expertMode = game.settings.get(moduleName, "expertMode");
        
        return data;
    }

    async _updateObject(event, formData) {
        const newDefaultData = {};
        for (const [k, v] of Object.entries(formData)) {
            const cleanedKey = `${this.actorType}.` + k.replace(`flags.${moduleName}.`, "");
            newDefaultData[cleanedKey] = v;
        }

        const actorTypeDefaults = game.settings.get(moduleName, "actorTypeDefaults")?.iconData ?? {};
        foundry.utils.mergeObject(actorTypeDefaults, newDefaultData);

        return game.settings.set(moduleName, "actorTypeDefaults", actorTypeDefaults);
    }
}