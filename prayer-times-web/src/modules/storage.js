window.Storage = {
    save: function(key, value) {
        try {
            const data = JSON.stringify(value);
            localStorage.setItem(key, data);
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    },

    load: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    },

    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    saveSession: function(key, value) {
        try {
            const data = JSON.stringify(value);
            return data; // Store in memory instead of sessionStorage
        } catch (error) {
            console.error('Session storage error:', error);
            return null;
        }
    },

    getFavoriteCity: function() {
        return this.load('favoriteCity', 'Yogyakarta');
    },

    getFavoriteCountry: function() {
        return this.load('favoriteCountry', 'Indonesia');
    },

    saveFavoriteLocation: function(city, country) {
        this.save('favoriteCity', city);
        this.save('favoriteCountry', country);
    },

    getCachedPrayerTimes: function(cacheKey) {
        const cached = this.load(`prayer_${cacheKey}`);
        if (!cached) return null;
        // Check if cache is still valid (1 hour)
        const now = new Date().getTime();
        if (now - cached.timestamp > 3600000) {
            this.remove(`prayer_${cacheKey}`);
            return null;
        }
        return cached.data;
    },

    cachePrayerTimes: function(cacheKey, data) {
        const cacheData = {
            timestamp: new Date().getTime(),
            data: data
        };
        this.save(`prayer_${cacheKey}`, cacheData);
    }
};