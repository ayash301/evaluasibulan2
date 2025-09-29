// Main Islamic Prayer Times Application
class IslamicPrayerApp {
    constructor() {
        this.currentCity = 'Yogyakarta';
        this.currentCountry = 'Indonesia';
        this.prayerData = null;
        this.currentPage = 'home';
        this.countdownInterval = null;
        this.init();
    }

    async init() {
        console.log('🕌 Islamic Prayer Times App Initializing...');
        
        try {
            // Load saved preferences
            this.loadPreferences();
            
            // Initialize UI
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            console.log('✅ Islamic Prayer Times App initialized successfully!');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Gagal memuat aplikasi. Silakan refresh halaman.');
        }
    }

    loadPreferences() {
        this.currentCity = Storage.getFavoriteCity();
        this.currentCountry = Storage.getFavoriteCountry();
        console.log(`📍 Loaded preferences: ${this.currentCity}, ${this.currentCountry}`);
    }

    initializeUI() {
        // Set current values in form
        const cityInput = document.getElementById('cityInput');
        const countrySelect = document.getElementById('countrySelect');
        
        if (cityInput) cityInput.value = this.currentCity;
        if (countrySelect) countrySelect.value = this.currentCountry;
        
        // Set current date
        this.updateCurrentDate();
        
        // Set default month and year for monthly view
        const now = new Date();
        const monthSelect = document.getElementById('monthSelect');
        const yearInput = document.getElementById('yearInput');
        
        if (monthSelect) monthSelect.value = now.getMonth() + 1;
        if (yearInput) yearInput.value = now.getFullYear();
        
        console.log('🎨 UI initialized');
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Search functionality
        this.setupSearch();
        
        // Location detection
        this.setupLocationDetection();
        
        // Monthly data loading
        this.setupMonthlyData();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('🎯 Event listeners setup completed');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                this.showPage(page);
            });
        });
    }

    setupSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const cityInput = document.getElementById('cityInput');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        if (cityInput) {
            cityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }
    }

    setupLocationDetection() {
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => this.getCurrentLocation());
        }
    }

    setupMonthlyData() {
        const loadMonthBtn = document.getElementById('loadMonthBtn');
        if (loadMonthBtn) {
            loadMonthBtn.addEventListener('click', () => this.loadMonthlyData());
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.showPage('home');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showPage('detail');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showPage('qibla');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
        });
    }

    async loadInitialData() {
        console.log('📥 Loading initial prayer times...');
        await this.loadPrayerTimes();
    }

    async loadPrayerTimes() {
        const container = document.getElementById('prayerTimesContainer');
        if (!container) return;

        this.showLoading(container, `Memuat jadwal sholat untuk ${this.currentCity}...`);

        try {
            console.log('🌐 Fetching prayer times...');
            const data = await API.getPrayerTimes(this.currentCity, this.currentCountry);
            
            if (data && data.code === 200) {
                this.prayerData = data.data;
                
                // Update UI with new data
                this.displayPrayerTimes(data.data);
                this.displayLocationInfo(data.data, this.currentCity, this.currentCountry);
                
                // Start countdown
                this.startCountdown();
                
                this.showNotification(`Jadwal sholat ${this.currentCity} berhasil dimuat!`, 'success');
                
            } else {
                throw new Error('Invalid API response');
            }
            
        } catch (error) {
            console.error('❌ Prayer times loading error:', error);
            this.showError(container, 
                'Gagal memuat jadwal sholat. Menggunakan data offline.',
                () => this.loadPrayerTimes()
            );
            // Load fallback data
            this.loadFallbackData();
        }
    }

    displayPrayerTimes(data) {
        const container = document.getElementById('prayerTimesContainer');
        const timings = data.timings;
        
        const prayerNames = {
            Fajr: { name: 'Subuh', icon: 'fas fa-sun' },
            Sunrise: { name: 'Terbit', icon: 'fas fa-sunrise' },
            Dhuhr: { name: 'Dzuhur', icon: 'fas fa-sun' },
            Asr: { name: 'Ashar', icon: 'fas fa-cloud-sun' },
            Maghrib: { name: 'Maghrib', icon: 'fas fa-sunset' },
            Isha: { name: 'Isya', icon: 'fas fa-moon' }
        };

        const nextPrayerKey = this.getNextPrayer(timings);

        let html = '<div class="prayer-times">';
        
        Object.keys(prayerNames).forEach(prayerKey => {
            if (timings[prayerKey]) {
                const prayer = prayerNames[prayerKey];
                const time = Utils.formatTime(timings[prayerKey]);
                const isNext = prayerKey === nextPrayerKey;
                
                html += `
                    <div class="prayer-card ${isNext ? 'next-prayer' : ''}">
                        <div class="prayer-name">
                            <i class="${prayer.icon}"></i>
                            ${prayer.name}
                        </div>
                        <div class="prayer-time">${time}</div>
                        <div class="prayer-status">
                            ${isNext ? '🔔 Sholat Selanjutnya' : '✅ Jadwal Sholat'}
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    getNextPrayer(timings) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const prayerTimes = [
            { key: 'Fajr', time: timings.Fajr },
            { key: 'Dhuhr', time: timings.Dhuhr },
            { key: 'Asr', time: timings.Asr },
            { key: 'Maghrib', time: timings.Maghrib },
            { key: 'Isha', time: timings.Isha }
        ];

        for (let prayer of prayerTimes) {
            if (prayer.time) {
                const [hours, minutes] = prayer.time.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                
                if (prayerTime > currentTime) {
                    return prayer.key;
                }
            }
        }

        // If no prayer found for today, first prayer tomorrow is Fajr
        return 'Fajr';
    }

    displayLocationInfo(prayerData, city, country) {
        document.getElementById('currentLocation').textContent = `${city}, ${country}`;
        this.updateDateInfo(prayerData.date);
    }

    updateDateInfo(dateData) {
        // Update Gregorian date
        document.getElementById('gregorianDate').textContent = dateData.readable;
        
        // Update Hijri date
        if (dateData.hijri) {
            const hijri = dateData.hijri;
            const hijriMonthNames = {
                'Muharram': 'Muharram',
                'Safar': 'Safar', 
                'Rabi al-Awwal': 'Rabiul Awal',
                'Rabi al-Thani': 'Rabiul Akhir',
                'Jumada al-Awwal': 'Jumadil Awal',
                'Jumada al-Thani': 'Jumadil Akhir',
                'Rajab': 'Rajab',
                'Sha\'ban': 'Sya\'ban',
                'Ramadan': 'Ramadan',
                'Shawwal': 'Syawal',
                'Dhu al-Qi\'dah': 'Dzulqa\'dah',
                'Dhu al-Hijjah': 'Dzulhijjah'
            };
            
            const hijriMonth = hijriMonthNames[hijri.month.en] || hijri.month.en;
            document.getElementById('hijriDate').textContent = 
                `${hijri.day} ${hijriMonth} ${hijri.year} H`;
        } else {
            document.getElementById('hijriDate').textContent = 'Memuat...';
        }
    }

    async handleSearch() {
        const cityInput = document.getElementById('cityInput');
        const countrySelect = document.getElementById('countrySelect');
        
        if (!cityInput || !countrySelect) return;

        const city = cityInput.value.trim();
        const country = countrySelect.value;

        if (!city) {
            this.showNotification('Silakan masukkan nama kota', 'error');
            return;
        }

        this.currentCity = city;
        this.currentCountry = country;

        // Save to storage
        Storage.saveFavoriteLocation(city, country);

        // Clear cache for fresh data
        const cacheKey = `${city}_${country}`;
        Storage.remove(`prayer_${cacheKey}`);

        // Load new data
        await this.loadPrayerTimes();

        this.showNotification(`Lokasi diubah ke ${city}, ${country}`, 'success');
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('GPS tidak didukung oleh browser Anda', 'error');
            return;
        }

        const container = document.getElementById('prayerTimesContainer');
        this.showLoading(container, 'Mendeteksi lokasi Anda...');

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });

            const { latitude, longitude } = position.coords;
            
            // Load prayer times for coordinates
            await this.loadPrayerTimesByCoords(latitude, longitude);
            
        } catch (error) {
            console.error('❌ Geolocation error:', error);
            this.showNotification('Gagal mendapatkan lokasi. Pastikan GPS diaktifkan.', 'error');
            this.loadPrayerTimes(); // Fallback to city-based
        }
    }

    async loadPrayerTimesByCoords(latitude, longitude) {
        const container = document.getElementById('prayerTimesContainer');
        this.showLoading(container, 'Memuat jadwal berdasarkan lokasi...');

        try {
            const data = await API.getPrayerTimesByCoords(latitude, longitude);
            
            if (data && data.code === 200) {
                this.prayerData = data.data;
                
                this.displayPrayerTimes(data.data);
                this.displayLocationInfo(data.data, 'Lokasi GPS', 'Koordinat');
                
                this.startCountdown();
                this.showNotification('Lokasi GPS berhasil dideteksi!', 'success');
                
            } else {
                throw new Error('Invalid coordinates API response');
            }
            
        } catch (error) {
            console.error('❌ Coordinates prayer times error:', error);
            this.showError(container, 'Gagal mendapatkan data untuk lokasi GPS');
            this.loadFallbackData();
        }
    }

    async loadMonthlyData() {
        const container = document.getElementById('monthlySchedule');
        if (!container) return;

        const monthSelect = document.getElementById('monthSelect');
        const yearInput = document.getElementById('yearInput');
        
        if (!monthSelect || !yearInput) return;

        const month = monthSelect.value;
        const year = yearInput.value || new Date().getFullYear();

        this.showLoading(container, `Memuat jadwal ${Utils.getMonthName(month)} ${year}...`);

        try {
            const data = await API.getMonthlyPrayerTimes(this.currentCity, this.currentCountry, month, year);
            
            if (data && data.code === 200) {
                this.displayMonthlySchedule(data.data, month, year);
                this.showNotification(`Jadwal ${Utils.getMonthName(month)} berhasil dimuat!`, 'success');
            } else {
                throw new Error('Invalid monthly API response');
            }
            
        } catch (error) {
            console.error('❌ Monthly data error:', error);
            this.showError(container, 
                'Gagal memuat jadwal bulanan',
                () => this.loadMonthlyData()
            );
        }
    }

    displayMonthlySchedule(monthlyData, month, year) {
        const container = document.getElementById('monthlySchedule');
        const today = new Date().toISOString().split('T')[0];
        const monthName = Utils.getMonthName(month);

        let html = `
            <div class="monthly-table">
                <h2><i class="fas fa-calendar-alt"></i> Jadwal Sholat ${monthName} ${year}</h2>
                <div style="overflow-x: auto;">
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Subuh</th>
                                <th>Dzuhur</th>
                                <th>Ashar</th>
                                <th>Maghrib</th>
                                <th>Isya</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        monthlyData.forEach(dayData => {
            const isToday = dayData.date.gregorian.date === today;
            const timings = dayData.timings;
            
            html += `
                <tr class="${isToday ? 'today-row' : ''}">
                    <td>
                        ${dayData.date.gregorian.day}
                        ${isToday ? '<br><small style="color: var(--gold-color);">Hari Ini</small>' : ''}
                    </td>
                    <td>${Utils.formatTime(timings.Fajr)}</td>
                    <td>${Utils.formatTime(timings.Dhuhr)}</td>
                    <td>${Utils.formatTime(timings.Asr)}</td>
                    <td>${Utils.formatTime(timings.Maghrib)}</td>
                    <td>${Utils.formatTime(timings.Isha)}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from nav links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected page and activate nav link
        const targetPage = document.getElementById(`${pageId}Page`);
        const targetNavLink = document.querySelector(`[data-page="${pageId}"]`);

        if (targetPage && targetNavLink) {
            targetPage.classList.add('active');
            targetNavLink.classList.add('active');
            this.currentPage = pageId;

            // Load specific page data
            if (pageId === 'detail') {
                this.loadMonthlyData();
            } else if (pageId === 'qibla') {
                this.calculateQibla();
            }
        }
    }

    startCountdown() {
        // Clear existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        if (!this.prayerData || !this.prayerData.timings) return;

        const updateCountdown = () => {
            const now = new Date();
            const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            
            const prayerTimes = [
                { key: 'Fajr', name: 'Subuh', time: this.prayerData.timings.Fajr },
                { key: 'Dhuhr', name: 'Dzuhur', time: this.prayerData.timings.Dhuhr },
                { key: 'Asr', name: 'Ashar', time: this.prayerData.timings.Asr },
                { key: 'Maghrib', name: 'Maghrib', time: this.prayerData.timings.Maghrib },
                { key: 'Isha', name: 'Isya', time: this.prayerData.timings.Isha }
            ];

            let nextPrayer = null;
            let timeDiff = Infinity;

            for (let prayer of prayerTimes) {
                if (prayer.time) {
                    const [hours, minutes] = prayer.time.split(':').map(Number);
                    const prayerTime = hours * 3600 + minutes * 60;
                    
                    if (prayerTime > currentTime && prayerTime - currentTime < timeDiff) {
                        timeDiff = prayerTime - currentTime;
                        nextPrayer = prayer;
                    }
                }
            }

            // If no prayer found for today, use Fajr tomorrow
            if (!nextPrayer && prayerTimes[0].time) {
                nextPrayer = prayerTimes[0];
                const [hours, minutes] = prayerTimes[0].time.split(':').map(Number);
                const prayerTime = hours * 3600 + minutes * 60;
                timeDiff = (24 * 3600 - currentTime) + prayerTime;
            }

            if (nextPrayer && timeDiff > 0) {
                const hours = Math.floor(timeDiff / 3600);
                const minutes = Math.floor((timeDiff % 3600) / 60);
                const seconds = timeDiff % 60;

                document.getElementById('nextPrayerName').textContent = `Menuju ${nextPrayer.name}`;
                document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
                document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
                document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
            }
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    calculateQibla() {
        if (!navigator.geolocation) {
            this.showNotification('GPS tidak tersedia di perangkat Anda', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const direction = Utils.calculateQiblaDirection(latitude, longitude);
                const distance = Utils.calculateDistance(latitude, longitude, 21.4225, 39.8262);

                // Update Qibla direction
                document.getElementById('qiblaDirection').textContent = `${direction.toFixed(1)}°`;
                document.getElementById('distanceToMecca').textContent = `${distance.toFixed(0)} km`;

                // Update compass arrow
                const arrow = document.getElementById('qiblaArrow');
                if (arrow) {
                    arrow.style.transform = `translate(-50%, -100%) rotate(${direction}deg)`;
                }

                this.showNotification('Arah Qibla berhasil dihitung!', 'success');
            },
            (error) => {
                console.error('❌ Qibla calculation error:', error);
                this.showNotification('Gagal menghitung arah Qibla. Aktifkan GPS.', 'error');
            }
        );
    }

    loadFallbackData() {
        // Load mock data when API fails
        const mockData = API.createMockResponse(this.currentCity, this.currentCountry);
        this.prayerData = mockData.data;
        this.displayPrayerTimes(mockData.data);
        this.displayLocationInfo(mockData.data, this.currentCity, this.currentCountry);
        this.startCountdown();
    }

    refreshData() {
        console.log('🔄 Refreshing data...');
        
        // Clear relevant caches
        const cacheKey = `${this.currentCity}_${this.currentCountry}`;
        Storage.remove(`prayer_${cacheKey}`);
        
        if (this.currentPage === 'home') {
            this.loadPrayerTimes();
        } else if (this.currentPage === 'detail') {
            this.loadMonthlyData();
        } else if (this.currentPage === 'qibla') {
            this.calculateQibla();
        }
        
        this.showNotification('Data diperbarui', 'success');
    }

    exportData() {
        if (!this.prayerData) {
            this.showNotification('Tidak ada data untuk diekspor', 'error');
            return;
        }

        try {
            const timings = this.prayerData.timings;
            const date = this.prayerData.date.gregorian;
            
            const csvData = [
                ['Waktu Sholat', 'Jam', 'Lokasi', 'Tanggal'],
                ['Subuh', Utils.formatTime(timings.Fajr), `${this.currentCity}, ${this.currentCountry}`, date.date],
                ['Dzuhur', Utils.formatTime(timings.Dhuhr), `${this.currentCity}, ${this.currentCountry}`, date.date],
                ['Ashar', Utils.formatTime(timings.Asr), `${this.currentCity}, ${this.currentCountry}`, date.date],
                ['Maghrib', Utils.formatTime(timings.Maghrib), `${this.currentCity}, ${this.currentCountry}`, date.date],
                ['Isya', Utils.formatTime(timings.Isha), `${this.currentCity}, ${this.currentCountry}`, date.date]
            ];

            const csvContent = csvData.map(row => 
                row.map(field => `"${field}"`).join(',')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jadwal-sholat-${this.currentCity}-${date.date}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Data berhasil diekspor!', 'success');
            
        } catch (error) {
            console.error('❌ Export error:', error);
            this.showNotification('Gagal mengekspor data', 'error');
        }
    }

    setupAutoRefresh() {
        // Refresh at midnight
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const timeUntilMidnight = midnight - now;

        setTimeout(() => {
            this.refreshData();
            // Schedule next refresh
            this.setupAutoRefresh();
        }, timeUntilMidnight);

        console.log('⏰ Auto-refresh scheduled for midnight');
    }

    showLoading(container, message = 'Memuat...') {
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(container, message, retryCallback = null) {
        if (container) {
            let retryButton = '';
            if (retryCallback) {
                retryButton = `<button onclick="${retryCallback}"><i class="fas fa-redo"></i> Coba Lagi</button>`;
            }

            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    ${retryButton}
                </div>
            `;
        }
    }

    showNotification(message, type = 'success') {
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-weight: bold;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    updateCurrentDate() {
        const now = new Date();
        const gregorianDate = document.getElementById('gregorianDate');
        if (gregorianDate) {
            gregorianDate.textContent = Utils.formatDate(now);
        }
    }
}

// Global error handling
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Online/offline detection
window.addEventListener('online', () => {
    console.log('🌐 App is online');
    if (window.app) {
        app.showNotification('Koneksi internet tersambung kembali!', 'success');
        app.refreshData();
    }
});

window.addEventListener('offline', () => {
    console.log('📴 App is offline');
    if (window.app) {
        app.showNotification('Koneksi internet terputus. Menggunakan data tersimpan.', 'error');
    }
});

// Initialize app
let app;

document.addEventListener('DOMContentLoaded', function() {
    app = new IslamicPrayerApp();
    window.app = app;
    console.log('🚀 Islamic Prayer Times App loaded successfully!');
});

// Export functionality for global access
window.exportPrayerTimes = () => {
    if (window.app) {
        window.app.exportData();
    }
};