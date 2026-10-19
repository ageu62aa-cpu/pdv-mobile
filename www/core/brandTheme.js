const palettes = {
    green: {
        label: 'Verde',
        shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
        filter: 'none'
    },
    yellow: {
        label: 'Amarelo',
        shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
        filter: 'hue-rotate(-62deg) saturate(1.25)'
    },
    pink: {
        label: 'Rosa',
        shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
        filter: 'hue-rotate(205deg) saturate(1.25)'
    },
    orange: {
        label: 'Laranja',
        shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
        filter: 'hue-rotate(-92deg) saturate(1.25)'
    },
    purple: {
        label: 'Roxo',
        shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
        filter: 'hue-rotate(145deg) saturate(1.2)'
    },
    gray: {
        label: 'Cinza',
        shades: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
        filter: 'grayscale(1)'
    }
};

const shadeNames = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const mascotUrls = [
    new URL('../assets/caixa.registradora.jpeg', import.meta.url).href,
    new URL('../assets/botao-admin.jpeg', import.meta.url).href
];

function ensureThemeStyles() {
    if (document.getElementById('tenant-brand-theme-styles')) return;

    const rules = [
        '.brand-mascot-tint{filter:var(--brand-mascot-filter,none);transition:filter 180ms ease}'
    ];
    const utilityTypes = [
        ['bg', 'background-color'],
        ['text', 'color'],
        ['border', 'border-color'],
        ['ring', '--tw-ring-color']
    ];

    for (const [utility, property] of utilityTypes) {
        shadeNames.forEach((shade, index) => {
            const selector = `.${utility}-emerald-${shade}`;
            rules.push(`${selector}{${property}:var(--brand-${shade})!important}`);
            if (utility === 'bg') {
                rules.push(`.hover\\:bg-emerald-${shade}:hover{background-color:var(--brand-${shade})!important}`);
                rules.push(`.from-emerald-${shade}{--tw-gradient-from:var(--brand-${shade})!important;--tw-gradient-to:rgb(16 185 129 / 0)!important}`);
                rules.push(`.to-emerald-${shade}{--tw-gradient-to:var(--brand-${shade}) var(--tw-gradient-to-position)!important}`);
            }
            if (utility === 'text') {
                rules.push(`.hover\\:text-emerald-${shade}:hover{color:var(--brand-${shade})!important}`);
                rules.push(`.group:hover .group-hover\\:text-emerald-${shade}{color:var(--brand-${shade})!important}`);
            }
            if (utility === 'border') {
                rules.push(`.hover\\:border-emerald-${shade}:hover{border-color:var(--brand-${shade})!important}`);
            }
            if (utility === 'ring') {
                rules.push(`.focus\\:ring-emerald-${shade}:focus{--tw-ring-color:var(--brand-${shade})!important}`);
            }
        });
    }

    const style = document.createElement('style');
    style.id = 'tenant-brand-theme-styles';
    style.textContent = `:root{${shadeNames.map((shade, index) => `--brand-${shade}:${palettes.green.shades[index]}`).join(';')};--brand-mascot-filter:none}${rules.join('\n')}`;
    document.head.append(style);
}

function applyTheme(themeColor) {
    const selected = palettes[themeColor] ? themeColor : 'green';
    const palette = palettes[selected];
    const root = document.documentElement;
    shadeNames.forEach((shade, index) => {
        root.style.setProperty(`--brand-${shade}`, palette.shades[index]);
    });
    root.style.setProperty('--brand-mascot-filter', palette.filter);
    document.querySelectorAll('[data-brand-mascot]').forEach(image => {
        image.classList.add('brand-mascot-tint');
    });
    document.querySelectorAll('[data-brand-theme-trigger]').forEach(button => {
        button.title = `Personalizar cor da marca · ${palette.label}`;
        button.setAttribute('aria-label', button.title);
    });
    return selected;
}

function closeModal(modal) {
    document.removeEventListener('keydown', modal.escapeHandler);
    modal?.remove();
}

