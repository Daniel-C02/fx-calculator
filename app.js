/**
 * Forex Lot Size Calculator — Modular Engine Configuration
 */

// 1. EXTENSIBLE CONFIGURATION: Easily register new pairs here.
const CURRENCY_PAIRS = [
    { label: "EUR/USD", base: "EUR", quote: "USD", isJpy: false },
    { label: "AUD/USD", base: "AUD", quote: "USD", isJpy: false },
    { label: "GBP/USD", base: "GBP", quote: "USD", isJpy: false },
    { label: "EUR/GBP", base: "EUR", quote: "GBP", isJpy: false },
    { label: "EUR/JPY", base: "EUR", quote: "JPY", isJpy: true  },
    { label: "EUR/CAD", base: "EUR", quote: "CAD", isJpy: false },
    { label: "GBP/JPY", base: "GBP", quote: "JPY", isJpy: true  },
    { label: "GBP/AUD", base: "GBP", quote: "AUD", isJpy: false },
    { label: "GBP/NZD", base: "GBP", quote: "NZD", isJpy: false }
];

// Offline fallback rates relative to USD base if network API fails entirely
const FALLBACK_USD_BASE_RATES = {
    USD: 1.0000,
    EUR: 0.9215,
    GBP: 0.7845,
    AUD: 1.5120,
    CAD: 1.3680,
    JPY: 156.40,
    NZD: 1.6230
};

// Internal Application State Model
const STATE = {
    inputs: {
        balance: 10000,
        risk: 1.0,
        pairIndex: 0,
        stoploss: 20
    },
    rates: { ...FALLBACK_USD_BASE_RATES },
    customRates: JSON.parse(localStorage.getItem('fx_custom_rates')) || {},
    status: 'loading' // 'live' | 'cached' | 'fallback'
};

// DOM Node Selectors
const DOM = {
    balance: document.getElementById('balance'),
    risk: document.getElementById('risk'),
    pair: document.getElementById('pair'),
    stoploss: document.getElementById('stoploss'),
    outLots: document.getElementById('outLots'),
    outLotsCard: document.getElementById('out-lots'),
    outRiskAmount: document.getElementById('out-risk-amount'),
    outPipValue: document.getElementById('out-pip-value'),
    outLiveRate: document.getElementById('out-live-rate'),
    apiStatus: document.getElementById('api-status'),
    statusText: document.getElementById('status-text')
};

/**
 * 2. API CALL & LOCAL STORAGE HANDLERS
 */
async function fetchExchangeRates() {
    try {
        // Frankfurter provides currency rates using USD as base asset natively without keys
        const response = await fetch('https://api.frankfurter.app/latest?base=USD');
        if (!response.ok) throw new Error('Network response failure.');
        
        const data = await response.json();
        
        STATE.rates = {
            USD: 1.0,
            ...data.rates
        };
        STATE.status = 'live';
        localStorage.setItem('fx_cached_rates', JSON.stringify(STATE.rates));
        localStorage.setItem('fx_rates_timestamp', Date.now().toString());
        updateStatusBadge('Live FX Sync Successful', 'status-live');
    } catch (error) {
        console.warn('API sync failed. Attempting storage fallback...', error);
        const savedRates = localStorage.getItem('fx_cached_rates');
        if (savedRates) {
            STATE.rates = JSON.parse(savedRates);
            STATE.status = 'cached';
            updateStatusBadge('Using Cached Rates', 'status-cached');
        } else {
            STATE.rates = { ...FALLBACK_USD_BASE_RATES };
            STATE.status = 'fallback';
            updateStatusBadge('Using Default Fallback Rates', 'status-cached');
        }
    }
}

function updateStatusBadge(text, className) {
    DOM.apiStatus.className = `status-badge ${className}`;
    DOM.statusText.textContent = text;
}

function saveInputsToLocalStorage() {
    localStorage.setItem('fx_calc_settings', JSON.stringify(STATE.inputs));
}

function loadInitialState() {
    // Populate dropdown items systematically from Config Template Array
    DOM.pair.innerHTML = '';
    CURRENCY_PAIRS.forEach((pair, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = pair.label;
        DOM.pair.appendChild(option);
    });

    const savedSettings = localStorage.getItem('fx_calc_settings');
    if (savedSettings) {
        try {
            STATE.inputs = JSON.parse(savedSettings);
        } catch (e) {
            console.error("Corrupted local configurations.", e);
        }
    }

    // Bind working state models back directly to input controls
    DOM.balance.value = STATE.inputs.balance;
    DOM.risk.value = STATE.inputs.risk;
    DOM.pair.value = STATE.inputs.pairIndex;
    DOM.stoploss.value = STATE.inputs.stoploss;
}

