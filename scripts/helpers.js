export function getSetting(key) {
    let userSetting = game.settings.get("resource-icons", `user-${key}`);
    if (userSetting === "worldDefault") userSetting = game.settings.get("resource-icons", `world-${key}`);

    return userSetting;
}

export function containerPosition(currentIconIndex, tokenWidth, tokenHeight) {
    // Icon size based on pixel size of token
    const iconSize = 0.28 * Math.min(tokenWidth, tokenHeight);
    // Icon position based on iconPosition module setting
    const iconPosition = getSetting("iconPosition");

    let x, y;
    // If icons are above/below token, static vertical (y) offset but dynamic horizontal offset (x) based on current icon
    if (iconPosition === "above" || iconPosition === "below") {
        const x0 = (tokenWidth - 3 * iconSize) / 2; // horizontal space between icons
        const xArray = [0, iconSize + x0, 2 * (iconSize + x0)]; // left-end start points of icons
        x = xArray[currentIconIndex];

        y = iconPosition === "above" ? -iconSize - 4 : tokenHeight + 4;
    }
    // If icons are left/right of token, static horizontal (x) offset but dynamic vertical offset (y) based on current icon
    else {
        x = iconPosition === "left" ? -iconSize - 4 : tokenWidth + 4;

        const y0 = (tokenHeight - 3 * iconSize) / 2; // vertical space between icons
        const yArray = [0, iconSize + y0, 2 * (iconSize + y0)] // top-side start points of icons
        y = yArray[currentIconIndex];
    }

    return [x, y];
}
