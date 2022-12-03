import { ResourceIconConfig } from './ResourceIconConfig.js';
import { containerPosition } from './helpers.js';

export const moduleID = 'resource-icons';

const logg = x => console.log(x);


Hooks.once('init', () => {
    libWrapper.register(moduleID, 'Token.prototype._draw', Token__draw, 'WRAPPER');
    libWrapper.register(moduleID, 'Token.prototype._onUpdateAppearance', Token_onUpdateAppearance, 'WRAPPER');

    Token.prototype.refreshResourceIcons = function () { // could just be done in updateActor hook...
        const iconData = this.document.getFlag(moduleID, 'iconData');
        for (const [iNum, data] of Object.entries(iconData)) {
            const resource = foundry.utils.getProperty(this.document.actor.system, data.resource);
            if (resource === null || resource === undefined) continue;

            let value;
            if (Number.isFinite(resource)) value = resource;
            else if ('value' in resource) value = resource.value || 0;

            this.resourceIcons[iNum].value.text = value;
        }
    }
});


Hooks.on('renderTokenConfig', (tokenConfig, [html], appData) => {
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-group');
    buttonDiv.innerHTML = `
        <label>Resource Icons</label>
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.innerText = 'Customize';
    button.addEventListener('click', () => new ResourceIconConfig(tokenConfig.object).render(true));
    buttonDiv.appendChild(button);

    html.querySelector('div.tab[data-tab="resources"]').append(buttonDiv);

    tokenConfig.setPosition({ height: 'auto' });
});

Hooks.on('updateActor', (actorDoc, diff, options, userID) => {
    const tokens = actorDoc.getActiveTokens();
    if (!tokens.length) return;

    for (const token of tokens) {
        if (token.document.flags[moduleID]) token.refreshResourceIcons();
    }
});


async function Token__draw(wrapped) {
    await wrapped();

    this.resourceIcons = this.addChild(new PIXI.Container());

    const iconData = this.document.getFlag(moduleID, 'iconData');
    if (!iconData) return;

    this.resourceIcons.removeChildren().forEach(c => c.destroy({ children: true }));

    for (const [iNum, data] of Object.entries(iconData)) {
        this.resourceIcons[iNum] = this.resourceIcons.addChild(new PIXI.Container());
        const iconNum = iNum.match(/\d+/)[0];
        const [x, y] = containerPosition(iconNum - 1, this.w, this.h);
        this.resourceIcons[iNum].position.set(x, y);

        if (!data) continue;

        // Icon
        const texture = await loadTexture(data.img || `modules/${moduleID}/icons/plain-circle.png`);
        const icon = new PIXI.Sprite(texture);
        icon.width = icon.height = 0.28 * Math.min(this.w, this.h);
        icon.anchor.set(0);
        icon.position.set(0);
        if (data.tint) icon.tint = foundry.utils.Color.from(data.tint) || 0x000000;

        // Background
        const bg = new PIXI.Graphics();
        if (data.background) bg.beginFill(foundry.utils.Color.from(data.background) || 0x000000, 0.4);
        if (data.border) bg.lineStyle(1.0, foundry.utils.Color.from(data.border) || 0x000000);
        if (data.shape === 'circle') bg.drawCircle(icon.width / 2, icon.height / 2, icon.width / 2 + 1);
        else bg.drawRoundedRect(icon.position.x - 1, icon.position.y - 1, icon.width + 2, icon.height + 2, 2);

        // Value
        const resource = foundry.utils.getProperty(this.actor.system, data.resource);
        if (resource === undefined || resource === null) continue;

        let value;
        if (Number.isFinite(resource)) value = resource;
        else if ('value' in resource) value = resource.value || 0;
        const style = this._getTextStyle();
        // Adjust font size linearly based on grid size
        if (canvas.dimensions.size < 101) style.fontSize = (10 / 50) * canvas.dimensions.size;
        else if (canvas.dimensions.size > 100) style.fontSize = 12 + (8 / 100) * canvas.dimensions.size;
        // If the token height and width in grid units > 1, scale font based on largest value
        //if (this.height > 1 || this.width > 1) {
        //  const bigger = Math.max(this.height, this.width);
        //style.fontSize = style.fontSize * bigger;
        //}

        // Text
        const text = new PreciseText(`${value}`, style);
        text.anchor.set(1);
        text.position.set(icon.width + 2, icon.height + 5);

        // Add PIXI elements to container
        this.resourceIcons[iNum].background = this.resourceIcons[iNum].addChild(bg);
        this.resourceIcons[iNum].img = this.resourceIcons[iNum].addChild(icon);
        this.resourceIcons[iNum].value = this.resourceIcons[iNum].addChild(text);
    }
}

async function Token_onUpdateAppearance(wrapped, data, changed, options) {
    const isResourceIcon = changed.some(c => c.includes(`flags.${moduleID}`));
    if (isResourceIcon) changed.add('texture.src');

    return wrapped(data, changed, options);
}