/**
 * 3. CORE CALCULATION MATHEMATICAL LOGIC
 */
function calculatePositionSize() {
    const balance = parseFloat(DOM.balance.value) || 0;
    const riskPercent = parseFloat(DOM.risk.value) || 0;
    const stopLossPips = parseFloat(DOM.stoploss.value) || 0;
    const pairIndex = parseInt(DOM.pair.value, 10);

    STATE.inputs = { balance, risk: riskPercent, pairIndex, stoploss: stopLossPips };
    saveInputsToLocalStorage();

    if (balance <= 0 || riskPercent <= 0 || stopLossPips <= 0) {
        renderResults(0, 0, 0);
        return;
    }

    const activePair = CURRENCY_PAIRS[pairIndex];
    const riskAmountUSD = balance * (riskPercent / 100);
    const quoteCurrency = activePair.quote;

    // Step 2: Determine standard cross rate
    let apiCrossRate = 1.0000;
    if (activePair.base === "USD") apiCrossRate = STATE.rates[activePair.quote];
    else if (activePair.quote === "USD") apiCrossRate = 1 / STATE.rates[activePair.base];
    else apiCrossRate = STATE.rates[activePair.quote] / STATE.rates[activePair.base];

    // Apply manual user override if it exists in cache
    let finalDisplayRate = apiCrossRate;
    if (STATE.customRates[pairIndex]) {
        finalDisplayRate = STATE.customRates[pairIndex];
    }

    // Only auto-fill the input if the user isn't currently typing in it
    if (document.activeElement !== DOM.outLiveRate) {
        DOM.outLiveRate.value = finalDisplayRate.toFixed(4);
    }

    // Mathematically derive the USD/Quote rate based on the custom user rate
    let activeUsdToQuoteRate = STATE.rates[quoteCurrency];
    if (activePair.base === "USD") {
        activeUsdToQuoteRate = finalDisplayRate;
    } else if (activePair.quote !== "USD") {
        activeUsdToQuoteRate = STATE.rates[activePair.base] * finalDisplayRate;
    }

    // Step 3: Extract True Pip Value
    const pipMultiplier = activePair.isJpy ? 1000 : 10;
    let pipValuePerLotUSD = pipMultiplier;

    if (quoteCurrency !== 'USD' && activeUsdToQuoteRate) {
        pipValuePerLotUSD = pipMultiplier / activeUsdToQuoteRate;
    }

    // Step 4: Execute final lot sizing algorithm formula
    let recommendedLots = 0;
    if (stopLossPips > 0 && pipValuePerLotUSD > 0) {
        recommendedLots = riskAmountUSD / (stopLossPips * pipValuePerLotUSD);
    }

    renderResults(recommendedLots, riskAmountUSD, pipValuePerLotUSD);
}

function renderResults(lots, riskAmount, pipValue) {
    DOM.outLotsCard.textContent = lots.toFixed(2);
    DOM.outRiskAmount.textContent = `$${riskAmount.toFixed(2)}`;
    DOM.outPipValue.textContent = `$${pipValue.toFixed(2)}`;
}

/**
 * 4. ROUTER EVENT INITIALIZATION
 */
function initEvents() {
    const inputs = [DOM.balance, DOM.risk, DOM.pair, DOM.stoploss];
    inputs.forEach(input => {
        input.addEventListener('input', calculatePositionSize);
    });

    // SCROLL WHEEL FEATURE: Change currency pair on hover + scroll
    DOM.pair.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        let newIndex = DOM.pair.selectedIndex + delta;

        if (newIndex >= 0 && newIndex < DOM.pair.options.length) {
            DOM.pair.selectedIndex = newIndex;
            calculatePositionSize();
        }
    });

    // MANUAL RATE OVERRIDE FEATURE: Update calculations & cache on typing
    DOM.outLiveRate.addEventListener('input', () => {
        const pairIndex = DOM.pair.value;
        const manualValue = parseFloat(DOM.outLiveRate.value);

        if (!isNaN(manualValue) && manualValue > 0) {
            STATE.customRates[pairIndex] = manualValue; // Save custom rate
        } else {
            delete STATE.customRates[pairIndex]; // Reset back to API rate if cleared
        }

        localStorage.setItem('fx_custom_rates', JSON.stringify(STATE.customRates));
        calculatePositionSize();
    });
}

// Global App Bootstrapping Hook
document.addEventListener('DOMContentLoaded', async () => {
    loadInitialState();
    initEvents();
    await fetchExchangeRates();
    calculatePositionSize();
});
