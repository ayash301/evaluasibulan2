window.UI = {
    currentLocation: {
        city: 'Yogyakarta',
        country: 'Indonesia',
        coords: null
    },

    init: function() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupNavigation();
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
        this.updateDates();
    },

    handleSearch: function() {
        const city = document.getElementById('cityInput').value.trim();
        const country = document.getElementById('countrySelect').value;
        
        if (!city) {
            this.showError('Mohon masukkan nama kota');
            return;
        }

        this.currentLocation.city = city;
        this.currentLocation.country = country;
        this.currentLocation.coords = null;

        // Save as favorite
        Storage.saveFavoriteLocation(city, country);

        // Update UI and load prayer times
        this.updateLocationDisplay();
        this.loadPrayerTimes();
    },

    handleLocationRequest: function() {
        if (!navigator.geolocation) {
            this.showError('Geolocation tidak didukung oleh browser Anda');
            return;
        }

        this.showLoading('Mendeteksi lokasi...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation.coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                this.loadPrayerTimesByCoords();
            },
            (error) => {
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
                this.showError(errorMessage);
            }
        );
    },

    loadPrayerTimes: async function() {
        const container = document.getElementById('prayerTimesContainer');
        this.showLoading('Memuat jadwal sholat...', container);

        try {
            let response;
            if (this.currentLocation.coords) {
                response = await API.getPrayerTimesByCoords(
                    this.currentLocation.coords.latitude,
                    this.currentLocation.coords.longitude
                );
            } else {
                response = await API.getPrayerTimes(
                    this.currentLocation.city,
                    this.currentLocation.country
                );
            }

            if (response && response.status === 'success') {
                this.displayPrayerTimes(response.data);
                this.startCountdown(response.data.timings);
            } else {
                throw new Error('Data tidak valid');
            }
        } catch (error) {
            console.error('Error loading prayer times:', error);
            this.showError('Gagal memuat jadwal sholat. Silakan coba lagi.', container);
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

            if (response && response.status === 'success') {
                this.displayPrayerTimes(response.data);
                this.startCountdown(response.data.timings);
                this.updateLocationDisplay();
            } else {
                throw new Error('Data tidak valid');
            }
        } catch (error) {
            console.error('Error loading prayer times by coords:', error);
            this.showError('Gagal memuat jadwal sholat. Silakan coba lagi.', container);
        }
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

        let html = '<div class="prayer-times">';
        
        Object.keys(prayerNames).forEach(prayerKey => {
            if (timings[prayerKey]) {
                const prayer = prayerNames[prayerKey];
                const time = Utils.formatTime(timings[prayerKey]);
                const isNext = this.isNextPrayer(prayerKey, timings);
                
                html += `
                    <div class="prayer-card ${isNext ? 'next-prayer' : ''}">
                        <div class="prayer-name">
                            <i class="${prayer.icon}"></i>
                            ${prayer.name}
                        </div>
                        <div class="prayer-time">${time}</div>
                        ${isNext ? '<div class="prayer-status">Sholat Selanjutnya</div>' : ''}
                    </div>
                `;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    },

    isNextPrayer: function(prayerKey, timings) {
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
                    return prayer.key === prayerKey;
                }
            }
        }

        // If no prayer found for today, first prayer tomorrow is Fajr
        return prayerKey === 'Fajr';
    },

    startCountdown: function(timings) {
        const updateCountdown = () => {
            const now = new Date();
            const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            
            const prayerTimes = [
                { name: 'Subuh', time: timings.Fajr },
                { name: 'Dzuhur', time: timings.Dhuhr },
                { name: 'Ashar', time: timings.Asr },
                { name: 'Maghrib', time: timings.Maghrib },
                { name: 'Isya', time: timings.Isha }
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

            if (nextPrayer) {
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
        setInterval(updateCountdown, 1000);
    },

    loadMonthlyData: async function() {
        const container = document.getElementById('monthlySchedule');
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearInput').value;

        if (!month || !year) {
            this.showError('Mohon pilih bulan dan tahun', container);
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

            if (response && response.status === 'success') {
                this.displayMonthlySchedule(response.data, month, year);
            } else {
                throw new Error('Data tidak valid');
            }
        } catch (error) {
            console.error('Error loading monthly data:', error);
            this.showError('Gagal memuat jadwal bulanan. Silakan coba lagi.', container);
        }
    },

    displayMonthlySchedule: function(data, month, year) {
        const container = document.getElementById('monthlySchedule');
        const today = new Date().toISOString().split('T')[0];
        const monthName = Utils.getMonthName(month);

        let html = `
            <div class="monthly-table">
                <h2>Jadwal Sholat ${monthName} ${year}</h2>
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

        data.forEach(day => {
            const isToday = day.date.gregorian.date === today;
            const timings = day.timings;
            
            html += `
                <tr class="${isToday ? 'today-row' : ''}">
                    <td>${day.date.gregorian.day}</td>
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
        `;

        container.innerHTML = html;
    },

    updateQiblaCompass: function() {
        if (!this.currentLocation.coords) {
            document.getElementById('qiblaDirection').textContent = 'Aktifkan lokasi untuk melihat arah Qibla';
            document.getElementById('distanceToMecca').textContent = 'Tidak tersedia';
            return;
        }

        const direction = Utils.calculateQiblaDirection(
            this.currentLocation.coords.latitude,
            this.currentLocation.coords.longitude
        );

        const distance = Utils.calculateDistance(
            this.currentLocation.coords.latitude,
            this.currentLocation.coords.longitude,
            21.4225, // Mecca latitude
            39.8262  // Mecca longitude
        );

        // Update direction text
        const directionText = this.getDirectionText(direction);
        document.getElementById('qiblaDirection').textContent = directionText;
        document.getElementById('distanceToMecca').textContent = `${distance.toFixed(0)} km`;

        // Update compass arrow
        const arrow = document.getElementById('qiblaArrow');
        arrow.style.transform = `translate(-50%, -100%) rotate(${direction}deg)`;

        // Start device orientation if supported
        this.startCompass(direction);
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
                const adjustedDirection = (qiblaDirection - compassDirection + 360) % 360;
                arrow.style.transform = `translate(-50%, -100%) rotate(${adjustedDirection}deg)`;
            }
        }, true);
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

    updateDates: function() {
        const now = new Date();
        document.getElementById('gregorianDate').textContent = Utils.formatDate(now);
        
        // Simplified Hijri date for demo
        const hijriDate = API.getHijriDate(now);
        document.getElementById('hijriDate').textContent = 
            `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year} H`;
    },

    showLoading: function(message = 'Memuat...', container = null) {
        const target = container || document.getElementById('prayerTimesContainer');
        target.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>${message}</p>
            </div>
        `;
    },

    showError: function(message, container = null) {
        const target = container || document.getElementById('prayerTimesContainer');
        target.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="UI.loadPrayerTimes()">Coba Lagi</button>
            </div>
        `;
    }
};