window.UI = {
    currentLocation: {
        city: 'Yogyakarta',
        country: 'Indonesia',
        coords: null
    },

    countdownInterval: null,

    init: function() {
        console.log('🕌 Initializing Prayer Times UI...');
        this.setupEventListeners();
        this.setupNavigation();
        this.loadInitialData();
    },

    setupEventListeners: function() {
        // Search button
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.handleSearch();
        });

        // Location button
        document.getElementById('locationBtn').addEventListener('click', () => {
            this.handleLocationRequest();
        });

        // Enter key in city input
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Load monthly data
        document.getElementById('loadMonthBtn').addEventListener('click', () => {
            this.loadMonthlyData();
        });

        // Initialize current month and year
        const now = new Date();
        document.getElementById('monthSelect').value = now.getMonth() + 1;
        document.getElementById('yearInput').value = now.getFullYear();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    },

    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
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
                        this.loadPrayerTimes();
                        break;
                }
            }
        });
    },

    setupNavigation: function() {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.showPage(page);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    showPage: function(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Load specific page data
            if (pageName === 'detail') {
                this.loadMonthlyData();
            } else if (pageName === 'qibla') {
                this.updateQiblaCompass();
            }
        }
    },

    loadInitialData: function() {
        // Load favorite location
        const favoriteCity = Storage.getFavoriteCity();
        const favoriteCountry = Storage.getFavoriteCountry();
        
        document.getElementById('cityInput').value = favoriteCity;
        document.getElementById('countrySelect').value = favoriteCountry;
        
        this.currentLocation.city = favoriteCity;
        this.currentLocation.country = favoriteCountry;

        // Load prayer times
        this.loadPrayerTimes();
        
        // Update dates
        this.updateCurrentDates();
    },

    handleSearch: function() {
        const city = document.getElementById('cityInput').value.trim();
        const country = document.getElementById('countrySelect').value;
        
        if (!city) {
            this.showNotification('Mohon masukkan nama kota', 'error');
            return;
        }

        this.currentLocation.city = city;
        this.currentLocation.country = country;
        this.currentLocation.coords = null;

        // Save to storage
        Storage.saveFavoriteLocation(city, country);

        // Clear cache for fresh data
        const cacheKey = `${city}_${country}`;
        Storage.remove(`prayer_${cacheKey}`);
        
        // Update UI and load prayer times
        this.updateLocationDisplay();
        this.loadPrayerTimes();
        
        // Show notification
        this.showNotification(`Mengambil data untuk ${city}, ${country}`);
    },

    handleLocationRequest: function() {
        if (!navigator.geolocation) {
            this.showNotification('GPS tidak didukung oleh browser Anda', 'error');
            return;
        }

        this.showLoading('Mendeteksi lokasi Anda...', 'prayerTimesContainer');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation.coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                this.loadPrayerTimesByCoords();
            },
            (error) => {
                console.error('Location error:', error);
                let errorMessage = 'Gagal mendapatkan lokasi';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Akses lokasi ditolak. Mohon izinkan akses lokasi.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Informasi lokasi tidak tersedia.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Permintaan lokasi timeout.';
                        break;
                }
                this.showNotification(errorMessage, 'error');
                this.loadPrayerTimes(); // Fallback to city-based
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    },

    loadPrayerTimes: async function() {
        const container = document.getElementById('prayerTimesContainer');
        this.showLoading('Memuat jadwal sholat...', container);

        try {
            console.log('📍 Loading prayer times for:', this.currentLocation.city, this.currentLocation.country);
            
            const response = await API.getPrayerTimes(this.currentLocation.city, this.currentLocation.country);
            console.log('📡 API Response:', response);

            if (response && response.code === 200) {
                this.displayPrayerTimes(response.data);
                this.displayLocationInfo(response.data, this.currentLocation.city, this.currentLocation.country);
                this.startCountdown(response.data.timings);
                this.showNotification('Jadwal sholat berhasil dimuat!');
            } else {
                throw new Error('Format data tidak valid');
            }
        } catch (error) {
            console.error('❌ Error loading prayer times:', error);
            // Use fallback data
            this.loadFallbackData();
            this.showNotification('Menggunakan data offline', 'info');
        }
    },

    loadPrayerTimesByCoords: async function() {
        const container = document.getElementById('prayerTimesContainer');
        this.showLoading('Memuat jadwal berdasarkan lokasi...', container);

        try {
            const response = await API.getPrayerTimesByCoords(
                this.currentLocation.coords.latitude,
                this.currentLocation.coords.longitude
            );

            if (response && response.code === 200) {
                this.displayPrayerTimes(response.data);
                this.displayLocationInfo(response.data, 'Lokasi GPS', 'Koordinat');
                this.startCountdown(response.data.timings);
                this.updateLocationDisplay();
                this.showNotification('Lokasi GPS berhasil dideteksi!');
            } else {
                throw new Error('Data tidak valid');
            }
        } catch (error) {
            console.error('Error loading prayer times by coords:', error);
            this.loadFallbackData();
            this.showNotification('Menggunakan data offline', 'info');
        }
    },

    // Fallback data when API fails
    loadFallbackData: function() {
        const mockData = API.createMockResponse(this.currentLocation.city, this.currentLocation.country);
        this.displayPrayerTimes(mockData.data);
        this.displayLocationInfo(mockData.data, this.currentLocation.city, this.currentLocation.country);
        this.startCountdown(mockData.data.timings);
    },

    displayPrayerTimes: function(data) {
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
        
        console.log('🎨 Prayer times displayed successfully');
    },

    getNextPrayer: function(timings) {
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
    },

    startCountdown: function(timings) {
        // Clear existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const updateCountdown = () => {
            const now = new Date();
            const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            
            const prayerTimes = [
                { key: 'Fajr', name: 'Subuh', time: timings.Fajr },
                { key: 'Dhuhr', name: 'Dzuhur', time: timings.Dhuhr },
                { key: 'Asr', name: 'Ashar', time: timings.Asr },
                { key: 'Maghrib', name: 'Maghrib', time: timings.Maghrib },
                { key: 'Isha', name: 'Isya', time: timings.Isha }
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
    },

    loadMonthlyData: async function() {
        const container = document.getElementById('monthlySchedule');
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearInput').value || new Date().getFullYear();

        if (!month) {
            this.showError('Mohon pilih bulan', container);
            return;
        }

        this.showLoading('Memuat jadwal bulanan...', container);

        try {
            const response = await API.getMonthlyPrayerTimes(
                this.currentLocation.city,
                this.currentLocation.country,
                month,
                year
            );

            if (response && response.code === 200) {
                this.displayMonthlySchedule(response.data, month, year);
                this.showNotification(`Jadwal ${Utils.getMonthName(month)} berhasil dimuat!`);
            } else {
                throw new Error('Data tidak valid');
            }
        } catch (error) {
            console.error('Error loading monthly data:', error);
            this.showError('Gagal memuat jadwal bulanan. Silakan coba lagi.', container);
        }
    },

    displayMonthlySchedule: function(monthlyData, month, year) {
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
    },

    updateQiblaCompass: function() {
        if (!navigator.geolocation) {
            document.getElementById('qiblaDirection').textContent = 'GPS tidak tersedia';
            document.getElementById('distanceToMecca').textContent = 'GPS tidak tersedia';
            return;
        }

        this.showLoading('Menghitung arah Qibla...', 'qiblaPage');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const direction = Utils.calculateQiblaDirection(latitude, longitude);
                const distance = Utils.calculateDistance(latitude, longitude, 21.4225, 39.8262);

                // Update direction text
                const directionText = this.getDirectionText(direction);
                document.getElementById('qiblaDirection').textContent = directionText;
                document.getElementById('distanceToMecca').textContent = `${distance.toFixed(0)} km`;

                // Update compass arrow
                const arrow = document.getElementById('qiblaArrow');
                if (arrow) {
                    arrow.style.transform = `translate(-50%, -100%) rotate(${direction}deg)`;
                }

                // Start device orientation if supported
                this.startCompass(direction);
                
                this.showNotification('Arah Qibla berhasil dihitung!');
            },
            (error) => {
                console.error('Qibla calculation error:', error);
                document.getElementById('qiblaDirection').textContent = 'Error GPS';
                document.getElementById('distanceToMecca').textContent = 'Error GPS';
                this.showNotification('Gagal menghitung arah Qibla. Aktifkan GPS.', 'error');
            }
        );
    },

    getDirectionText: function(degrees) {
        const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
        const index = Math.round(degrees / 45) % 8;
        return `${directions[index]} (${Math.round(degrees)}°)`;
    },

    startCompass: function(qiblaDirection) {
        if (!window.DeviceOrientationEvent) {
            console.log('Device orientation not supported');
            return;
        }

        window.addEventListener('deviceorientation', (event) => {
            if (event.alpha !== null) {
                const compassDirection = 360 - event.alpha; // Convert to degrees
                const arrow = document.getElementById('qiblaArrow');
                if (arrow) {
                    const adjustedDirection = (qiblaDirection - compassDirection + 360) % 360;
                    arrow.style.transform = `translate(-50%, -100%) rotate(${adjustedDirection}deg)`;
                }
            }
        }, true);
    },

    displayLocationInfo: function(prayerData, city, country) {
        document.getElementById('currentLocation').textContent = `${city}, ${country}`;
        this.updateDateInfo(prayerData.date);
    },

    updateDateInfo: function(dateData) {
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
    },

    updateLocationDisplay: function() {
        let locationText = this.currentLocation.city;
        if (this.currentLocation.country) {
            locationText += `, ${this.currentLocation.country}`;
        }
        if (this.currentLocation.coords) {
            locationText += ' (GPS)';
        }
        
        document.getElementById('currentLocation').textContent = locationText;
    },

    updateCurrentDates: function() {
        const now = new Date();
        document.getElementById('gregorianDate').textContent = Utils.formatDate(now);
        document.getElementById('hijriDate').textContent = 'Memuat...';
    },

    showLoading: function(message = 'Memuat...', containerId = 'prayerTimesContainer') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    },

    showError: function(message, container = null) {
        const target = container || document.getElementById('prayerTimesContainer');
        if (target) {
            target.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button onclick="UI.loadPrayerTimes()">Coba Lagi</button>
                </div>
            `;
        }
    },

    showNotification: function(message, type = 'success') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--gold-color)' : '#ff4444'};
            color: var(--text-dark);
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 9999;
            font-weight: bold;
            max-width: 300px;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    // Export functionality
    exportPrayerTimes: function() {
        const container = document.getElementById('prayerTimesContainer');
        const prayerCards = container.querySelectorAll('.prayer-card');
        
        if (!prayerCards.length) {
            this.showNotification('Tidak ada data untuk diekspor', 'error');
            return;
        }

        let csvData = [['Waktu Sholat', 'Jam', 'Status']];
        
        prayerCards.forEach(card => {
            const name = card.querySelector('.prayer-name').textContent.trim();
            const time = card.querySelector('.prayer-time').textContent.trim();
            const status = card.querySelector('.prayer-status').textContent.trim();
            
            csvData.push([name, time, status]);
        });

        const csvContent = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jadwal-sholat-${this.currentLocation.city}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.URL.revokeObjectURL(url);
        this.showNotification('Data berhasil diekspor!');
    }
};

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        UI.init();
    });
} else {
    UI.init();
}