function createModal(client, empresaId, initialTheme) {
    const modal = document.createElement('div');
    modal.id = 'brand-theme-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm';
    modal.innerHTML = `
        <section role="dialog" aria-modal="true" aria-labelledby="brand-theme-title" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl">
            <header class="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <div>
                    <h2 id="brand-theme-title" class="text-base font-bold text-white">Personalizar Cor da Marca</h2>
                    <p class="mt-1 text-xs text-gray-400">Escolha uma cor e visualize a identidade da sua loja.</p>
                </div>
                <button type="button" data-close-brand-theme class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 text-xl text-gray-400 transition hover:border-gray-500 hover:text-white" aria-label="Fechar">&times;</button>
            </header>
            <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                ${Object.entries(palettes).map(([key, palette]) => `
                    <button type="button" data-theme-color="${key}" class="group rounded-xl border ${key === initialTheme ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-gray-700'} bg-gray-800/70 p-3 text-left transition hover:border-gray-500 hover:bg-gray-800" aria-pressed="${key === initialTheme}">
                        <span class="flex items-center justify-between gap-2">
                            <span class="flex items-center gap-2 text-sm font-semibold text-white">
                                <span class="h-3.5 w-3.5 rounded-full ring-2 ring-white/10" style="background:${palette.shades[5]}"></span>
                                ${palette.label}
                            </span>
                            <i data-theme-check class="fa-solid fa-check text-xs text-gray-500 ${key === initialTheme ? 'text-emerald-400' : ''}" aria-hidden="true"></i>
                        </span>
                        <span class="mt-3 flex h-20 items-center justify-center overflow-hidden rounded-lg border border-gray-700/80 bg-gray-950/70">
                            <img src="${mascotUrls[1]}" alt="Mascote com tema ${palette.label}" class="h-16 w-16 object-cover brand-mascot-tint" style="filter:${palette.filter}">
                        </span>
                    </button>
                `).join('')}
            </div>
            <p data-theme-status class="min-h-10 border-t border-gray-800 px-5 py-3 text-xs text-gray-400" role="status" aria-live="polite">A cor escolhida será aplicada a esta empresa e salva na nuvem.</p>
        </section>
    `;

    modal.addEventListener('click', async event => {
        if (event.target === modal || event.target.closest('[data-close-brand-theme]')) {
            closeModal(modal);
            return;
        }

        const option = event.target.closest('[data-theme-color]');
        if (!option || option.disabled) return;

        const selected = option.dataset.themeColor;
        const previous = document.documentElement.dataset.brandTheme || 'green';
        const status = modal.querySelector('[data-theme-status]');
        modal.querySelectorAll('[data-theme-color]').forEach(button => {
            button.disabled = true;
            button.setAttribute('aria-pressed', String(button === option));
            button.classList.toggle('border-emerald-500', button === option);
            button.classList.toggle('ring-1', button === option);
            button.classList.toggle('ring-emerald-500/40', button === option);
            button.classList.toggle('border-gray-700', button !== option);
            button.querySelector('[data-theme-check]')?.classList.toggle('text-emerald-400', button === option);
        });
        applyTheme(selected);
        status.textContent = 'Salvando a preferência da empresa...';
        status.className = 'min-h-10 border-t border-gray-800 px-5 py-3 text-xs text-gray-300';

        try {
            const { error } = await client.rpc('vancely_update_theme_color', {
                p_empresa_id: empresaId,
                p_theme_color: selected
            });
            if (error) throw error;
            document.documentElement.dataset.brandTheme = selected;
            status.textContent = `Tema ${palettes[selected].label} salvo para esta empresa.`;
            status.className = 'min-h-10 border-t border-gray-800 px-5 py-3 text-xs text-emerald-300';
        } catch (error) {
            console.error('PDV-VS: Não foi possível salvar a cor da marca:', error);
            applyTheme(previous);
            document.documentElement.dataset.brandTheme = previous;
            modal.querySelectorAll('[data-theme-color]').forEach(button => {
                const isPrevious = button.dataset.themeColor === previous;
                button.setAttribute('aria-pressed', String(isPrevious));
                button.classList.toggle('border-emerald-500', isPrevious);
                button.classList.toggle('ring-1', isPrevious);
                button.classList.toggle('ring-emerald-500/40', isPrevious);
                button.classList.toggle('border-gray-700', !isPrevious);
                button.querySelector('[data-theme-check]')?.classList.toggle('text-emerald-400', isPrevious);
            });
            status.textContent = `Não foi possível salvar a cor: ${error.message || error}`;
            status.className = 'min-h-10 border-t border-gray-800 px-5 py-3 text-xs text-rose-300';
        } finally {
            modal.querySelectorAll('[data-theme-color]').forEach(button => { button.disabled = false; });
        }
    });

    modal.escapeHandler = event => {
        if (event.key === 'Escape' && document.body.contains(modal)) closeModal(modal);
    };
    document.addEventListener('keydown', modal.escapeHandler);
    document.body.append(modal);
}

export function initializeBrandTheme(client, empresa, { allowOperators = true } = {}) {
    if (!client || !empresa?.id) {
        throw new Error('Não foi possível inicializar a personalização: empresa ou cliente Supabase ausente.');
    }
    ensureThemeStyles();
    const current = applyTheme(empresa.theme_color || 'green');
    document.documentElement.dataset.brandTheme = current;

    if (document.documentElement.dataset.brandThemeInitialized === 'true') return;
    document.documentElement.dataset.brandThemeInitialized = 'true';
    document.addEventListener('click', event => {
        const trigger = event.target instanceof Element ? event.target.closest('[data-brand-theme-trigger]') : null;
        if (!trigger) return;
        if (!allowOperators && window.cargoUsuarioAtual !== 'admin_mercado') return;
        if (document.getElementById('brand-theme-modal')) return;
        createModal(client, empresa.id, document.documentElement.dataset.brandTheme || 'green');
    });
}
