# Size-n-Side Extension for Stable Diffusion WebUI / Forge Neo
# Aspect Ratio & Multi-Megapixel Resolution Manager
# Priority: Absolute Top (-999999)

import gradio as gr
from modules import scripts

# Multi-Megapixel Fixed Presets (all dimensions are multiples of 64)
PRESETS = {
    "1 MP": [
        ("1:1 (1024×1024)", 1024, 1024),
        ("3:2 (1216×832)", 1216, 832),
        ("3:4 (896×1152)", 896, 1152),
        ("16:9 (1344×768)", 1344, 768),
        ("21:9 (1536×640)", 1536, 640),
        ("16:10 (1280×832)", 1280, 832),
        ("20:9 (1536×704)", 1536, 704),
    ],
    "2 MP": [
        ("1:1 (1472×1472)", 1472, 1472),
        ("3:2 (1728×1152)", 1728, 1152),
        ("3:4 (1280×1664)", 1280, 1664),
        ("16:9 (1920×1088)", 1920, 1088),
        ("21:9 (2240×960)", 2240, 960),
        ("16:10 (1856×1152)", 1856, 1152),
        ("20:9 (2176×960)", 2176, 960),
    ],
    "3 MP": [
        ("1:1 (1792×1792)", 1792, 1792),
        ("3:2 (2176×1472)", 2176, 1472),
        ("3:4 (1536×2048)", 1536, 2048),
        ("16:9 (2368×1344)", 2368, 1344),
        ("21:9 (2688×1152)", 2688, 1152),
        ("16:10 (2240×1408)", 2240, 1408),
        ("20:9 (2688×1216)", 2688, 1216),
    ],
    "4 MP": [
        ("1:1 (2048×2048)", 2048, 2048),
        ("3:2 (2496×1664)", 2496, 1664),
        ("3:4 (1792×2368)", 1792, 2368),
        ("16:9 (2752×1536)", 2752, 1536),
        ("21:9 (3136×1344)", 3136, 1344),
        ("16:10 (2560×1600)", 2560, 1600),
        ("20:9 (3008×1344)", 3008, 1344),
    ],
    "5 MP": [
        ("1:1 (2304×2304)", 2304, 2304),
        ("3:2 (2816×1856)", 2816, 1856),
        ("3:4 (1984×2624)", 1984, 2624),
        ("16:9 (3072×1728)", 3072, 1728),
        ("21:9 (3456×1472)", 3456, 1472),
        ("16:10 (2880×1792)", 2880, 1792),
        ("20:9 (3392×1536)", 3392, 1536),
    ],
}

RATIOS = [
    ("1:1", 1.0),
    ("3:2", 1.5),
    ("3:4", 0.75),
    ("16:9", 1.777777),
    ("21:9", 2.333333),
    ("16:10", 1.6),
    ("20:9", 2.222222),
]

