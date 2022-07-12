import { moduleName } from "./main.js";

export function containerPosition(iconIndex, tokenWidth, tokenHeight) {
    const iconSize = 0.28 * Math.min(tokenWidth, tokenHeight);
    const iconAnchor = game.settings.get(moduleName, "iconAnchor");
    const boundingBox = game.settings.get(moduleName, "boundingBox")

    let targetDim;
    if (iconAnchor === "top" || iconAnchor === "bottom") targetDim = tokenWidth;
    else targetDim = tokenHeight;
    const contraDim = targetDim === tokenWidth ? tokenHeight : tokenWidth;

    const initialPos = (targetDim - 3 * iconSize) / 2;
    //const dimArray = [Math.max(0, targetDim/2 - iconSize*2.25), targetDim/2 - iconSize/2, Math.min(targetDim - iconSize, targetDim/2 + iconSize*1.25)];
    const dimArray = [0, iconSize + initialPos, 2 * (iconSize + initialPos)];
    
    const x = dimArray[iconIndex];
    const y = iconAnchor === "top"
        ? boundingBox === "outside" ? -iconSize - 4 : 0
        : boundingBox === "outside" ? contraDim + 4 : contraDim - iconSize;

    return iconAnchor === "top" || iconAnchor === "bottom" ? [x, y] : [y, x];
}