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

export function calculateRoundScore(playerCaptures, aiCaptures, playerScope, aiScope) {
    let playerPoints = 0;
    let aiPoints = 0;
    const playerDenari = playerCaptures.filter(card => card.suit === 'Denari').length;
    const aiDenari = aiCaptures.filter(card => card.suit === 'Denari').length;
    const playerSettebello = playerCaptures.find(card => card.suit === 'Denari' && card.value === 7);
    const playerPrimiera = calculatePrimiera(playerCaptures);
    const aiPrimiera = calculatePrimiera(aiCaptures);

    if (playerCaptures.length > 20) playerPoints++;
    else if (aiCaptures.length > 20) aiPoints++;

    if (playerDenari > 5) playerPoints++;
    else if (aiDenari > 5) aiPoints++;

    if (playerSettebello) playerPoints++;
    else aiPoints++;

    if (playerPrimiera > aiPrimiera) playerPoints++;
    else if (aiPrimiera > playerPrimiera) aiPoints++;

    playerPoints += playerScope;
    aiPoints += aiScope;

    return {
        playerPoints,
        aiPoints,
        playerDenari,
        playerSettebello,
        playerPrimiera,
        aiPrimiera
    };
}
