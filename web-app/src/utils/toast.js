// Lightweight toast utility with no external deps
// Usage: showToast('Message', 'success' | 'error' | 'info')

const ensureContainer = () => {
    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        container.style.position = 'fixed';
        container.style.top = '16px';
        container.style.right = '16px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        document.body.appendChild(container);
    }
    return container;
};

export function showToast(message, type = 'info', durationMs = 2500) {
    const container = ensureContainer();

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '6px';
    toast.style.minWidth = '220px';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    toast.style.fontSize = '14px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'opacity 150ms ease, transform 150ms ease';

    const bgByType = {
        success: '#16a34a',
        error: '#dc2626',
        info: '#2563eb',
        warning: '#d97706'
    };

    // Use brand-styled solid background for all toasts
    const brandColor = '#C39C5E';
    toast.style.background = brandColor;
    toast.style.border = 'none';
    toast.style.color = '#ffffff';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    toast.style.backdropFilter = 'none';

    container.appendChild(toast);

    // Enter
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto remove
    const remove = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 180);
    };

    const timeout = setTimeout(remove, durationMs);

    // Allow manual dismiss on click
    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        remove();
    });
}


