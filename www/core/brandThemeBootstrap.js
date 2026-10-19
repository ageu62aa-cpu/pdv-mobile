(function () {
    const themeStorageKey = 'vancely-brand-theme';
    const shadeNames = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    const opacitySteps = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95];
    const palettes = {
        green: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
        yellow: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#facc15', '#eab308', '#ca8a04', '#a16207', '#713f12'],
        pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
        orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
        purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
        gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827']
    };

    let selected;
    try {
        selected = localStorage.getItem(themeStorageKey);
    } catch (error) {
        console.warn('PDV-VS: Não foi possível ler o tema persistido neste dispositivo:', error);
        return;
    }

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
        : `color-mix(in srgb, ${shades[1]} 72%, white)`);
    root.style.setProperty('--theme-canvas', selected === 'green' ? '#111827' : `color-mix(in srgb, ${shades[6]} 4%, #f8fafc)`);
    root.style.setProperty('--theme-surface', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${shades[6]} 6%, white)`);
    root.style.setProperty('--theme-control', selected === 'green' ? '#111827' : `color-mix(in srgb, ${shades[6]} 5%, white)`);
    root.style.setProperty('--theme-control-hover', selected === 'green' ? '#1f2937' : `color-mix(in srgb, ${shades[6]} 12%, white)`);
    root.style.setProperty('--theme-accent-soft', selected === 'green' ? 'rgba(2,44,34,.3)' : `color-mix(in srgb, ${shades[6]} 12%, white)`);
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
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-100:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-200:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-300:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-gray-400:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-100:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-200:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-300:not(input):not(select):not(textarea),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-gray-400:not(input):not(select):not(textarea){color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvHeader .text-white:not(button),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminHeader .text-white:not(button),:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-white:not(button):not(button *),:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-white:not(button):not(button *){color:#1f2937!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-emerald-300,:root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain .text-emerald-400,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-emerald-300,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout .text-emerald-400{color:var(--brand-700)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) body.bg-gray-900{background-color:var(--theme-canvas,#f8fafc)!important;color:#334155!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvHeader,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminHeader{background-color:var(--theme-surface,#fff)!important;border-color:var(--theme-border-soft,#e2e8f0)!important}');
    rules.push(':root[data-brand-theme]:not([data-brand-theme="green"]) #pdvMain,:root[data-brand-theme]:not([data-brand-theme="green"]) #adminLayout{background-color:var(--theme-canvas,#f8fafc)!important}');
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
