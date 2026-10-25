import { primieraValues } from './state.js';

export function calculatePrimiera(captures) {
    const best = { Denari: 0, Coppe: 0, Spade: 0, Bastoni: 0 };
    for (const card of captures) {
        const value = primieraValues[card.value] || 0;
        if (value > best[card.suit]) best[card.suit] = value;
    }

    if (Object.values(best).includes(0)) return 0;
    return Object.values(best).reduce((sum, value) => sum + value, 0);
}

export function calculateSbarazzoPoints(hand) {
    const valueCounts = new Map();
    for (const card of hand) {
        valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
    }
    if ([...valueCounts.values()].includes(3)) return 4;
    if ([...valueCounts.values()].includes(2)) return 3;
    return 2;
}

export function calculateRoundScore(
    playerCaptures,
    aiCaptures,
    playerScope,
    aiScope,
    gameVariant = 'classic',
    playerSbarazzoPoints = 0,
    aiSbarazzoPoints = 0
) {
    let playerPoints = 0;
    let aiPoints = 0;
    const playerDenari = playerCaptures.filter(card => card.suit === 'Denari').length;
    const aiDenari = aiCaptures.filter(card => card.suit === 'Denari').length;
    const playerSettebello = playerCaptures.find(card => card.suit === 'Denari' && card.value === 7);
    const playerDieciDenari = playerCaptures.some(card => card.suit === 'Denari' && card.value === 10);
    const aiDieciDenari = aiCaptures.some(card => card.suit === 'Denari' && card.value === 10);
    const playerDueDenari = playerCaptures.some(card => card.suit === 'Denari' && card.value === 2);
    const aiDueDenari = aiCaptures.some(card => card.suit === 'Denari' && card.value === 2);
    const playerPrimiera = calculatePrimiera(playerCaptures);
    const aiPrimiera = calculatePrimiera(aiCaptures);

    if (playerCaptures.length > 20) playerPoints++;
    else if (aiCaptures.length > 20) aiPoints++;

    if (playerDenari > 5) playerPoints++;
    else if (aiDenari > 5) aiPoints++;

    if (playerSettebello) playerPoints++;
    else aiPoints++;

    if (gameVariant === 'sbarazzo') {
        if (playerDieciDenari) playerPoints++;
        if (aiDieciDenari) aiPoints++;
        if (playerDueDenari) playerPoints -= 5;
        if (aiDueDenari) aiPoints -= 5;
    }

    if (playerPrimiera > aiPrimiera) playerPoints++;
    else if (aiPrimiera > playerPrimiera) aiPoints++;

    playerPoints += playerScope;
    aiPoints += aiScope;

    if (gameVariant === 'sbarazzo') {
        playerPoints += playerSbarazzoPoints;
        aiPoints += aiSbarazzoPoints;
    }

    return {
        playerPoints,
        aiPoints,
        playerDenari,
        playerSettebello,
        playerDieciDenari,
        aiDieciDenari,
        playerDueDenari,
        aiDueDenari,
        playerPrimiera,
        aiPrimiera,
        playerSbarazzoPoints,
        aiSbarazzoPoints
    };
}
