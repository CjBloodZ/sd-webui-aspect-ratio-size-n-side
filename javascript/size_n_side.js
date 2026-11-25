// Size-n-Side Extension Driver for SD Forge Neo / WebUI
// Dual-Tab Synchronized Architecture (txt2img & img2img)
(function() {
    let snsMode = 'idle';
    window.snsLastRatio = { txt2img: null, img2img: null };
    window.snsHistory = { txt2img: [], img2img: [] };
    window.snsLastSeenDims = { txt2img: '', img2img: '' };

    const RATIO_MAP = {
        "1:1": 1.0,
        "3:2": 1.5,
        "3:4": 0.75,
        "16:9": 16 / 9,
        "21:9": 21 / 9,
        "16:10": 1.6,
        "20:9": 20 / 9
    };

    function getActivePrefix(evt) {
        if (evt && evt.target) {
            if (evt.target.closest('#tab_img2img, [data-prefix="img2img"], #img2img_sns_accordion')) return 'img2img';
            if (evt.target.closest('#tab_txt2img, [data-prefix="txt2img"], #txt2img_sns_accordion')) return 'txt2img';
        }
        const tabImg = document.getElementById('tab_img2img');
        if (tabImg && tabImg.style.display !== 'none' && !tabImg.classList.contains('hidden') && tabImg.offsetParent !== null) {
            return 'img2img';
        }
        const tabBtns = document.querySelectorAll('#tabs > div.tab-nav > button');
        for (let btn of tabBtns) {
            if (btn.classList.contains('selected') && btn.textContent.toLowerCase().includes('img2img')) {
                return 'img2img';
            }
        }
        return 'txt2img';
    }

    window.snsParseMp = function(val) {
        if (!val) return 0;
        const clean = String(val).replace(',', '.').replace(/[^0-9.]/g, '');
        return parseFloat(clean) || 0;
    };

    window.snsGetCurDims = function(prefix) {
        const root = (typeof gradioApp === 'function' ? gradioApp() : document);
        const getVal = (id) => {
            const box = root.getElementById(id) || document.getElementById(id);
            if (!box) return null;
            const num = box.querySelector('input:not([type="range"])') || box.querySelector('input[type="number"]') || box.querySelector('input');
            if (num && num.value) {
                const v = parseInt(num.value, 10);
                if (!isNaN(v) && v > 0) return v;
            }
            const rng = box.querySelector('input[type="range"]');
            if (rng && rng.value) {
                const v = parseInt(rng.value, 10);
                if (!isNaN(v) && v > 0) return v;
            }
            return null;
        };

        const w = getVal(prefix + '_width') || 1024;
        const h = getVal(prefix + '_height') || 1024;
        return [w, h];
    };

    window.snsGetCurRatio = function(prefix) {
        const [w, h] = window.snsGetCurDims(prefix);
        const actualRatio = w / h;

        if (window.snsLastRatio[prefix] && Math.abs(window.snsLastRatio[prefix] - actualRatio) / actualRatio < 0.08) {
            return window.snsLastRatio[prefix];
        }

        const KNOWN = [
            1.0,
            16 / 9,  9 / 16,
            3 / 2,   2 / 3,
            4 / 3,   3 / 4,
            21 / 9,  9 / 21,
            16 / 10, 10 / 16,
            20 / 9,  9 / 20
        ];

        for (let kr of KNOWN) {
            if (Math.abs(kr - actualRatio) / kr < 0.05) {
                window.snsLastRatio[prefix] = kr;
                return kr;
            }
        }

        window.snsLastRatio[prefix] = actualRatio;
        return actualRatio;
    };

    function pushHistory(prefix, w, h) {
        if (!w || !h) return;
        const stack = window.snsHistory[prefix];
        const last = stack[stack.length - 1];
        if (last && last[0] === w && last[1] === h) return;
        stack.push([w, h]);
        if (stack.length > 10) stack.shift();
        updateUndoButton(prefix);
    }

    function updateUndoButton(prefix) {
        const stack = window.snsHistory[prefix] || [];
        document.querySelectorAll(`.sns-undo-btn-${prefix}`).forEach(btn => {
            if (stack.length > 0) {
                const prev = stack[stack.length - 1];
                btn.classList.remove('sns-undo-empty');
                btn.title = `Undo → ${prev[0]}×${prev[1]} (${stack.length} saved)`;
            } else {
                btn.classList.add('sns-undo-empty');
                btn.title = 'Undo previous resolution (empty)';
            }
        });
    }

    window.snsFindBestDims = function(targetMp, ratio) {
        if (!targetMp || targetMp <= 0) targetMp = 1.0;
        if (!ratio || ratio <= 0) ratio = 1.0;

        const targetPixels = targetMp * 1024 * 1024;
        const rawH = Math.sqrt(targetPixels / ratio);
        const baseH = Math.max(64, Math.round(rawH / 64.0) * 64);

        let bestW = 1024, bestH = 1024;
        let minDiff = Infinity;

        for (let dh = -12; dh <= 12; dh++) {
            const h = baseH + dh * 64;
            if (h < 64) continue;
            const idealW = h * ratio;
            const w = Math.max(64, Math.round(idealW / 64.0) * 64);
            const actualPix = w * h;
            const actualRatio = w / h;

            const pixDiff = Math.abs(actualPix - targetPixels) / targetPixels;
            const ratioDiff = Math.abs(actualRatio - ratio) / ratio;
            const score = pixDiff * 1.0 + ratioDiff * 6.0;

            if (score < minDiff) {
                minDiff = score;
                bestW = w;
                bestH = h;
            }
        }
        return [bestW, bestH];
    };

    window.snsSetDims = function(w, h, evt, explicitPrefix, opts) {
        if (!w || !h) return;
        const prefix = explicitPrefix || getActivePrefix(evt);
        const [curW, curH] = window.snsGetCurDims(prefix);

        if (!(opts && opts.skipHistory) && curW && curH && (curW !== w || curH !== h)) {
            pushHistory(prefix, curW, curH);
        }

        if (!window.snsLastRatio[prefix] || Math.abs(window.snsLastRatio[prefix] - (w / h)) > 0.08) {
            window.snsLastRatio[prefix] = w / h;
        }

        // In img2img: if user is on "Resize by" tab, switch to "Resize to" tab automatically
        if (prefix === 'img2img') {
            const resizeToTabBtn = document.querySelector('#img2img_tabs_resize > div.tab-nav > button:first-child, #img2img_tab_resize_to');
            if (resizeToTabBtn && !resizeToTabBtn.classList.contains('selected')) {
                resizeToTabBtn.click();
            }
        }

        const root = (typeof gradioApp === 'function' ? gradioApp() : document);
        const setVal = (id, val) => {
            const box = root.getElementById(id) || document.getElementById(id);
            if (!box) return;
            const num = box.querySelector('input:not([type="range"])') || box.querySelector('input[type="number"]');
            const rng = box.querySelector('input[type="range"]');
            if (num) {
                num.value = val;
                num.dispatchEvent(new Event('input', { bubbles: true }));
                num.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (rng) {
                rng.value = val;
                rng.dispatchEvent(new Event('input', { bubbles: true }));
                rng.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        setVal(prefix + '_width', w);
        setVal(prefix + '_height', h);
        window.snsUpdateIndicators(prefix);
    };

    window.snsUndo = function(evt, explicitPrefix) {
        const prefix = explicitPrefix || getActivePrefix(evt);
        const stack = window.snsHistory[prefix];
        if (!stack || stack.length === 0) return;

        const [curW, curH] = window.snsGetCurDims(prefix);
        let target = stack.pop();
        while (target && target[0] === curW && target[1] === curH && stack.length > 0) {
            target = stack.pop();
        }
        updateUndoButton(prefix);
        if (target && (target[0] !== curW || target[1] !== curH)) {
            window.snsLastRatio[prefix] = target[0] / target[1];
            window.snsSetDims(target[0], target[1], evt, prefix, { skipHistory: true });
        }
    };

    window.snsApplyRatio = function(r, evt, explicitPrefix) {
        const prefix = explicitPrefix || getActivePrefix(evt);
        window.snsLastRatio[prefix] = r;

        const [curW, curH] = window.snsGetCurDims(prefix);
        const maxSide = Math.max(curW, curH);
        const snap64 = (v) => Math.max(64, Math.round(v / 64.0) * 64);
        const cleanMax = (maxSide % 64 === 0) ? maxSide : (maxSide % 8 === 0 ? maxSide : snap64(maxSide));

        let nw = cleanMax, nh = cleanMax;
        if (r > 1.0) {
            nw = cleanMax;
            nh = snap64(cleanMax / r);
        } else if (r < 1.0) {
            nh = cleanMax;
            nw = snap64(cleanMax * r);
        }
        window.snsSetDims(nw, nh, evt, prefix);
    };

    window.snsApplyTargetMp = function(targetMp, evt, explicitPrefix, opts) {
        if (!targetMp || targetMp <= 0) return;
        const prefix = explicitPrefix || getActivePrefix(evt);
        const r = window.snsGetCurRatio(prefix);
        const [nw, nh] = window.snsFindBestDims(targetMp, r);
        window.snsSetDims(nw, nh, evt, prefix, opts);
    };

    window.snsSwap = function(evt, explicitPrefix) {
        const prefix = explicitPrefix || getActivePrefix(evt);
        const [w, h] = window.snsGetCurDims(prefix);
        window.snsLastRatio[prefix] = h / w;
        window.snsSetDims(h, w, evt, prefix);
    };

    function getImg2ImgSourceDims() {
        const root = (typeof gradioApp === 'function' ? gradioApp() : document);
        const selectors = [
            '#mode_img2img > div[style*="display: block"] img',
            '#mode_img2img > div[style*="display: block"] canvas',
            '#img2img_image img', '#img2img_image canvas',
            '#img2img_sketch img', '#img2img_sketch canvas',
            '#img2maskimg img', '#img2maskimg canvas',
            '#inpaint_sketch img', '#inpaint_sketch canvas',
            '#img_inpaint_base img'
        ];
        for (const sel of selectors) {
            const els = root.querySelectorAll(sel);
            for (const el of els) {
                if (el.offsetParent === null) continue;
                const w = el.naturalWidth || el.width;
                const h = el.naturalHeight || el.height;
                if (w > 16 && h > 16) return [w, h];
            }
        }
        return null;
    }

    function flashButtonText(btn, tempText, durationMs) {
        if (!btn) return;
        if (!btn.dataset.origText) btn.dataset.origText = btn.textContent;
        btn.textContent = tempText;
        clearTimeout(btn._flashTimer);
        btn._flashTimer = setTimeout(() => {
            btn.textContent = btn.dataset.origText;
        }, durationMs || 1400);
    }

    window.snsMatchImageRatio = function(evt) {
        const btn = evt && evt.target ? evt.target.closest('button') : null;
        const dims = getImg2ImgSourceDims();
        if (!dims) {
            flashButtonText(btn, '⚠️ No image found', 1600);
            return;
        }
        const [imgW, imgH] = dims;
        const imgRatio = imgW / imgH;

        const mpInput = document.getElementById('img2img_sns_target_mp_input');
        let targetMp = mpInput ? window.snsParseMp(mpInput.value) : 0;
        if (!targetMp || targetMp <= 0) {
            const [curW, curH] = window.snsGetCurDims('img2img');
            targetMp = Math.max(0.5, (curW * curH) / (1024 * 1024));
        }

        window.snsLastRatio['img2img'] = imgRatio;
        const [nw, nh] = window.snsFindBestDims(targetMp, imgRatio);
        window.snsSetDims(nw, nh, evt, 'img2img');
        flashButtonText(btn, `✅ Matched (${nw}×${nh})`, 1600);
    };

    window.snsUpdateIndicators = function(targetPrefix) {
        const prefixes = targetPrefix ? [targetPrefix] : ['txt2img', 'img2img'];

        prefixes.forEach(prefix => {
            const [w, h] = window.snsGetCurDims(prefix);
            if (!w || !h) return;

            const ratio = w / h;
            const mpNum = (w * h) / (1024 * 1024);
            const mp = mpNum.toFixed(2);

            // VRAM load color coding for MP badge
            let mpColor = '#38bdf8';
            let mpTip = 'Normal VRAM load (≤ 2 MP)';
            if (mpNum > 6.05) {
                mpColor = '#ef4444';
                mpTip = 'Very high VRAM load (> 6 MP)';
            } else if (mpNum > 4.05) {
                mpColor = '#f97316';
                mpTip = 'High VRAM load (4–6 MP)';
            } else if (mpNum > 2.05) {
                mpColor = '#facc15';
                mpTip = 'Medium-high VRAM load (2–4 MP)';
            }

            const is_sq = (ratio >= 0.98 && ratio <= 1.02);
            const is_wv = (ratio < 0.63);
            const is_pv = (ratio >= 0.63 && ratio < 0.98);
            const is_ph = (ratio > 1.02 && ratio <= 1.55);
            const is_wh = (ratio > 1.55);

            let label = '1:1 Square';
            if (is_wv) label = 'Wide Portrait';
            else if (is_pv) label = 'Portrait (3:4 / 2:3)';
            else if (is_ph) label = 'Landscape (3:2 / 4:3)';
            else if (is_wh) label = 'Wide Landscape';

            document.querySelectorAll(`.sns-orient-txt[data-prefix="${prefix}"]`).forEach(el => el.textContent = label);
            document.querySelectorAll(`.sns-dims-txt[data-prefix="${prefix}"]`).forEach(el => el.textContent = `${w}×${h}`);
            document.querySelectorAll(`.sns-mp-txt[data-prefix="${prefix}"]`).forEach(el => {
                el.textContent = `${mp} MP`;
                el.style.color = mpColor;
                el.title = mpTip;
            });

            // Highlight active Ratio button in this tab's accordion
            const acc = document.getElementById(prefix + '_sns_accordion');
            if (acc) {
                acc.querySelectorAll('.sns-ratio-btn').forEach(btn => {
                    const txt = btn.textContent.trim();
                    const btnR = RATIO_MAP[txt];
                    const active = btnR ? (Math.abs(ratio - btnR) / btnR < 0.045) : false;
                    btn.classList.toggle('sns-ratio-active', active);
                });
            }

            // Synchronize Target MP input with current resolution if not actively focused
            const mpInput = document.getElementById(prefix + '_sns_target_mp_input');
            if (mpInput && document.activeElement !== mpInput) {
                const dimKey = `${w}x${h}`;
                if (window.snsLastSeenDims[prefix] !== dimKey) {
                    window.snsLastSeenDims[prefix] = dimKey;
                    if (!window.snsIgnoreMpSyncUntil || Date.now() > window.snsIgnoreMpSyncUntil) {
                        mpInput.value = mpNum.toFixed(1);
                    }
                }
            }

            const act = "border: 2px solid #ff9900; background: rgba(255, 153, 0, 0.28); box-shadow: 0 0 10px rgba(255, 153, 0, 0.55); transform: scale(1.08);";
            const inact = "border: 1.5px solid #555; background: rgba(255, 255, 255, 0.04); opacity: 0.35; transform: scale(1.0);";

            document.querySelectorAll(`.sns-box-wv[data-prefix="${prefix}"]`).forEach(b => b.style.cssText = (is_wv ? act : inact) + ' width: 14px; height: 34px; border-radius: 3px; transition: all 0.2s;');
            document.querySelectorAll(`.sns-box-pv[data-prefix="${prefix}"]`).forEach(b => b.style.cssText = (is_pv ? act : inact) + ' width: 22px; height: 30px; border-radius: 3px; transition: all 0.2s;');
            document.querySelectorAll(`.sns-box-sq[data-prefix="${prefix}"]`).forEach(b => b.style.cssText = (is_sq ? act : inact) + ' width: 28px; height: 28px; border-radius: 4px; transition: all 0.2s;');
            document.querySelectorAll(`.sns-box-ph[data-prefix="${prefix}"]`).forEach(b => b.style.cssText = (is_ph ? act : inact) + ' width: 30px; height: 22px; border-radius: 3px; transition: all 0.2s;');
            document.querySelectorAll(`.sns-box-wh[data-prefix="${prefix}"]`).forEach(b => b.style.cssText = (is_wh ? act : inact) + ' width: 38px; height: 16px; border-radius: 3px; transition: all 0.2s;');
        });
    };

    window.snsToggleMode = function(mode) {
        if (snsMode === mode) {
            snsMode = 'idle';
            document.querySelectorAll('.sns-save-btn').forEach(b => {
                b.textContent = '💾 Save Preset';
                b.style.background = '';
                b.style.borderColor = '';
            });
            document.querySelectorAll('.sns-del-btn').forEach(b => {
                b.textContent = '🗑️ Delete Preset';
                b.style.background = '';
                b.style.borderColor = '';
            });
        } else {
            snsMode = mode;
            if (mode === 'save') {
                document.querySelectorAll('.sns-save-btn').forEach(b => {
                    b.textContent = '⏳ Click Slot (1-10)';
                    b.style.background = 'rgba(255, 153, 0, 0.28)';
                    b.style.borderColor = '#ff9900';
                });
                document.querySelectorAll('.sns-del-btn').forEach(b => {
                    b.textContent = '🗑️ Delete Preset';
                    b.style.background = '';
                    b.style.borderColor = '';
                });
            } else if (mode === 'delete') {
                document.querySelectorAll('.sns-del-btn').forEach(b => {
                    b.textContent = '⏳ Click Slot to Clear';
                    b.style.background = 'rgba(239, 68, 68, 0.28)';
                    b.style.borderColor = '#ef4444';
                });
                document.querySelectorAll('.sns-save-btn').forEach(b => {
                    b.textContent = '💾 Save Preset';
                    b.style.background = '';
                    b.style.borderColor = '';
                });
            }
        }
    };

    window.snsExportPresets = function(evt) {
        const btn = evt && evt.target ? evt.target.closest('button') : null;
        let presets = {};
        try {
            presets = JSON.parse(localStorage.getItem('sns_global_presets') || '{}');
        } catch(e) {}

        const jsonStr = JSON.stringify(presets, null, 2);
        try {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'size_n_side_presets.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(e) {}

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jsonStr).catch(() => {});
        }
        flashButtonText(btn, '✅ Exported', 1500);
    };

    window.snsImportPresets = function(evt) {
        const btn = evt && evt.target ? evt.target.closest('button') : null;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result || '{}'));
                    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                        throw new Error('Invalid format');
                    }
                    const cleaned = {};
                    for (let i = 1; i <= 10; i++) {
                        const pair = parsed[String(i)] || parsed[i];
                        if (Array.isArray(pair) && pair.length >= 2) {
                            const w = parseInt(pair[0], 10);
                            const h = parseInt(pair[1], 10);
                            if (w >= 64 && h >= 64) {
                                cleaned[String(i)] = [w, h];
                            }
                        }
                    }
                    localStorage.setItem('sns_global_presets', JSON.stringify(cleaned));
                    refreshAllPresetButtons();
                    flashButtonText(btn, '✅ Imported', 1600);
                } catch(err) {
                    flashButtonText(btn, '❌ Bad JSON', 1800);
                }
            };
            reader.readAsText(file);
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        setTimeout(() => {
            if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
        }, 60000);
    };

    function refreshAllPresetButtons() {
        let presets = {};
        try {
            const stored = localStorage.getItem('sns_global_presets');
            if (stored) {
                presets = JSON.parse(stored);
            }
        } catch(e) {}

        for (let i = 1; i <= 10; i++) {
            const label = presets[i] ? `P${i}: ${presets[i][0]}×${presets[i][1]}` : `Preset ${i}`;
            document.querySelectorAll(`.sns-slot-btn-${i}`).forEach(btn => {
                if (btn.textContent !== label) {
                    btn.textContent = label;
                }
            });
        }
        initSwapButton();
        initRatioTooltips();
        initTargetMpControl();
        updateUndoButton('txt2img');
        updateUndoButton('img2img');
    }

    function initSwapButton() {
        const svgV = `<svg class="sns-swap-icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M6 16V4M6 4L3 7M6 4L9 7" /><path d="M14 4V16M14 16L11 13M14 16L17 13" /></svg>`;
        const svgH = `<svg class="sns-swap-icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M4 6H16M16 6L13 3M16 6L13 9" /><path d="M16 14H4M4 14L7 11M4 14L7 17" /></svg>`;

        document.querySelectorAll('.sns-swap-btn').forEach(btn => {
            if (btn.dataset.svgReady === 'true') return;
            btn.innerHTML = `${svgV}<span class="sns-swap-label" style="display:inline-block; vertical-align:middle; letter-spacing:0.5px;">Swap</span>${svgH}`;
            btn.dataset.svgReady = 'true';
        });
    }

    function initRatioTooltips() {
        document.querySelectorAll('.sns-ratio-btn').forEach(btn => {
            if (!btn.title) {
                const txt = btn.textContent.trim();
                btn.title = `Apply ${txt} ratio anchored to larger side`;
            }
        });
    }

    function bindLongPressRepeat(btn, delta, onTick) {
        let holdTimeout = null;
        let repeatInterval = null;
        let startTime = 0;
        let isFast = false;

        const stop = () => {
            if (holdTimeout) {
                clearTimeout(holdTimeout);
                holdTimeout = null;
            }
            if (repeatInterval) {
                clearInterval(repeatInterval);
                repeatInterval = null;
            }
        };

        const startRepeat = () => {
            // Initial repeat speed: 120ms (~8.3 steps per sec)
            repeatInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                // After 5 seconds of holding, double the speed (60ms, ~16.6 steps per sec)
                if (elapsed >= 5000 && !isFast) {
                    isFast = true;
                    clearInterval(repeatInterval);
                    repeatInterval = setInterval(() => {
                        onTick(delta, true);
                    }, 60);
                }
                onTick(delta, true);
            }, 120);
        };

        const start = (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            stop();
            startTime = Date.now();
            isFast = false;
            onTick(delta, false); // Immediate 1st tick (records history once)

            holdTimeout = setTimeout(() => {
                startRepeat();
            }, 1000);
        };

        btn.addEventListener('mousedown', start);
        btn.addEventListener('touchstart', start, { passive: false });

        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
        btn.addEventListener('touchend', stop);
        btn.addEventListener('touchcancel', stop);
        window.addEventListener('blur', stop);
    }

    function initTargetMpControl() {
        ['txt2img', 'img2img'].forEach(prefix => {
            const input = document.getElementById(prefix + '_sns_target_mp_input');
            const btnInc = document.getElementById(prefix + '_sns_mp_inc');
            const btnDec = document.getElementById(prefix + '_sns_mp_dec');
            if (!input || input.dataset.bound === 'true') return;
            input.dataset.bound = 'true';

            let debounceTimer = null;

            const applyVal = (val, evt, opts) => {
                const num = window.snsParseMp(val);
                if (num > 0) {
                    window.snsApplyTargetMp(num, evt, prefix, opts);
                }
            };

            const STEP = 0.1;
            const stepChange = (delta, isRepeat) => {
                let cur = window.snsParseMp(input.value) || 1.0;
                cur = (delta > 0)
                    ? Math.round((cur + STEP) * 10) / 10
                    : Math.max(0.1, Math.round((cur - STEP) * 10) / 10);

                input.value = cur.toFixed(1);
                window.snsIgnoreMpSyncUntil = Date.now() + 1500;
                applyVal(cur, null, { skipHistory: !!isRepeat });
            };

            input.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    applyVal(input.value, e);
                }, 350);
            });

            input.addEventListener('change', (e) => {
                clearTimeout(debounceTimer);
                applyVal(input.value, e);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    stepChange(1, e.repeat);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    stepChange(-1, e.repeat);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(debounceTimer);
                    applyVal(input.value, e);
                    input.blur();
                }
            });

            if (btnInc) {
                btnInc.title = "+0.1 MP (Hold 1s to repeat, accelerates after 5s)";
                bindLongPressRepeat(btnInc, 1, stepChange);
            }

            if (btnDec) {
                btnDec.title = "-0.1 MP (Hold 1s to repeat, accelerates after 5s)";
                bindLongPressRepeat(btnDec, -1, stepChange);
            }
        });
    }

    window.snsHandleSlot = function(idx, evt, explicitPrefix) {
        const prefix = explicitPrefix || getActivePrefix(evt);
        let presets = {};
        try {
            presets = JSON.parse(localStorage.getItem('sns_global_presets') || '{}');
        } catch(e) {}

        if (snsMode === 'save') {
            const [w, h] = window.snsGetCurDims(prefix);
            presets[idx] = [w, h];
            localStorage.setItem('sns_global_presets', JSON.stringify(presets));
            refreshAllPresetButtons();
            window.snsToggleMode('save');
        } else if (snsMode === 'delete') {
            delete presets[idx];
            localStorage.setItem('sns_global_presets', JSON.stringify(presets));
            refreshAllPresetButtons();
            window.snsToggleMode('delete');
        } else {
            if (presets[idx]) {
                const [w, h] = presets[idx];
                window.snsSetDims(w, h, evt, prefix);
            }
        }
    };

    setInterval(() => window.snsUpdateIndicators(), 150);
    setInterval(refreshAllPresetButtons, 500);
    setTimeout(() => {
        initSwapButton();
        initRatioTooltips();
        initTargetMpControl();
        refreshAllPresetButtons();
    }, 100);
})();
