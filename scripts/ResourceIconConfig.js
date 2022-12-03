import { moduleID } from "./main.js";

export class ResourceIconConfig extends FormApplication {
    constructor(object, options) {
        super(object, options);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: [moduleID, 'sheet'],
            template: `modules/${moduleID}/templates/resource-icon-config.hbs`,
            tabs: [
                { navSelector: '.tabs[data-group="main"]', contentSelector: 'form', initial: 'icon1' }
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
        const objectData = this.object;
        const data = {};

        let iconData = objectData.flags?.[moduleID]?.iconData ?? {};
        if (!Object.values(iconData).length) {
            const empty = {
                resource: '',
                img: '',
                tint: '',
                background: '',
                border: '',
                shape: 'circle'
            };
            iconData = {
                icon1: empty,
                icon2: empty,
                icon3: empty
            };
        }
        data.iconData = iconData;

        const attributes = TokenDocument.implementation.getTrackedAttributes(this.object.actor?.system ?? {});
        const resourceChoices = TokenDocument.implementation.getTrackedAttributeChoices(attributes);
        data.resourceChoices = resourceChoices;

        data.displayIcons = objectData.flags?.[moduleID]?.displayIcons ?? 0;
        data.displayModes = Object.entries(CONST.TOKEN_DISPLAY_MODES).reduce((obj, e) => {
            obj[e[1]] = game.i18n.localize(`TOKEN.DISPLAY_${e[0]}`);
            return obj;
        }, {});

        //data.expertMode = game.settings.get(moduleID, "expertMode");

        return data;
    }


    async _updateObject(event, formData) {
        // temporary workaround for core bug (issue 8368).
        for (const app of Object.values(ui.windows)) {
            if (app instanceof TokenConfig) app.close();
        }

        await this.object.update(formData);
    }
}