CSS_STYLES = """
<style>
.sns-btn {
    height: 26px !important;
    min-height: 26px !important;
    padding: 1px 5px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    border-radius: 5px !important;
    margin: 1px 0 !important;
    line-height: 1 !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sns-btn:hover {
    border-color: #ff9900 !important;
    color: #ff9900 !important;
    box-shadow: 0 0 6px rgba(255, 153, 0, 0.3) !important;
}

.sns-btn-compact {
    height: 24px !important;
    min-height: 24px !important;
    padding: 1px 3px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    border-radius: 4px !important;
    margin: 1px 0 !important;
    line-height: 1 !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sns-btn-compact:hover {
    border-color: #ff9900 !important;
    color: #ff9900 !important;
}

.sns-col-header {
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted, #94a3b8);
    margin-bottom: 3px;
    letter-spacing: 0.3px;
}

.sns-ratio-col {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    min-width: 44px !important;
    max-width: 52px !important;
    flex: 0 0 46px !important;
}

.sns-ratio-btn {
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    aspect-ratio: 1 / 1 !important;
    flex: 0 0 32px !important;
    flex-shrink: 0 !important;
    box-sizing: border-box !important;
    padding: 0 !important;
    margin: 2px auto !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 8px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: -0.3px !important;
    white-space: nowrap !important;
    line-height: 1 !important;
    background: rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(18px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(18px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: var(--body-text-color, #f1f5f9) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.25) !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sns-ratio-btn:hover {
    background: rgba(255, 255, 255, 0.18) !important;
    border-color: rgba(255, 153, 0, 0.6) !important;
    color: #ff9900 !important;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35), 0 0 8px rgba(255, 153, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4) !important;
    transform: translateY(-1px) scale(1.05) !important;
}

.sns-ratio-btn:active {
    transform: scale(0.95) !important;
    background: rgba(255, 153, 0, 0.2) !important;
}

.sns-ratio-btn.sns-ratio-active {
    border-color: #ff9900 !important;
    color: #ff9900 !important;
    background: rgba(255, 153, 0, 0.22) !important;
    box-shadow: 0 0 10px rgba(255, 153, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
}

.sns-action-row {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    margin-top: 6px !important;
}

.sns-swap-btn {
    flex: 1 1 auto !important;
    max-width: 150px !important;
    height: 34px !important;
    min-height: 34px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    color: #ff9900 !important;
    background: rgba(255, 153, 0, 0.12) !important;
    border: 1.5px solid #ff9900 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    margin: 0 !important;
    box-shadow: 0 0 8px rgba(255, 153, 0, 0.22) !important;
    transition: all 0.2s ease !important;
}

.sns-swap-btn .sns-swap-icon {
    width: 16px !important;
    height: 16px !important;
    display: inline-block !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    stroke-width: 2.3 !important;
}

.sns-swap-btn .sns-swap-label {
    letter-spacing: 0.5px !important;
    display: inline-block !important;
    vertical-align: middle !important;
}

.sns-swap-btn:hover {
    background: rgba(255, 153, 0, 0.25) !important;
    box-shadow: 0 0 14px rgba(255, 153, 0, 0.5) !important;
    transform: scale(1.02) !important;
}

.sns-undo-btn {
    width: 34px !important;
    min-width: 34px !important;
    max-width: 34px !important;
    height: 34px !important;
    min-height: 34px !important;
    flex: 0 0 34px !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 15px !important;
    font-weight: 700 !important;
    border-radius: 8px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(14px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(14px) saturate(160%) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: var(--body-text-color, #f1f5f9) !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

.sns-undo-btn:hover:not(.sns-undo-empty) {
    border-color: #38bdf8 !important;
    color: #38bdf8 !important;
    background: rgba(56, 189, 248, 0.16) !important;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.35) !important;
}

.sns-undo-btn.sns-undo-empty {
    opacity: 0.38 !important;
    cursor: default !important;
}

.sns-match-btn {
    width: 100% !important;
    max-width: 190px !important;
    margin: 5px auto 0 auto !important;
    border-color: rgba(56, 189, 248, 0.45) !important;
    color: #38bdf8 !important;
    background: rgba(56, 189, 248, 0.1) !important;
}

.sns-match-btn:hover {
    border-color: #38bdf8 !important;
    color: #ffffff !important;
    background: rgba(56, 189, 248, 0.25) !important;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.4) !important;
}

.sns-mp-tabs {
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
}

.sns-mp-tabs > div.tab-nav {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 3px !important;
    margin-bottom: 4px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding-bottom: 2px !important;
}

.sns-mp-tabs > div.tab-nav > button {
    height: 24px !important;
    min-height: 24px !important;
    padding: 1px 7px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    border-radius: 4px !important;
    line-height: 1 !important;
    transition: all 0.15s ease !important;
}

.sns-mp-tabs > div.tab-nav > button.selected {
    border-color: #ff9900 !important;
    color: #ff9900 !important;
    background: rgba(255, 153, 0, 0.15) !important;
}

.sns-save-btn, .sns-del-btn {
    flex: 2 !important;
    height: 26px !important;
    min-height: 26px !important;
    font-size: 12px !important;
    padding: 2px 6px !important;
}

.sns-io-btn {
    flex: 1 !important;
    min-width: 74px !important;
    height: 26px !important;
    min-height: 26px !important;
    font-size: 11px !important;
    padding: 2px 6px !important;
}

.sns-slot-btn {
    flex: 1 !important;
    height: 26px !important;
    min-height: 26px !important;
    font-size: 11px !important;
    padding: 1px 3px !important;
}

/* Target Megapixels Control Box */
.sns-target-mp-box {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    margin: 4px auto 2px auto !important;
    padding: 2px 7px !important;
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(14px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(14px) saturate(160%) !important;
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
    transition: all 0.2s ease !important;
}

.sns-target-mp-box:hover {
    border-color: rgba(255, 153, 0, 0.4) !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 6px rgba(255, 153, 0, 0.25) !important;
}

.sns-target-mp-label {
    font-size: 11px !important;
    font-weight: 700 !important;
    color: var(--text-muted, #94a3b8) !important;
    letter-spacing: 0.3px !important;
    user-select: none !important;
}

.sns-target-mp-control {
    display: inline-flex !important;
    align-items: center !important;
    background: rgba(0, 0, 0, 0.28) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.sns-mp-btn {
    width: 20px !important;
    min-width: 20px !important;
    height: 22px !important;
    border: none !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: #ff9900 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    transition: all 0.15s ease !important;
}

.sns-mp-btn:hover {
    background: rgba(255, 153, 0, 0.3) !important;
    color: #ffffff !important;
}

.sns-mp-btn:active {
    transform: scale(0.92) !important;
}

.sns-target-mp-val {
    width: 44px !important;
    min-width: 44px !important;
    max-width: 52px !important;
    height: 22px !important;
    padding: 0 2px !important;
    background: transparent !important;
    border: none !important;
    color: #38bdf8 !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    text-align: center !important;
    outline: none !important;
    box-sizing: border-box !important;
}

.sns-target-mp-val:focus {
    color: #ff9900 !important;
    background: rgba(255, 153, 0, 0.1) !important;
}

.sns-target-mp-unit {
    font-size: 11px !important;
    font-weight: 700 !important;
    color: #38bdf8 !important;
    user-select: none !important;
}

.sns-author-wrap,
.sns-author-wrap > div,
.sns-author-wrap .prose {
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

.sns-author-wrap {
    margin-top: -2px !important;
}

.sns-author-tag {
    text-align: right !important;
    font-size: 10px !important;
    font-weight: 500 !important;
    letter-spacing: 0.3px !important;
    color: var(--body-text-color, #cbd5e1) !important;
    opacity: 0.18 !important;
    line-height: 1.1 !important;
    padding: 0 2px !important;
    user-select: none !important;
    pointer-events: none !important;
}
</style>
"""


