export function animateElement(sourceElement, targetElement, duration = 400) {
    return new Promise(resolve => {
        const sourceRect = sourceElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        const clone = sourceElement.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.margin = '0';
        clone.style.left = `${sourceRect.left}px`;
        clone.style.top = `${sourceRect.top}px`;
        clone.style.zIndex = '1000';
        clone.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.8, 0.25, 1)`;
        clone.style.boxShadow = '5px 15px 20px rgba(0,0,0,0.5)';

        document.body.appendChild(clone);
        sourceElement.style.visibility = 'hidden';
        clone.getBoundingClientRect();

        let isFinished = false;
        let fallbackTimer;
        const finish = () => {
            if (isFinished) return;
            isFinished = true;
            clearTimeout(fallbackTimer);
            clone.remove();
            sourceElement.style.visibility = '';
            resolve();
        };

        fallbackTimer = setTimeout(finish, duration + 100);
        requestAnimationFrame(() => {
            if (isFinished) return;
            clone.style.left = `${targetRect.left}px`;
            clone.style.top = `${targetRect.top}px`;
            clone.style.transform = 'scale(1)';

            setTimeout(finish, duration);
        });
    });
}
