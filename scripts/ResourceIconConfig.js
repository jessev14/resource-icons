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
            ]
        });
    }

    get id() {
        return this.object.id;
    }

    get title() {
        return `Resource Icons: ${this.object.name}`;
    }

    getData() {
        const data = {};

        let iconData = this.object.flags[moduleName]?.iconData;
        if (!iconData) {
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
            }
        }
        data.iconData = iconData;

        const attributes = TokenDocument.getTrackedAttributes();
        const resourceChoices = TokenDocument.getTrackedAttributeChoices(attributes);
        data.resourceChoices = resourceChoices;

        return data;
    }

    async _updateObject(event, formData) {
        const isPrototype = this.object instanceof foundry.data.PrototypeToken;
        if (isPrototype) return this.object.actor.update({ prototypeToken: formData });

        await this.object.update(formData);
        await this.object.object.drawResourceIcons();
        return this.object.object.refresh();
    }
}
