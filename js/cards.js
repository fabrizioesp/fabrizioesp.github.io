const italianValues = {
    1: 'Asso',
    2: 'Due',
    3: 'Tre',
    4: 'Quattro',
    5: 'Cinque',
    6: 'Sei',
    7: 'Sette',
    8: 'Otto',
    9: 'Nove',
    10: 'Dieci'
};

function getCardImage(value, suit) {
    const fileSuit = suit === 'Bastoni' && value === 10 ? 'Bastoni' : suit.toLowerCase();
    const fileName = `${value}_${italianValues[value]}_di_${fileSuit}.jpg`;
    return new URL(`../assets/img/${fileName}`, import.meta.url).href;
}

export function createCardElement(card, isBack = false) {
    const element = document.createElement('div');

    if (isBack) {
        element.className = 'card card-back';
        return element;
    }

    element.className = 'card';
    element.id = `card-${card.id}`;

    const fallback = document.createElement('div');
    fallback.style.position = 'absolute';
    fallback.style.zIndex = '1';
    fallback.style.textAlign = 'center';
    fallback.innerText = `${card.value}\n${card.suit[0]}`;

    const image = document.createElement('img');
    image.src = getCardImage(card.value, card.suit);
    image.style.zIndex = '2';
    image.style.backgroundColor = 'white';
    image.onerror = function () {
        this.style.display = 'none';
    };

    element.appendChild(fallback);
    element.appendChild(image);
    return element;
}

export function findMatch(card, table) {
    const single = table.find(tableCard => tableCard.value === card.value);
    if (single) return [single];

    const failedStates = new Set();

    function findSubset(index, sum, selected) {
        if (sum === card.value) return selected.length > 1 ? selected : null;
        if (sum > card.value || index === table.length) return null;

        const count = Math.min(selected.length, 2);
        const state = `${index}:${sum}:${count}`;
        if (failedStates.has(state)) return null;

        const tableCard = table[index];
        const withCard = findSubset(index + 1, sum + tableCard.value, [...selected, tableCard]);
        if (withCard) return withCard;

        const withoutCard = findSubset(index + 1, sum, selected);
        if (withoutCard) return withoutCard;

        failedStates.add(state);
        return null;
    }

    const match = findSubset(0, 0, []);
    if (match) {
        return match;
    }

    return null;
}

export function hasMultipleSumMatches(targetValue, table) {
    const ways = Array(targetValue + 1).fill(0);
    ways[0] = 1;

    for (const card of table) {
        for (let sum = targetValue; sum >= card.value; sum--) {
            ways[sum] = Math.min(2, ways[sum] + ways[sum - card.value]);
        }
    }

    return ways[targetValue] > 1;
}
