window.API = {
    baseUrl: 'https://api.pray.zone/v2/times',

    // Alternative APIs for better reliability
    alternativeAPIs: [
        'https://api.aladhan.com/v1/timingsByCity',
        'https://muslimsalat.com'
    ],

    // Mock data for development/demo
    mockPrayerData: {
        "Fajr": "04:45",
        "Sunrise": "06:05",
        "Dhuhr": "11:52",
        "Asr": "15:18",
        "Sunset": "17:38",
        "Maghrib": "17:38",
        "Isha": "18:58",
        "Imsak": "04:35",
        "Midnight": "23:52"
    },

    // Get prayer times by city
    getPrayerTimes: async function(city, country) {
        const cacheKey = `${city}_${country}`;
        // Try to get from cache first
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) {
            console.log('Using cached prayer times');
            return Promise.resolve(cached);
        }

        try {
            // Try primary API (using mock data for demo)
            console.log(`Fetching prayer times for ${city}, ${country}`);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Use mock data for demo
            const mockResponse = this.createMockResponse(city, country);
            // Cache the result
            Storage.cachePrayerTimes(cacheKey, mockResponse);
            return mockResponse;
        } catch (error) {
            console.error('Primary API failed:', error);
            // Return mock data as fallback
            const fallbackResponse = this.createMockResponse(city, country);
            return fallbackResponse;
        }
    },

    // Get prayer times by coordinates
    getPrayerTimesByCoords: async function(latitude, longitude) {
        const cacheKey = `coords_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) {
            return Promise.resolve(cached);
        }

        try {
            console.log(`Fetching prayer times for coordinates: ${latitude}, ${longitude}`);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Use mock data for demo
            const mockResponse = this.createMockResponse('Your Location', 'GPS');
            // Cache the result
            Storage.cachePrayerTimes(cacheKey, mockResponse);
            return mockResponse;
        } catch (error) {
            console.error('Coordinates API failed:', error);
            return this.createMockResponse('Your Location', 'GPS');
        }
    },

    // Get monthly prayer times
    getMonthlyPrayerTimes: async function(city, country, month, year) {
        const cacheKey = `monthly_${city}_${month}_${year}`;
        const cached = Storage.getCachedPrayerTimes(cacheKey);
        if (cached) {
            return Promise.resolve(cached);
        }

        try {
            console.log(`Fetching monthly prayer times for ${city}, ${month}/${year}`);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Generate mock monthly data
            const monthlyData = this.createMockMonthlyData(city, country, month, year);
            // Cache the result
            Storage.cachePrayerTimes(cacheKey, monthlyData);
            return monthlyData;
        } catch (error) {
            console.error('Monthly API failed:', error);
            return this.createMockMonthlyData(city, country, month, year);
        }
    },

    // Create mock response
    createMockResponse: function(city, country) {
        const now = new Date();
        const hijriDate = this.getHijriDate(now);
        
        return {
            status: 'success',
            data: {
                timings: { ...this.mockPrayerData },
                date: {
                    readable: Utils.formatDate(now),
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
                    timezone: city,
                    method: {
                        name: "Islamic Society of North America (ISNA)"
                    }
                }
            }
        };
    },

    // Create mock monthly data
    createMockMonthlyData: function(city, country, month, year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthlyData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const hijriDate = this.getHijriDate(date);
            
            // Add slight variations to prayer times
            const variations = {
                "Fajr": this.addMinuteVariation("04:45", day),
                "Sunrise": this.addMinuteVariation("06:05", day),
                "Dhuhr": this.addMinuteVariation("11:52", day),
                "Asr": this.addMinuteVariation("15:18", day),
                "Maghrib": this.addMinuteVariation("17:38", day),
                "Isha": this.addMinuteVariation("18:58", day)
            };

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
                timings: variations
            });
        }

        return {
            status: 'success',
            data: monthlyData
        };
    },

    // Add realistic minute variations based on day of month
    addMinuteVariation: function(timeStr, day) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const variation = Math.sin(day * 0.1) * 3; // ±3 minutes variation
        const totalMinutes = hours * 60 + minutes + Math.round(variation);
        
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    },

    // Calculate Hijri date (simplified)
    getHijriDate: function(date) {
        // Simplified Hijri calculation for demo
        const baseHijri = 1445; // Base Hijri year
        const baseGregorian = 2024; // Base Gregorian year
        const hijriYear = baseHijri + Math.floor((date.getFullYear() - baseGregorian) * 0.97);
        
        const hijriMonths = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 
                           'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 
                           'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'];
        
        const monthIndex = Math.floor(Math.random() * 12); // Simplified
        const day = Math.floor(Math.random() * 29) + 1; // Simplified
        
        return {
            date: `${day}-${monthIndex + 1}-${hijriYear}`,
            day: day,
            month: {
                number: monthIndex + 1,
                en: hijriMonths[monthIndex]
            },
            year: hijriYear
        };
    }
};