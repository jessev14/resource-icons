import { moduleName } from "./main.js";

export class ResourceIconConfig extends FormApplication {
    constructor(object, options) {
        super(object, options);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: [moduleName, "sheet"],
            template: `modules/${moduleName}/templates/resource-icon-config.hbs`,
            tabs: [
                { navSelector: '.tabs[data-group="main"]', contentSelector: "form", initial: "icon1" }
            ],
            resizable: true
        });
    }

    get id() {
        return this.object.id;
    }

    get title() {
        return `Resource Icons: ${this.object.name}`;
    }

    getData() {
        const isPrototype = this.object instanceof Actor;
        const objectData = isPrototype ? this.object.data.token : this.object.data;
        const data = {};

        let iconData = objectData.flags?.[moduleName]?.iconData ?? {};
        if (!Object.values(iconData).length) {
            const empty = {
                resource: "",
                img: "",
                tint: "",
                background: "",
                border: "",
                shape: "circle"
            };
            iconData = {
                icon1: empty,
                icon2: empty,
                icon3: empty
            };
        }
        data.iconData = iconData;

        const attributes = TokenDocument.implementation.getTrackedAttributes((isPrototype ? this.object.data.data : this.object.actor.data.data ) ?? {});
        const resourceChoices = TokenDocument.implementation.getTrackedAttributeChoices(attributes);
        data.resourceChoices = resourceChoices;

        data.displayIcons = objectData.flags?.[moduleName]?.displayIcons ?? 0;
        data.displayModes = Object.entries(CONST.TOKEN_DISPLAY_MODES).reduce((obj, e) => {
            obj[e[1]] = game.i18n.localize(`TOKEN.DISPLAY_${e[0]}`);
            return obj;
        }, {});

        data.expertMode = game.settings.get(moduleName, "expertMode");
        
        return data;
    }

    async _updateObject(event, formData) {
        const isPrototype = this.object instanceof Actor;
        if (isPrototype) return this.object.update({ token: formData });

        await this.object.update(formData);
        await this.object.object.drawResourceIcons();
        return this.object.object.refresh();
    }
}
