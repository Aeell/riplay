// Simple i18n system for the application
const i18n = {
    currentLanguage: 'en',
    translations: {},
    
    async init() {
        // Load all translations
        await this.loadTranslations('en');
        await this.loadTranslations('cs');
        await this.loadTranslations('de');
        
        // Get saved language from localStorage or use default
        const savedLang = localStorage.getItem('preferredLanguage') || 'en';
        this.setLanguage(savedLang);
        
        // Set up language toggle listeners
        this.setupLanguageToggle();
    },
    
    async loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error(`Failed to load ${lang} translations:`, error);
        }
    },
    
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language ${lang} not found, using default`);
            lang = 'en';
        }
        
        this.currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        document.documentElement.setAttribute('lang', lang);
        
        // Update all flag icons
        document.querySelectorAll('.flag-icon').forEach(flag => {
            if (flag.dataset.lang === lang) {
                flag.classList.add('active');
            } else {
                flag.classList.remove('active');
            }
        });
        
        // Update all translatable elements
        this.updatePageTranslations();
    },
    
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        
        return value;
    },
    
    updatePageTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translation;
            } else if (element.tagName === 'INPUT') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update elements with data-i18n-title attribute (for tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    },
    
    setupLanguageToggle() {
        document.querySelectorAll('.flag-icon').forEach(flag => {
            flag.addEventListener('click', () => {
                const lang = flag.dataset.lang;
                this.setLanguage(lang);
            });
        });
    }
};

// Initialize i18n when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}