def get_indicator_html(prefix):
    return f"""
{CSS_STYLES}
<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 84px; gap: 4px;">
    <div style="font-size: 15px; font-weight: 700; color: var(--body-text-color, #ddd); letter-spacing: 0.4px; text-align: center;">
        <span class="sns-orient-txt" data-prefix="{prefix}" style="color: #ff9900;">1:1 Square</span>
    </div>
    <div style="font-size: 12px; color: var(--text-muted, #94a3b8); font-weight: 600; letter-spacing: 0.3px;">
        <span class="sns-dims-txt" data-prefix="{prefix}" style="color: var(--body-text-color, #eee);">1024×1024</span> • <span class="sns-mp-txt" data-prefix="{prefix}" style="color: #38bdf8; transition: color 0.2s;" title="Normal VRAM load">1.00 MP</span>
    </div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; height: 34px;">
        <div class="sns-box-wv" data-prefix="{prefix}" title="Wide Portrait (9:16 / 20:9 / 21:9)"></div>
        <div class="sns-box-pv" data-prefix="{prefix}" title="Portrait (3:4 / 2:3)"></div>
        <div class="sns-box-sq" data-prefix="{prefix}" title="1:1 Square"></div>
        <div class="sns-box-ph" data-prefix="{prefix}" title="Landscape (3:2 / 4:3)"></div>
        <div class="sns-box-wh" data-prefix="{prefix}" title="Wide Landscape (16:9 / 16:10 / 20:9 / 21:9)"></div>
    </div>
    <div class="sns-target-mp-box" data-prefix="{prefix}">
        <span class="sns-target-mp-label" title="Target Megapixels">Target:</span>
        <div class="sns-target-mp-control">
            <button type="button" class="sns-mp-btn sns-mp-dec" id="{prefix}_sns_mp_dec" data-prefix="{prefix}" title="Decrease MP (−0.1). Hold to repeat">−</button>
            <input type="text" id="{prefix}_sns_target_mp_input" class="sns-target-mp-val" data-prefix="{prefix}" value="1.0" placeholder="1.0" autocomplete="off" title="Target Megapixels (step 0.1). ArrowUp/Down to step. Hold +/− to auto-repeat" />
            <button type="button" class="sns-mp-btn sns-mp-inc" id="{prefix}_sns_mp_inc" data-prefix="{prefix}" title="Increase MP (+0.1). Hold to repeat">+</button>
        </div>
        <span class="sns-target-mp-unit">MP</span>
    </div>
</div>
"""


