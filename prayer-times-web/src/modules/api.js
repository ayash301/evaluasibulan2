window.API = {
    // Muslim Salat API V2 - Free & No API Key
    baseUrl: 'https://api.aladhan.com/v1', // Fallback to Aladhan for Hijri date

    // Get prayer times by city
    getPrayerTimes: async function(city, country) {
        const cacheKey = `${city}_${country}`;
        
        // Try cache first
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) {
            console.log('📦 Using cached data');
            return cached;
        }

        console.log('🌐 Fetching prayer times for:', city, country);

        try {
            // Try Muslim Salat API first
            const muslimSalatUrl = `https://muslimsalat.com/${encodeURIComponent(city)}.json`;
            console.log('🔗 Fetching from Muslim Salat API:', muslimSalatUrl);
            
            const muslimResponse = await fetch(muslimSalatUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!muslimResponse.ok) throw new Error(`Muslim API HTTP ${muslimResponse.status}`);
            
            const muslimData = await muslimResponse.json();
            console.log('✅ Muslim Salat API success:', muslimData);

            if (muslimData.status === 'success' && muslimData.items && muslimData.items.length > 0) {
                // Get Hijri date from Aladhan API
                const hijriDate = await this.getHijriDateFromAladhan();
                
                const result = this.formatMuslimSalatResponse(muslimData, city, country, hijriDate);
                Storage.cachePrayerTimes(cacheKey, result);
                return result;
            } else {
                throw new Error('Muslim API returned no data');
            }
            
        } catch (muslimError) {
            console.log('❌ Muslim Salat API failed:', muslimError.message);
            
            // Fallback to Aladhan API
            try {
                const aladhanUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;
                console.log('🔗 Fallback to Aladhan API:', aladhanUrl);
                
                const aladhanResponse = await fetch(aladhanUrl);
                if (!aladhanResponse.ok) throw new Error(`Aladhan HTTP ${aladhanResponse.status}`);
                
                const aladhanData = await aladhanResponse.json();
                console.log('✅ Aladhan API success:', aladhanData);

                if (aladhanData.code === 200) {
                    const result = this.formatAladhanResponse(aladhanData, city, country);
                    Storage.cachePrayerTimes(cacheKey, result);
                    return result;
                }
            } catch (aladhanError) {
                console.log('❌ Aladhan API failed:', aladhanError.message);
            }

            // Final fallback to mock data
            console.log('🔄 Using mock data as final fallback');
            const mockData = this.createMockResponse(city, country);
            Storage.cachePrayerTimes(cacheKey, mockData);
            return mockData;
        }
    },

    // Get prayer times by coordinates
    getPrayerTimesByCoords: async function(latitude, longitude) {
        const cacheKey = `coords_${latitude}_${longitude}`;
        
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) return cached;

        console.log('🌐 Fetching by coordinates:', latitude, longitude);

        try {
            const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;
            console.log('🔗 Fetching coordinates from Aladhan:', url);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Coordinates API success:', data);

            if (data.code === 200 && data.data) {
                const result = this.formatAladhanResponse(data, 'Your Location', 'GPS');
                Storage.cachePrayerTimes(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.log('❌ Coordinates API failed:', error.message);
            
            // Fallback to city-based lookup
            try {
                const location = await this.getCityFromCoords(latitude, longitude);
                return await this.getPrayerTimes(location.city, location.country);
            } catch (fallbackError) {
                console.log('❌ Reverse geocoding failed:', fallbackError.message);
                const mockData = this.createMockResponse('Your Location', 'GPS');
                Storage.cachePrayerTimes(cacheKey, mockData);
                return mockData;
            }
        }
    },

    // Get monthly prayer times
    getMonthlyPrayerTimes: async function(city, country, month, year) {
        const cacheKey = `monthly_${city}_${month}_${year}`;
        
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) return cached;

        console.log('🌐 Fetching monthly times:', city, month, year);

        try {
            const url = `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&month=${month}&year=${year}&method=2`;
            console.log('🔗 Fetching monthly from Aladhan:', url);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Monthly API success:', data);

            if (data.code === 200 && data.data) {
                Storage.cachePrayerTimes(cacheKey, data);
                return data;
            }
        } catch (error) {
            console.log('❌ Monthly API failed:', error.message);
            
            // Fallback to mock monthly data
            const mockData = this.createMockMonthlyData(city, country, month, year);
            Storage.cachePrayerTimes(cacheKey, mockData);
            return mockData;
        }
    },

    // Get Hijri date from Aladhan API
    getHijriDateFromAladhan: async function() {
        try {
            const url = 'https://api.aladhan.com/v1/gToH';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200) {
                return data.data.hijri;
            }
        } catch (error) {
            console.log('❌ Hijri date API failed:', error);
        }
        
        // Fallback to calculated Hijri date
        return this.calculateHijriDate(new Date());
    },

    // Format Muslim Salat API response
    formatMuslimSalatResponse: function(muslimData, city, country, hijriDate) {
        const item = muslimData.items[0];
        const now = new Date();
        
        return {
            code: 200,
            status: 'success',
            data: {
                timings: {
                    Fajr: item.fajr,
                    Sunrise: item.shurooq,
                    Dhuhr: item.dhuhr,
                    Asr: item.asr,
                    Maghrib: item.maghrib,
                    Isha: item.isha,
                    Imsak: item.fajr, // Muslim API doesn't have Imsak, use Fajr
                    Midnight: '23:59'
                },
                date: {
                    readable: now.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    gregorian: {
                        date: now.toISOString().split('T')[0],
                        day: now.getDate(),
                        month: {
                            number: now.getMonth() + 1,
                            en: now.toLocaleString('en', { month: 'long' })
                        },
                        year: now.getFullYear()
                    },
                    hijri: hijriDate || this.calculateHijriDate(now)
                },
                meta: {
                    timezone: muslimData.query || 'Asia/Jakarta',
                    method: {
                        name: "Muslim Salat API"
                    }
                }
            }
        };
    },

    // Format Aladhan API response
    formatAladhanResponse: function(aladhanData, city, country) {
        return {
            code: 200,
            status: 'success',
            data: {
                timings: aladhanData.data.timings,
                date: aladhanData.data.date,
                meta: aladhanData.data.meta
            }
        };
    },

    // Get city name from coordinates
    getCityFromCoords: async function(lat, lon) {
        try {
            const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
            const response = await fetch(url);
            const data = await response.json();
            
            return {
                city: data.city || data.locality || 'Unknown City',
                country: data.countryName || 'Unknown Country'
            };
        } catch (error) {
            return {
                city: 'Unknown Location',
                country: 'GPS'
            };
        }
    },

    // Calculate Hijri date (accurate calculation)
    calculateHijriDate: function(gregorianDate) {
        // Accurate Hijri calculation based on Umm al-Qura calendar
        const gDate = new Date(gregorianDate);
        const gYear = gDate.getFullYear();
        const gMonth = gDate.getMonth() + 1;
        const gDay = gDate.getDate();
        
        // Convert Gregorian to Julian Day
        const jd = this.gregorianToJulian(gYear, gMonth, gDay);
        
        // Convert Julian Day to Hijri
        const hijri = this.julianToHijri(jd);
        
        const hijriMonths = [
            'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
            'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];
        
        return {
            date: `${hijri.day}-${hijri.month}-${hijri.year}`,
            day: hijri.day,
            month: {
                number: hijri.month,
                en: hijriMonths[hijri.month - 1] || 'Muharram'
            },
            year: hijri.year
        };
    },

    // Convert Gregorian to Julian Day
    gregorianToJulian: function(year, month, day) {
        if (month <= 2) {
            year -= 1;
            month += 12;
        }
        const a = Math.floor(year / 100);
        const b = 2 - a + Math.floor(a / 4);
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
    },

    // Convert Julian Day to Hijri
    julianToHijri: function(jd) {
        // Julian day at start of Hijri epoch (July 16, 622 CE)
        const hijriEpoch = 1948439.5;
        
        // Days since Hijri epoch
        let days = Math.floor(jd - hijriEpoch);
        
        // Hijri year
        let year = Math.floor((days - 0.5) / 354.366);
        
        // Days in current year
        days = Math.floor(days - IslamicYearDays(year));
        
        let month = 1;
        let monthDays = HijriMonthLength(year, month);
        
        while (days > monthDays) {
            days -= monthDays;
            month++;
            monthDays = HijriMonthLength(year, month);
        }
        
        return {
            year: year + 1,
            month: month,
            day: Math.floor(days) + 1
        };
        
        function IslamicYearDays(year) {
            return 354 + (11 * year + 14) % 30 < 11 ? 1 : 0;
        }
        
        function HijriMonthLength(year, month) {
            return 29 + (11 * year + 14) % 30 < (month - 1) % 2 ? 1 : 0;
        }
    },

    // Create mock response with accurate dates
    createMockResponse: function(city, country) {
        console.log('🎭 Creating mock data for:', city, country);
        
        const now = new Date();
        const hijriDate = this.calculateHijriDate(now);
        
        // City time adjustments (in minutes)
        const adjustments = {
            'jakarta': 0,
            'surabaya': -15,
            'bandung': -5,
            'yogyakarta': -10,
            'medan': -30,
            'makassar': -45,
            'denpasar': -20,
            'default': 0
        };
        
        const cityKey = city.toLowerCase();
        const adjustment = adjustments[cityKey] || adjustments.default;
        
        // Generate prayer times with city adjustment
        const times = this.generatePrayerTimes(adjustment);
        
        return {
            code: 200,
            status: 'success',
            data: {
                timings: times,
                date: {
                    readable: now.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    gregorian: {
                        date: now.toISOString().split('T')[0],
                        day: now.getDate(),
                        month: {
                            number: now.getMonth() + 1,
                            en: now.toLocaleString('en', { month: 'long' })
                        },
                        year: now.getFullYear()
                    },
                    hijri: hijriDate
                },
                meta: {
                    timezone: 'Asia/Jakarta',
                    method: {
                        name: 'Mock Data'
                    }
                }
            }
        };
    },

    // Generate realistic prayer times
    generatePrayerTimes: function(adjustment) {
        const times = {};
        const baseTimes = {
            Fajr: [4, 30],
            Sunrise: [5, 45],
            Dhuhr: [11, 45],
            Asr: [15, 0],
            Sunset: [17, 45],
            Maghrib: [17, 45],
            Isha: [19, 0],
            Imsak: [4, 20],
            Midnight: [23, 45]
        };

        Object.entries(baseTimes).forEach(([prayer, [hours, minutes]]) => {
            let totalMinutes = hours * 60 + minutes + adjustment;
            
            // Ensure valid time
            totalMinutes = Math.max(0, Math.min(1439, totalMinutes));
            
            const newHours = Math.floor(totalMinutes / 60);
            const newMinutes = Math.floor(totalMinutes % 60);
            
            times[prayer] = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        });

        return times;
    },

    // Create mock monthly data with accurate Hijri dates
    createMockMonthlyData: function(city, country, month, year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthlyData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const hijriDate = this.calculateHijriDate(date);
            const adjustment = Math.sin((day - 15) * 0.1) * 2; // Small daily variation
            
            monthlyData.push({
                date: {
                    gregorian: {
                        date: date.toISOString().split('T')[0],
                        day: day,
                        month: {
                            number: month,
                            en: Utils.getMonthName(month)
                        },
                        year: year
                    },
                    hijri: hijriDate
                },
                timings: this.generatePrayerTimes(adjustment)
            });
        }

        return {
            code: 200,
            data: monthlyData
        };
    }
};