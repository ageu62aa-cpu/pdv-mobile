const palettes = {
    green: {
        label: 'Verde',
        shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
        filter: 'none'
    },
    yellow: {
        label: 'Amarelo',
        shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fde047', '#facc15', '#facc15', '#eab308', '#a16207', '#713f12'],
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
    coffee: {
        label: 'Marrom-Café',
        shades: ['#faf3e8', '#f2e2c9', '#e5c9a0', '#d4aa76', '#bd8954', '#a66b3f', '#8b5633', '#70432b', '#563322', '#3d251a'],
        filter: 'sepia(.55) saturate(1.2)'
    }
};

const shadeNames = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const opacitySteps = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95];
const themeArtwork = new URL('../assets/icones-card.jpeg', import.meta.url).href;
const coffeeThemeArtwork = new URL('../assets/icone-carde.jpeg', import.meta.url).href;

function ensureThemeStyles() {
    if (document.getElementById('tenant-brand-theme-styles')) return;

    const rules = [
        '.brand-mascot-tint{filter:var(--brand-mascot-filter,none);transition:filter 180ms ease}',
        '.brand-theme-option{border-color:var(--preview-border);background-color:var(--preview-surface);box-shadow:0 8px 24px -18px var(--preview-glow);transition:background-color 180ms ease,border-color 180ms ease,box-shadow 180ms ease,transform 180ms ease}',
        '.brand-theme-option:hover{border-color:var(--preview-primary);box-shadow:0 10px 26px -14px var(--preview-glow);transform:translateY(-1px)}',
        '.brand-theme-option[aria-pressed="true"]{border-color:var(--preview-primary);box-shadow:0 0 0 1px var(--preview-primary),0 10px 28px -14px var(--preview-glow)}',
        '.brand-theme-option [data-theme-check]{color:var(--preview-primary)}',
        '.brand-theme-preview{border-color:var(--preview-border);background:var(--preview-background);box-shadow:inset 0 0 28px -18px var(--preview-glow)}',
        '.brand-theme-art{width:4.5rem;height:4.5rem;border-radius:.8rem;background-image:var(--theme-artwork);background-color:var(--preview-background);background-size:490% 267%;background-position:var(--art-position);background-repeat:no-repeat;box-shadow:0 4px 14px color-mix(in srgb,var(--preview-primary) 20%,transparent);transition:transform 180ms ease,box-shadow 180ms ease}',
        '.brand-theme-option[data-theme-color="coffee"] .brand-theme-art{background-image:var(--coffee-theme-artwork);background-size:230% auto;background-position:center 44%}',
        '.brand-theme-option:hover .brand-theme-art,.brand-theme-option[aria-pressed="true"] .brand-theme-art{transform:translateY(-1px);box-shadow:0 6px 18px color-mix(in srgb,var(--preview-primary) 30%,transparent)}',
        '.brand-theme-option:disabled{cursor:wait;opacity:.72}'
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
            const colorVariable = utility === 'bg' && shade === 600
                ? '--theme-primary'
                : utility === 'border' && shade === 600
                    ? '--theme-border'
                    : `--brand-${shade}`;
            rules.push(`${selector}{${property}:var(${colorVariable})!important}`);
            if (utility === 'bg') {
                rules.push(`.hover\\:bg-emerald-${shade}:hover{background-color:var(--brand-${shade})!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-${shade}/${opacity}"]{background-color:color-mix(in srgb,var(--brand-${shade}) ${opacity}%,transparent)!important}`);
                });
                rules.push(`.from-emerald-${shade}{--tw-gradient-from:var(--brand-${shade})!important;--tw-gradient-to:rgb(16 185 129 / 0)!important}`);
                rules.push(`.to-emerald-${shade}{--tw-gradient-to:var(--brand-${shade}) var(--tw-gradient-to-position)!important}`);
            }
            if (utility === 'text') {
                rules.push(`.hover\\:text-emerald-${shade}:hover{color:var(--brand-${shade})!important}`);
                rules.push(`.group:hover .group-hover\\:text-emerald-${shade}{color:var(--brand-${shade})!important}`);
            }
            if (utility === 'border') {
                rules.push(`.hover\\:border-emerald-${shade}:hover{border-color:var(--brand-${shade})!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="border-emerald-${shade}/${opacity}"]{border-color:color-mix(in srgb,var(--brand-${shade}) ${opacity}%,transparent)!important}`);
                });
            }
            if (utility === 'ring') {
                rules.push(`.focus\\:ring-emerald-${shade}:focus{--tw-ring-color:var(--brand-${shade})!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="ring-emerald-${shade}/${opacity}"]{--tw-ring-color:color-mix(in srgb,var(--brand-${shade}) ${opacity}%,transparent)!important}`);
                });
            }
        });
    }

    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) [class~="shadow-emerald-950/20"]{--tw-shadow-color:color-mix(in srgb,var(--theme-primary) 20%,transparent)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) body.bg-gray-900{background-color:var(--theme-canvas)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvHeader,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminHeader{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout{background-color:var(--theme-canvas)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) .theme-commission-description{color:#334155!important;font-weight:600}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .bg-gray-800,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .bg-gray-800{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important;color:#334155}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .bg-gray-900:not(input):not(select):not(textarea):not(button),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .bg-gray-900:not(input):not(select):not(textarea):not(button){background-color:var(--theme-canvas)!important;color:#334155}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-900"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-800"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-700"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-850"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-900/60"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-800/90"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-900"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-800"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-700"]{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-900"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-800"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-700"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain button[class~="bg-gray-900/60"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-900"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-800"]:hover,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout button[class~="bg-gray-700"]:hover{background-color:var(--theme-control-hover)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain #inputBusca{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#1f2937!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain #inputBusca::placeholder{color:#64748b!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain input:not([type="checkbox"]):not([type="radio"]),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain select,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain textarea,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout input:not([type="checkbox"]):not([type="radio"]),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout select,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout textarea{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#1f2937!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain input::placeholder,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain textarea::placeholder,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout input::placeholder,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout textarea::placeholder{color:#64748b!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain #containerInputBusca>svg{color:#64748b!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvLegalFooter{background:var(--theme-surface)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain [class~="bg-emerald-950"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain [class~="bg-emerald-950/50"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain [class~="bg-emerald-950/60"],:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain [class~="bg-emerald-950/80"]{background-color:var(--theme-accent-soft)!important;border-color:var(--theme-border-soft)!important;color:var(--theme-accent-ink)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-100:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-200:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-300:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-400:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-100:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-200:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-300:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-400:not(input):not(select):not(textarea){color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvHeader .text-white:not(button),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminHeader .text-white:not(button),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-white:not(button):not(button *),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-white:not(button):not(button *){color:#1f2937!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-emerald-300,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-emerald-400,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-emerald-300,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-emerald-400{color:var(--brand-700)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-900/70"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-900/80"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-800/80"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-800/90"]{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-700"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-750"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="bg-gray-850"]{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#334155}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-white"]:not(button):not(button *),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-gray-100"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-gray-200"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-gray-300"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-gray-400"],:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout [class~="text-gray-500"]{color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .plan-card{background-image:linear-gradient(to bottom,var(--theme-accent-soft),var(--theme-surface))!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .admin-terminal-card{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .admin-terminal-card-summary{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .sale-detail-summary{background-color:var(--theme-control)!important;border:1px solid var(--theme-border-soft)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera>section,:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto>section,:root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico>div{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-900"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-900/95"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="bg-slate-900"]{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-800"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-800/80"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-900/80"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="bg-slate-800"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="bg-slate-700"]{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-white"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-slate-100"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-slate-200"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-slate-300"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-slate-400"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="text-slate-500"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="text-white"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="text-slate-100"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="text-slate-200"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="text-slate-300"],:root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto [class~="text-slate-400"]{color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCameraAdminProduto #readerAdminProduto{background-color:#0f172a!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico>div [class~="bg-white"]{background-color:var(--theme-surface)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico input:not([type="checkbox"]):not([type="radio"]),:root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico select,:root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico textarea{background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important;color:#1f2937!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico input::placeholder,:root[data-brand-theme]:not([data-brand-theme="green"]) #admin-modal-dinamico textarea::placeholder{color:#64748b!important}');
    rules.push('#adminLayout .plan-tier-icon{border:1px solid currentColor;box-shadow:0 2px 8px color-mix(in srgb,currentColor 18%,transparent)}');
    rules.push('#adminLayout .plan-tier-icon[data-plan-tier="gratis"]{color:#64748b;background-color:#f1f5f9!important;border-color:#cbd5e1}');
    rules.push('#adminLayout .plan-tier-icon[data-plan-tier="bronze"]{color:#b87333;background-color:#f8eee5!important;border-color:#d4a276}');
    rules.push('#adminLayout .plan-tier-icon[data-plan-tier="prata"]{color:#64748b;background-color:#f1f5f9!important;border-color:#cbd5e1}');
    rules.push('#adminLayout .plan-tier-icon[data-plan-tier="ouro"]{color:#b8860b;background-color:#fff7d6!important;border-color:#eabf3a}');
    rules.push('#adminLayout .plan-tier-icon[data-plan-tier="diamante"]{color:#0891b2;background-color:#e0f7fc!important;border-color:#67d2e8}');
    [500, 600, 700].forEach(shade => {
        const selector = `:root[data-brand-theme="yellow"] button[class~="bg-emerald-${shade}"]`;
        rules.push(`${selector}{color:#1e293b!important}`);
        rules.push(`${selector} :is(i,svg,[class~="text-white"]){color:#1e293b!important}`);
    });

    const style = document.createElement('style');
    style.id = 'tenant-brand-theme-styles';
    style.textContent = `:root{${shadeNames.map((shade, index) => `--brand-${shade}:${palettes.green.shades[index]}`).join(';')};--theme-primary:${palettes.green.shades[6]};--theme-bg-subtle:rgba(2,44,34,.3);--theme-canvas:#111827;--theme-surface:#1f2937;--theme-control:#111827;--theme-control-hover:#1f2937;--theme-accent-soft:rgba(2,44,34,.3);--theme-accent-ink:#a7f3d0;--theme-border-soft:#374151;--theme-border:${palettes.green.shades[6]};--brand-mascot-filter:none;--theme-artwork:url("${themeArtwork}")}${rules.join('\n')}`;
    document.head.append(style);
}

function applyTheme(themeColor) {
    const selectedTheme = themeColor === 'gray' ? 'coffee' : themeColor;
    const selected = palettes[selectedTheme] ? selectedTheme : 'green';
    const palette = palettes[selected];
    const root = document.documentElement;
    shadeNames.forEach((shade, index) => {
        root.style.setProperty(`--brand-${shade}`, palette.shades[index]);
    });
    root.style.setProperty('--theme-primary', palette.shades[6]);
    root.style.setProperty('--theme-bg-subtle', selected === 'green'
        ? 'rgba(2,44,34,.3)'
        : `color-mix(in srgb, ${palette.shades[2]} 52%, white)`);
    root.style.setProperty('--theme-canvas', selected === 'green' ? '#111827' : `color-mix(in srgb, ${palette.shades[2]} 55%, white)`);
    root.style.setProperty('--theme-surface', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${palette.shades[1]} 48%, white)`);
    root.style.setProperty('--theme-control', selected === 'green' ? '#111827' : `color-mix(in srgb, ${palette.shades[1]} 62%, white)`);
    root.style.setProperty('--theme-control-hover', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${palette.shades[2]} 42%, white)`);
    root.style.setProperty('--theme-accent-soft', selected === 'green' ? 'rgba(2,44,34,.3)' : `color-mix(in srgb, ${palette.shades[2]} 42%, white)`);
    root.style.setProperty('--theme-accent-ink', selected === 'green' ? '#a7f3d0' : palette.shades[7]);
    root.style.setProperty('--theme-border-soft', selected === 'green' ? '#374151' : `color-mix(in srgb, ${palette.shades[6]} 20%, #e2e8f0)`);
    root.style.setProperty('--theme-border', palette.shades[6]);
    root.style.setProperty('--theme-icon-ink', selected === 'yellow' ? '#1e293b' : '#ffffff');
    root.style.setProperty('--brand-mascot-filter', palette.filter);
    root.dataset.brandTheme = selected;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.shades[7]);
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

function persistThemeSelection(theme) {
    try {
        localStorage.setItem('vancely-brand-theme', theme);
    } catch (error) {
        console.warn('PDV-VS: Não foi possível persistir o tema neste dispositivo:', error);
    }
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
                ${Object.entries(palettes).map(([key, palette]) => {
                    const imagePosition = {
                        green: '85% 85%',
                        yellow: '14% 14%',
                        pink: '50% 14%',
                        orange: '85% 14%',
                        purple: '14% 85%',
                        coffee: '50% 85%'
                    }[key];
                    const previewSurface = key === 'green'
                        ? 'color-mix(in srgb, #059669 12%, #1f2937)'
                        : `color-mix(in srgb, ${palette.shades[1]} 78%, white)`;
                    const previewBackground = key === 'green'
                        ? 'color-mix(in srgb, #059669 28%, #111827)'
                        : `color-mix(in srgb, ${palette.shades[2]} 80%, white)`;
                    const labelClass = key === 'green' ? 'text-white' : 'text-slate-900';
                    return `
                    <button type="button" data-theme-color="${key}" class="brand-theme-option group rounded-xl border p-3 text-left" style="--preview-primary:${palette.shades[6]};--preview-border:color-mix(in srgb, ${palette.shades[6]} 58%, ${key === 'green' ? '#374151' : '#ffffff'});--preview-surface:${previewSurface};--preview-background:${previewBackground};--preview-glow:${palette.shades[5]};--art-position:${imagePosition};--coffee-theme-artwork:url('${coffeeThemeArtwork}') " aria-pressed="${key === initialTheme}">
                        <span class="flex items-center justify-between gap-2">
                            <span class="flex items-center gap-2 text-sm font-semibold ${labelClass}">
                                <span class="h-3.5 w-3.5 rounded-full ring-2 ring-white/10" style="background:${palette.shades[6]}"></span>
                                ${palette.label}
                            </span>
                            <i data-theme-check class="fa-solid fa-check text-xs ${key === initialTheme ? '' : 'opacity-0'}" aria-hidden="true"></i>
                        </span>
                        <span class="brand-theme-preview mt-3 flex h-20 items-center justify-center overflow-hidden rounded-lg border" aria-hidden="true">
                            <span class="brand-theme-art"></span>
                        </span>
                    </button>
                `}).join('')}
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
            button.querySelector('[data-theme-check]')?.classList.toggle('opacity-0', button !== option);
        });
        applyTheme(selected);
        persistThemeSelection(selected);
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
            persistThemeSelection(previous);
            document.documentElement.dataset.brandTheme = previous;
            modal.querySelectorAll('[data-theme-color]').forEach(button => {
                const isPrevious = button.dataset.themeColor === previous;
                button.setAttribute('aria-pressed', String(isPrevious));
                button.querySelector('[data-theme-check]')?.classList.toggle('opacity-0', !isPrevious);
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
    persistThemeSelection(current);
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
