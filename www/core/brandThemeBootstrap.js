(function () {
    const themeStorageKey = 'vancely-brand-theme';
    const shadeNames = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    const opacitySteps = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95];
    const palettes = {
        green: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
        yellow: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fde047', '#facc15', '#facc15', '#eab308', '#a16207', '#713f12'],
        pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
        orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
        purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
        coffee: ['#faf3e8', '#f2e2c9', '#e5c9a0', '#d4aa76', '#bd8954', '#a66b3f', '#8b5633', '#70432b', '#563322', '#3d251a']
    };

    let selected;
    try {
        selected = localStorage.getItem(themeStorageKey);
    } catch (error) {
        console.warn('PDV-VS: Não foi possível ler o tema persistido neste dispositivo:', error);
        return;
    }

    if (selected === 'gray') selected = 'coffee';
    if (!Object.prototype.hasOwnProperty.call(palettes, selected)) return;

    const root = document.documentElement;
    const shades = palettes[selected];
    root.dataset.brandTheme = selected;
    shadeNames.forEach((shade, index) => {
        root.style.setProperty(`--brand-${shade}`, shades[index]);
    });
    root.style.setProperty('--theme-primary', shades[6]);
    root.style.setProperty('--theme-bg-subtle', selected === 'green'
        ? 'rgba(2,44,34,.3)'
        : `color-mix(in srgb, ${shades[2]} 52%, white)`);
    root.style.setProperty('--theme-canvas', selected === 'green' ? '#111827' : `color-mix(in srgb, ${shades[2]} 55%, white)`);
    root.style.setProperty('--theme-surface', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${shades[1]} 48%, white)`);
    root.style.setProperty('--theme-control', selected === 'green' ? '#111827' : `color-mix(in srgb, ${shades[1]} 62%, white)`);
    root.style.setProperty('--theme-control-hover', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${shades[2]} 42%, white)`);
    root.style.setProperty('--theme-accent-soft', selected === 'green' ? 'rgba(2,44,34,.3)' : `color-mix(in srgb, ${shades[2]} 42%, white)`);
    root.style.setProperty('--theme-accent-ink', selected === 'green' ? '#a7f3d0' : shades[7]);
    root.style.setProperty('--theme-border-soft', selected === 'green' ? '#374151' : `color-mix(in srgb, ${shades[6]} 20%, #e2e8f0)`);
    root.style.setProperty('--theme-border', shades[6]);
    root.style.setProperty('--theme-icon-ink', selected === 'yellow' ? '#1e293b' : '#ffffff');

    const rules = [];
    const utilityTypes = [
        ['bg', 'background-color'],
        ['text', 'color'],
        ['border', 'border-color'],
        ['ring', '--tw-ring-color']
    ];
    for (const [utility, property] of utilityTypes) {
        shadeNames.forEach((shade, index) => {
            const color = `var(--brand-${shade})`;
            rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .${utility}-emerald-${shade}{${property}:${color}!important}`);
            if (utility === 'bg') {
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .hover\\:bg-emerald-${shade}:hover{background-color:${color}!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-${shade}/${opacity}"]{background-color:color-mix(in srgb,${color} ${opacity}%,transparent)!important}`);
                });
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .from-emerald-${shade}{--tw-gradient-from:${color}!important;--tw-gradient-to:rgb(16 185 129 / 0)!important}`);
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .to-emerald-${shade}{--tw-gradient-to:${color} var(--tw-gradient-to-position)!important}`);
            }
            if (utility === 'text') {
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .hover\\:text-emerald-${shade}:hover{color:${color}!important}`);
            }
            if (utility === 'border') {
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .hover\\:border-emerald-${shade}:hover{border-color:${color}!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="border-emerald-${shade}/${opacity}"]{border-color:color-mix(in srgb,${color} ${opacity}%,transparent)!important}`);
                });
            }
            if (utility === 'ring') {
                rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) .focus\\:ring-emerald-${shade}:focus{--tw-ring-color:${color}!important}`);
                opacitySteps.forEach(opacity => {
                    rules.push(`:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="ring-emerald-${shade}/${opacity}"]{--tw-ring-color:color-mix(in srgb,${color} ${opacity}%,transparent)!important}`);
                });
            }
        });
    }
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-950"],:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-950/50"],:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-950/60"],:root[data-brand-theme]:not([data-brand-theme="green"]) [class~="bg-emerald-950/80"]{background-color:var(--theme-accent-soft)!important;border-color:var(--theme-border-soft)!important;color:var(--theme-accent-ink)!important}');
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
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain #containerInputBusca>svg{color:#64748b!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .bg-gray-800,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .bg-gray-800{background-color:var(--theme-surface)!important;border-color:var(--theme-border-soft)!important;color:#334155}');
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
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #modalCamera [class~="bg-slate-950"]:not(#reader){background-color:var(--theme-control)!important;border-color:var(--theme-border-soft)!important}');
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
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) body.bg-gray-900{background-color:var(--theme-canvas,#f8fafc)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvHeader,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminHeader{background-color:var(--theme-surface,#fff)!important;border-color:var(--theme-border-soft,#e2e8f0)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout{background-color:var(--theme-canvas,#f8fafc)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) .theme-commission-description{color:#334155!important;font-weight:600}');
    [500, 600, 700].forEach(shade => {
        const selector = `:root[data-brand-theme="yellow"] button[class~="bg-emerald-${shade}"]`;
        rules.push(`${selector}{color:#1e293b!important}`);
        rules.push(`${selector} :is(i,svg,[class~="text-white"]){color:#1e293b!important}`);
    });

    const style = document.createElement('style');
    style.id = 'brand-theme-bootstrap-styles';
    style.textContent = rules.join('\n');
    document.head.append(style);

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', shades[7]);
})();
