export function getSetting(key) {
    let userSetting = game.settings.get("resource-icons", `user-${key}`);
    if (userSetting === "worldDefault") userSetting = game.settings.get("resource-icons", `world-${key}`);

    return userSetting;
}

export function containerPosition(currentIconIndex, tokenWidth, tokenHeight) {
    // Icon size based on pixel size of token
    let iconSize;
    if (game.settings.get("resource-icons", "scaleToToken")) iconSize = 0.28 * Math.min(tokenWidth, tokenHeight);
    else iconSize = 0.28 * canvas.grid.w;

    // Icon position based on iconPosition module setting
    const iconPosition = getSetting("iconPosition");
    const iconAlignment = getSetting("iconAlignment");

    let x, y;
    // If icons are above/below token, static vertical (y) offset but dynamic horizontal offset (x) based on current icon
    if (iconPosition === "above" || iconPosition === "below") {
        let xArray;
        const x0 = (tokenWidth - 3 * iconSize) / 2; // horizontal space between icons
        if (game.settings.get("resource-icons", "scaleToToken")) xArray = [0, iconSize + x0, 2 * (iconSize + x0)]; // left-end start points of icons
        else xArray = [Math.max(0, tokenWidth/2 - iconSize*2.25), tokenWidth/2 - iconSize/2, Math.min(tokenWidth - iconSize, tokenWidth/2 + iconSize*1.25)];
        x = xArray[currentIconIndex];

        y = iconPosition === "above"
            ? (iconAlignment === "outside" ? -iconSize - 4 : 0)
            : (iconAlignment === "outside" ? tokenHeight + 4 : tokenHeight - iconSize);
    }
    // If icons are left/right of token, static horizontal (x) offset but dynamic vertical offset (y) based on current icon
    else {
        x = iconPosition === "left"
            ? (iconAlignment === "outside" ? -iconSize - 4 : 0)
            : (iconAlignment === "outside" ? tokenWidth + 4 : tokenWidth - iconSize);

        const y0 = (tokenHeight - 3 * iconSize) / 2; // vertical space between icons
        let yArray;
        if (game.settings.get("resource-icons", "scaleToToken")) yArray = [0, iconSize + y0, 2 * (iconSize + y0)] // top-side start points of icons
        else yArray = [Math.max(0, tokenHeight/2 - iconSize*2.25), tokenHeight/2 - iconSize/2, Math.min(tokenHeight - iconSize, tokenHeight/2 + iconSize*1.25)];
        y = yArray[currentIconIndex];
    }

    return [x, y];
}
