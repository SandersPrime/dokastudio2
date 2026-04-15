// Components/Nav.js — Переиспользуемая навигация
class Navigation {
    static render(containerId = 'app-navigation', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container #${containerId} not found`);
            return;
        }
        
        const {
            showHome = true,
            showConstructor = true,
            showHost = true,
            showFlashcards = true,
            showHomework = true,
            showMarketplace = true,
            showAnalytics = true,
            currentPage = ''
        } = options;
        
        const isActive = (page) => currentPage === page ? 'active' : '';
        
        container.innerHTML = `
            <nav class="app-nav">
                <div class="nav-brand">
                    <a href="/" class="nav-logo">
                        <span class="logo-icon">🎮</span>
                        <span>DokaStudio</span>
                    </a>
                </div>
                
                <div class="nav-links" id="navLinks">
                    ${showHome ? `<a href="/" class="nav-link ${isActive('home')}">🏠 Главная</a>` : ''}
                    ${showConstructor ? `<a href="/constructor.html" class="nav-link ${isActive('constructor')}">📝 Конструктор</a>` : ''}
                    ${showHost ? `<a href="/host.html" class="nav-link ${isActive('host')}">🎯 Ведущий</a>` : ''}
                    ${showFlashcards ? `<a href="/flashcards.html" class="nav-link ${isActive('flashcards')}">📇 Карточки</a>` : ''}
                    ${showHomework ? `<a href="/homework.html" class="nav-link ${isActive('homework')}">📚 Задания</a>` : ''}
                </div>
                
                <div class="nav-user" id="navUser">
                    <span class="user-name" id="navUserName"></span>
                    <div class="user-avatar" id="navUserAvatar">U</div>
                    <div class="nav-dropdown" id="navDropdown">
                        <a href="/profile.html">👤 Профиль</a>
                        <a href="/my-quizzes.html">📋 Мои квизы</a>
                        <a href="/settings.html">⚙️ Настройки</a>
                        <hr>
                        <a href="#" onclick="handleLogout()">🚪 Выйти</a>
                    </div>
                </div>
                
                <button class="nav-toggle" id="navToggle" onclick="Navigation.toggleMobile()">
                    <span></span><span></span><span></span>
                </button>
            </nav>
        `;
        
        // Добавляем стили если их ещё нет
        if (!document.getElementById('nav-styles')) {
            const styles = document.createElement('style');
            styles.id = 'nav-styles';
            styles.textContent = `
                .app-nav {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 0;
                    margin-bottom: 24px;
                    border-bottom: 1px solid var(--border-light);
                    position: relative;
                }
                
                .nav-brand {
                    display: flex;
                    align-items: center;
                }
                
                .nav-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-family: var(--font-display);
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-decoration: none;
                }
                
                .nav-links {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                .nav-link {
                    padding: 10px 18px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    border-radius: var(--radius-full);
                    transition: all var(--transition);
                    font-weight: 500;
                    font-size: 0.95rem;
                }
                
                .nav-link:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }
                
                .nav-link.active {
                    background: var(--primary);
                    color: white;
                }
                
                .nav-user {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    position: relative;
                }
                
                .user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-full);
                    background: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: white;
                }
                
                .nav-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 8px;
                    min-width: 180px;
                    box-shadow: var(--shadow-lg);
                    display: none;
                    z-index: 100;
                }
                
                .nav-dropdown.active {
                    display: block;
                }
                
                .nav-dropdown a {
                    display: block;
                    padding: 10px 16px;
                    color: var(--text-primary);
                    text-decoration: none;
                    border-radius: var(--radius-md);
                    transition: background var(--transition);
                }
                
                .nav-dropdown a:hover {
                    background: var(--bg-secondary);
                }
                
                .nav-dropdown hr {
                    margin: 8px 0;
                    border: none;
                    border-top: 1px solid var(--border-light);
                }
                
                .nav-toggle {
                    display: none;
                    flex-direction: column;
                    gap: 4px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                }
                
                .nav-toggle span {
                    width: 24px;
                    height: 2px;
                    background: var(--text-primary);
                    border-radius: 2px;
                    transition: all 0.3s;
                }
                
                @media (max-width: 900px) {
                    .nav-links {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: var(--bg-card);
                        border: 1px solid var(--border-light);
                        border-radius: var(--radius-lg);
                        padding: 16px;
                        flex-direction: column;
                        z-index: 99;
                        margin-top: 8px;
                    }
                    
                    .nav-links.active {
                        display: flex;
                    }
                    
                    .nav-toggle {
                        display: flex;
                    }
                    
                    .user-name {
                        display: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Инициализация событий
        this.initEvents();
    }
    
    static initEvents() {
        const navUser = document.getElementById('navUser');
        const dropdown = document.getElementById('navDropdown');
        
        if (navUser && dropdown) {
            navUser.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
            
            document.addEventListener('click', () => {
                dropdown.classList.remove('active');
            });
        }
    }
    
    static toggleMobile() {
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
        }
    }
    
    static updateUser(name, avatar) {
        const nameEl = document.getElementById('navUserName');
        const avatarEl = document.getElementById('navUserAvatar');
        
        if (nameEl) nameEl.textContent = name || '';
        if (avatarEl) avatarEl.textContent = avatar || 'U';
    }
    
    static setActive(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav-link[href*="${page}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
}

// Экспорт для глобального использования
window.Navigation = Navigation;