class AspectRatioManagerScript(scripts.Script):
    sorting_priority = -999999

    def title(self):
        return "Size-n-Side"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        prefix = "img2img" if is_img2img else "txt2img"

        with gr.Accordion("📐 Size-n-Side", open=False, elem_id=f"{prefix}_sns_accordion"):
            with gr.Row():
                # Колонка 1: Фиксированные пресеты (1-5 MP в табах + All MP компактная сетка)
                with gr.Column(scale=5, min_width=210):
                    with gr.Tabs(elem_classes=["sns-mp-tabs"]):
                        for mp_label, presets in PRESETS.items():
                            with gr.Tab(mp_label):
                                for label, w, h in presets:
                                    btn = gr.Button(label, size="sm", elem_classes=["sns-btn"])
                                    btn.click(fn=None, _js=f"(e) => window.snsSetDims({w}, {h}, e, '{prefix}')")

                        with gr.Tab("All (1-5 MP)"):
                            with gr.Row():
                                for mp_label, presets in PRESETS.items():
                                    with gr.Column(min_width=60, scale=1):
                                        gr.HTML(f"<div class='sns-col-header' style='font-size:10px; margin-bottom:1px;'>{mp_label}</div>")
                                        for label, w, h in presets:
                                            short_label = label.split(" ")[0]
                                            btn_all = gr.Button(short_label, size="sm", elem_classes=["sns-btn-compact"])
                                            btn_all.click(fn=None, _js=f"(e) => window.snsSetDims({w}, {h}, e, '{prefix}')")

                # Колонка 2: Пропорции (Квадратные стеклянные кнопки с подсветкой активного формата)
                with gr.Column(scale=1, min_width=44, elem_classes=["sns-ratio-col"]):
                    gr.HTML("<div class='sns-col-header' style='margin-bottom:4px;'>Ratio</div>")
                    for label, r in RATIOS:
                        btn_r = gr.Button(label, size="sm", elem_classes=["sns-ratio-btn"])
                        btn_r.click(fn=None, _js=f"(e) => window.snsApplyRatio({r}, e, '{prefix}')")

                # Колонка 3: Индикатор Ориентации, Target MP, Swap, Undo (+ Match Image в img2img)
                with gr.Column(scale=4, min_width=210):
                    gr.HTML(value=get_indicator_html(prefix))
                    with gr.Row(elem_classes=["sns-action-row"]):
                        swap_btn = gr.Button("⇅ Swap ⇄", elem_classes=["sns-swap-btn"])
                        undo_btn = gr.Button("↩", elem_classes=["sns-undo-btn", f"sns-undo-btn-{prefix}", "sns-undo-empty"])
                        swap_btn.click(fn=None, _js=f"(e) => window.snsSwap(e, '{prefix}')")
                        undo_btn.click(fn=None, _js=f"(e) => window.snsUndo(e, '{prefix}')")
                    if is_img2img:
                        match_btn = gr.Button("🖼️ Match Image Ratio", size="sm", elem_classes=["sns-match-btn", "sns-btn"])
                        match_btn.click(fn=None, _js="(e) => window.snsMatchImageRatio(e)")

            # Нижняя панель управления пресетами (Save, Delete, Export, Import)
            with gr.Row():
                save_preset_btn = gr.Button("💾 Save Preset", variant="secondary", size="sm", elem_classes=["sns-save-btn", "sns-btn"])
                del_preset_btn = gr.Button("🗑️ Delete Preset", variant="secondary", size="sm", elem_classes=["sns-del-btn", "sns-btn"])
                export_btn = gr.Button("📤 Export", variant="secondary", size="sm", elem_classes=["sns-io-btn", "sns-export-btn", "sns-btn"])
                import_btn = gr.Button("📥 Import", variant="secondary", size="sm", elem_classes=["sns-io-btn", "sns-import-btn", "sns-btn"])
                save_preset_btn.click(fn=None, _js="() => window.snsToggleMode('save')")
                del_preset_btn.click(fn=None, _js="() => window.snsToggleMode('delete')")
                export_btn.click(fn=None, _js="(e) => window.snsExportPresets(e)")
                import_btn.click(fn=None, _js="(e) => window.snsImportPresets(e)")

            # Пользовательские слоты P1 - P5
            with gr.Row():
                for idx in range(1, 6):
                    btn_slot = gr.Button(f"Preset {idx}", size="sm", elem_classes=[f"sns-slot-btn-{idx}", "sns-btn", "sns-slot-btn"])
                    btn_slot.click(fn=None, _js=f"(e) => window.snsHandleSlot({idx}, e, '{prefix}')")

            # Пользовательские слоты P6 - P10
            with gr.Row():
                for idx in range(6, 11):
                    btn_slot = gr.Button(f"Preset {idx}", size="sm", elem_classes=[f"sns-slot-btn-{idx}", "sns-btn", "sns-slot-btn"])
                    btn_slot.click(fn=None, _js=f"(e) => window.snsHandleSlot({idx}, e, '{prefix}')")

            gr.HTML('<div class="sns-author-tag">by Cj</div>', elem_classes=["sns-author-wrap"])

        return []
