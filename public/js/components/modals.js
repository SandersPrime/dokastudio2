// Modals.js вЂ” Р’СЃРµ РјРѕРґР°Р»СЊРЅС‹Рµ РѕРєРЅР° РєРѕРЅСЃС‚СЂСѓРєС‚РѕСЂР°
const Modals = {
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <!-- РњРѕРґР°Р»РєР° СЃРѕР·РґР°РЅРёСЏ РєРІРёР·Р° -->
            <div class="preview-modal" id="createQuizModal">
                <div class="preview-content">
                    <h2>рџ“‹ РЎРѕР·РґР°РЅРёРµ РЅРѕРІРѕРіРѕ РєРІРёР·Р°</h2>
                    <div class="form-group">
                        <label class="form-label">РќР°Р·РІР°РЅРёРµ</label>
                        <input type="text" class="input" id="newQuizTitle" placeholder="РќР°РїСЂРёРјРµСЂ: РљРёРЅРѕРІРёРєС‚РѕСЂРёРЅР°">
                    </div>
                    <div class="form-group">
                        <label class="form-label">РћРїРёСЃР°РЅРёРµ</label>
                        <textarea class="input" id="newQuizDesc" rows="3" placeholder="Рћ С‡С‘Рј СЌС‚РѕС‚ РєРІРёР·?"></textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="createQuiz()">РЎРѕР·РґР°С‚СЊ</button>
                        <button class="btn btn-outline" onclick="closeModal('createQuizModal')">РћС‚РјРµРЅР°</button>
                    </div>
                </div>
            </div>

            <!-- РњРѕРґР°Р»РєР° СЃРїРёСЃРєР° РєРІРёР·РѕРІ -->
            <div class="preview-modal" id="quizzesListModal">
                <div class="preview-content" style="max-width: 760px;">
                    <h2>рџ“‚ РњРѕРё РєРІРёР·С‹</h2>
                    <div id="myQuizzesList" style="max-height: 400px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('quizzesListModal')">Р—Р°РєСЂС‹С‚СЊ</button>
                </div>
            </div>

            <!-- РњРѕРґР°Р»РєР° СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ РјРµС‚Р°РґР°РЅРЅС‹С… РєРІРёР·Р° -->
            <div class="preview-modal" id="editQuizModal">
                <div class="preview-content" style="max-width: 680px;">
                    <h2>вњЏпёЏ РќР°СЃС‚СЂРѕР№РєРё РєРІРёР·Р°</h2>
                    <input type="hidden" id="editQuizId">
                    <div class="form-group">
                        <label class="form-label">РќР°Р·РІР°РЅРёРµ</label>
                        <input type="text" class="input" id="editQuizTitle" maxlength="160" placeholder="РќР°Р·РІР°РЅРёРµ РєРІРёР·Р°">
                    </div>
                    <div class="form-group">
                        <label class="form-label">РћРїРёСЃР°РЅРёРµ</label>
                        <textarea class="input" id="editQuizDescription" rows="4" maxlength="2000" placeholder="РљСЂР°С‚РєРѕ РѕРїРёС€РёС‚Рµ СЃС†РµРЅР°СЂРёР№ Рё Р°СѓРґРёС‚РѕСЂРёСЋ"></textarea>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">РљР°С‚РµРіРѕСЂРёСЏ</label>
                            <input type="text" class="input" id="editQuizCategory" maxlength="80" placeholder="РќР°РїСЂРёРјРµСЂ: С€РєРѕР»Р°">
                        </div>
                        <div class="form-group">
                            <label class="form-label">РћР±Р»РѕР¶РєР°</label>
                            <input type="url" class="input" id="editQuizThumbnailUrl" placeholder="https://... РёР»Рё /uploads/...">
                        </div>
                    </div>
                    <div id="editQuizError" class="status-toast error"></div>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-primary" onclick="saveQuizMeta()">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
                        <button class="btn btn-outline" onclick="closeModal('editQuizModal')">РћС‚РјРµРЅР°</button>
                    </div>
                </div>
            </div>

            <!-- РњРѕРґР°Р»РєР° РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР° -->
            <div class="preview-modal" id="previewModal">
                <div class="preview-content" style="max-width: 700px;">
                    <h2>рџ‘ЃпёЏ РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РєРІРёР·Р°</h2>
                    <div id="previewContent" style="max-height: 500px; overflow-y: auto;"></div>
                    <button class="btn btn-outline w-full mt-3" onclick="closeModal('previewModal')">Р—Р°РєСЂС‹С‚СЊ</button>
                </div>
            </div>

            <!-- РњРѕРґР°Р»РєР° РР-РіРµРЅРµСЂР°С‚РѕСЂР° -->
            <div class="preview-modal" id="aiGeneratorModal">
                <div class="preview-content">
                    <h2>рџ¤– РР-РіРµРЅРµСЂР°С‚РѕСЂ РєРІРёР·Р°</h2>
                    <div class="form-group">
                        <label class="form-label">РўРµРјР° РєРІРёР·Р°</label>
                        <input type="text" class="input" id="aiTopic" placeholder="РќР°РїСЂРёРјРµСЂ: РСЃС‚РѕСЂРёСЏ Р РѕСЃСЃРёРё">
                    </div>
                    <div class="form-group">
                        <label class="form-label">РљРѕР»РёС‡РµСЃС‚РІРѕ РІРѕРїСЂРѕСЃРѕРІ</label>
                        <input type="number" class="input" id="aiQuestionCount" value="10" min="1" max="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label">РЎР»РѕР¶РЅРѕСЃС‚СЊ</label>
                        <select class="input" id="aiDifficulty">
                            <option value="easy">Р›С‘РіРєР°СЏ</option>
                            <option value="medium" selected>РЎСЂРµРґРЅСЏСЏ</option>
                            <option value="hard">РЎР»РѕР¶РЅР°СЏ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">РЇР·С‹Рє</label>
                        <select class="input" id="aiLanguage">
                            <option value="ru">Р СѓСЃСЃРєРёР№</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary" onclick="generateQuizAI()">рџ¤– РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ</button>
                        <button class="btn btn-outline" onclick="closeModal('aiGeneratorModal')">РћС‚РјРµРЅР°</button>
                    </div>
                    <div id="aiProgress" style="display: none; margin-top: 16px;">
                        <div class="timer-bar">
                            <div class="timer-progress" style="width: 100%; animation: pulse 1.5s infinite;"></div>
                        </div>
                        <p class="text-center mt-2">Р“РµРЅРµСЂР°С†РёСЏ РІРѕРїСЂРѕСЃРѕРІ...</p>
                    </div>
                </div>
            </div>
        `;
    }
};

window.Modals = Modals;

